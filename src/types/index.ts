export type ChallengeCategory = 'Fitness' | 'Coding' | 'Photography' | 'Community' | 'Art' | 'Study' | 'Custom';
export type DifficultyTier = 'Easy' | 'Medium' | 'Hard' | 'Expert';
export type SubmissionType = 'numeric' | 'text' | 'file' | 'photo' | 'video' | 'quiz' | 'checklist';
export type ParticipantStatus = 'joined' | 'in_progress' | 'completed' | 'failed';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'flagged';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string;
  is_moderator: boolean;
  challenges_joined: number;
  challenges_completed: number;
  challenges_in_progress: number;
  challenges_failed: number;
  average_score: number;
  consistency_streak: number;
  created_at: string;
}

export interface Challenge {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  rules: string;
  category: ChallengeCategory;
  difficulty_tier: DifficultyTier;
  difficulty_weight: number;
  points: number;
  submission_type: SubmissionType;
  evaluation_criteria: Record<string, unknown>;
  benchmark_value: number | null;
  benchmark_unit: string | null;
  deadline: string | null;
  requires_verification: boolean;
  participant_count: number;
  created_at: string;
}

export interface Participant {
  id: string;
  user_id: string;
  challenge_id: string;
  status: ParticipantStatus;
  joined_at: string;
}

export interface Submission {
  id: string;
  user_id: string;
  challenge_id: string;
  submission_payload: Record<string, unknown>;
  file_url: string | null;
  file_hash: string | null;
  raw_performance_score: number | null;
  verification_status: VerificationStatus;
  submitted_at: string;
}

export interface Vote {
  id: string;
  voter_id: string;
  submission_id: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  submission_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  submission_id: string;
  text: string;
  created_at: string;
}

export interface ScoreAuditLog {
  id: string;
  submission_id: string;
  computed_final_score: number;
  performance_normalized: number;
  difficulty_weight: number;
  completion_factor: number;
  verification_factor: number;
  consistency_bonus: number;
  community_signal_capped: number;
  breakdown: Record<string, unknown>;
  computed_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_score: number;
  best_score: number;
  submission_count: number;
  challenges_completed: number;
  consistency_streak: number;
}

export interface ChallengeLeaderboardEntry {
  rank: number;
  submission_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  verification_status: VerificationStatus;
  final_score: number;
  breakdown: {
    performance_normalized: number;
    difficulty_weight: number;
    completion_factor: number;
    verification_factor: number;
    consistency_bonus: number;
    community_signal_capped: number;
    details: Record<string, unknown>;
  } | null;
}

export interface ScoreBreakdown {
  submission_id: string;
  final_score: number;
  performance_normalized: number;
  difficulty_weight: number;
  completion_factor: number;
  verification_factor: number;
  consistency_bonus: number;
  community_signal_capped: number;
  breakdown: Record<string, unknown>;
  computed_at: string;
}

export const DIFFICULTY_WEIGHTS: Record<DifficultyTier, number> = {
  Easy: 1.0,
  Medium: 1.3,
  Hard: 1.6,
  Expert: 2.0,
};

export const CATEGORY_ICONS: Record<ChallengeCategory, string> = {
  Fitness: 'Dumbbell',
  Coding: 'Code',
  Photography: 'Camera',
  Community: 'HeartHandshake',
  Art: 'Palette',
  Study: 'BookOpen',
  Custom: 'Sparkles',
};

export const CATEGORY_COLORS: Record<ChallengeCategory, string> = {
  Fitness: 'emerald',
  Coding: 'blue',
  Photography: 'amber',
  Community: 'rose',
  Art: 'violet',
  Study: 'cyan',
  Custom: 'slate',
};
