import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchChallenge, joinChallenge, leaveChallenge, getParticipantStatus,
  fetchSubmissions, submitProof, getMySubmission, castVote, removeVote,
  hasVoted, getVoteCount, fetchComments, addComment, fetchScoreBreakdown,
  fetchChallengeLeaderboard,
} from '@/lib/api';
import type { Challenge, Submission, ChallengeLeaderboardEntry, ScoreBreakdown as ScoreBreakdownType } from '@/types';
import { ScoreBreakdown } from '@/components/ScoreBreakdown';
import { ReportModal } from '@/components/ReportModal';
import {
  ArrowLeft, Users, Clock, Lock, Loader2, CheckCircle2, Circle, Heart,
  MessageCircle, Flag, Trophy, Send, X, Upload, Share2, Pencil,
} from 'lucide-react';

interface ChallengeDetailPageProps {
  challengeId: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function ChallengeDetailPage({ challengeId, onNavigate }: ChallengeDetailPageProps) {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantStatus, setParticipantStatus] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [leaderboard, setLeaderboard] = useState<ChallengeLeaderboardEntry[]>([]);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'submissions' | 'leaderboard'>('submissions');
  const [reportTarget, setReportTarget] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, [challengeId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const ch = await fetchChallenge(challengeId);
      setChallenge(ch);
      if (ch && user) {
        const status = await getParticipantStatus(challengeId);
        setParticipantStatus(status);
        const subs = await fetchSubmissions(challengeId);
        setSubmissions(subs);
        const mySub = await getMySubmission(challengeId);
        setMySubmission(mySub);
        const lb = await fetchChallengeLeaderboard(challengeId).catch(() => []);
        setLeaderboard(lb);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    try {
      await joinChallenge(challengeId);
      setParticipantStatus('joined');
      loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveChallenge(challengeId);
      setParticipantStatus(null);
      loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500">Challenge not found.</p>
        <button onClick={() => onNavigate('home')} className="mt-4 text-emerald-600 hover:underline">
          Back to challenges
        </button>
      </div>
    );
  }

  const isCreator = user?.id === challenge.creator_id;
  const hasJoined = participantStatus !== null;
  const hasSubmitted = mySubmission !== null;
  const deadline = challenge.deadline ? new Date(challenge.deadline) : null;
  const isExpired = Boolean(deadline && deadline < new Date());

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <button
        onClick={() => onNavigate('home')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Challenge Header */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {challenge.category}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {challenge.difficulty_tier} ({challenge.difficulty_weight}x) · {challenge.points} points
              </span>
              {challenge.requires_verification && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                  <Lock className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-2">{challenge.title}</h1>
          <p className="text-slate-600 mb-4">{challenge.description}</p>

          {challenge.rules && (
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Rules</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{challenge.rules}</p>
            </div>
          )}

          <button onClick={async()=>{const url=`${window.location.origin}/challenge?id=${challenge.id}`; try{await navigator.clipboard.writeText(url); alert('Invite link copied. Send it to your friends.');}catch{window.prompt('Copy this invite link:',url);}}} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"><Share2 className="w-3.5 h-3.5"/> Invite friends</button>
          {isCreator && (
            <button onClick={() => onNavigate('edit-challenge', { id: challenge.id })} className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"><Pencil className="w-3.5 h-3.5"/> Edit challenge</button>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {challenge.participant_count} participants
            </span>
            {deadline && (
              <span className={`flex items-center gap-1.5 ${isExpired ? 'text-red-500' : ''}`}>
                <Clock className="w-4 h-4" />
                {isExpired ? 'Ended' : `Due ${deadline.toLocaleDateString()}`}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              Submission: {challenge.submission_type}
            </span>
          </div>

          {challenge.benchmark_value && (
            <div className="mt-3 text-sm text-slate-500">
              Benchmark: {challenge.benchmark_value} {challenge.benchmark_unit ?? ''}
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          {!user ? (
            <button
              onClick={() => onNavigate('auth')}
              className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
            >
              Sign in to participate
            </button>
          ) : hasSubmitted ? (
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-medium py-1">
              <CheckCircle2 className="w-5 h-5" />
              Submission complete — {mySubmission?.verification_status}
            </div>
          ) : hasJoined ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowSubmitForm(true)}
                disabled={isExpired}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExpired ? 'Challenge Ended' : 'Submit Proof'}
              </button>
              <button
                onClick={handleLeave}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-100"
              >
                Leave
              </button>
            </div>
          ) : (
            <div>
              {isCreator && (
                <p className="text-center text-xs text-slate-500 mb-2">
                  You created this challenge. You can also enroll as a participant.
                </p>
              )}
              <button
                onClick={handleJoin}
                disabled={isExpired}
                className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {isExpired ? 'Challenge Ended' : isCreator ? 'Enroll in Your Challenge' : 'Join Challenge'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-4 max-w-xs">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'submissions' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          Submissions
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'leaderboard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          Leaderboard
        </button>
      </div>

      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Circle className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No submissions yet. Be the first!</p>
            </div>
          ) : (
            submissions.map((sub) => (
              <SubmissionCard
                key={sub.id}
                submission={sub}
                challenge={challenge}
                currentUserId={user?.id ?? ''}
                onReport={setReportTarget}
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="space-y-3">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Trophy className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No leaderboard entries yet. Scores compute after submissions are verified.</p>
            </div>
          ) : (
            leaderboard.map((entry) => (
              <div key={entry.submission_id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      entry.rank === 1 ? 'bg-amber-100 text-amber-700' :
                      entry.rank === 2 ? 'bg-slate-100 text-slate-600' :
                      entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-50 text-slate-400'
                    }`}>
                      {entry.rank}
                    </span>
                    <div>
                      <p className="font-medium text-slate-700">{entry.username}</p>
                      <span className={`text-xs ${
                        entry.verification_status === 'verified' ? 'text-emerald-600' :
                        entry.verification_status === 'pending' ? 'text-amber-600' :
                        'text-slate-400'
                      }`}>
                        {entry.verification_status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-800">{Math.round(entry.final_score * 100) / 100}</p>
                    <p className="text-xs text-slate-400">final score</p>
                  </div>
                </div>
                <ScoreBreakdown breakdown={entry.breakdown} finalScore={entry.final_score} />
              </div>
            ))
          )}
        </div>
      )}

      {/* Submit Form Modal */}
      {showSubmitForm && challenge && (
        <SubmitForm
          challenge={challenge}
          onClose={() => setShowSubmitForm(false)}
          onSubmitted={() => { setShowSubmitForm(false); loadAll(); }}
        />
      )}

      {/* Report Modal */}
      {reportTarget && (
        <ReportModal submissionId={reportTarget} onClose={() => setReportTarget(null)} />
      )}
    </div>
  );
}

// ============================================================
// SUBMISSION CARD
// ============================================================

interface SubmissionCardProps {
  submission: Submission;
  challenge: Challenge;
  currentUserId: string;
  onReport: (id: string) => void;
}

function SubmissionCard({ submission, challenge, currentUserId, onReport }: SubmissionCardProps) {
  const [voted, setVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<{ id: string; text: string; username: string; avatar_url: string | null }[]>([]);
  const [newComment, setNewComment] = useState('');
  const [breakdown, setBreakdown] = useState<ScoreBreakdownType | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const isOwn = submission.user_id === currentUserId;

  useEffect(() => {
    if (!isOwn) hasVoted(submission.id).then(setVoted).catch(() => {});
    getVoteCount(submission.id).then(setVoteCount).catch(() => {});
  }, [submission.id, isOwn]);

  const handleVote = async () => {
    if (voted) {
      await removeVote(submission.id);
      setVoted(false);
      setVoteCount((c) => c - 1);
    } else {
      try {
        await castVote(submission.id);
        setVoted(true);
        setVoteCount((c) => c + 1);
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Vote failed');
      }
    }
  };

  const handleLoadBreakdown = async () => {
    if (breakdown) return;
    setLoadingBreakdown(true);
    try {
      const b = await fetchScoreBreakdown(submission.id);
      setBreakdown(b);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const handleLoadComments = async () => {
    if (!showComments && comments.length === 0) {
      const c = await fetchComments(submission.id).catch(() => []);
      setComments(c);
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addComment(submission.id, newComment.trim());
    setNewComment('');
    const c = await fetchComments(submission.id).catch(() => []);
    setComments(c);
  };

  const renderPayload = () => {
    const payload = submission.submission_payload;
    switch (challenge.submission_type) {
      case 'numeric':
        return <p className="text-sm text-slate-600">Result: <span className="font-semibold">{String(payload.value ?? payload.numeric_value ?? 'N/A')}</span> {challenge.benchmark_unit ?? ''}</p>;
      case 'text':
        return <p className="text-sm text-slate-600 whitespace-pre-wrap">{String(payload.text ?? '')}</p>;
      case 'quiz':
        return <p className="text-sm text-slate-600">Quiz submitted with {((payload.answers as unknown[]) ?? []).length} answers</p>;
      case 'checklist':
        const items = (payload.checklist as boolean[]) ?? [];
        return (
          <div className="space-y-1">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                {item ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300" />}
                Item {i + 1}
              </div>
            ))}
          </div>
        );
      case 'photo':
      case 'video':
      case 'file':
        return submission.file_url ? (
          challenge.submission_type === 'photo' ? (
            <img src={submission.file_url} alt="Proof" className="rounded-lg max-h-64 object-cover" />
          ) : (
            <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:underline flex items-center gap-1">
              <Upload className="w-4 h-4" />
              View proof file
            </a>
          )
        ) : <p className="text-sm text-slate-400">No file attached</p>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
            submission.verification_status === 'verified' ? 'bg-emerald-50 text-emerald-600' :
            submission.verification_status === 'pending' ? 'bg-amber-50 text-amber-600' :
            submission.verification_status === 'flagged' ? 'bg-red-50 text-red-600' :
            'bg-slate-50 text-slate-500'
          }`}>
            {submission.verification_status}
          </span>
          {submission.raw_performance_score !== null && (
            <span className="text-sm font-semibold text-slate-700">
              Score: {Math.round(submission.raw_performance_score * 100) / 100}
            </span>
          )}
        </div>
        {!isOwn && (
          <button
            onClick={() => onReport(submission.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
            title="Report"
          >
            <Flag className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mb-3">
        {renderPayload()}
      </div>

      {submission.file_hash && (
        <p className="text-xs text-slate-400 mb-2">File hash: {submission.file_hash.substring(0, 16)}...</p>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        {!isOwn ? (
          <button
            onClick={handleVote}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              voted ? 'text-rose-500' : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            <Heart className={`w-4 h-4 ${voted ? 'fill-rose-500' : ''}`} />
            {voteCount}
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-sm text-slate-300">
            <Heart className="w-4 h-4" />
            {voteCount}
          </span>
        )}
        <button
          onClick={handleLoadComments}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600"
        >
          <MessageCircle className="w-4 h-4" />
          Comment
        </button>
        <button
          onClick={handleLoadBreakdown}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 ml-auto"
        >
          <Trophy className="w-4 h-4" />
          Score Breakdown
        </button>
      </div>

      {loadingBreakdown && (
        <div className="flex items-center gap-2 mt-3 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading score breakdown...
        </div>
      )}

      {breakdown && (
        <div className="mt-3">
          <ScoreBreakdown
            breakdown={{
              performance_normalized: breakdown.performance_normalized,
              difficulty_weight: breakdown.difficulty_weight,
              completion_factor: breakdown.completion_factor,
              verification_factor: breakdown.verification_factor,
              consistency_bonus: breakdown.consistency_bonus,
              community_signal_capped: breakdown.community_signal_capped,
              details: breakdown.breakdown,
            }}
            finalScore={breakdown.final_score}
          />
        </div>
      )}

      {showComments && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 flex-shrink-0">
                {c.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <span className="text-xs font-medium text-slate-600">{c.username}</span>
                <p className="text-sm text-slate-600">{c.text}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400"
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            />
            <button
              onClick={handleAddComment}
              className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SUBMIT FORM
// ============================================================

interface SubmitFormProps {
  challenge: Challenge;
  onClose: () => void;
  onSubmitted: () => void;
}

function SubmitForm({ challenge, onClose, onSubmitted }: SubmitFormProps) {
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      setFileUrl(URL.createObjectURL(file));

      const buf = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
      setFileHash(hashHex);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await submitProof(challenge.id, payload, fileUrl, fileHash);
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const renderForm = () => {
    switch (challenge.submission_type) {
      case 'numeric':
        return (
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">
              Your Result {challenge.benchmark_unit ? `(${challenge.benchmark_unit})` : ''}
            </label>
            <input
              type="number"
              step="any"
              placeholder="Enter your result"
              onChange={(e) => setPayload({ ...payload, value: parseFloat(e.target.value) })}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400"
            />
            {challenge.benchmark_value && (
              <p className="text-xs text-slate-400 mt-1">Benchmark to beat: {challenge.benchmark_value} {challenge.benchmark_unit ?? ''}</p>
            )}
          </div>
        );
      case 'text':
        return (
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Your Submission</label>
            <textarea
              rows={5}
              placeholder="Write your submission..."
              onChange={(e) => setPayload({ ...payload, text: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400 resize-none"
            />
          </div>
        );
      case 'quiz':
        const answerKey = (challenge.evaluation_criteria.answer_key as unknown[]) ?? [];
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 block">Answer each question:</label>
            {answerKey.map((_, i) => (
              <input
                key={i}
                type="text"
                placeholder={`Answer ${i + 1}`}
                onChange={(e) => {
                  const answers = [...((payload.answers as string[]) ?? [])];
                  answers[i] = e.target.value;
                  setPayload({ ...payload, answers });
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400"
              />
            ))}
          </div>
        );
      case 'checklist':
        const items = (challenge.evaluation_criteria.checklist_items as string[]) ?? ['Item 1', 'Item 2', 'Item 3'];
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 block">Check off completed items:</label>
            {items.map((item, i) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    const checklist = [...((payload.checklist as boolean[]) ?? [])];
                    checklist[i] = e.target.checked;
                    setPayload({ ...payload, checklist });
                  }}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-400"
                />
                <span className="text-sm text-slate-600">{item}</span>
              </label>
            ))}
          </div>
        );
      case 'photo':
      case 'video':
      case 'file':
        return (
          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Upload Proof</label>
            <input
              type="file"
              accept={challenge.submission_type === 'photo' ? 'image/*' : challenge.submission_type === 'video' ? 'video/*' : '*/*'}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:font-medium hover:file:bg-emerald-100"
            />
            {uploading && <p className="text-xs text-slate-400 mt-1">Uploading...</p>}
            {fileUrl && <p className="text-xs text-emerald-600 mt-1">File uploaded</p>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="font-semibold text-slate-800">Submit Proof</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm font-medium text-slate-700">{challenge.title}</p>
            <p className="text-xs text-slate-500">Submission type: {challenge.submission_type}</p>
          </div>
          {renderForm()}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
