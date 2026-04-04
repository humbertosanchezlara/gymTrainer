// TypeScript types for the entire app, mapping to Supabase schema

export type ExerciseStatus = 'YES' | 'SUB' | 'NO';

export type MovementCategory =
  | 'QUAD_DOMINANT'
  | 'POSTERIOR_CHAIN'
  | 'PUSH_HORIZONTAL'
  | 'PUSH_VERTICAL'
  | 'PULL_HORIZONTAL'
  | 'PULL_VERTICAL'
  | 'ARMS'
  | 'CORE'
  | 'CALVES';

export const CATEGORY_LABELS: Record<MovementCategory, string> = {
  QUAD_DOMINANT: 'Dominante de Cuádriceps',
  POSTERIOR_CHAIN: 'Cadena Posterior',
  PUSH_HORIZONTAL: 'Empuje — Horizontal',
  PUSH_VERTICAL: 'Empuje — Vertical',
  PULL_HORIZONTAL: 'Jalón — Horizontal',
  PULL_VERTICAL: 'Jalón — Vertical',
  ARMS: 'Brazos',
  CORE: 'Core',
  CALVES: 'Pantorrillas',
};

export interface Profile {
  id: string;
  name: string;
  bodyweight: number;
  height: number;
  training_experience: string;
  goal: string;
  schedule_days: number;
  session_minutes: number;
  equipment_access: string;
  limitations: string;
  created_at: string;
}

export interface Exercise {
  id: string;
  user_id: string;
  name: string;
  category: MovementCategory;
  status: ExerciseStatus;
  notes: string | null;
}

export interface WorkingWeight {
  id: string;
  user_id: string;
  exercise_id: string;
  weight: number;
  updated_at: string;
  exercise?: Exercise;
}

export interface Session {
  id: string;
  user_id: string;
  date: string;
  name: string;
  week_num: number | null;
  block_num: number | null;
  notes: string | null;
  created_at: string;
}

export interface SessionLog {
  id: string;
  session_id: string;
  exercise_id: string;
  sets: number;
  reps_per_set: number;
  weight: number;
  rpe: number | null;
  notes: string | null;
  exercise?: Exercise;
}

export interface BlockMetric {
  id: string;
  user_id: string;
  block_num: number;
  exercise_id: string;
  start_weight: number | null;
  end_wk4_weight: number | null;
  end_wk8_weight: number | null;
  end_wk11_weight: number | null;
}

export interface ProgramDayExercise {
  exercise_id: string;
  exercise_name: string;
  category: string;
  role: 'primary' | 'secondary' | 'accessory';
  sets: number;
  reps_min: number;
  reps_max: number;
  rpe: number;
  weight: number;
  is_calibration: boolean;
  notes: string;
}

export interface ProgramDay {
  id: string;
  program_id: string;
  day_number: number;
  day_name: string;
  exercises: ProgramDayExercise[];
}

export interface Program {
  id: string;
  user_id: string;
  name: string;
  split_type: string;
  total_days: number;
  total_weeks: number;
  created_at: string;
  days?: ProgramDay[];
}

// Default exercise library from exercise_library.md
export const DEFAULT_EXERCISES: { name: string; category: MovementCategory }[] = [
  // Quad Dominant
  { name: 'Barbell Back Squat', category: 'QUAD_DOMINANT' },
  { name: 'Barbell Front Squat', category: 'QUAD_DOMINANT' },
  { name: 'Safety Bar Squat', category: 'QUAD_DOMINANT' },
  { name: 'Hack Squat', category: 'QUAD_DOMINANT' },
  { name: 'Leg Press', category: 'QUAD_DOMINANT' },
  { name: 'Bulgarian Split Squat', category: 'QUAD_DOMINANT' },
  { name: 'Lunges', category: 'QUAD_DOMINANT' },
  { name: 'Step Ups', category: 'QUAD_DOMINANT' },
  { name: 'Goblet Squat', category: 'QUAD_DOMINANT' },
  { name: 'Leg Extension', category: 'QUAD_DOMINANT' },
  // Posterior Chain
  { name: 'Conventional Deadlift', category: 'POSTERIOR_CHAIN' },
  { name: 'Sumo Deadlift', category: 'POSTERIOR_CHAIN' },
  { name: 'Romanian Deadlift', category: 'POSTERIOR_CHAIN' },
  { name: 'Stiff Leg Deadlift', category: 'POSTERIOR_CHAIN' },
  { name: 'Hip Thrust (Barbell)', category: 'POSTERIOR_CHAIN' },
  { name: 'Hip Thrust (Machine)', category: 'POSTERIOR_CHAIN' },
  { name: 'Glute Bridge', category: 'POSTERIOR_CHAIN' },
  { name: 'Leg Curl (Lying)', category: 'POSTERIOR_CHAIN' },
  { name: 'Leg Curl (Seated)', category: 'POSTERIOR_CHAIN' },
  { name: 'Nordic Curl', category: 'POSTERIOR_CHAIN' },
  { name: 'Good Morning', category: 'POSTERIOR_CHAIN' },
  { name: 'Cable Pull Through', category: 'POSTERIOR_CHAIN' },
  // Push Horizontal
  { name: 'Barbell Bench Press', category: 'PUSH_HORIZONTAL' },
  { name: 'Dumbbell Bench Press', category: 'PUSH_HORIZONTAL' },
  { name: 'Incline Barbell Press', category: 'PUSH_HORIZONTAL' },
  { name: 'Incline Dumbbell Press', category: 'PUSH_HORIZONTAL' },
  { name: 'Decline Press', category: 'PUSH_HORIZONTAL' },
  { name: 'Machine Chest Press', category: 'PUSH_HORIZONTAL' },
  { name: 'Cable Fly', category: 'PUSH_HORIZONTAL' },
  { name: 'Dumbbell Fly', category: 'PUSH_HORIZONTAL' },
  { name: 'Pec Dec', category: 'PUSH_HORIZONTAL' },
  // Push Vertical
  { name: 'Barbell OHP', category: 'PUSH_VERTICAL' },
  { name: 'Dumbbell OHP', category: 'PUSH_VERTICAL' },
  { name: 'Arnold Press', category: 'PUSH_VERTICAL' },
  { name: 'Seated Machine Press', category: 'PUSH_VERTICAL' },
  { name: 'Landmine Press', category: 'PUSH_VERTICAL' },
  { name: 'Lateral Raise (DB)', category: 'PUSH_VERTICAL' },
  { name: 'Lateral Raise (Cable)', category: 'PUSH_VERTICAL' },
  { name: 'Rear Delt Fly (DB)', category: 'PUSH_VERTICAL' },
  { name: 'Rear Delt Fly (Machine)', category: 'PUSH_VERTICAL' },
  { name: 'Face Pull', category: 'PUSH_VERTICAL' },
  // Pull Horizontal
  { name: 'Barbell Bent Over Row', category: 'PULL_HORIZONTAL' },
  { name: 'Dumbbell Row', category: 'PULL_HORIZONTAL' },
  { name: 'Cable Row (Seated)', category: 'PULL_HORIZONTAL' },
  { name: 'Machine Row', category: 'PULL_HORIZONTAL' },
  { name: 'Chest Supported Row', category: 'PULL_HORIZONTAL' },
  { name: 'Meadows Row', category: 'PULL_HORIZONTAL' },
  { name: 'Pendlay Row', category: 'PULL_HORIZONTAL' },
  // Pull Vertical
  { name: 'Pull Up', category: 'PULL_VERTICAL' },
  { name: 'Weighted Pull Up', category: 'PULL_VERTICAL' },
  { name: 'Chin Up', category: 'PULL_VERTICAL' },
  { name: 'Lat Pulldown (Bar)', category: 'PULL_VERTICAL' },
  { name: 'Lat Pulldown (Neutral)', category: 'PULL_VERTICAL' },
  { name: 'Single Arm Pulldown', category: 'PULL_VERTICAL' },
  { name: 'Straight Arm Pulldown', category: 'PULL_VERTICAL' },
  // Arms
  { name: 'Barbell Curl', category: 'ARMS' },
  { name: 'Dumbbell Curl', category: 'ARMS' },
  { name: 'Incline Dumbbell Curl', category: 'ARMS' },
  { name: 'Cable Curl', category: 'ARMS' },
  { name: 'Hammer Curl', category: 'ARMS' },
  { name: 'Preacher Curl', category: 'ARMS' },
  { name: 'Close Grip Bench Press', category: 'ARMS' },
  { name: 'Tricep Pushdown', category: 'ARMS' },
  { name: 'Overhead Tricep Extension', category: 'ARMS' },
  { name: 'Skull Crushers', category: 'ARMS' },
  { name: 'Dips (Tricep)', category: 'ARMS' },
  // Core
  { name: 'Plank', category: 'CORE' },
  { name: 'Cable Crunch', category: 'CORE' },
  { name: 'Hanging Leg Raise', category: 'CORE' },
  { name: 'Ab Wheel', category: 'CORE' },
  { name: 'Pallof Press', category: 'CORE' },
  { name: 'Landmine Rotation', category: 'CORE' },
  // Calves
  { name: 'Standing Calf Raise', category: 'CALVES' },
  { name: 'Seated Calf Raise', category: 'CALVES' },
  { name: 'Leg Press Calf Raise', category: 'CALVES' },
];
