

/**
 * Bodyweight-relative multipliers for estimating starting working weights.
 * These are conservative estimates for intermediate lifters.
 * All Week 1 weights generated from these are flagged as calibration weights.
 */
const BW_MULTIPLIERS: Record<string, number> = {
  // Lower compounds
  'Barbell Back Squat': 0.85,
  'Barbell Front Squat': 0.65,
  'Conventional Deadlift': 1.0,
  'Sumo Deadlift': 1.0,
  'Romanian Deadlift': 0.7,
  'Leg Press': 1.4,
  'Hack Squat': 0.7,
  'Bulgarian Split Squat': 0.3, // per hand DB weight
  'Hip Thrust (Barbell)': 0.8,

  // Upper push compounds
  'Barbell Bench Press': 0.6,
  'Incline Barbell Press': 0.5,
  'Dumbbell Bench Press': 0.25, // per hand
  'Incline Dumbbell Press': 0.2,
  'Barbell OHP': 0.35,
  'Dumbbell OHP': 0.15,
  'Close Grip Bench Press': 0.5,

  // Upper pull compounds
  'Barbell Bent Over Row': 0.55,
  'Pendlay Row': 0.55,
  'Dumbbell Row': 0.25,
  'Lat Pulldown (Bar)': 0.5,

  // Arms
  'Barbell Curl': 0.25,
  'Dumbbell Curl': 0.1,
  'Tricep Pushdown': 0.2,
  'Skull Crushers': 0.2,

  // Accessories default
  'Lateral Raise (DB)': 0.07,
  'Rear Delt Fly (DB)': 0.07,
  'Face Pull': 0.15,
  'Cable Fly': 0.12,
  'Leg Extension': 0.35,
  'Leg Curl (Seated)': 0.3,
  'Leg Curl (Lying)': 0.3,
  'Cable Row (Seated)': 0.45,
  'Standing Calf Raise': 0.6,
  'Seated Calf Raise': 0.4,
};

// Experience multipliers (applied on top of BW estimates)
const EXPERIENCE_SCALE: Record<string, number> = {
  beginner: 0.7,
  intermediate: 1.0,
  advanced: 1.2,
};

/**
 * Estimate a starting working weight for a given exercise.
 * Returns weight rounded to nearest 2.5 kg.
 */
export function estimateWeight(
  exerciseName: string,
  bodyweight: number,
  experience: string = 'intermediate'
): number {
  const multiplier = BW_MULTIPLIERS[exerciseName] ?? 0.15; // fallback for unknowns
  const expScale = EXPERIENCE_SCALE[experience.toLowerCase()] ?? 1.0;
  const raw = bodyweight * multiplier * expScale;
  return Math.round(raw / 2.5) * 2.5; // round to nearest 2.5
}

/**
 * Estimate the 4 key compound working weights.
 */
export function estimateKeyLifts(
  bodyweight: number,
  experience: string = 'intermediate'
): { squat: number; bench: number; deadlift: number; ohp: number } {
  return {
    squat: estimateWeight('Barbell Back Squat', bodyweight, experience),
    bench: estimateWeight('Barbell Bench Press', bodyweight, experience),
    deadlift: estimateWeight('Conventional Deadlift', bodyweight, experience),
    ohp: estimateWeight('Barbell OHP', bodyweight, experience),
  };
}
