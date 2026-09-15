import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchProfile, updateProfile, fetchUserSubmissions, fetchChallenge } from '@/lib/api';
import type { Profile, Submission, Challenge } from '@/types';
import { Loader2, User, Edit2, Check, X, Award, TrendingUp, Target, Calendar } from 'lucide-react';

interface ProfilePageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [submissions, setSubmissions] = useState<(Submission & { challenge?: Challenge })[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await Promise.race([
          fetchProfile(user.id),
          new Promise<null>((_, reject) => {
            window.setTimeout(() => reject(new Error('Profile request timed out.')), 5000);
          }),
        ]);
        if (!p) throw new Error('Profile data was not found.');
        setProfile(p);
        setUsername(p?.username ?? '');
        setBio(p?.bio ?? '');
        setAvatarUrl(p?.avatar_url ?? '');
        setLoading(false);

        try {
          const subs = await fetchUserSubmissions();
          const enriched = await Promise.all(
            subs.map(async (s) => {
              try {
                const ch = await fetchChallenge(s.challenge_id);
                return { ...s, challenge: ch ?? undefined };
              } catch {
                return { ...s, challenge: undefined };
              }
            })
          );
          setSubmissions(enriched);
        } catch (error) {
          console.error('Unable to load profile submissions', error);
          setSubmissions([]);
        }
      } catch (e) {
        console.error(e);
        const fallbackProfile: Profile = {
          id: user.id,
          username: user.email.split('@')[0] || 'Profile',
          avatar_url: null,
          bio: '',
          is_moderator: false,
          challenges_joined: 0,
          challenges_completed: 0,
          challenges_in_progress: 0,
          challenges_failed: 0,
          average_score: 0,
          consistency_streak: 0,
          created_at: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
        setUsername(fallbackProfile.username);
        setBio(fallbackProfile.bio);
        setAvatarUrl('');
        setError(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSave = async () => {
    if (!profile) return;
    try {
      await updateProfile({ id: profile.id, username, bio, avatar_url: avatarUrl });
      const updated = await fetchProfile(profile.id);
      setProfile(updated);
      setEditing(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update profile');
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-slate-500 mb-4">Sign in to view your profile.</p>
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

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-slate-500 mb-4">{error ?? 'Unable to load your profile.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
        <div className="h-24 bg-gradient-to-r from-emerald-400 to-teal-500" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="flex items-end gap-4">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full border-4 border-white object-cover shadow-sm" />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-white bg-emerald-100 flex items-center justify-center shadow-sm">
                  <User className="w-10 h-10 text-emerald-500" />
                </div>
              )}
            </div>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Bio</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Avatar URL</label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-800">{profile.username}</h1>
              <p className="text-sm text-slate-500 mt-1">{profile.bio || 'No bio yet'}</p>
              {profile.is_moderator && (
                <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-xs font-medium bg-violet-50 text-violet-600">
                  Moderator
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatBox icon={Award} label="Completed" value={profile.challenges_completed} />
        <StatBox icon={Target} label="Avg Score" value={Math.round(profile.average_score * 100) / 100} />
        <StatBox icon={TrendingUp} label="Streak" value={profile.consistency_streak} />
        <StatBox icon={Calendar} label="Joined" value={profile.challenges_joined} />
      </div>

      {/* Recent Submissions */}
      <h2 className="text-lg font-semibold text-slate-700 mb-3">Recent Submissions</h2>
      {submissions.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl border border-slate-200">
          <p className="text-sm text-slate-400">No submissions yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {submissions.slice(0, 10).map((s) => (
            <button
              key={s.id}
              onClick={() => s.challenge && onNavigate('challenge', { id: s.challenge.id })}
              className="w-full flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all text-left"
            >
              <div>
                <p className="text-sm font-medium text-slate-700">{s.challenge?.title ?? 'Unknown challenge'}</p>
                <p className="text-xs text-slate-400">{new Date(s.submitted_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-md ${
                  s.verification_status === 'verified' ? 'bg-emerald-50 text-emerald-600' :
                  s.verification_status === 'pending' ? 'bg-amber-50 text-amber-600' :
                  s.verification_status === 'flagged' ? 'bg-red-50 text-red-600' :
                  'bg-slate-50 text-slate-500'
                }`}>
                  {s.verification_status}
                </span>
                {s.raw_performance_score !== null && (
                  <span className="text-sm font-semibold text-slate-700">
                    {Math.round(s.raw_performance_score * 100) / 100}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBox({ icon: Icon, label, value }: { icon: typeof Award; label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center mb-2">
        <Icon className="w-4 h-4 text-emerald-600" />
      </div>
      <p className="text-xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
