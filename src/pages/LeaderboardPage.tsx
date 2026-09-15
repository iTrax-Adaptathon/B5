import { useEffect, useState } from 'react';
import { fetchGlobalLeaderboard, fetchChallenges, fetchChallengeLeaderboard } from '@/lib/api';
import type { LeaderboardEntry, ChallengeLeaderboardEntry, Challenge } from '@/types';
import { ScoreBreakdown } from '@/components/ScoreBreakdown';
import { Loader2, Trophy, Medal, Crown, TrendingUp, Award, Search } from 'lucide-react';

interface LeaderboardPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function LeaderboardPage({ onNavigate }: LeaderboardPageProps) {
  const [mode, setMode] = useState<'global' | 'challenge'>('global');
  const [globalLb, setGlobalLb] = useState<LeaderboardEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<string>('');
  const [challengeLb, setChallengeLb] = useState<ChallengeLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [lb, chs] = await Promise.all([
          fetchGlobalLeaderboard(50),
          fetchChallenges('active'),
        ]);
        setGlobalLb(lb);
        setChallenges(chs);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (mode === 'challenge' && selectedChallenge) {
      (async () => {
        setLoading(true);
        try {
          const lb = await fetchChallengeLeaderboard(selectedChallenge);
          setChallengeLb(lb);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [mode, selectedChallenge]);

  if (loading && globalLb.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="w-6 h-6 text-emerald-600" />
        <h1 className="text-2xl font-bold text-slate-800">Leaderboard</h1>
      </div>
      <p className="text-slate-500 text-sm mb-6">
        Ranked by Final Score — a fair formula combining performance, difficulty, verification, and consistency. Not popularity.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-4 max-w-xs">
        <button
          onClick={() => setMode('global')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
            mode === 'global' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          Global
        </button>
        <button
          onClick={() => setMode('challenge')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
            mode === 'challenge' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          Per Challenge
        </button>
      </div>

      {mode === 'challenge' && (
        <div className="mb-4">
          <select
            value={selectedChallenge}
            onChange={(e) => setSelectedChallenge(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400 bg-white"
          >
            <option value="">Select a challenge...</option>
            {challenges.map((ch) => (
              <option key={ch.id} value={ch.id}>{ch.title}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Global Leaderboard */}
      {mode === 'global' && (
        <div className="space-y-2">
          {globalLb.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No scores yet. Join challenges and submit proof to appear here!</p>
            </div>
          ) : (
            globalLb.map((entry) => (
              <div
                key={entry.user_id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  entry.rank === 1 ? 'bg-amber-50 border-amber-200' :
                  entry.rank === 2 ? 'bg-slate-50 border-slate-200' :
                  entry.rank === 3 ? 'bg-orange-50 border-orange-200' :
                  'bg-white border-slate-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  entry.rank === 1 ? 'bg-amber-200 text-amber-800' :
                  entry.rank === 2 ? 'bg-slate-200 text-slate-700' :
                  entry.rank === 3 ? 'bg-orange-200 text-orange-800' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {entry.rank === 1 ? <Crown className="w-5 h-5" /> : entry.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{entry.username}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {entry.challenges_completed} completed
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {entry.consistency_streak} streak
                    </span>
                    <span>{entry.submission_count} submissions</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-slate-800">{entry.total_score}</p>
                  <p className="text-xs text-slate-400">total score</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Challenge Leaderboard */}
      {mode === 'challenge' && (
        <div className="space-y-3">
          {!selectedChallenge ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Select a challenge above to see its leaderboard.</p>
            </div>
          ) : challengeLb.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <Medal className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No submissions scored yet for this challenge.</p>
            </div>
          ) : (
            challengeLb.map((entry) => (
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
    </div>
  );
}
