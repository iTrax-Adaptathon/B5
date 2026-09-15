from django.db.models import Avg
from django.conf import settings

from .models import AnomalyFlag, ScoreAuditLog


def reviewer_trust_weight(reviewer_id):
    flags = AnomalyFlag.objects.filter(subject_id=reviewer_id, status=AnomalyFlag.Status.OPEN)
    penalty = sum(flag.severity for flag in flags) * 0.1
    return max(0.1, round(1 - penalty, 3))


def _clamp(value, low=0.0, high=100.0):
    return max(low, min(high, float(value)))


def _performance_score(submission):
    challenge = submission.participation.challenge
    payload = submission.payload or {}
    criteria = (challenge.submission_schema or {}).get('evaluation_criteria') or {}
    kind = (challenge.submission_schema or {}).get('submission_type', '')
    reviews = list(submission.peer_reviews.all())
    weighted = [float(r.score) * float(r.reviewer_trust_weight) for r in reviews]
    weights = [float(r.reviewer_trust_weight) for r in reviews]
    review_score = sum(weighted) / sum(weights) if weighted and sum(weights) else 0.0

    if kind == 'quiz' or 'answer_key' in criteria:
        key = [str(x).strip().lower() for x in criteria.get('answer_key', [])]
        answers = [str(x).strip().lower() for x in payload.get('answers', [])]
        return _clamp(sum(a == b for a, b in zip(answers, key)) / len(key) * 100 if key else review_score)
    if kind == 'checklist' or 'checklist_items' in criteria:
        items = payload.get('checklist', [])
        return _clamp(sum(bool(x) for x in items) / len(items) * 100 if items else 0)
    if kind == 'numeric' or challenge.scoring_method == 'numeric_threshold':
        raw = payload.get('value', payload.get('distance'))
        try:
            result = float(raw)
        except (TypeError, ValueError):
            return _clamp(review_score)
        benchmark = criteria.get('benchmark_value')
        if benchmark is None:
            return _clamp(result)
        try:
            benchmark = float(benchmark)
            if benchmark <= 0:
                return _clamp(result)
            # Numeric challenges default to higher-is-better. A creator can set
            # direction='lower' for time/latency style challenges.
            if criteria.get('direction') == 'lower':
                return _clamp((benchmark / result) * 100 if result > 0 else 100)
            return _clamp((result / benchmark) * 100)
        except (TypeError, ValueError, ZeroDivisionError):
            return _clamp(result)
    return _clamp(review_score)


def compute_merit_score(submission):
    challenge = submission.participation.challenge
    if getattr(settings, 'AUTO_APPROVE_SUBMISSIONS', False):
        final = round(float(challenge.points), 3)
        submission.payload = {**(submission.payload or {}), '_verification_status': 'verified'}
        submission.merit_score = final
        submission.save(update_fields=['payload', 'merit_score'])
        ScoreAuditLog.objects.create(
            submission=submission,
            computed_final_score=final,
            breakdown={
                'performance_normalized': 100.0,
                'difficulty_weight': 1.0,
                'completion_factor': 1.0,
                'verification_factor': 1.0,
                'consistency_bonus': 0.0,
                'community_signal_capped': 0.0,
                'details': {
                    'method': 'demo_auto_approval',
                    'full_points_awarded': True,
                    'challenge_points': float(challenge.points),
                },
            },
        )
        return submission.merit_score
    performance = _performance_score(submission)
    difficulty = {1: 1.0, 2: 1.15, 3: 1.3, 4: 1.6, 5: 2.0}.get(challenge.difficulty, 1.3)
    completion = 1.0
    requires_verification = bool((challenge.submission_schema or {}).get('requires_verification', False))
    verification_status = (submission.payload or {}).get('_verification_status', 'pending')
    verification = 1.0 if not requires_verification or verification_status == 'verified' else 0.85

    # Consistency is deliberately small and cannot dominate performance.
    completed = submission.participation.challenge.participations.filter(status='completed').count()
    consistency = min(float(getattr(settings, 'SCORE_CONSISTENCY_BONUS_CAP', 8)), completed * 0.5)
    votes = submission.votes.count()
    base = performance * difficulty * completion * verification
    community_cap = min(float(getattr(settings, 'SCORE_COMMUNITY_CAP', 10)), base * 0.10)
    community = min(float(votes), community_cap)
    final = round(base + consistency + community, 3)

    submission.merit_score = final
    submission.save(update_fields=['merit_score'])
    ScoreAuditLog.objects.create(
        submission=submission,
        computed_final_score=final,
        breakdown={
            'performance_normalized': round(performance, 3),
            'difficulty_weight': difficulty,
            'completion_factor': completion,
            'verification_factor': verification,
            'consistency_bonus': round(consistency, 3),
            'community_signal_capped': round(community, 3),
            'details': {
                'method': challenge.scoring_method,
                'reviews_used': len(submission.peer_reviews.all()),
                'votes_count': votes,
                'requires_verification': requires_verification,
                'verification_status': verification_status,
            },
        },
    )
    return submission.merit_score
