from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .admin_auth import IsAdmin, authenticate_admin
from .models import AuditEvent, Challenge, Participation, PeerReview, Profile, ReviewAssignment, Submission, Vote, LocalAccount, Comment, Report
from .serializers import BlindReviewSerializer, ChallengeSerializer, ParticipationSerializer, PeerReviewSerializer, ProfileSerializer, SubmissionSerializer, VoteSerializer, CommentSerializer, ReportSerializer
from .security import PeerReviewThrottle, ReviewAssignmentPermission, SubmissionThrottle, VoteThrottle, ensure_review_assignment, hash_ip, device_fingerprint, stratified_assign, suspicious_review_pair
from .services import compute_merit_score, reviewer_trust_weight


class IsAuthenticatedOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS or bool(request.user and request.user.is_authenticated)




class HealthView(APIView):
    """Small unauthenticated readiness endpoint used by the local launcher."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'status': 'ok', 'service': 'fairplay-api'})

class AuthView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        action = request.data.get('action')
        email = str(request.data.get('email', '')).strip().lower()
        password = str(request.data.get('password', ''))
        username = str(request.data.get('username', '')).strip()
        if not email or len(password) < 6: return Response({'detail':'Valid email and password (6+ characters) are required.'}, status=400)
        from django.contrib.auth.hashers import make_password, check_password
        if action == 'signup':
            if not username: return Response({'detail':'Username is required.'}, status=400)
            if LocalAccount.objects.filter(email=email).exists(): return Response({'detail':'An account with this email already exists.'}, status=400)
            if LocalAccount.objects.filter(username=username).exists(): return Response({'detail':'Username is already taken.'}, status=400)
            account=LocalAccount.objects.create(email=email, username=username, password_hash=make_password(password))
            Profile.objects.update_or_create(id=account.id, defaults={'username':username})
        else:
            account=LocalAccount.objects.filter(email=email).first()
            if not account or not check_password(password, account.password_hash): return Response({'detail':'Invalid email or password.'}, status=401)
        return Response({'id':str(account.id),'email':account.email,'username':account.username})

class ParticipantStatusView(APIView):
    permission_classes=[permissions.IsAuthenticated]
    def get(self, request, challenge_id):
        p=Participation.objects.filter(user_id=request.user.id, challenge_id=challenge_id).first()
        return Response({'status': p.status if p else None})
    def delete(self, request, challenge_id):
        Participation.objects.filter(user_id=request.user.id, challenge_id=challenge_id).delete()
        return Response(status=204)

class SubmissionCompatibilityView(APIView):
    permission_classes=[permissions.IsAuthenticated]

    def get(self, request, challenge_id):
        return Response([SubmissionSerializer(x).data for x in Submission.objects.filter(participation__challenge_id=challenge_id).select_related('participation')])

    def post(self, request, challenge_id):
        # The frontend already uses this compatibility URL for submissions.
        # Keep POST here as well as the router action so GET and POST use the
        # same /challenges/<id>/submit/ URL without a 405.
        challenge = get_object_or_404(Challenge, pk=challenge_id)
        participation = get_object_or_404(Participation, challenge=challenge, user_id=request.user.id)
        payload = dict(request.data.get('payload', request.data.get('submission_payload', {})) or {})
        if request.data.get('file_url'):
            payload['_file_url'] = request.data.get('file_url')
        if request.data.get('file_hash'):
            payload['_file_hash'] = request.data.get('file_hash')
        # Normalize the friendly frontend payload to the challenge's declared type.
        # Older challenges in the supplied database can have an incomplete JSON schema;
        # the declared submission_type is the source of truth for this compatibility route.
        submission_type = (challenge.submission_schema or {}).get('submission_type', 'text')
        if submission_type == 'text' and 'text' not in payload:
            payload['text'] = str(payload.get('value', '')).strip()
        elif submission_type == 'numeric' and 'value' not in payload:
            raw = payload.get('numeric_value', payload.get('distance'))
            if raw is not None:
                try: payload['value'] = float(raw)
                except (TypeError, ValueError): pass
        elif submission_type == 'quiz' and 'answers' not in payload:
            payload['answers'] = []
        elif submission_type == 'checklist' and 'checklist' not in payload:
            payload['checklist'] = []

        # The original model deliberately allows only one submission per participation.
        # Re-submitting should update that submission rather than producing a confusing 400.
        submission = Submission.objects.filter(participation=participation).first()
        try:
            with transaction.atomic():
                if submission is None:
                    # This compatibility endpoint already normalized the payload from the
                    # frontend according to the challenge's declared submission_type.
                    # Do NOT run the legacy JSON-schema validator here: older challenges
                    # can contain stale schemas (for example a text challenge requiring
                    # a `value` field). That was the source of the persistent 400 error.
                    submission = Submission.objects.create(
                        participation=participation,
                        payload=payload,
                    )
                    created = True
                else:
                    submission.payload = payload
                    submission.save(update_fields=['payload'])
                    created = False

                participation.status = Participation.Status.COMPLETED
                participation.save(update_fields=['status'])
                from django.conf import settings
                submission.payload = {**(submission.payload or {}), '_verification_status': 'verified' if settings.AUTO_APPROVE_SUBMISSIONS else 'pending'}
                if request.data.get('file_url'):
                    submission.payload['_file_url'] = request.data.get('file_url')
                if request.data.get('file_hash'):
                    submission.payload['_file_hash'] = request.data.get('file_hash')
                submission.save(update_fields=['payload'])
                compute_merit_score(submission)
                AuditEvent.objects.create(
                    event_type='submission_updated' if not created else 'submission_created',
                    actor_id=request.user.id, submission=submission,
                    ip_hash=hash_ip(request), device_fingerprint=device_fingerprint(request),
                    metadata={'challenge_id': str(challenge.id)},
                )
                if created:
                    reviewer_ids = Participation.objects.filter(challenge=challenge).exclude(
                        user_id=request.user.id
                    ).values_list('user_id', flat=True)
                    stratified_assign(submission, reviewer_ids)
        except IntegrityError as error:
            raise serializers.ValidationError({'detail': 'The submission could not be saved. Please try again.'}) from error
        return Response(SubmissionSerializer(submission).data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

class MineSubmissionsView(APIView):
    permission_classes=[permissions.IsAuthenticated]
    def get(self, request):
        return Response([SubmissionSerializer(x).data for x in Submission.objects.filter(participation__user_id=request.user.id).select_related('participation')])

class VotesView(APIView):
    permission_classes=[permissions.AllowAny]
    def get(self, request, submission_id): return Response(VoteSerializer(Vote.objects.filter(submission_id=submission_id), many=True).data)
    def post(self, request, submission_id):
        if not request.user.is_authenticated: return Response({'detail':'Sign in required.'},status=401)
        sub=get_object_or_404(Submission,pk=submission_id)
        if sub.participation.user_id == request.user.id: return Response({'detail':'You cannot vote for your own submission.'},status=400)
        Vote.objects.get_or_create(voter_id=request.user.id, submission=sub)
        return Response({'count':Vote.objects.filter(submission=sub).count()})
    def delete(self, request, submission_id):
        Vote.objects.filter(voter_id=request.user.id,submission_id=submission_id).delete(); return Response(status=204)

class CommentsView(APIView):
    permission_classes=[permissions.IsAuthenticated]
    def get(self, request, submission_id): return Response(CommentSerializer(Comment.objects.filter(submission_id=submission_id),many=True).data)
    def post(self, request, submission_id):
        text=str(request.data.get('text','')).strip()
        if not text: return Response({'detail':'Comment cannot be empty.'},status=400)
        obj=Comment.objects.create(user_id=request.user.id,submission_id=submission_id,text=text)
        return Response(CommentSerializer(obj).data,status=201)

class ReportView(APIView):
    permission_classes=[permissions.IsAuthenticated]
    def post(self, request, submission_id):
        reason=str(request.data.get('reason','')).strip()
        if not reason:return Response({'detail':'Reason is required.'},status=400)
        obj=Report.objects.create(reporter_id=request.user.id,submission_id=submission_id,reason=reason)
        return Response(ReportSerializer(obj).data,status=201)

class ReportsView(APIView):
    permission_classes=[IsAdmin]
    def get(self, request): return Response(ReportSerializer(Report.objects.all(),many=True).data)
    def patch(self, request, report_id):
        obj=get_object_or_404(Report,pk=report_id); obj.status=request.data.get('status',obj.status); obj.save(update_fields=['status']); return Response(ReportSerializer(obj).data)

class VerificationView(APIView):
    permission_classes=[IsAdmin]
    def patch(self, request, submission_id):
        sub=get_object_or_404(Submission,pk=submission_id)
        status_value=request.data.get('status','pending')
        sub.payload = {**(sub.payload or {}), '_verification_status': status_value}
        sub.save(update_fields=['payload'])
        compute_merit_score(sub)
        return Response({'status':status_value,'submission_id':str(sub.id),'merit_score':float(sub.merit_score)})

class ScoreBreakdownView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, submission_id):
        submission = get_object_or_404(Submission, pk=submission_id)
        audit = submission.score_audits.order_by('-computed_at').first()
        if not audit:
            compute_merit_score(submission)
            audit = submission.score_audits.order_by('-computed_at').first()
        data = dict(audit.breakdown or {})
        return Response({
            'submission_id': str(submission.id),
            'final_score': float(submission.merit_score or 0),
            'performance_normalized': float(data.get('performance_normalized', 0)),
            'difficulty_weight': float(data.get('difficulty_weight', 1)),
            'completion_factor': float(data.get('completion_factor', 1)),
            'verification_factor': float(data.get('verification_factor', 1)),
            'consistency_bonus': float(data.get('consistency_bonus', 0)),
            'community_signal_capped': float(data.get('community_signal_capped', 0)),
            'breakdown': data.get('details', {}),
            'computed_at': audit.computed_at,
        })


class GlobalLeaderboardView(APIView):
    permission_classes=[permissions.AllowAny]
    def get(self, request):
        rows=[]
        profiles={p.id:p for p in Profile.objects.all()}
        scores={}
        for sub in Submission.objects.filter(merit_score__isnull=False).select_related('participation'):
            uid=sub.participation.user_id; scores.setdefault(uid,[]).append(float(sub.merit_score))
        for uid, vals in scores.items():
            profile=profiles.get(uid); rows.append({'user_id':str(uid),'username':profile.username if profile else f'user_{str(uid)[:8]}','avatar_url':profile.avatar_url if profile else None,'total_score':round(sum(vals),3),'best_score':max(vals),'submission_count':len(vals),'challenges_completed':len(vals),'consistency_streak':profile.consistency_streak if profile else 0})
        rows.sort(key=lambda x:(-x['total_score'],-x['best_score']))
        for i,r in enumerate(rows,1):r['rank']=i
        return Response(rows[:int(request.query_params.get('limit',50))])

class RecomputeScoresView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        count = 0
        for submission in Submission.objects.all():
            compute_merit_score(submission)
            count += 1
        return Response({'recomputed': count})


class ChallengeViewSet(viewsets.ModelViewSet):
    queryset = Challenge.objects.all()
    serializer_class = ChallengeSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        # Challenge creation is a normal authenticated user feature.
        # Moderation/admin-only operations remain protected elsewhere.
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(creator_id=self.request.user.id)

    def perform_update(self, serializer):
        # A challenge may be edited only by its creator.
        challenge = self.get_object()
        if str(challenge.creator_id) != str(self.request.user.id):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only the challenge creator can edit this challenge.')
        serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def join(self, request, pk=None):
        challenge = self.get_object()
        participation, created = Participation.objects.get_or_create(user_id=request.user.id, challenge=challenge)
        if not created:
            return Response(ParticipationSerializer(participation).data, status=status.HTTP_200_OK)
        return Response(ParticipationSerializer(participation).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='submit')
    def submit(self, request, pk=None):
        challenge = self.get_object()
        participation = get_object_or_404(Participation, challenge=challenge, user_id=request.user.id)
        serializer = SubmissionSerializer(data={
            'participation': participation.pk,
            'payload': request.data.get('payload', request.data.get('submission_payload', {})),
        })
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                submission = serializer.save()
                participation.status = Participation.Status.COMPLETED
                participation.save(update_fields=['status'])
                # Persist verification state with the submission without changing
                # the original Submission schema.
                submission.payload = {**submission.payload, '_verification_status': 'pending'}
                submission.save(update_fields=['payload'])
                compute_merit_score(submission)
                AuditEvent.objects.create(
                    event_type='submission_created', actor_id=request.user.id, submission=submission,
                    ip_hash=hash_ip(request), device_fingerprint=device_fingerprint(request),
                    metadata={'challenge_id': str(challenge.id)},
                )
                reviewer_ids = Participation.objects.filter(challenge=challenge).exclude(
                    user_id=request.user.id
                ).values_list('user_id', flat=True)
                stratified_assign(submission, reviewer_ids)
        except IntegrityError as error:
            raise serializers.ValidationError('This participation already has a submission.') from error
        return Response(SubmissionSerializer(submission).data, status=status.HTTP_201_CREATED)

    def get_throttles(self):
        return [SubmissionThrottle()] if self.action == 'submit' else super().get_throttles()


class ParticipationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ParticipationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Participation.objects.filter(user_id=self.request.user.id).select_related('challenge')


class SubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubmissionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = Submission.objects.select_related('participation', 'participation__challenge').all()


class PeerReviewViewSet(viewsets.ModelViewSet):
    serializer_class = PeerReviewSerializer
    permission_classes = [permissions.IsAuthenticated, ReviewAssignmentPermission]
    queryset = PeerReview.objects.select_related('submission', 'submission__participation').all()

    def get_throttles(self):
        return [PeerReviewThrottle()] if self.action == 'create' else super().get_throttles()

    def get_queryset(self):
        return super().get_queryset().filter(reviewer_id=self.request.user.id)

    def perform_create(self, serializer):
        submission = serializer.validated_data['submission']
        assignment = ensure_review_assignment(submission, self.request.user.id)
        if suspicious_review_pair(self.request.user.id, submission.participation.user_id):
            from .models import AnomalyFlag
            AnomalyFlag.objects.get_or_create(
                kind='mutual_review_pattern', subject_id=self.request.user.id,
                defaults={'submission': submission, 'severity': 3, 'evidence': {'author_id': str(submission.participation.user_id)}},
            )
        weight = reviewer_trust_weight(self.request.user.id)
        review = serializer.save(reviewer_id=self.request.user.id, reviewer_trust_weight=weight)
        assignment.status = ReviewAssignment.Status.COMPLETED
        assignment.save(update_fields=['status'])
        AuditEvent.objects.create(
            event_type='peer_review_created', actor_id=self.request.user.id, submission=submission,
            ip_hash=hash_ip(self.request), device_fingerprint=device_fingerprint(self.request),
            metadata={'assignment_id': str(assignment.id), 'blind': True},
        )
        compute_merit_score(review.submission)


class ReviewAssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BlindReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Submission.objects.filter(
            review_assignments__reviewer_id=self.request.user.id,
            review_assignments__status=ReviewAssignment.Status.ASSIGNED,
        ).distinct()


class VoteViewSet(viewsets.ModelViewSet):
    serializer_class = VoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Vote.objects.all()

    def get_throttles(self):
        return [VoteThrottle()] if self.action == 'create' else super().get_throttles()

    def perform_create(self, serializer):
        submission = serializer.validated_data['submission']
        if submission.participation.user_id == self.request.user.id:
            raise serializers.ValidationError({'submission': 'You cannot vote for your own submission.'})
        try:
            vote = serializer.save(voter_id=self.request.user.id)
        except IntegrityError as error:
            raise serializers.ValidationError({'submission': 'You have already voted for this submission.'}) from error
        AuditEvent.objects.create(
            event_type='vote_created', actor_id=self.request.user.id, submission=submission,
            ip_hash=hash_ip(self.request), device_fingerprint=device_fingerprint(self.request),
            metadata={'vote_id': str(vote.id)},
        )


class ChallengeLeaderboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, challenge_id):
        get_object_or_404(Challenge, pk=challenge_id)
        submissions = Submission.objects.filter(
            participation__challenge_id=challenge_id,
            merit_score__isnull=False,
        ).select_related('participation').order_by('-merit_score', 'submitted_at')
        return Response([
            {
                'rank': index,
                'submission_id': str(submission.id),
                'participation_id': str(submission.participation_id),
                'user_id': str(submission.participation.user_id),
                'username': Profile.objects.filter(id=submission.participation.user_id).values_list('username', flat=True).first() or f'user_{str(submission.participation.user_id)[:8]}',
                'avatar_url': Profile.objects.filter(id=submission.participation.user_id).values_list('avatar_url', flat=True).first(),
                'verification_status': 'pending',
                'final_score': float(submission.merit_score),
                'merit_score': float(submission.merit_score),
                'breakdown': (lambda a: ({**(a.breakdown or {}), 'details': (a.breakdown or {}).get('details', {})} if a else None))(submission.score_audits.order_by('-computed_at').first()),
                'submitted_at': submission.submitted_at,
            }
            for index, submission in enumerate(submissions, start=1)
        ])


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_profile(self, request, user_id):
        profile, _ = Profile.objects.get_or_create(
            id=user_id,
            defaults={'username': f'user_{str(user_id)[:8]}'},
        )
        return profile

    def get(self, request, user_id):
        return Response(ProfileSerializer(self.get_profile(request, user_id)).data)

    def patch(self, request, user_id):
        if str(request.user.id) != str(user_id):
            return Response({'detail': 'You can only update your own profile.'}, status=status.HTTP_403_FORBIDDEN)
        profile = self.get_profile(request, user_id)
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ProfileByUsernameView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        profile = get_object_or_404(Profile, username=username)
        return Response(ProfileSerializer(profile).data)


class AdminLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = authenticate_admin(request.data.get('email', ''), request.data.get('password', ''))
        if not token:
            return Response({'detail': 'Invalid administrator credentials.'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response({'token': token, 'email': str(request.data.get('email', '')).strip().lower()})


class AdminDashboardView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        from .models import AnomalyFlag, AuditEvent
        return Response({
            'challenge_count': Challenge.objects.count(),
            'submission_count': Submission.objects.count(),
            'open_anomaly_count': AnomalyFlag.objects.filter(status=AnomalyFlag.Status.OPEN).count(),
            'recent_events': list(AuditEvent.objects.order_by('-created_at').values(
                'event_type', 'actor_id', 'created_at', 'metadata'
            )[:25]),
        })


class AdminParticipationView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        participants = list(Participation.objects.select_related('challenge').order_by('challenge__title', '-joined_at'))
        user_ids = {participant.user_id for participant in participants}
        profiles = {
            profile.id: profile
            for profile in Profile.objects.filter(id__in=user_ids)
        }
        submission_scores = {
            submission.participation_id: submission.merit_score
            for submission in Submission.objects.filter(participation_id__in=[item.id for item in participants]).order_by('-submitted_at')
        }
        grouped = {}
        for participant in participants:
            grouped.setdefault(str(participant.challenge_id), {
                'challenge_id': str(participant.challenge_id),
                'title': participant.challenge.title,
                'points': participant.challenge.points,
                'difficulty': participant.challenge.difficulty,
                'participant_count': 0,
                'participants': [],
            })
            profile = profiles.get(participant.user_id)
            grouped[str(participant.challenge_id)]['participant_count'] += 1
            grouped[str(participant.challenge_id)]['participants'].append({
                'user_id': str(participant.user_id),
                'username': profile.username if profile else f'user_{str(participant.user_id)[:8]}',
                'avatar_url': profile.avatar_url if profile else None,
                'bio': profile.bio if profile else '',
                'status': participant.status,
                'joined_at': participant.joined_at,
                'submitted': participant.id in submission_scores,
                'merit_score': float(submission_scores[participant.id]) if submission_scores.get(participant.id) is not None else None,
            })
        return Response(list(grouped.values()))
