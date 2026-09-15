import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Profile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=80, unique=True)
    avatar_url = models.URLField(blank=True, null=True)
    bio = models.TextField(blank=True)
    is_moderator = models.BooleanField(default=False)
    challenges_joined = models.PositiveIntegerField(default=0)
    challenges_completed = models.PositiveIntegerField(default=0)
    challenges_in_progress = models.PositiveIntegerField(default=0)
    challenges_failed = models.PositiveIntegerField(default=0)
    average_score = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    consistency_streak = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'profiles'


class Challenge(models.Model):
    class ScoringMethod(models.TextChoices):
        PEER_REVIEW = 'peer_review', 'Peer review'
        NUMERIC_THRESHOLD = 'numeric_threshold', 'Numeric threshold'
        HYBRID = 'hybrid', 'Hybrid'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator_id = models.UUIDField()
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=30, blank=True)
    difficulty = models.PositiveSmallIntegerField(default=3, validators=[MinValueValidator(1), MaxValueValidator(5)])
    points = models.PositiveIntegerField(default=100)
    deadline = models.DateTimeField(null=True, blank=True)
    submission_schema = models.JSONField(default=dict)
    scoring_method = models.CharField(max_length=30, choices=ScoringMethod.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'challenges'
        ordering = ['-created_at']


class Participation(models.Model):
    class Status(models.TextChoices):
        JOINED = 'joined', 'Joined'
        IN_PROGRESS = 'in_progress', 'In progress'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField()
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name='participations')
    joined_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.JOINED)

    class Meta:
        db_table = 'participations'
        constraints = [models.UniqueConstraint(fields=['user_id', 'challenge'], name='participations_user_challenge_unique')]


class Submission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participation = models.ForeignKey(Participation, on_delete=models.CASCADE, related_name='submissions')
    payload = models.JSONField(default=dict)
    submitted_at = models.DateTimeField(auto_now_add=True)
    merit_score = models.DecimalField(max_digits=9, decimal_places=3, null=True, blank=True)

    class Meta:
        db_table = 'submissions'
        constraints = [models.UniqueConstraint(fields=['participation'], name='one_submission_per_participation')]


class PeerReview(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reviewer_id = models.UUIDField()
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name='peer_reviews')
    score = models.DecimalField(max_digits=6, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)])
    reviewer_trust_weight = models.DecimalField(max_digits=6, decimal_places=3, default=1, validators=[MinValueValidator(0)])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'peer_reviews'
        constraints = [models.UniqueConstraint(fields=['reviewer_id', 'submission'], name='peer_reviews_reviewer_submission_unique')]


class Vote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    voter_id = models.UUIDField()
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name='votes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'votes'
        constraints = [models.UniqueConstraint(fields=['voter_id', 'submission'], name='votes_voter_submission_unique')]


class ReviewAssignment(models.Model):
    class Status(models.TextChoices):
        ASSIGNED = 'assigned', 'Assigned'
        COMPLETED = 'completed', 'Completed'
        EXPIRED = 'expired', 'Expired'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name='review_assignments')
    reviewer_id = models.UUIDField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ASSIGNED)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'review_assignments'
        constraints = [models.UniqueConstraint(fields=['submission', 'reviewer_id'], name='review_assignments_submission_reviewer_unique')]


class AuditEvent(models.Model):
    event_type = models.CharField(max_length=40)
    actor_id = models.UUIDField(null=True, blank=True)
    submission = models.ForeignKey(Submission, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_events')
    ip_hash = models.CharField(max_length=64, blank=True)
    device_fingerprint = models.CharField(max_length=64, blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_events'
        indexes = [models.Index(fields=['event_type', 'created_at'])]


class AnomalyFlag(models.Model):
    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        REVIEWED = 'reviewed', 'Reviewed'
        DISMISSED = 'dismissed', 'Dismissed'

    kind = models.CharField(max_length=60)
    subject_id = models.UUIDField(null=True, blank=True)
    submission = models.ForeignKey(Submission, on_delete=models.SET_NULL, null=True, blank=True, related_name='anomaly_flags')
    severity = models.PositiveSmallIntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(5)])
    evidence = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'anomaly_flags'
        indexes = [models.Index(fields=['status', 'created_at'])]


class ScoreAuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(Submission, on_delete=models.PROTECT, related_name='score_audits')
    computed_final_score = models.DecimalField(max_digits=9, decimal_places=3)
    breakdown = models.JSONField(default=dict)
    computed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'score_audit_log'
        ordering = ['-computed_at']


class LocalAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=80, unique=True)
    password_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'local_accounts'


class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField()
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name='comments')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'comments'
        ordering = ['created_at']


class Report(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        REVIEWED = 'reviewed', 'Reviewed'
        RESOLVED = 'resolved', 'Resolved'
        DISMISSED = 'dismissed', 'Dismissed'
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter_id = models.UUIDField()
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name='reports')
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reports'
        ordering = ['-created_at']
