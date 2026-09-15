import type { Challenge, ChallengeLeaderboardEntry, Comment, LeaderboardEntry, Profile, Report, ScoreBreakdown, Submission, Vote } from '@/types';

// Always use the Vite same-origin proxy in local development. This prevents
// stale VITE_API_URL environment variables from sending requests to another project.
const API_URL = '/api';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
  const savedUser = localStorage.getItem('fairplay_user');
  if (savedUser) {
    try { headers.set('X-User-ID', (JSON.parse(savedUser) as { id: string }).id); } catch { localStorage.removeItem('fairplay_user'); }
  }
  const adminToken = localStorage.getItem('fairplay_admin_token');
  if (adminToken) headers.set('X-Admin-Token', adminToken);

  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(`${API_URL}${path}`, { ...options, headers });
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        let message = `Request failed (${response.status})`;
        if (contentType.includes('application/json')) {
          const error = await response.json().catch(() => null);
          if (error && typeof error === 'object') {
            const detail = (error as { detail?: unknown; error?: unknown; errors?: unknown }).detail ?? (error as { error?: unknown }).error;
            const errors = (error as { errors?: unknown }).errors;
            if (typeof detail === 'string') message = detail;
            else if (detail) message = JSON.stringify(detail);
            else if (errors) message = JSON.stringify(errors);
          }
        }
        throw new Error(message);
      }
      if (response.status === 204) return undefined as T;
      return response.json();
    } catch (error) {
      lastError = error;
      // A browser-level fetch failure usually means the API process is still starting
      // (or temporarily unavailable). Retry those failures; surface real HTTP errors immediately.
      if (error instanceof TypeError && attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Unable to reach the FairPlay API.');
}

export function fetchChallenges(section: 'active' | 'new' | 'popular' = 'active') { return apiRequest<Challenge[]>(`/challenges/?section=${section}`); }
export function fetchChallenge(id: string) { return apiRequest<Challenge>(`/challenges/${id}/`); }
export function createChallenge(challenge: Partial<Challenge>) { return apiRequest<Challenge>('/challenges/', { method: 'POST', body: JSON.stringify(challenge) }); }
export function updateChallenge(challengeId: string, challenge: Partial<Challenge>) { return apiRequest<Challenge>(`/challenges/${challengeId}/`, { method: 'PATCH', body: JSON.stringify(challenge) }); }
export async function joinChallenge(challengeId: string) { await apiRequest(`/challenges/${challengeId}/join/`, { method: 'POST' }); }
export async function leaveChallenge(challengeId: string) { await apiRequest(`/challenges/${challengeId}/participant-status/`, { method: 'DELETE' }); }
export async function getParticipantStatus(challengeId: string) { return (await apiRequest<{ status: string | null }>(`/challenges/${challengeId}/participant-status/`)).status; }
export async function getUserParticipations() { return apiRequest<{ challenge_id: string; status: string; joined_at: string }[]>('/participations/'); }
export function fetchSubmissions(challengeId: string) { return apiRequest<Submission[]>(`/challenges/${challengeId}/submit/`); }
export function fetchUserSubmissions() { return apiRequest<Submission[]>('/submissions/mine/'); }
export function submitProof(challengeId: string, payload: Record<string, unknown>, fileUrl?: string | null, fileHash?: string | null) { return apiRequest<Submission>(`/challenges/${challengeId}/submit/`, { method: 'POST', body: JSON.stringify({ submission_payload: payload, file_url: fileUrl, file_hash: fileHash }) }); }
export function getMySubmission(challengeId: string) { return fetchSubmissions(challengeId).then((submissions) => submissions[0] ?? null); }
export async function castVote(submissionId: string) { await apiRequest(`/submissions/${submissionId}/vote/`, { method: 'POST' }); }
export async function removeVote(submissionId: string) { await apiRequest(`/submissions/${submissionId}/vote/`, { method: 'DELETE' }); }
export async function getVotesForSubmission(submissionId: string): Promise<Vote[]> { return apiRequest<Vote[]>(`/submissions/${submissionId}/votes/`); }
export async function hasVoted(submissionId: string) {
  const savedUser = localStorage.getItem('fairplay_user');
  return savedUser ? (await getVotesForSubmission(submissionId)).some((vote) => vote.voter_id === (JSON.parse(savedUser) as { id: string }).id) : false;
}
export async function getVoteCount(submissionId: string) { return (await getVotesForSubmission(submissionId)).length; }
export function fetchComments(submissionId: string): Promise<(Comment & { username: string; avatar_url: string | null })[]> { return apiRequest(`/submissions/${submissionId}/comments/`); }
export async function addComment(submissionId: string, text: string) { await apiRequest(`/submissions/${submissionId}/comments/`, { method: 'POST', body: JSON.stringify({ text }) }); }
export async function reportSubmission(submissionId: string, reason: string) { await apiRequest(`/submissions/${submissionId}/report/`, { method: 'POST', body: JSON.stringify({ reason }) }); }
export function fetchReports() { return apiRequest<(Report & { username: string; submission_payload: Record<string, unknown> })[]>('/moderation/reports/'); }
export async function updateReportStatus(reportId: string, status: 'reviewed' | 'resolved' | 'dismissed') { await apiRequest(`/moderation/reports/${reportId}/`, { method: 'PATCH', body: JSON.stringify({ status }) }); }
export async function updateSubmissionVerification(submissionId: string, status: 'verified' | 'rejected' | 'flagged') { await apiRequest(`/submissions/${submissionId}/verification/`, { method: 'PATCH', body: JSON.stringify({ status }) }); }
export async function fetchGlobalLeaderboard(limit = 50) { return (await apiRequest<LeaderboardEntry[]>(`/leaderboard/global/?limit=${limit}`)).slice(0, limit); }
export function fetchChallengeLeaderboard(challengeId: string) { return apiRequest<ChallengeLeaderboardEntry[]>(`/leaderboard/${challengeId}/`); }
export function fetchScoreBreakdown(submissionId: string) { return apiRequest<ScoreBreakdown | null>(`/submissions/${submissionId}/score/`).catch((error: Error) => { if (error.message.includes('(404)')) return null; throw error; }); }
export async function recomputeScores() { return apiRequest<{ recomputed: number }>('/scores/recompute/', { method: 'POST' }); }
export function fetchProfile(userId: string) { return apiRequest<Profile>(`/users/${userId}/stats/`); }
export async function updateProfile(updates: Partial<Profile>) { await apiRequest(`/users/${updates.id}/stats/`, { method: 'PATCH', body: JSON.stringify(updates) }); }
export function fetchProfileByUsername(username: string) { return apiRequest<Profile>(`/users/by-username/${encodeURIComponent(username)}/stats/`); }