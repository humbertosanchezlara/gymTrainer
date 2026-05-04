// TypeScript types for the entire app, mapping to Supabase schema

export type ExerciseStatus = 'YES' | 'NO';

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
  gender: 'male' | 'female';
  bodyweight: number;
  height: number;
  training_experience: string;
  goal: string;
  schedule_days: number;
  session_minutes: number;
  equipment_access: string;
  limitations: string;
  weight_unit: 'kg' | 'lbs';
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
  range_status?: RangeStatus | null;
  exercise?: Exercise;
}

export type InjurySide = 'left' | 'right' | 'bilateral' | 'unspecified';
export type PainPattern = 'during_exercise' | 'delayed_next_day' | 'post_load_hours_later' | 'load_threshold_only';
export type SymptomLevel = 'pending' | 'none' | 'mild_self_resolving' | 'lasting_hours';
export type RangeStatus = 'partial' | 'target' | 'unknown';
export type InjuryProgressionStep = 'range' | 'reps' | 'weight';

export interface UserInjury {
  id: string;
  user_id: string;
  body_part: string;
  side: InjurySide;
  pain_pattern: PainPattern;
  trigger_sensation: string | null;
  avoided_exercise_names: string[];
  tolerated_exercise_names: string[];
  clean_weeks_required: number;
  progression_order: InjuryProgressionStep[];
  active: boolean;
  created_at?: string;
}

export interface InjuryCheckin {
  id: string;
  user_id: string;
  injury_id: string;
  session_id: string;
  checkin_date: string;
  symptom_level: SymptomLevel;
  free_text: string | null;
  created_at?: string;
  injury?: UserInjury;
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
  // Cuádriceps Dominante
  { name: 'Barra Back Squat', category: 'QUAD_DOMINANT' },
  { name: 'Barra Front Squat', category: 'QUAD_DOMINANT' },
  { name: 'Safety Bar Squat', category: 'QUAD_DOMINANT' },
  { name: 'Hack Squat', category: 'QUAD_DOMINANT' },
  { name: 'Prensa de Piernas', category: 'QUAD_DOMINANT' },
  { name: 'Sentadilla Búlgara', category: 'QUAD_DOMINANT' },
  { name: 'Zancadas', category: 'QUAD_DOMINANT' },
  { name: 'Step Ups', category: 'QUAD_DOMINANT' },
  { name: 'Sentadilla Goblet', category: 'QUAD_DOMINANT' },
  { name: 'Extensión de Pierna', category: 'QUAD_DOMINANT' },
  // Cadena Posterior
  { name: 'Peso Muerto Convencional', category: 'POSTERIOR_CHAIN' },
  { name: 'Peso Muerto Sumo', category: 'POSTERIOR_CHAIN' },
  { name: 'Peso Muerto Rumano', category: 'POSTERIOR_CHAIN' },
  { name: 'Peso Muerto Piernas Rígidas', category: 'POSTERIOR_CHAIN' },
  { name: 'Hip Thrust (Barra)', category: 'POSTERIOR_CHAIN' },
  { name: 'Hip Thrust (Máquina)', category: 'POSTERIOR_CHAIN' },
  { name: 'Puente de Glúteo', category: 'POSTERIOR_CHAIN' },
  { name: 'Curl Femoral (Tumbado)', category: 'POSTERIOR_CHAIN' },
  { name: 'Curl Femoral (Sentado)', category: 'POSTERIOR_CHAIN' },
  { name: 'Curl Nórdico', category: 'POSTERIOR_CHAIN' },
  { name: 'Good Morning', category: 'POSTERIOR_CHAIN' },
  { name: 'Jalón entre Piernas (Cable)', category: 'POSTERIOR_CHAIN' },
  // Empuje Horizontal
  { name: 'Barra Press de Banca', category: 'PUSH_HORIZONTAL' },
  { name: 'Mancuerna Press de Banca', category: 'PUSH_HORIZONTAL' },
  { name: 'Barra Press Inclinado', category: 'PUSH_HORIZONTAL' },
  { name: 'Mancuerna Press Inclinado', category: 'PUSH_HORIZONTAL' },
  { name: 'Press Declinado', category: 'PUSH_HORIZONTAL' },
  { name: 'Press Pecho en Máquina', category: 'PUSH_HORIZONTAL' },
  { name: 'Aperturas en Cable', category: 'PUSH_HORIZONTAL' },
  { name: 'Aperturas con Mancuerna', category: 'PUSH_HORIZONTAL' },
  { name: 'Pec Dec', category: 'PUSH_HORIZONTAL' },
  // Empuje Vertical
  { name: 'Barra Press Militar', category: 'PUSH_VERTICAL' },
  { name: 'Mancuerna Press Militar', category: 'PUSH_VERTICAL' },
  { name: 'Press Arnold', category: 'PUSH_VERTICAL' },
  { name: 'Press Hombro en Máquina', category: 'PUSH_VERTICAL' },
  { name: 'Press Landmine', category: 'PUSH_VERTICAL' },
  { name: 'Elevación Lateral (MC)', category: 'PUSH_VERTICAL' },
  { name: 'Elevación Lateral (Cable)', category: 'PUSH_VERTICAL' },
  { name: 'Pájaro (MC)', category: 'PUSH_VERTICAL' },
  { name: 'Pájaro en Máquina', category: 'PUSH_VERTICAL' },
  { name: 'Jalón al Cuello Cable', category: 'PUSH_VERTICAL' },
  // Jalón Horizontal
  { name: 'Barra Remo Inclinado', category: 'PULL_HORIZONTAL' },
  { name: 'Mancuerna Remo', category: 'PULL_HORIZONTAL' },
  { name: 'Remo en Cable (Sentado)', category: 'PULL_HORIZONTAL' },
  { name: 'Remo en Máquina', category: 'PULL_HORIZONTAL' },
  { name: 'Remo con Apoyo de Pecho', category: 'PULL_HORIZONTAL' },
  { name: 'Remo Meadows', category: 'PULL_HORIZONTAL' },
  { name: 'Remo Pendlay', category: 'PULL_HORIZONTAL' },
  // Jalón Vertical
  { name: 'Dominadas', category: 'PULL_VERTICAL' },
  { name: 'Dominadas con Apoyo', category: 'PULL_VERTICAL' },
  { name: 'Dominadas con Lastre', category: 'PULL_VERTICAL' },
  { name: 'Dominadas Supinación', category: 'PULL_VERTICAL' },
  { name: 'Jalón al Pecho (Barra)', category: 'PULL_VERTICAL' },
  { name: 'Jalón al Pecho (Neutro)', category: 'PULL_VERTICAL' },
  { name: 'Jalón Unilateral', category: 'PULL_VERTICAL' },
  { name: 'Jalón Brazos Rectos', category: 'PULL_VERTICAL' },
  // Brazos
  { name: 'Barra Curl', category: 'ARMS' },
  { name: 'Mancuerna Curl', category: 'ARMS' },
  { name: 'Curl Inclinado Mancuerna', category: 'ARMS' },
  { name: 'Curl en Cable', category: 'ARMS' },
  { name: 'Curl Martillo', category: 'ARMS' },
  { name: 'Curl Predicador', category: 'ARMS' },
  { name: 'Press Banca Agarre Cerrado', category: 'ARMS' },
  { name: 'Extensión Tríceps Cable', category: 'ARMS' },
  { name: 'Extensión Tríceps sobre Cabeza', category: 'ARMS' },
  { name: 'Rompecráneos', category: 'ARMS' },
  { name: 'Fondos (Tríceps)', category: 'ARMS' },
  // Core
  { name: 'Plancha', category: 'CORE' },
  { name: 'Crunch en Cable', category: 'CORE' },
  { name: 'Elevación Piernas Colgado', category: 'CORE' },
  { name: 'Rueda Abdominal', category: 'CORE' },
  { name: 'Pallof Press', category: 'CORE' },
  { name: 'Rotación Landmine', category: 'CORE' },
  // Pantorrillas
  { name: 'Elevación Talones de Pie', category: 'CALVES' },
  { name: 'Elevación Talones Sentado', category: 'CALVES' },
  { name: 'Elevación Talones en Prensa', category: 'CALVES' },
  // Aislamiento tren inferior
  { name: 'Patada de Glúteo', category: 'POSTERIOR_CHAIN' },
  { name: 'Abductores (Máquina)', category: 'POSTERIOR_CHAIN' },
  { name: 'Aductores (Máquina)', category: 'QUAD_DOMINANT' },
  { name: 'Prensa Horizontal (Máquina)', category: 'QUAD_DOMINANT' },
];
