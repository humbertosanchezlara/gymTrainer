// ============================================================
// types/workout.ts
// Core types for the workout engine
// ============================================================

export type MuscleGroup =
  | "chest" | "shoulders" | "triceps"
  | "back" | "biceps" | "rear_delts"
  | "quads" | "glutes" | "hamstrings" | "calves" | "adductors" | "abductors"
  | "core" | "full_body";

export type Equipment = "band" | "bodyweight" | "band_anchor_high" | "band_anchor_low" | "band_anchor_door" | "chair";

export type ExerciseCategory = "push" | "pull" | "legs" | "core" | "full_body";

export type DayFocus = "push" | "pull" | "legs" | "upper" | "full_body";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type SetScheme =
  | { type: "reps"; sets: number; reps: number | [number, number] }
  | { type: "time"; sets: number; seconds: number }
  | { type: "amrap"; sets: number }
  | { type: "reps_per_side"; sets: number; reps: number };

export type ProgressionRule = {
  trigger: "reps_easy" | "sets_complete" | "week_n";
  weekThreshold?: number;
  action: "add_set" | "add_reps" | "add_pause" | "add_band" | "increase_band" | "reduce_rest";
  value?: number; // reps to add, seconds of pause, etc.
  description: string;
};

export interface Exercise {
  id: string;
  name: string;
  nameEs: string;
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment[];
  difficulty: Difficulty;
  isUnilateral: boolean;
  requiresAnchor: boolean;
  anchorPosition?: "high" | "low" | "mid";
  tags: string[];
  cues: string[];           // execution cues
  commonErrors: string[];
  description: string;      // full description shown on expand
  progressions: string[];   // harder variations
  regressions: string[];    // easier variations
}

export interface ExerciseSlot {
  exercise: Exercise;
  scheme: SetScheme;
  restSeconds: number;
  notes?: string;
  pairedWith?: string; // exercise id — for supersets
  isNew?: boolean;
  week1Ref?: string; // "4×12" — shown as delta reference
}

export interface WorkoutDay {
  dayNumber: number;
  focus: DayFocus;
  title: string;
  subtitle: string;
  sections: WorkoutSection[];
  progressionNotes: string;
  estimatedMinutes: number;
}

export interface WorkoutSection {
  label: string;
  exercises: ExerciseSlot[];
}

export interface WeeklyPlan {
  weekNumber: number;
  days: WorkoutDay[];
  generatedBy: "rules" | "claude" | "hybrid";
  userProfile: UserProfile;
  createdAt: string;
}

export interface UserProfile {
  level: Difficulty;
  volumeTolerance: "low" | "medium" | "high" | "very_high";
  equipment: Equipment[];
  restrictions: string[];       // e.g. "no_pullup_bar"
  daysPerWeek: number;
  focusPriority?: MuscleGroup[];
  previousWeekCompleted?: boolean;
  previousWeekPerformance?: "easy" | "correct" | "too_hard";
}

export interface ProgressionContext {
  weekNumber: number;
  previousPlan: WeeklyPlan;
  userFeedback: UserFeedback;
}

export interface UserFeedback {
  completedAllDays: boolean;
  volumeFeeling: "easy" | "correct" | "too_hard";
  exerciseNotes?: Record<string, string>; // exerciseId -> note
  adjustments?: ExerciseAdjustment[];
}

export interface ExerciseAdjustment {
  exerciseId: string;
  actualSets?: number;
  actualReps?: number;
  skipped?: boolean;
  reason?: string;
}

export type ClaudeRoutineResponse = {
  days: WeeklyPlan["days"];
  rationale: string;
  progressionHighlights: string[];
};
