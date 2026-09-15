import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchChallenge, updateChallenge } from '@/lib/api';
import type { Challenge, ChallengeCategory, DifficultyTier, SubmissionType } from '@/types';
import { DIFFICULTY_WEIGHTS } from '@/types';
import { Loader2, ArrowLeft, Save, AlertCircle } from 'lucide-react';

interface Props { challengeId: string; onNavigate: (page: string, params?: Record<string, string>) => void; }
const categories: ChallengeCategory[] = ['Fitness','Coding','Photography','Community','Art','Study','Custom'];
const submissionTypes: SubmissionType[] = ['numeric','text','photo','video','file','quiz','checklist'];
const difficulties: DifficultyTier[] = ['Easy','Medium','Hard','Expert'];

export function EditChallengePage({ challengeId, onNavigate }: Props) {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [category, setCategory] = useState<ChallengeCategory>('Custom');
  const [difficulty, setDifficulty] = useState<DifficultyTier>('Medium');
  const [points, setPoints] = useState('100');
  const [submissionType, setSubmissionType] = useState<SubmissionType>('text');
  const [deadline, setDeadline] = useState('');
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [benchmarkValue, setBenchmarkValue] = useState('');
  const [benchmarkUnit, setBenchmarkUnit] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchChallenge(challengeId).then((c) => {
      setChallenge(c); setTitle(c.title); setDescription(c.description || ''); setRules(c.rules || '');
      setCategory(c.category); setDifficulty(c.difficulty_tier); setPoints(String(c.points));
      setSubmissionType(c.submission_type); setRequiresVerification(c.requires_verification);
      setBenchmarkValue(c.benchmark_value == null ? '' : String(c.benchmark_value));
      setBenchmarkUnit(c.benchmark_unit || '');
      if (c.deadline) { const d = new Date(c.deadline); setDeadline(new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16)); }
    }).catch((e) => setError(e instanceof Error ? e.message : 'Failed to load challenge'));
  }, [challengeId]);

  if (!challenge) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  if (!user || String(user.id) !== String(challenge.creator_id)) return <div className="max-w-xl mx-auto px-4 py-16 text-center"><p className="text-slate-500">Only the challenge creator can edit this challenge.</p><button className="mt-4 text-emerald-600" onClick={() => onNavigate('challenge',{id:challengeId})}>Back to challenge</button></div>;

  const save = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError(null);
    try {
      const updated = await updateChallenge(challengeId, {
        title: title.trim(), description: description.trim(), rules: rules.trim(), category,
        difficulty_tier: difficulty, difficulty_weight: DIFFICULTY_WEIGHTS[difficulty], points: Math.max(1, Number(points) || 1),
        submission_type: submissionType, evaluation_criteria: challenge.evaluation_criteria,
        benchmark_value: benchmarkValue ? Number(benchmarkValue) : null, benchmark_unit: benchmarkUnit || null,
        deadline: deadline ? new Date(deadline).toISOString() : null, requires_verification: requiresVerification,
      });
      onNavigate('challenge', { id: updated.id });
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save challenge'); }
    finally { setSaving(false); }
  };

  return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
    <button onClick={() => onNavigate('challenge',{id:challengeId})} className="flex items-center gap-2 text-sm text-slate-500 mb-5"><ArrowLeft className="w-4 h-4"/> Back</button>
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
      <div><h1 className="text-2xl font-bold text-slate-800">Edit Challenge</h1><p className="text-sm text-slate-500">Update the challenge details without creating a new challenge.</p></div>
      {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex gap-2"><AlertCircle className="w-4 h-4 mt-0.5"/>{error}</div>}
      <label className="block text-sm font-medium text-slate-600">Title<input value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200"/></label>
      <label className="block text-sm font-medium text-slate-600">Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200"/></label>
      <label className="block text-sm font-medium text-slate-600">Rules<textarea value={rules} onChange={e=>setRules(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200"/></label>
      <div><p className="text-sm font-medium text-slate-600 mb-2">Category</p><div className="flex flex-wrap gap-2">{categories.map(x=><button key={x} onClick={()=>setCategory(x)} className={`px-3 py-2 rounded-lg border text-sm ${category===x?'border-emerald-400 bg-emerald-50 text-emerald-700':'border-slate-200 text-slate-500'}`}>{x}</button>)}</div></div>
      <div><p className="text-sm font-medium text-slate-600 mb-2">Difficulty</p><div className="flex gap-2">{difficulties.map(x=><button key={x} onClick={()=>setDifficulty(x)} className={`flex-1 py-2 rounded-lg border text-sm ${difficulty===x?'border-emerald-400 bg-emerald-50 text-emerald-700':'border-slate-200 text-slate-500'}`}>{x}</button>)}</div></div>
      <label className="block text-sm font-medium text-slate-600">Points<input type="number" min="1" value={points} onChange={e=>setPoints(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200"/></label>
      <label className="block text-sm font-medium text-slate-600">Submission type<select value={submissionType} onChange={e=>setSubmissionType(e.target.value as SubmissionType)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200">{submissionTypes.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="block text-sm font-medium text-slate-600">Deadline<input type="datetime-local" value={deadline} onChange={e=>setDeadline(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200"/></label>
      <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium text-slate-600">Benchmark value<input value={benchmarkValue} onChange={e=>setBenchmarkValue(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200"/></label><label className="block text-sm font-medium text-slate-600">Benchmark unit<input value={benchmarkUnit} onChange={e=>setBenchmarkUnit(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200"/></label></div>
      <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg"><input type="checkbox" checked={requiresVerification} onChange={e=>setRequiresVerification(e.target.checked)} className="w-4 h-4"/><span><span className="block text-sm font-medium text-slate-700">Requires verification</span><span className="text-xs text-slate-500">Submissions go through review before scoring.</span></span></label>
      <div className="flex gap-2"><button onClick={()=>onNavigate('challenge',{id:challengeId})} className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600">Cancel</button><button disabled={saving} onClick={save} className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2">{saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}{saving?'Saving...':'Save Changes'}</button></div>
    </div>
  </div>;
}
