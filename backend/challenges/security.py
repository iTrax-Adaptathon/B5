import hashlib
import secrets

from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from rest_framework import permissions, throttling
from rest_framework.exceptions import PermissionDenied

from .models import PeerReview, ReviewAssignment, Submission


class UserIpThrottle(throttling.SimpleRateThrottle):
    """Throttle each authenticated user/IP pair to limit account rotation abuse."""
    scope = 'user_ip'

    def get_cache_key(self, request, view):
        user_id = getattr(request.user, 'pk', 'anonymous')
        ip = request.META.get('REMOTE_ADDR', 'unknown')
        return self.cache_format % {'scope': self.scope, 'ident': f'{user_id}:{ip}'}


class SubmissionThrottle(UserIpThrottle):
    scope = 'submission'


class PeerReviewThrottle(UserIpThrottle):
    scope = 'peer_review'


class VoteThrottle(UserIpThrottle):
    scope = 'vote'


class ReviewAssignmentPermission(permissions.BasePermission):
    message = 'This submission is not assigned to you for review.'

    def has_permission(self, request, view):
        if request.method != 'POST' or not request.user or not request.user.is_authenticated:
            return bool(request.user and request.user.is_authenticated)
        submission = getattr(view, 'review_submission', None)
        if submission is None:
            submission_id = request.data.get('submission')
            if submission_id:
                submission = Submission.objects.filter(id=submission_id).first()
        if submission is None:
            return True
        return ReviewAssignment.objects.filter(
            submission=submission,
            reviewer_id=request.user.id,
            status=ReviewAssignment.Status.ASSIGNED,
        ).exists()


def client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
    return forwarded or request.META.get('REMOTE_ADDR', '')


def hash_ip(request):
    value = client_ip(request)
    salt = getattr(settings, 'AUDIT_HASH_SALT', settings.SECRET_KEY)
    return hashlib.sha256(f'{salt}:{value}'.encode()).hexdigest() if value else ''


def device_fingerprint(request):
    value = request.META.get('HTTP_X_DEVICE_FINGERPRINT', '')
    return hashlib.sha256(value.encode()).hexdigest() if value else ''


def ensure_review_assignment(submission, reviewer_id):
    challenge = submission.participation.challenge
    if submission.participation.user_id == reviewer_id:
        raise PermissionDenied('You cannot review your own submission.')
    if challenge.creator_id == reviewer_id:
        raise PermissionDenied('Challenge creators cannot review submissions in their challenge.')
    if PeerReview.objects.filter(reviewer_id=reviewer_id, submission=submission).exists():
        raise PermissionDenied('You have already reviewed this submission.')
    assignment = ReviewAssignment.objects.filter(
        submission=submission,
        reviewer_id=reviewer_id,
        status=ReviewAssignment.Status.ASSIGNED,
    ).first()
    if not assignment:
        raise PermissionDenied('This submission is not assigned to you for review.')
    return assignment


def stratified_assign(submission, reviewer_ids, count=3):
    """Assign reviewers while excluding the author and preserving review coverage."""
    candidates = [
        reviewer_id for reviewer_id in reviewer_ids
        if reviewer_id != submission.participation.user_id
        and reviewer_id != submission.participation.challenge.creator_id
        and not PeerReview.objects.filter(reviewer_id=reviewer_id, submission=submission).exists()
    ]
    secrets.SystemRandom().shuffle(candidates)
    assignments = []
    for reviewer_id in candidates[:count]:
        assignment, _ = ReviewAssignment.objects.get_or_create(
            submission=submission,
            reviewer_id=reviewer_id,
            defaults={'status': ReviewAssignment.Status.ASSIGNED},
        )
        assignments.append(assignment)
    return assignments


def suspicious_review_pair(reviewer_id, author_id):
    if reviewer_id == author_id:
        return True
    pair_count = PeerReview.objects.filter(reviewer_id=reviewer_id, submission__participation__user_id=author_id).count()
    reverse_count = PeerReview.objects.filter(reviewer_id=author_id, submission__participation__user_id=reviewer_id).count()
    return pair_count >= 3 and reverse_count >= 3
