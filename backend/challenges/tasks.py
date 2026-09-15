from datetime import timedelta

from celery import shared_task
from django.utils import timezone
from django.db.models import Count

from .models import AnomalyFlag, AuditEvent, PeerReview, Profile


@shared_task
def detect_anomalies():
    """Queue suspicious activity for human audit; never bans accounts automatically."""
    now = timezone.now()
    window_start = now - timedelta(minutes=10)
    created = 0

    vote_clusters = AuditEvent.objects.filter(
        event_type='vote_created', created_at__gte=window_start,
    ).values('actor_id', 'submission__participation__challenge_id').annotate(total=Count('id')).filter(total__gte=10)
    for cluster in vote_clusters:
        _, was_created = AnomalyFlag.objects.get_or_create(
            kind='vote_cluster', subject_id=cluster['actor_id'],
            defaults={
                'severity': 3,
                'evidence': {
                    'challenge_id': str(cluster['submission__participation__challenge_id']),
                    'events': cluster['total'],
                    'window_minutes': 10,
                },
            },
        )
        created += int(was_created)

    recent_voters = AuditEvent.objects.filter(
        event_type='vote_created', created_at__gte=window_start,
    ).values('actor_id', 'submission__participation__challenge_id').annotate(total=Count('id')).filter(total__gte=5)
    for voter in recent_voters:
        profile = Profile.objects.filter(id=voter['actor_id']).first()
        if not profile or profile.created_at > now - timedelta(days=7):
            _, was_created = AnomalyFlag.objects.get_or_create(
                kind='new_account_vote_burst', subject_id=voter['actor_id'],
                defaults={
                    'severity': 3,
                    'evidence': {
                        'challenge_id': str(voter['submission__participation__challenge_id']),
                        'events': voter['total'],
                        'window_minutes': 10,
                    },
                },
            )
            created += int(was_created)

    mutual_pairs = PeerReview.objects.values('reviewer_id', 'submission__participation__user_id').annotate(total=Count('id')).filter(total__gte=3)
    for pair in mutual_pairs:
        reverse = PeerReview.objects.filter(
            reviewer_id=pair['submission__participation__user_id'],
            submission__participation__user_id=pair['reviewer_id'],
        ).count()
        if reverse < 3:
            continue
        _, was_created = AnomalyFlag.objects.get_or_create(
            kind='mutual_positive_reviews', subject_id=pair['reviewer_id'],
            defaults={
                'severity': 3,
                'evidence': {'counterparty_id': str(pair['submission__participation__user_id']), 'each_direction': pair['total']},
            },
        )
        created += int(was_created)
    return created
