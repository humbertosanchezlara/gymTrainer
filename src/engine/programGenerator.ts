import type { Exercise } from '../types';
import { getSplitTemplate, type ExerciseSlot } from './splitTemplates';
import { estimateWeight } from './weightEstimator';

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
 * Priority: preferred exercise (if available & YES) → any YES exercise in category → null
 */
function resolveExercise(
  slot: ExerciseSlot,
  exercises: Exercise[],
  usedIds: Set<string>
): Exercise | null {
  const available = exercises.filter(
    (e) => e.category === slot.category && e.status === 'YES' && !usedIds.has(e.id)
  );

  if (available.length === 0) {
    // Fallback: allow already-used exercises in this category
    const fallback = exercises.filter(
      (e) => e.category === slot.category && e.status === 'YES'
    );
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
    const pref = available.find((e) => e.name === slot.preferredExercise);
    if (pref) return pref;
  }

  return available[0];
}

// ─── Main Generator ──────────────────────────────────────
/**
 * Generate a complete training program.
 *
 * @param exercises - User's exercise library (only YES status will be used)
 * @param days - Number of training days per week
 * @param bodyweight - User's bodyweight in kg
 * @param experience - beginner | intermediate | advanced
 * @param keyLifts - Optional overrides for main compound weights
 * @param goal - hypertrophy | strength | fat_loss | general
 */
export function generateProgram(
  exercises: Exercise[],
  days: number,
  bodyweight: number,
  experience: string,
  keyLifts?: { squat: number; bench: number; deadlift: number; ohp: number },
  goal: string = 'hypertrophy'
): GeneratedProgram {
  const split = getSplitTemplate(days);
  const block = BLOCKS[0]; // Generate Day 1 details for Volume block (Week 1)

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

    for (const slot of dayTemplate.slots) {
      const exercise = resolveExercise(slot, exercises, usedIds);
      if (!exercise) continue;

      usedIds.add(exercise.id);

      const setsForRole = slot.role === 'primary'
        ? block.setsCompound
        : slot.role === 'secondary'
        ? block.setsCompound - 1
        : block.setsAccessory;

      // Get weight: override > estimate
      const weight = weightOverrides[exercise.name]
        ?? estimateWeight(exercise.name, bodyweight, experience);

      // Adjust weight for accessories (they use lighter weight in volume phase)
      const adjustedWeight = slot.role === 'accessory'
        ? Math.round(weight * 0.9 / 2.5) * 2.5
        : weight;

      generatedExercises.push({
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        category: exercise.category,
        role: slot.role,
        sets: setsForRole,
        reps_min: slot.role === 'accessory' ? Math.max(block.repsMin, 10) : block.repsMin,
        reps_max: slot.role === 'accessory' ? Math.max(block.repsMax, 15) : block.repsMax,
        rpe: slot.role === 'primary' ? block.rpeMax : block.rpeMin,
        weight: adjustedWeight,
        is_calibration: true,
        notes: 'Peso de calibración — ajusta después de la sesión 1',
      });
    }

    return {
      day_number: idx + 1,
      day_name: dayTemplate.name,
      exercises: generatedExercises,
    };
  });

  return {
    name: `${split.label} — ${capitalize(goal)}`,
    split_type: split.type,
    total_days: days,
    days: generatedDays,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
