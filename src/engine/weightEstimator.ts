

/**
 * Bodyweight-relative multipliers for estimating starting working weights.
 * These are conservative estimates for intermediate lifters.
 * All Week 1 weights generated from these are flagged as calibration weights.
 */
const BW_MULTIPLIERS: Record<string, number> = {
  // Tren inferior
  'Barra Back Squat': 0.85,
  'Barra Front Squat': 0.65,
  'Peso Muerto Convencional': 1.0,
  'Peso Muerto Sumo': 1.0,
  'Peso Muerto Rumano': 0.7,
  'Prensa de Piernas': 1.4,
  'Hack Squat': 0.7,
  'Sentadilla Búlgara': 0.3,
  'Hip Thrust (Barra)': 0.8,

  // Empuje horizontal
  'Barra Press de Banca': 0.6,
  'Barra Press Inclinado': 0.5,
  'Mancuerna Press de Banca': 0.25,
  'Mancuerna Press Inclinado': 0.2,
  'Barra Press Militar': 0.35,
  'Mancuerna Press Militar': 0.15,
  'Press Banca Agarre Cerrado': 0.5,

  // Jalón horizontal
  'Barra Remo Inclinado': 0.55,
  'Remo Pendlay': 0.55,
  'Mancuerna Remo': 0.25,
  'Jalón al Pecho (Barra)': 0.5,

  // Brazos
  'Barra Curl': 0.25,
  'Mancuerna Curl': 0.1,
  'Extensión Tríceps Cable': 0.2,
  'Rompecráneos': 0.2,

  // Accesorios
  'Elevación Lateral (MC)': 0.07,
  'Pájaro (MC)': 0.07,
  'Jalón al Cuello Cable': 0.15,
  'Aperturas en Cable': 0.12,
  'Extensión de Pierna': 0.35,
  'Curl Femoral (Sentado)': 0.3,
  'Curl Femoral (Tumbado)': 0.3,
  'Remo en Cable (Sentado)': 0.45,
  'Elevación Talones de Pie': 0.6,
  'Elevación Talones Sentado': 0.4,
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
    squat: estimateWeight('Barra Back Squat', bodyweight, experience),
    bench: estimateWeight('Barra Press de Banca', bodyweight, experience),
    deadlift: estimateWeight('Peso Muerto Convencional', bodyweight, experience),
    ohp: estimateWeight('Barra Press Militar', bodyweight, experience),
  };
}
