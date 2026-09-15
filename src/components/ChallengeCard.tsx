import { Dumbbell, Code, Camera, HeartHandshake, Palette, BookOpen, Sparkles, Users, Clock, Lock } from 'lucide-react';
import type { Challenge, ChallengeCategory } from '@/types';

const iconMap: Record<string, typeof Dumbbell> = {
  Dumbbell, Code, Camera, HeartHandshake, Palette, BookOpen, Sparkles,
};

const colorMap: Record<ChallengeCategory, { bg: string; text: string; border: string }> = {
  Fitness: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Coding: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Photography: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Community: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  Art: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  Study: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  Custom: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

const difficultyColors: Record<string, string> = {
  Easy: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Hard: 'bg-orange-100 text-orange-700',
  Expert: 'bg-red-100 text-red-700',
};

interface ChallengeCardProps {
  challenge: Challenge;
  onClick: () => void;
}

export function ChallengeCard({ challenge, onClick }: ChallengeCardProps) {
  const Icon = iconMap[challenge.category] ?? Sparkles;
  const colors = colorMap[challenge.category];
  const deadline = challenge.deadline ? new Date(challenge.deadline) : null;
  const isExpired = deadline && deadline < new Date();

  return (
    <button
      onClick={onClick}
      className="group text-left bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className={`h-2 ${colors.bg.replace('50', '100')}`}>
        <div className={`h-full w-full ${colors.bg.replace('50', '200')}`} />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg ${colors.bg} ${colors.border} border flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </div>
          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${difficultyColors[challenge.difficulty_tier]}`}>
            {challenge.difficulty_tier}
          </span>
        </div>

        <h3 className="font-semibold text-slate-800 mb-1 line-clamp-2 group-hover:text-emerald-700 transition-colors">
          {challenge.title}
        </h3>
        <p className="text-sm text-slate-500 line-clamp-2 mb-4">{challenge.description}</p>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-emerald-700">{challenge.points} points</span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {challenge.participant_count}
            </span>
            {deadline && (
              <span className={`flex items-center gap-1 ${isExpired ? 'text-red-500' : ''}`}>
                <Clock className="w-3.5 h-3.5" />
                {isExpired ? 'Ended' : deadline.toLocaleDateString()}
              </span>
            )}
          </div>
          {challenge.requires_verification && (
            <span className="flex items-center gap-1 text-slate-400">
              <Lock className="w-3 h-3" />
              Verified
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
