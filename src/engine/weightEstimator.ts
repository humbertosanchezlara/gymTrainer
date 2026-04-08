

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

  // Aislamiento tren inferior
  'Patada de Glúteo': 0.15,          // ejercicio de aislamiento, peso muy ligero relativo a PC
  'Abductores (Máquina)': 0.3,       // máquina de abductores
  'Aductores (Máquina)': 0.3,        // máquina de aductores
  'Prensa Horizontal (Máquina)': 1.4, // similar a prensa vertical
};

// Experience multipliers (applied on top of BW estimates)
const EXPERIENCE_SCALE: Record<string, number> = {
  beginner: 0.7,
  intermediate: 1.0,
  advanced: 1.2,
};

/**
 * Gender-based scaling factors per movement pattern.
 *
 * Rationale (based on strength sport data & physiology):
 * - Women produce ~50-60% of male upper-body strength relative to BW
 *   but ~70-80% of male lower-body strength relative to BW.
 * - Hip-dominant movements (hip thrust, glute bridge) show the smallest gap.
 * - Pressing movements (bench, OHP) show the largest gap.
 * - Isolation/accessory movements have a moderate gap.
 */
const GENDER_SCALE: Record<string, Record<string, number>> = {
  male: {},   // all 1.0 (baseline — multipliers already calibrated for males)
  female: {
    // Lower body — closer to male ratios
    'Barra Back Squat': 0.70,
    'Barra Front Squat': 0.70,
    'Peso Muerto Convencional': 0.72,
    'Peso Muerto Sumo': 0.75,
    'Peso Muerto Rumano': 0.72,
    'Prensa de Piernas': 0.80,
    'Hack Squat': 0.75,
    'Sentadilla Búlgara': 0.75,
    'Hip Thrust (Barra)': 0.85,

    // Upper body pushing — largest gap
    'Barra Press de Banca': 0.55,
    'Barra Press Inclinado': 0.55,
    'Mancuerna Press de Banca': 0.55,
    'Mancuerna Press Inclinado': 0.55,
    'Barra Press Militar': 0.50,
    'Mancuerna Press Militar': 0.50,
    'Press Banca Agarre Cerrado': 0.55,

    // Upper body pulling — moderate gap
    'Barra Remo Inclinado': 0.60,
    'Remo Pendlay': 0.60,
    'Mancuerna Remo': 0.60,
    'Jalón al Pecho (Barra)': 0.65,

    // Arms — moderate gap
    'Barra Curl': 0.55,
    'Mancuerna Curl': 0.55,
    'Extensión Tríceps Cable': 0.60,
    'Rompecráneos': 0.55,

    // Accessories — moderate to small gap
    'Elevación Lateral (MC)': 0.60,
    'Pájaro (MC)': 0.60,
    'Jalón al Cuello Cable': 0.65,
    'Aperturas en Cable': 0.60,
    'Extensión de Pierna': 0.70,
    'Curl Femoral (Sentado)': 0.75,
    'Curl Femoral (Tumbado)': 0.75,
    'Remo en Cable (Sentado)': 0.65,
    'Elevación Talones de Pie': 0.80,
    'Elevación Talones Sentado': 0.80,

    // Aislamiento tren inferior — brecha pequeña (músculos inferiores)
    'Patada de Glúteo': 0.85,
    'Abductores (Máquina)': 0.90,
    'Aductores (Máquina)': 0.90,
    'Prensa Horizontal (Máquina)': 0.80,
  },
};

const DEFAULT_FEMALE_SCALE = 0.60;

/**
 * Estimate a starting working weight for a given exercise.
 * Returns weight rounded to nearest 2.5 kg.
 */
export function estimateWeight(
  exerciseName: string,
  bodyweight: number,
  experience: string = 'intermediate',
  gender: string = 'male'
): number {
  const multiplier = BW_MULTIPLIERS[exerciseName] ?? 0.15; // fallback for unknowns
  const expScale = EXPERIENCE_SCALE[experience.toLowerCase()] ?? 1.0;
  const genderScale = gender === 'female'
    ? (GENDER_SCALE.female[exerciseName] ?? DEFAULT_FEMALE_SCALE)
    : 1.0;
  const raw = bodyweight * multiplier * expScale * genderScale;
  return Math.round(raw / 2.5) * 2.5; // round to nearest 2.5
}

/**
 * Estimate the 4 key compound working weights.
 */
export function estimateKeyLifts(
  bodyweight: number,
  experience: string = 'intermediate',
  gender: string = 'male'
): { squat: number; bench: number; deadlift: number; ohp: number } {
  return {
    squat: estimateWeight('Barra Back Squat', bodyweight, experience, gender),
    bench: estimateWeight('Barra Press de Banca', bodyweight, experience, gender),
    deadlift: estimateWeight('Peso Muerto Convencional', bodyweight, experience, gender),
    ohp: estimateWeight('Barra Press Militar', bodyweight, experience, gender),
  };
}
