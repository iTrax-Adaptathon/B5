import { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, BarChart3, CalendarDays, CheckCircle2, LogOut, ShieldAlert, Sparkles, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import '@/styles/admin.css';

const API_URL = '/api';

interface AdminPageProps { onNavigate: (page: string, params?: Record<string, string>) => void; }
interface DashboardData { challenge_count: number; submission_count: number; open_anomaly_count: number; recent_events: { event_type: string; actor_id: string | null; created_at: string; metadata: Record<string, unknown> }[]; }
interface ParticipantRecord { user_id: string; username: string; bio: string; status: string; joined_at: string; submitted: boolean; merit_score: number | null; }
interface ParticipationGroup { challenge_id: string; title: string; points: number; difficulty: number; participant_count: number; participants: ParticipantRecord[]; }

export function AdminPage({ onNavigate }: AdminPageProps) {
  const { adminUsername, adminLogout } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [participation, setParticipation] = useState<ParticipationGroup[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminUsername) return;
    const headers = { 'X-Admin-Token': localStorage.getItem('fairplay_admin_token') ?? '' };
    fetch(`${API_URL}/admin/dashboard/`, { headers }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || 'Administrator access denied');
      setData(body);
    }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Administrator access denied'));
    fetch(`${API_URL}/admin/participation/`, { headers }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || 'Unable to load participation data');
      setParticipation(body);
      setSelectedChallenge((current) => current || body[0]?.challenge_id || '');
    }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load participation data'));
  }, [adminUsername]);

  const selectedGroup = participation.find((group) => group.challenge_id === selectedChallenge);
  const totalParticipants = participation.reduce((total, group) => total + group.participant_count, 0);

  return (
    <div className="admin-shell min-h-screen pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <section className="admin-hero relative overflow-hidden rounded-[2rem] min-h-[270px] flex items-end p-7 sm:p-10 text-white shadow-2xl">
          <div className="absolute inset-0 admin-grid opacity-30" />
          <div className="relative z-10 max-w-2xl"><div className="flex items-center gap-2 text-teal-200 text-xs uppercase tracking-[0.24em] admin-mono mb-4"><Sparkles className="w-4 h-4" /> Operations / FairPlay</div><h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[0.95]">The merit<br />control room.</h1><p className="mt-5 text-slate-300 max-w-lg">See participation pulse, scoring activity, and platform health at a glance.</p></div>
          <div className="relative z-10 ml-auto hidden sm:flex flex-col items-end gap-3 text-right"><span className="text-xs text-slate-400 uppercase tracking-widest">Authenticated operator</span><strong className="text-lg">{adminUsername}</strong><button className="inline-flex items-center gap-2 text-sm text-teal-200 hover:text-white" onClick={() => { adminLogout(); onNavigate('home'); }}><LogOut className="w-4 h-4" /> Sign out</button></div>
        </section>
        <div className="flex items-center justify-between mt-7 mb-4"><div><p className="admin-mono text-xs uppercase tracking-[0.2em] text-teal-700">Live overview</p><h2 className="text-2xl font-bold text-slate-900">Platform pulse</h2></div><button className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-teal-800 transition-colors" onClick={() => onNavigate('create')}>Post challenge</button></div>
        {error && <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {data && <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"><MetricTile icon={BarChart3} label="Challenges live" value={data.challenge_count} tone="teal" /><MetricTile icon={Activity} label="Proof submissions" value={data.submission_count} tone="blue" /><MetricTile icon={ShieldAlert} label="Open anomaly flags" value={data.open_anomaly_count} tone="amber" /></div>
          <div className="grid grid-cols-1 xl:grid-cols-[0.72fr_1.28fr] gap-6">
            <section className="admin-tile bg-white/90 border border-white rounded-[1.5rem] p-6"><div className="flex items-start justify-between mb-5"><div><p className="admin-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">Signal feed</p><h2 className="text-lg font-bold text-slate-900 mt-1">Recent audit events</h2></div><ArrowUpRight className="w-5 h-5 text-teal-600" /></div><div className="space-y-1">{data.recent_events.length ? data.recent_events.map((event, index) => <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0" key={`${event.event_type}-${index}`}><span className="w-2 h-2 rounded-full bg-teal-400 ring-4 ring-teal-50" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-700 truncate">{event.event_type.replace(/_/g, ' ')}</p><p className="text-xs text-slate-400">{event.actor_id ? `actor ${event.actor_id.slice(0, 8)}` : 'system event'}</p></div><time className="text-[11px] text-slate-400 whitespace-nowrap">{new Date(event.created_at).toLocaleDateString()}</time></div>) : <p className="text-sm text-slate-400 py-8 text-center">No audit events yet.</p>}</div></section>
            <section className="admin-tile bg-white/90 border border-white rounded-[1.5rem] p-6"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6"><div><p className="admin-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">Event intelligence</p><h2 className="text-lg font-bold text-slate-900 mt-1">Participation by challenge</h2></div><div className="flex items-center gap-2 text-xs text-slate-500"><Users className="w-4 h-4 text-teal-600" /> {totalParticipants} total participants</div></div><select value={selectedChallenge} onChange={(event) => setSelectedChallenge(event.target.value)} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-teal-400 mb-5"><option value="">Select a challenge</option>{participation.map((group) => <option key={group.challenge_id} value={group.challenge_id}>{group.title}</option>)}</select>{selectedGroup ? <><div className="grid grid-cols-3 gap-2 mb-5"><MiniStat label="Points" value={selectedGroup.points} /><MiniStat label="Difficulty" value={`${selectedGroup.difficulty}/5`} /><MiniStat label="People" value={selectedGroup.participant_count} /></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-200"><th className="py-3 pr-4">Participant</th><th className="py-3 pr-4">Status</th><th className="py-3 pr-4">Joined</th><th className="py-3">Proof</th></tr></thead><tbody>{selectedGroup.participants.map((participant) => <tr key={participant.user_id} className="admin-table-row border-b border-slate-100 last:border-0"><td className="py-3 pr-4"><p className="font-semibold text-slate-700">{participant.username}</p><p className="text-xs text-slate-400 truncate max-w-[180px]">{participant.bio || participant.user_id}</p></td><td className="py-3 pr-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-600">{participant.status.replace('_', ' ')}</span></td><td className="py-3 pr-4 text-xs text-slate-500">{new Date(participant.joined_at).toLocaleDateString()}</td><td className="py-3">{participant.submitted ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600"><CheckCircle2 className="w-3.5 h-3.5" /> Submitted{participant.merit_score !== null ? ` · ${participant.merit_score.toFixed(1)}` : ''}</span> : <span className="text-xs font-semibold text-amber-600">In progress</span>}</td></tr>)}</tbody></table></div></> : <div className="rounded-2xl bg-slate-50 border border-dashed border-slate-200 py-12 text-center"><CalendarDays className="w-7 h-7 text-teal-500 mx-auto mb-2" /><p className="text-sm font-semibold text-slate-600">No participation data yet</p><p className="text-xs text-slate-400 mt-1">Challenge activity will appear here.</p></div>}</section>
          </div>
        </>}
      </div>
    </div>
  );
}

function MetricTile({ icon: Icon, label, value, tone }: { icon: typeof Activity; label: string; value: number; tone: 'teal' | 'blue' | 'amber' }) { const styles = { teal: 'bg-teal-50 text-teal-700 ring-teal-100', blue: 'bg-blue-50 text-blue-700 ring-blue-100', amber: 'bg-amber-50 text-amber-700 ring-amber-100' }[tone]; return <div className="admin-tile bg-white/90 border border-white rounded-[1.5rem] p-5 flex items-center gap-4"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center ring-8 ${styles}`}><Icon className="w-5 h-5" /></div><div><p className="text-xs uppercase tracking-widest text-slate-400 admin-mono">{label}</p><p className="text-3xl font-bold text-slate-900 mt-1">{value}</p></div></div>; }
function MiniStat({ label, value }: { label: string; value: number | string }) { return <div className="rounded-xl bg-slate-50 border border-slate-100 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p><p className="text-lg font-bold text-slate-800 mt-1">{value}</p></div>; }
