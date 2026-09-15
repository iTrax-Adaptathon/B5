from rest_framework import serializers

from .models import Challenge, Participation, PeerReview, Profile, Submission, Vote, Comment, Report
from .schema_validation import validate_payload


class ChallengeSerializer(serializers.ModelSerializer):
    difficulty_tier = serializers.CharField(write_only=True, required=False)
    submission_type = serializers.CharField(write_only=True, required=False)
    evaluation_criteria = serializers.JSONField(write_only=True, required=False)
    rules = serializers.CharField(write_only=True, required=False, allow_blank=True)
    difficulty_weight = serializers.FloatField(write_only=True, required=False)
    points = serializers.IntegerField(required=False, min_value=1)
    benchmark_value = serializers.FloatField(write_only=True, required=False, allow_null=True)
    benchmark_unit = serializers.CharField(write_only=True, required=False, allow_null=True, allow_blank=True)
    requires_verification = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = Challenge
        fields = '__all__'
        read_only_fields = ('id', 'creator_id', 'created_at')

    def to_internal_value(self, data):
        normalized = dict(data)
        if 'difficulty' not in normalized:
            normalized['difficulty'] = {
                'Easy': 1, 'Medium': 3, 'Hard': 4, 'Expert': 5,
            }.get(normalized.get('difficulty_tier'), 3)
        if 'scoring_method' not in normalized:
            normalized['scoring_method'] = 'numeric_threshold' if normalized.get('submission_type') == 'numeric' else 'peer_review'
        if 'submission_schema' not in normalized:
            criteria = normalized.get('evaluation_criteria') or {}
            normalized['submission_schema'] = {
                'type': 'object',
                'properties': {'value': {'type': 'number'}} if normalized.get('submission_type') == 'numeric' else {},
                'required': ['value'] if normalized.get('submission_type') == 'numeric' else [],
                'additionalProperties': True,
                'evaluation_criteria': criteria,
            }
        schema = dict(normalized.get('submission_schema') or {})
        schema['submission_type'] = normalized.get('submission_type', 'text')
        schema['requires_verification'] = bool(normalized.get('requires_verification', False))
        if normalized.get('benchmark_value') is not None:
            criteria = dict(schema.get('evaluation_criteria') or {})
            criteria['benchmark_value'] = normalized.get('benchmark_value')
            schema['evaluation_criteria'] = criteria
        normalized['submission_schema'] = schema
        return super().to_internal_value(normalized)

    def create(self, validated_data):
        schema = dict(validated_data.get('submission_schema') or {})
        if validated_data.get('rules') is not None: schema['rules'] = validated_data.get('rules')
        if validated_data.get('benchmark_unit') is not None: schema['benchmark_unit'] = validated_data.get('benchmark_unit')
        validated_data['submission_schema'] = schema
        for legacy_field in (
            'difficulty_tier', 'submission_type', 'evaluation_criteria', 'rules',
            'difficulty_weight', 'benchmark_value', 'benchmark_unit', 'requires_verification',
        ):
            validated_data.pop(legacy_field, None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Translate the frontend's friendly challenge fields back into the
        # original database representation when editing.
        tier = validated_data.pop('difficulty_tier', None)
        submission_type = validated_data.pop('submission_type', None)
        criteria = validated_data.pop('evaluation_criteria', None)
        rules = validated_data.pop('rules', None)
        validated_data.pop('difficulty_weight', None)
        benchmark_value = validated_data.pop('benchmark_value', None)
        benchmark_unit = validated_data.pop('benchmark_unit', None)
        req = validated_data.pop('requires_verification', None)
        schema = dict(instance.submission_schema or {})
        if rules is not None: schema['rules'] = rules
        if benchmark_unit is not None: schema['benchmark_unit'] = benchmark_unit
        if req is not None: schema['requires_verification'] = bool(req)
        instance.submission_schema = schema
        if tier:
            instance.difficulty = {'Easy': 1, 'Medium': 3, 'Hard': 4, 'Expert': 5}.get(tier, instance.difficulty)
        if submission_type:
            instance.scoring_method = 'numeric_threshold' if submission_type == 'numeric' else 'peer_review'
        schema = dict(instance.submission_schema or {})
        if criteria is not None:
            schema['evaluation_criteria'] = criteria
        if benchmark_value is not None:
            schema['evaluation_criteria'] = {**(schema.get('evaluation_criteria') or {}), 'benchmark_value': benchmark_value}
        instance.submission_schema = schema
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        return instance

    def to_representation(self, instance):
        result = super().to_representation(instance)
        tier = {1: 'Easy', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Expert'}.get(instance.difficulty, 'Medium')
        schema = instance.submission_schema or {}
        criteria = schema.get('evaluation_criteria', {}) or {}
        result.update({
            'difficulty_tier': tier,
            'submission_type': schema.get('submission_type') or ('numeric' if instance.scoring_method == 'numeric_threshold' else 'text'),
            'evaluation_criteria': criteria,
            'rules': schema.get('rules', ''),
            'difficulty_weight': round(1 + (instance.difficulty - 1) * 0.25, 2),
            'benchmark_value': criteria.get('benchmark_value'),
            'benchmark_unit': schema.get('benchmark_unit'),
            'requires_verification': bool(schema.get('requires_verification', False)),
            'participant_count': instance.participations.count(),
        })
        return result


class ParticipationSerializer(serializers.ModelSerializer):
    challenge_id = serializers.UUIDField(source='challenge.id', read_only=True)

    class Meta:
        model = Participation
        fields = ('id', 'user_id', 'challenge_id', 'status', 'joined_at')
        read_only_fields = ('id', 'user_id', 'challenge_id', 'joined_at', 'status')


class SubmissionSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source='participation.user_id', read_only=True)
    challenge_id = serializers.UUIDField(source='participation.challenge_id', read_only=True)
    submission_payload = serializers.JSONField(source='payload')
    file_url = serializers.SerializerMethodField()
    file_hash = serializers.SerializerMethodField()
    raw_performance_score = serializers.SerializerMethodField()
    verification_status = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = ('id', 'user_id', 'challenge_id', 'submission_payload', 'file_url', 'file_hash',
                  'raw_performance_score', 'verification_status', 'submitted_at', 'merit_score')
        read_only_fields = ('id', 'user_id', 'challenge_id', 'submitted_at', 'merit_score',
                            'file_url', 'file_hash', 'raw_performance_score', 'verification_status')

    def get_file_url(self, obj):
        return (obj.payload or {}).get('_file_url')

    def get_file_hash(self, obj):
        return (obj.payload or {}).get('_file_hash')

    def get_raw_performance_score(self, obj):
        return float(obj.merit_score) if obj.merit_score is not None else None

    def get_verification_status(self, obj):
        return (obj.payload or {}).get('_verification_status', 'pending')

    def validate(self, attrs):
        participation = attrs.get('participation')
        if participation is None:
            raise serializers.ValidationError({'participation': 'This field is required.'})
        validate_payload(attrs.get('payload', {}), participation.challenge.submission_schema)
        return attrs


class PeerReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeerReview
        fields = '__all__'
        read_only_fields = ('id', 'reviewer_id', 'reviewer_trust_weight', 'created_at')


class BlindReviewSerializer(serializers.ModelSerializer):
    """Review assignment representation intentionally contains no author profile data."""
    class Meta:
        model = Submission
        fields = ('id', 'payload', 'submitted_at')
        read_only_fields = fields


class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = '__all__'
        read_only_fields = ('id', 'voter_id', 'created_at')


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'challenges_joined', 'challenges_completed', 'challenges_in_progress', 'challenges_failed', 'average_score', 'consistency_streak', 'is_moderator')


class CommentSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    class Meta:
        model = Comment
        fields = '__all__'
        read_only_fields = ('id', 'user_id', 'created_at', 'username', 'avatar_url')
    def get_username(self, obj):
        return Profile.objects.filter(id=obj.user_id).values_list('username', flat=True).first() or f'user_{str(obj.user_id)[:8]}'
    def get_avatar_url(self, obj):
        return Profile.objects.filter(id=obj.user_id).values_list('avatar_url', flat=True).first()

class ReportSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    submission_payload = serializers.SerializerMethodField()
    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = ('id', 'reporter_id', 'created_at', 'username', 'submission_payload')
    def get_username(self, obj):
        return Profile.objects.filter(id=obj.reporter_id).values_list('username', flat=True).first() or f'user_{str(obj.reporter_id)[:8]}'
    def get_submission_payload(self, obj):
        return obj.submission.payload
