import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserParticipations, fetchChallenge, fetchUserSubmissions } from '@/lib/api';
import type { Challenge, Submission, ParticipantStatus } from '@/types';
import { Loader2, TrendingUp, CheckCircle2, Clock, XCircle, Award } from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Map<string, Challenge>>(new Map());
  const [participations, setParticipations] = useState<{ challenge_id: string; status: string; joined_at: string }[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const parts = await getUserParticipations();
        setParticipations(parts);
        const subs = await fetchUserSubmissions();
        setSubmissions(subs);

        const challengeIds = [...new Set(parts.map((p) => p.challenge_id))];
        const challengeMap = new Map<string, Challenge>();
        for (const id of challengeIds) {
          const ch = await fetchChallenge(id);
          if (ch) challengeMap.set(id, ch);
        }
        setChallenges(challengeMap);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-slate-500 mb-4">Sign in to view your progress.</p>
        <button onClick={() => onNavigate('auth')} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium">
          Sign In
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const stats = {
    joined: participations.length,
    completed: participations.filter((p) => p.status === 'completed').length,
    inProgress: participations.filter((p) => p.status === 'joined' || p.status === 'in_progress').length,
    failed: participations.filter((p) => p.status === 'failed').length,
  };

  const completionPct = stats.joined > 0 ? Math.round((stats.completed / stats.joined) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">My Progress</h1>
      <p className="text-slate-500 text-sm mb-6">Track your challenge journey and stats.</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard icon={Award} label="Joined" value={stats.joined} color="emerald" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} color="blue" />
        <StatCard icon={Clock} label="In Progress" value={stats.inProgress} color="amber" />
        <StatCard icon={XCircle} label="Failed" value={stats.failed} color="rose" />
      </div>

      {/* Profile Stats */}
      {profile && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Average Score</p>
              <p className="text-xl font-bold text-slate-800">{Math.round(profile.average_score * 100) / 100}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Consistency Streak</p>
              <p className="text-xl font-bold text-slate-800 flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                {profile.consistency_streak}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Completion Rate</p>
              <p className="text-xl font-bold text-slate-800">{completionPct}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Submissions</p>
              <p className="text-xl font-bold text-slate-800">{submissions.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Challenge List */}
      <h2 className="text-lg font-semibold text-slate-700 mb-3">Your Challenges</h2>
      {participations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-400 text-sm">You haven't joined any challenges yet.</p>
          <button
            onClick={() => onNavigate('home')}
            className="mt-3 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
          >
            Browse Challenges
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {participations.map((p) => {
            const challenge = challenges.get(p.challenge_id);
            const submission = submissions.find((s) => s.challenge_id === p.challenge_id);
            if (!challenge) return null;
            return (
              <button
                key={p.challenge_id}
                onClick={() => onNavigate('challenge', { id: challenge.id })}
                className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <StatusIcon status={p.status as ParticipantStatus} />
                  <div>
                    <p className="font-medium text-slate-700">{challenge.title}</p>
                    <p className="text-xs text-slate-400">{challenge.category} · {challenge.difficulty_tier}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                    p.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                    p.status === 'joined' ? 'bg-amber-50 text-amber-600' :
                    p.status === 'failed' ? 'bg-rose-50 text-rose-600' :
                    'bg-slate-50 text-slate-500'
                  }`}>
                    {p.status}
                  </span>
                  {submission?.raw_performance_score !== null && submission?.raw_performance_score !== undefined && (
                    <p className="text-xs text-slate-400 mt-1">
                      Score: {Math.round(submission.raw_performance_score! * 100) / 100}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Award; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className={`w-9 h-9 rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: ParticipantStatus }) {
  const icons: Record<ParticipantStatus, typeof CheckCircle2> = {
    completed: CheckCircle2,
    joined: Clock,
    in_progress: Clock,
    failed: XCircle,
  };
  const colors: Record<ParticipantStatus, string> = {
    completed: 'text-emerald-500',
    joined: 'text-amber-500',
    in_progress: 'text-amber-500',
    failed: 'text-rose-500',
  };
  const Icon = icons[status];
  return <Icon className={`w-5 h-5 ${colors[status]}`} />;
}
