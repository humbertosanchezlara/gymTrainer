import type { Exercise, UserInjury } from '../types';
import { getSplitTemplate, type ExerciseSlot } from './splitTemplates';
import { estimateWeight } from './weightEstimator';
import { isExerciseEnabled } from '../utils/programState';
import { injuryGuidanceNote } from './injuryExerciseRules';
import {
  exerciseSuitabilityScore,
  isExerciseSuitableForProfile,
  type ExerciseSuitabilityProfile,
} from './exerciseSuitability';

// ─── Block Periodization Parameters ──────────────────────
export interface BlockParams {
  name: string;
  weeks: number[];
  repsMin: number;
  repsMax: number;
  rpeMin: number;
  rpeMax: number;
  setsCompound: number;
  setsAccessory: number;
}

export const BLOCKS: BlockParams[] = [
  {
    name: 'Volumen',
    weeks: [1, 2, 3, 4],
    repsMin: 8, repsMax: 12,
    rpeMin: 7, rpeMax: 8,
    setsCompound: 4, setsAccessory: 3,
  },
  {
    name: 'Intensidad',
    weeks: [5, 6, 7, 8],
    repsMin: 6, repsMax: 8,
    rpeMin: 8, rpeMax: 9,
    setsCompound: 4, setsAccessory: 3,
  },
  {
    name: 'Pico',
    weeks: [9, 10, 11],
    repsMin: 3, repsMax: 5,
    rpeMin: 8, rpeMax: 9.5,
    setsCompound: 5, setsAccessory: 2,
  },
  {
    name: 'Descarga',
    weeks: [12],
    repsMin: 8, repsMax: 10,
    rpeMin: 5, rpeMax: 6,
    setsCompound: 2, setsAccessory: 2,
  },
];

export function getBlockForWeek(week: number): BlockParams {
  return BLOCKS.find((b) => b.weeks.includes(week)) ?? BLOCKS[0];
}

// ─── Generated Day Structure ─────────────────────────────
export interface GeneratedExercise {
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

export interface GeneratedDay {
  day_number: number;
  day_name: string;
  exercises: GeneratedExercise[];
}

export interface GeneratedProgram {
  name: string;
  split_type: string;
  total_days: number;
  days: GeneratedDay[];
}

// ─── Exercise Resolution ─────────────────────────────────
/**
 * Resolve an exercise slot to an actual exercise from the user's library.
 * Priority: preferred exercise (if available & enabled) → any enabled exercise in category → null
 */
function resolveExercise(
  slot: ExerciseSlot,
  exercises: Exercise[],
  usedIds: Set<string>,
  profile: ExerciseSuitabilityProfile,
): Exercise | null {
  const available = exercises.filter(
    (e) => e.category === slot.category && isExerciseEnabled(e.status) && !usedIds.has(e.id)
  );
  const bySuitability = (a: Exercise, b: Exercise) =>
    exerciseSuitabilityScore(b, profile) - exerciseSuitabilityScore(a, profile);
  const suitableAvailable = available
    .filter((exercise) => isExerciseSuitableForProfile(exercise, profile))
    .sort(bySuitability);

  if (suitableAvailable.length === 0) {
    // Fallback: allow already-used exercises in this category
    const fallback = exercises.filter(
      (e) => e.category === slot.category && isExerciseEnabled(e.status) && isExerciseSuitableForProfile(e, profile)
    ).sort(bySuitability);
    if (fallback.length === 0) return null;
    // If preferred, try to find it
    if (slot.preferredExercise) {
      const pref = fallback.find((e) => e.name === slot.preferredExercise);
      if (pref) return pref;
    }
    return fallback[0];
  }

  // Try preferred first
  if (slot.preferredExercise) {
    const pref = suitableAvailable.find((e) => e.name === slot.preferredExercise);
    if (pref) return pref;
  }

  return suitableAvailable[0];
}

// ─── BMI Adjustments ────────────────────────────────────
/**
 * Compute training adjustments based on BMI × experience interaction.
 *
 * Rationale:
 * - High-BMI beginners need lower intensity (joint stress) and slightly higher reps
 *   to build movement proficiency before loading heavy.
 * - Low-BMI advanced athletes are efficient movers and can handle higher relative
 *   intensity but may need slightly more volume to drive hypertrophy.
 * - Overweight/obese trainees benefit from more compound movements (metabolic demand)
 *   and conservative RPE to manage recovery.
 */
interface BmiAdjustments {
  rpeDelta: number;       // Added to RPE targets (negative = easier)
  repsDelta: number;      // Added to rep ranges (positive = more reps)
  weightScale: number;    // Multiplier on estimated weights (< 1 = lighter)
}

function getBmiAdjustments(bmi: number, experience: string): BmiAdjustments {
  if (bmi >= 30) {
    // Obese: conservative across the board
    if (experience === 'beginner') return { rpeDelta: -1.5, repsDelta: 2, weightScale: 0.75 };
    if (experience === 'intermediate') return { rpeDelta: -1, repsDelta: 1, weightScale: 0.85 };
    return { rpeDelta: -0.5, repsDelta: 1, weightScale: 0.9 };
  }
  if (bmi >= 25) {
    // Overweight: slightly conservative
    if (experience === 'beginner') return { rpeDelta: -1, repsDelta: 1, weightScale: 0.8 };
    if (experience === 'intermediate') return { rpeDelta: -0.5, repsDelta: 0, weightScale: 0.9 };
    return { rpeDelta: 0, repsDelta: 0, weightScale: 0.95 };
  }
  if (bmi < 18.5) {
    // Underweight: prioritize volume for mass gain, moderate intensity
    if (experience === 'beginner') return { rpeDelta: -0.5, repsDelta: 2, weightScale: 0.85 };
    return { rpeDelta: 0, repsDelta: 1, weightScale: 0.95 };
  }
  // Normal BMI: no adjustments
  return { rpeDelta: 0, repsDelta: 0, weightScale: 1.0 };
}

// ─── Volume Tolerance ────────────────────────────────────
/**
 * Derive how much volume the user can handle per session,
 * based on session length, goal and experience level.
 *
 * Maps directly to the four tiers used by the band/bodyweight engine,
 * keeping both pipelines consistent.
 */
export type VolumeTolerance = 'low' | 'medium' | 'high' | 'very_high';

export function deriveVolumeTolerance(
  sessionMinutes: number,
  goal: string,
  experience: string
): VolumeTolerance {
  if (sessionMinutes <= 35) return 'low';
  if (sessionMinutes <= 50) return 'medium';
  if (experience === 'advanced' || goal === 'hypertrophy') return 'very_high';
  return 'high';
}

/** Scale compound sets based on tolerance. Accessory gets 1 less than compound. */
function scaleSets(baseSets: number, tolerance: VolumeTolerance): number {
  switch (tolerance) {
    case 'low':       return Math.max(2, baseSets - 1);
    case 'medium':    return baseSets;
    case 'high':      return baseSets + 1;
    case 'very_high': return baseSets + 1;
  }
}

/** Rest in seconds by role and tolerance (mirrors band-engine VOLUME_TABLE). */
function restSeconds(role: 'primary' | 'secondary' | 'accessory', tolerance: VolumeTolerance): number {
  const base: Record<VolumeTolerance, number> = {
    low: 120, medium: 90, high: 75, very_high: 60,
  };
  const r = base[tolerance];
  if (role === 'primary')   return r + 30;
  if (role === 'accessory') return Math.max(r - 15, 30);
  return r;
}

// ─── Isometric exercises in the classic library ──────────
// These use time-based schemes (seconds) instead of reps.
const ISOMETRIC_EXERCISES: Record<string, Record<string, number>> = {
  // name → { beginner, intermediate, advanced } seconds
  'Plancha': { beginner: 20, intermediate: 30, advanced: 45 },
};

// ─── Unilateral exercises in the classic library ─────────
// Flag these so ProgramView can display "c/lado".
const UNILATERAL_EXERCISES = new Set([
  'Sentadilla Búlgara',
  'Zancadas',
  'Step Ups',
  'Mancuerna Remo',
  'Remo Meadows',
  'Curl Inclinado Mancuerna',
  'Mancuerna Curl',
  'Mancuerna Press Militar',
  'Press Arnold',
  'Curl Martillo',
]);

// ─── Session Duration → Max Exercises ───────────────────
/**
 * Estimate how many exercises fit into a session based on available minutes.
 *
 * Heuristic: ~7 min per exercise (warm-up sets + working sets + rest).
 * Subtract 5 min for general warm-up/cooldown.
 * Minimum 3 exercises (always keep compounds), maximum is the template's full slot list.
 */
function maxExercisesForDuration(sessionMinutes: number): number {
  const usableMinutes = Math.max(sessionMinutes - 5, 15);
  return Math.max(3, Math.floor(usableMinutes / 7));
}

// ─── Cycle Progression Adjustments ──────────────────────
/**
 * Each completed 12-week cycle earns progressive overload on the next one.
 * Cycle 1 = base. Cycle 2+ gets higher starting RPE, more sets, and a
 * slightly tighter rep range to reflect the athlete's accumulated capacity.
 *
 * Caps at cycle 3 to avoid programming that's unrealistically hard.
 */
export interface CycleAdjustments {
  rpeDelta: number;       // Added to RPE targets across all blocks
  setsBonus: number;      // Extra sets for compound lifts
  repsRangeShrink: number; // Rep range compression (shift repsMax down for strength focus)
  label: string;          // Human-readable cycle label
}

export function getCycleAdjustments(cycleNumber: number): CycleAdjustments {
  const cycle = Math.min(cycleNumber, 3); // cap progression at cycle 3
  if (cycle <= 1) return { rpeDelta: 0,   setsBonus: 0, repsRangeShrink: 0, label: 'Ciclo 1 — Base' };
  if (cycle === 2) return { rpeDelta: 0.5, setsBonus: 1, repsRangeShrink: 1, label: 'Ciclo 2 — Acumulación' };
  return              { rpeDelta: 1.0, setsBonus: 1, repsRangeShrink: 2, label: 'Ciclo 3+ — Especialización' };
}

// ─── Main Generator ──────────────────────────────────────
/**
 * Generate a complete training program.
 *
 * @param exercises - User's exercise library (only enabled exercises will be used)
 * @param days - Number of training days per week
 * @param bodyweight - User's bodyweight in kg
 * @param experience - beginner | intermediate | advanced
 * @param keyLifts - Optional overrides for main compound weights
 * @param goal - hypertrophy | strength | fat_loss | general
 * @param bmi - Body Mass Index (kg/m²)
 * @param sessionMinutes - Available minutes per session
 * @param gender - male | female
 * @param cycleNumber - How many full 12-week cycles the user has completed (1 = first)
 */
export function generateProgram(
  exercises: Exercise[],
  days: number,
  bodyweight: number,
  experience: string,
  keyLifts?: { squat: number; bench: number; deadlift: number; ohp: number },
  goal: string = 'hypertrophy',
  bmi: number = 22,
  sessionMinutes: number = 60,
  gender: string = 'male',
  cycleNumber: number = 1,
  currentWeek: number = 1,
  limitations?: string | null,
  injuries?: UserInjury[] | null
): GeneratedProgram {
  const split = getSplitTemplate(days, { limitations, injuries });
  const block = getBlockForWeek(currentWeek);
  const bmiAdj = getBmiAdjustments(bmi, experience);
  const cycleAdj = getCycleAdjustments(cycleNumber);
  const maxExercises = maxExercisesForDuration(sessionMinutes);
  const volumeTolerance = deriveVolumeTolerance(sessionMinutes, goal, experience);

  // Build weight lookup from key lifts overrides
  const weightOverrides: Record<string, number> = {};
  if (keyLifts) {
    weightOverrides['Barra Back Squat'] = keyLifts.squat;
    weightOverrides['Barra Front Squat'] = Math.round(keyLifts.squat * 0.75 / 2.5) * 2.5;
    weightOverrides['Barra Press de Banca'] = keyLifts.bench;
    weightOverrides['Barra Press Inclinado'] = Math.round(keyLifts.bench * 0.8 / 2.5) * 2.5;
    weightOverrides['Mancuerna Press de Banca'] = Math.round(keyLifts.bench * 0.4 / 2.5) * 2.5;
    weightOverrides['Mancuerna Press Inclinado'] = Math.round(keyLifts.bench * 0.35 / 2.5) * 2.5;
    weightOverrides['Peso Muerto Convencional'] = keyLifts.deadlift;
    weightOverrides['Peso Muerto Sumo'] = keyLifts.deadlift;
    weightOverrides['Peso Muerto Rumano'] = Math.round(keyLifts.deadlift * 0.65 / 2.5) * 2.5;
    weightOverrides['Barra Press Militar'] = keyLifts.ohp;
    weightOverrides['Mancuerna Press Militar'] = Math.round(keyLifts.ohp * 0.4 / 2.5) * 2.5;
    weightOverrides['Press Banca Agarre Cerrado'] = Math.round(keyLifts.bench * 0.85 / 2.5) * 2.5;
    weightOverrides['Barra Remo Inclinado'] = Math.round(keyLifts.bench * 0.9 / 2.5) * 2.5;
    weightOverrides['Remo Pendlay'] = Math.round(keyLifts.bench * 0.85 / 2.5) * 2.5;
  }

  const generatedDays: GeneratedDay[] = split.days.map((dayTemplate, idx) => {
    const usedIds = new Set<string>();
    const generatedExercises: GeneratedExercise[] = [];

    // Trim slots to fit session duration: keep primaries/secondaries, trim accessories
    const slots = dayTemplate.slots.slice(0, maxExercises);

    for (const slot of slots) {
      const exercise = resolveExercise(slot, exercises, usedIds, { gender, training_experience: experience, limitations, injuries });
      if (!exercise) continue;

      usedIds.add(exercise.id);

      // ── Improvement 1: volume-tolerance sets scaling ──
      const baseSetsForRole = slot.role === 'primary'
        ? block.setsCompound + (slot.role === 'primary' ? cycleAdj.setsBonus : 0)
        : slot.role === 'secondary'
        ? block.setsCompound - 1 + Math.floor(cycleAdj.setsBonus / 2)
        : block.setsAccessory;
      const setsForRole = scaleSets(baseSetsForRole, volumeTolerance);

      // Get weight: override > estimate, then apply BMI scale
      const baseWeight = weightOverrides[exercise.name]
        ?? estimateWeight(exercise.name, bodyweight, experience, gender);
      const bmiScaledWeight = Math.round(baseWeight * bmiAdj.weightScale / 2.5) * 2.5;

      // Adjust weight for accessories (they use lighter weight in volume phase)
      const adjustedWeight = slot.role === 'accessory'
        ? Math.round(bmiScaledWeight * 0.9 / 2.5) * 2.5
        : bmiScaledWeight;

      // Apply BMI + cycle rep adjustments (cycle compresses range for more strength focus)
      const baseRepsMin = slot.role === 'accessory' ? Math.max(block.repsMin, 10) : block.repsMin;
      const baseRepsMax = slot.role === 'accessory' ? Math.max(block.repsMax, 15) : block.repsMax;
      const repsMin = baseRepsMin + bmiAdj.repsDelta;
      const repsMax = Math.max(repsMin + 1, baseRepsMax + bmiAdj.repsDelta - cycleAdj.repsRangeShrink);

      // Apply BMI + cycle RPE adjustments (clamp between 5 and 10)
      const baseRpe = slot.role === 'primary' ? block.rpeMax : block.rpeMin;
      const rpe = Math.max(5, Math.min(10, baseRpe + bmiAdj.rpeDelta + cycleAdj.rpeDelta));

      // ── Improvement 3: heterogeneous schemes ──────────
      const isometricConfig = ISOMETRIC_EXERCISES[exercise.name];
      const isIsometric = isometricConfig !== undefined;
      const isUnilateral = UNILATERAL_EXERCISES.has(exercise.name);

      const isoSeconds = isIsometric
        ? (isometricConfig[experience] ?? isometricConfig['intermediate'])
        : 0;

      // reps_min/max: for isometric these store the target seconds
      const finalRepsMin = isIsometric ? isoSeconds : repsMin;
      const finalRepsMax = isIsometric ? isoSeconds : repsMax;

      // ── Rest note (derived from volume tolerance + role) ──
      const rest = restSeconds(slot.role, volumeTolerance);

      // ── Build notes string ────────────────────────────
      const schemePrefix = isIsometric  ? `⏱ ${isoSeconds}s — `
                         : isUnilateral ? 'c/lado — '
                         : '';
      const injuryNote = injuryGuidanceNote(exercise, injuries);
      const notes = [
        `${schemePrefix}Peso de calibración — ajusta después de la sesión 1`,
        `${rest}s descanso`,
        injuryNote,
      ].filter(Boolean).join(' · ');

      generatedExercises.push({
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        category: exercise.category,
        role: slot.role,
        sets: setsForRole,
        reps_min: finalRepsMin,
        reps_max: finalRepsMax,
        rpe,
        weight: isIsometric ? 0 : adjustedWeight,
        is_calibration: !isIsometric,
        notes,
      });
    }

    return {
      day_number: idx + 1,
      day_name: dayTemplate.name,
      exercises: generatedExercises,
    };
  });

  return {
    name: `${split.label} — ${capitalize(goal)} · ${cycleAdj.label}`,
    split_type: split.type,
    total_days: days,
    days: generatedDays,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
