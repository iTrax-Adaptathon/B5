from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (AdminDashboardView, AdminLoginView, AdminParticipationView, ChallengeLeaderboardView, ChallengeViewSet, ParticipationViewSet, PeerReviewViewSet, ProfileView, ProfileByUsernameView, ReviewAssignmentViewSet, SubmissionViewSet, VoteViewSet, AuthView, ParticipantStatusView, SubmissionCompatibilityView, MineSubmissionsView, VotesView, CommentsView, ReportView, ReportsView, VerificationView, GlobalLeaderboardView, HealthView, RecomputeScoresView, ScoreBreakdownView)

router = DefaultRouter()
router.register('challenges', ChallengeViewSet, basename='challenge')
router.register('participations', ParticipationViewSet, basename='participation')
router.register('submissions', SubmissionViewSet, basename='submission')
router.register('peer-reviews', PeerReviewViewSet, basename='peer-review')
router.register('review-assignments', ReviewAssignmentViewSet, basename='review-assignment')
router.register('votes', VoteViewSet, basename='vote')

urlpatterns = [
    path('admin/login/', AdminLoginView.as_view(), name='admin-login'),
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/participation/', AdminParticipationView.as_view(), name='admin-participation'),
    path('health/', HealthView.as_view(), name='health'),
    path('scores/recompute/', RecomputeScoresView.as_view(), name='recompute-scores'),
    path('auth/', AuthView.as_view(), name='auth'),
    path('challenges/<uuid:challenge_id>/participant-status/', ParticipantStatusView.as_view(), name='participant-status'),
    path('challenges/<uuid:challenge_id>/submit/', SubmissionCompatibilityView.as_view(), name='submission-compat-get'),
    path('submissions/mine/', MineSubmissionsView.as_view(), name='mine-submissions'),
    path('submissions/<uuid:submission_id>/score/', ScoreBreakdownView.as_view(), name='submission-score'),
    path('submissions/<uuid:submission_id>/votes/', VotesView.as_view(), name='votes'),
    path('submissions/<uuid:submission_id>/vote/', VotesView.as_view(), name='vote-compat'),
    path('submissions/<uuid:submission_id>/comments/', CommentsView.as_view(), name='comments'),
    path('submissions/<uuid:submission_id>/report/', ReportView.as_view(), name='report'),
    path('moderation/reports/', ReportsView.as_view(), name='reports'),
    path('moderation/reports/<uuid:report_id>/', ReportsView.as_view(), name='report-detail'),
    path('submissions/<uuid:submission_id>/verification/', VerificationView.as_view(), name='verification'),
    path('leaderboard/global/', GlobalLeaderboardView.as_view(), name='global-leaderboard'),
    path('', include(router.urls)),
    path('leaderboard/<uuid:challenge_id>/', ChallengeLeaderboardView.as_view(), name='challenge-leaderboard'),
    path('users/<uuid:user_id>/stats/', ProfileView.as_view(), name='profile'),
    path('users/by-username/<str:username>/stats/', ProfileByUsernameView.as_view(), name='profile-by-username'),
]
