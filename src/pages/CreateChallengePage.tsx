import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createChallenge } from '@/lib/api';
import type { ChallengeCategory, DifficultyTier, SubmissionType } from '@/types';
import { DIFFICULTY_WEIGHTS } from '@/types';
import {
  Dumbbell, Code, Camera, HeartHandshake, Palette, BookOpen, Sparkles,
  X, Loader2, AlertCircle, Check,
} from 'lucide-react';

interface CreateChallengePageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

const categories: { value: ChallengeCategory; icon: typeof Dumbbell; label: string }[] = [
  { value: 'Fitness', icon: Dumbbell, label: 'Fitness' },
  { value: 'Coding', icon: Code, label: 'Coding' },
  { value: 'Photography', icon: Camera, label: 'Photography' },
  { value: 'Community', icon: HeartHandshake, label: 'Community' },
  { value: 'Art', icon: Palette, label: 'Art' },
  { value: 'Study', icon: BookOpen, label: 'Study' },
  { value: 'Custom', icon: Sparkles, label: 'Custom' },
];

const submissionTypes: { value: SubmissionType; label: string; description: string }[] = [
  { value: 'numeric', label: 'Numeric', description: 'Distance, time, reps — measurable results' },
  { value: 'text', label: 'Text', description: 'Written submission or essay' },
  { value: 'photo', label: 'Photo', description: 'Image upload as proof' },
  { value: 'video', label: 'Video', description: 'Video upload as proof' },
  { value: 'file', label: 'File', description: 'Document or code file upload' },
  { value: 'quiz', label: 'Quiz', description: 'Answer questions with an answer key' },
  { value: 'checklist', label: 'Checklist', description: 'Complete a list of tasks' },
];

export function CreateChallengePage({ onNavigate }: CreateChallengePageProps) {
  const { user, adminUsername } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [category, setCategory] = useState<ChallengeCategory>('Fitness');
  const [difficulty, setDifficulty] = useState<DifficultyTier>('Medium');
  const [points, setPoints] = useState('300');
  const [submissionType, setSubmissionType] = useState<SubmissionType>('numeric');
  const [deadline, setDeadline] = useState('');
  const [requiresVerification, setRequiresVerification] = useState(true);
  const [benchmarkValue, setBenchmarkValue] = useState('');
  const [benchmarkUnit, setBenchmarkUnit] = useState('');
  const [answerKey, setAnswerKey] = useState('');
  const [checklistItems, setChecklistItems] = useState('');

  if (!user && !adminUsername) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-slate-500 mb-4">Sign in to create a challenge.</p>
        <button onClick={() => onNavigate('auth')} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium">
          Sign In
        </button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const evaluationCriteria: Record<string, unknown> = {};
      if (submissionType === 'quiz' && answerKey.trim()) {
        evaluationCriteria.answer_key = answerKey.split(',').map((a) => a.trim());
      }
      if (submissionType === 'checklist' && checklistItems.trim()) {
        evaluationCriteria.checklist_items = checklistItems.split('\n').map((i) => i.trim()).filter(Boolean);
      }

      const challenge = await createChallenge({
        title: title.trim(),
        description: description.trim(),
        rules: rules.trim(),
        category,
        difficulty_tier: difficulty,
        difficulty_weight: DIFFICULTY_WEIGHTS[difficulty],
        points: Math.max(1, parseInt(points, 10) || 1),
        submission_type: submissionType,
        evaluation_criteria: evaluationCriteria,
        benchmark_value: benchmarkValue ? parseFloat(benchmarkValue) : null,
        benchmark_unit: benchmarkUnit || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        requires_verification: requiresVerification,
      });
      onNavigate('challenge', { id: challenge.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create challenge');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Create a Challenge</h1>
      <p className="text-slate-500 text-sm mb-6">Design a fair competition for your community.</p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
              step >= s ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              {step > s ? <Check className="w-3.5 h-3.5" /> : s}
            </div>
            {s < 3 && <div className={`h-0.5 flex-1 rounded ${step > s ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., 30-Day Running Challenge"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this challenge about?"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400 resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Rules</label>
              <textarea
                rows={3}
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Any specific rules participants must follow?"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400 resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">Category</label>
              <div className="grid grid-cols-4 gap-2">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                        category === cat.value
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!title.trim()}
              className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">Difficulty Level</label>
              <div className="grid grid-cols-4 gap-2">
                {(['Easy', 'Medium', 'Hard', 'Expert'] as DifficultyTier[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      difficulty === d
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {d}
                    <span className="block text-xs opacity-60">{DIFFICULTY_WEIGHTS[d]}x</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">Submission Type</label>
              <div className="space-y-1.5">
                {submissionTypes.map((st) => (
                  <button
                    key={st.value}
                    onClick={() => setSubmissionType(st.value)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      submissionType === st.value
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-medium text-slate-700">{st.label}</span>
                    <span className="block text-xs text-slate-500">{st.description}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Deadline (optional)</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-emerald-50 rounded-lg p-3 flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-emerald-700">
                Evaluation criteria helps the scoring engine compute fair scores. Fill in what applies to your challenge type.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Challenge Points</label>
              <input
                type="number"
                min="1"
                step="1"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400"
              />
              <p className="text-xs text-slate-400 mt-1">Awarded to participants based on this challenge's difficulty.</p>
            </div>

            {submissionType === 'numeric' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1.5 block">Benchmark Value</label>
                  <input
                    type="number"
                    step="any"
                    value={benchmarkValue}
                    onChange={(e) => setBenchmarkValue(e.target.value)}
                    placeholder="e.g., 5"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1.5 block">Unit</label>
                  <input
                    type="text"
                    value={benchmarkUnit}
                    onChange={(e) => setBenchmarkUnit(e.target.value)}
                    placeholder="e.g., km, reps, minutes"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            )}

            {submissionType === 'quiz' && (
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1.5 block">Answer Key (comma-separated)</label>
                <input
                  type="text"
                  value={answerKey}
                  onChange={(e) => setAnswerKey(e.target.value)}
                  placeholder="e.g., A, B, C, D"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400"
                />
                <p className="text-xs text-slate-400 mt-1">Correct answers in order, separated by commas</p>
              </div>
            )}

            {submissionType === 'checklist' && (
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1.5 block">Checklist Items (one per line)</label>
                <textarea
                  rows={5}
                  value={checklistItems}
                  onChange={(e) => setChecklistItems(e.target.value)}
                  placeholder="Item 1&#10;Item 2&#10;Item 3"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={requiresVerification}
                onChange={(e) => setRequiresVerification(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-400"
              />
              <div>
                <span className="text-sm font-medium text-slate-700">Requires verification</span>
                <p className="text-xs text-slate-500">Submissions go through a review queue before scoring</p>
              </div>
            </label>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? 'Creating...' : 'Create Challenge'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
