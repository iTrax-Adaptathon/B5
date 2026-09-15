import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, Shield, Target, Zap, Heart, Award } from 'lucide-react';

interface ScoreBreakdownProps {
  breakdown: {
    performance_normalized: number;
    difficulty_weight: number;
    completion_factor: number;
    verification_factor: number;
    consistency_bonus: number;
    community_signal_capped: number;
    details?: Record<string, unknown>;
  } | null;
  finalScore: number;
}

export function ScoreBreakdown({ breakdown, finalScore }: ScoreBreakdownProps) {
  const [expanded, setExpanded] = useState(false);

  if (!breakdown) {
    return <span className="text-sm text-slate-400">Score not computed yet</span>;
  }

  const components = [
    {
      label: 'Performance',
      value: breakdown.performance_normalized,
      max: 100,
      icon: Target,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      description: 'Normalized 0-100 based on your result vs. others in this challenge',
    },
    {
      label: 'Difficulty Weight',
      value: breakdown.difficulty_weight,
      max: 2,
      icon: Zap,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      description: 'Multiplier based on challenge tier (1.0-2.0x), adjusted by completion rate',
    },
    {
      label: 'Completion Factor',
      value: breakdown.completion_factor,
      max: 1,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
      description: 'How much of the challenge you completed (0-1)',
    },
    {
      label: 'Verification',
      value: breakdown.verification_factor,
      max: 1,
      icon: Shield,
      color: 'text-violet-600',
      bg: 'bg-violet-100',
      description: '1.0 if verified, reduced if pending/flagged/duplicate',
    },
    {
      label: 'Consistency Bonus',
      value: breakdown.consistency_bonus,
      max: 8,
      icon: TrendingUp,
      color: 'text-cyan-600',
      bg: 'bg-cyan-100',
      description: 'Bonus for completing challenges regularly over time',
    },
    {
      label: 'Community Signal',
      value: breakdown.community_signal_capped,
      max: 20,
      icon: Heart,
      color: 'text-rose-600',
      bg: 'bg-rose-100',
      description: 'Capped at 10% of base score — likes never determine ranking',
    },
  ];

  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-700">
            Final Score: {Math.round(finalScore * 100) / 100}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2.5">
          {components.map((c) => {
            const Icon = c.icon;
            const pct = Math.min(100, (c.value / c.max) * 100);
            return (
              <div key={c.label} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-md ${c.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon className={`w-3.5 h-3.5 ${c.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600">{c.label}</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {Math.round(c.value * 100) / 100}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.bg.replace('100', '500')}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{c.description}</p>
                </div>
              </div>
            );
          })}

          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Formula</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-mono leading-relaxed">
              Score = (Perf x Diff x Complete x Verify) + Consistency + Community
            </p>
          </div>

          {breakdown.details && typeof breakdown.details === 'object' && (
            <div className="pt-2 border-t border-slate-200">
              <span className="text-xs font-semibold text-slate-600">Audit Details</span>
              <pre className="text-[10px] text-slate-400 mt-1 overflow-x-auto">
                {JSON.stringify(breakdown.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckCircle({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
