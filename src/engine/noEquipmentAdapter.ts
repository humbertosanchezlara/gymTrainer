// Adapter: bridges the band/bodyweight workout-engine with the existing
// Program / ProgramDay / ProgramDayExercise shape used by the app.

import { EXERCISE_DB } from '../workout-engine/lib/exerciseDb';
import { buildWeeklyPlan } from '../workout-engine/lib/routineEngine';
import type {
  Exercise as EngineExercise,
  MuscleGroup,
  UserProfile,
  WeeklyPlan,
  WorkoutDay,
  ExerciseSlot,
  SetScheme,
} from '../workout-engine/types/workout';
import type { Exercise, MovementCategory, ProgramDayExercise } from '../types';

// ─── Category mapping: engine Exercise → app MovementCategory ──

export function mapEngineCategory(ex: EngineExercise): MovementCategory {
  const prim = ex.primaryMuscles;
  const has = (m: MuscleGroup) => prim.includes(m);

  if (ex.category === 'legs') {
    if (has('calves')) return 'CALVES';
    if (has('glutes') || has('hamstrings')) return 'POSTERIOR_CHAIN';
    return 'QUAD_DOMINANT';
  }
  if (ex.category === 'push') {
    if (has('triceps') && !has('chest')) return 'ARMS';
    if (has('shoulders')) return 'PUSH_VERTICAL';
    return 'PUSH_HORIZONTAL';
  }
  if (ex.category === 'pull') {
    if (has('biceps')) return 'ARMS';
    if (has('rear_delts')) return 'PUSH_VERTICAL';
    if (ex.tags.includes('vertical') || ex.id.includes('pulldown') || ex.id.includes('pullover'))
      return 'PULL_VERTICAL';
    return 'PULL_HORIZONTAL';
  }
  if (ex.category === 'core') return 'CORE';
  return 'CORE'; // full_body → agruparlo como CORE
}

// List of (name, category) used to seed the exercises table for a no-equipment
// user. Order preserved from EXERCISE_DB to keep the list stable.
export const NO_EQUIPMENT_DEFAULT_EXERCISES: { name: string; category: MovementCategory }[] =
  Object.values(EXERCISE_DB).map((ex) => ({
    name: ex.nameEs,
    category: mapEngineCategory(ex),
  }));

// ─── Scheme → reps/sets rendering ──────────────────────────

function schemeToProgramFields(scheme: SetScheme): {
  sets: number;
  reps_min: number;
  reps_max: number;
  notesPrefix: string;
} {
  switch (scheme.type) {
    case 'reps': {
      const r = scheme.reps;
      if (Array.isArray(r)) {
        return { sets: scheme.sets, reps_min: r[0], reps_max: r[1], notesPrefix: '' };
      }
      return { sets: scheme.sets, reps_min: r, reps_max: r, notesPrefix: '' };
    }
    case 'reps_per_side':
      return {
        sets: scheme.sets,
        reps_min: scheme.reps,
        reps_max: scheme.reps,
        notesPrefix: 'c/lado — ',
      };
    case 'time':
      return {
        sets: scheme.sets,
        reps_min: scheme.seconds,
        reps_max: scheme.seconds,
        notesPrefix: `⏱ ${scheme.seconds}s — `,
      };
    case 'amrap':
      return { sets: scheme.sets, reps_min: 0, reps_max: 0, notesPrefix: 'AMRAP — ' };
  }
}

// ─── Role inference per section ────────────────────────────

function inferRole(
  sectionLabel: string,
  indexInSection: number
): ProgramDayExercise['role'] {
  if (/calentamiento/i.test(sectionLabel)) return 'accessory';
  if (/core/i.test(sectionLabel)) return 'accessory';
  if (/circuito/i.test(sectionLabel)) return indexInSection === 0 ? 'primary' : 'secondary';
  // Bloque principal / supersets
  if (indexInSection === 0) return 'primary';
  if (indexInSection < 3) return 'secondary';
  return 'accessory';
}

// ─── Convert a single slot → ProgramDayExercise ────────────

function slotToProgramExercise(
  slot: ExerciseSlot,
  sectionLabel: string,
  indexInSection: number,
  exerciseByName: Map<string, Exercise>
): ProgramDayExercise {
  const engineEx = slot.exercise;
  const dbEx = exerciseByName.get(engineEx.nameEs);

  const { sets, reps_min, reps_max, notesPrefix } = schemeToProgramFields(slot.scheme);

  const restNote = slot.restSeconds > 0 ? `${slot.restSeconds}s descanso` : '';
  const pairedNote = slot.pairedWith ? 'superset' : '';
  const extraNotes = [notesPrefix, slot.notes, restNote, pairedNote]
    .filter(Boolean)
    .join(' · ');

  return {
    exercise_id: dbEx?.id ?? (() => {
      console.warn(`[noEquipmentAdapter] Ejercicio no encontrado en BD: "${engineEx.nameEs}". Asegúrate de ejecutar migration_bands.sql`);
      return `MISSING:${engineEx.nameEs}`;
    })(),
    exercise_name: dbEx?.name || engineEx.nameEs,
    category: dbEx?.category || mapEngineCategory(engineEx),
    role: inferRole(sectionLabel, indexInSection),
    sets,
    reps_min,
    reps_max,
    rpe: 8,
    weight: 0, // bodyweight / band — sin peso en kg
    is_calibration: false,
    notes: extraNotes,
  };
}

// ─── Full day → ProgramDay-shape ───────────────────────────

function dayToProgramExercises(
  day: WorkoutDay,
  exerciseByName: Map<string, Exercise>
): ProgramDayExercise[] {
  const result: ProgramDayExercise[] = [];
  for (const section of day.sections) {
    section.exercises.forEach((slot, i) => {
      const pe = slotToProgramExercise(slot, section.label, i, exerciseByName);
      if (pe) result.push(pe);
    });
  }
  return result;
}

// ─── Public: derive an engine UserProfile from app state ───

export function deriveEngineProfile(opts: {
  experience: string;
  scheduleDays: number;
  sessionMinutes: number;
  goal: string;
  hasBands?: boolean;
  hasPullupBar?: boolean;
  volumeLevel?: 'basic' | 'intermediate' | 'advanced';
}): UserProfile {
  const hasBands = opts.hasBands !== false;

  const level =
    opts.experience === 'beginner'
      ? 'beginner'
      : opts.experience === 'advanced'
      ? 'advanced'
      : 'intermediate';

  let volumeTolerance: 'low' | 'medium' | 'high' | 'very_high';
  if (opts.volumeLevel === 'basic') {
    volumeTolerance = 'low';
  } else if (opts.volumeLevel === 'intermediate') {
    volumeTolerance = 'high';
  } else if (opts.volumeLevel === 'advanced') {
    volumeTolerance = 'very_high';
  } else {
    // Derive from session length and experience
    volumeTolerance =
      opts.sessionMinutes <= 30
        ? 'low'
        : opts.sessionMinutes <= 50
        ? 'medium'
        : opts.experience === 'advanced' || opts.goal === 'hypertrophy'
        ? 'very_high'
        : 'high';
  }

  return {
    level,
    volumeTolerance,
    equipment: hasBands
      ? ['band', 'bodyweight', 'band_anchor_high', 'band_anchor_low', 'band_anchor_door', 'chair']
      : ['bodyweight', 'chair'],
    restrictions: opts.hasPullupBar ? [] : ['no_pullup_bar'],
    daysPerWeek: Math.min(Math.max(opts.scheduleDays, 2), 5),
  };
}

// ─── Public: generate a program in the app shape ───────────

export interface GeneratedNoEquipmentProgram {
  name: string;
  split_type: string;
  total_days: number;
  total_weeks: number;
  days: {
    day_number: number;
    day_name: string;
    exercises: ProgramDayExercise[];
  }[];
  sourcePlan: WeeklyPlan;
}

export function generateNoEquipmentProgram(
  profile: UserProfile,
  exercises: Exercise[],
  weekNumber = 1
): GeneratedNoEquipmentProgram {
  const plan = buildWeeklyPlan(profile, weekNumber);
  const byName = new Map<string, Exercise>();
  for (const e of exercises) byName.set(e.name, e);

  const days = plan.days.map((d) => ({
    day_number: d.dayNumber,
    day_name: d.title,
    exercises: dayToProgramExercises(d, byName),
  }));

  const splitType =
    plan.days.length <= 2
      ? 'Full Body'
      : plan.days.length === 3
      ? 'Push / Pull / Legs'
      : plan.days.length === 4
      ? 'Upper / Lower híbrido'
      : 'PPL + Upper + Full Body';

  const hasBandEquip = profile.equipment.includes('band');

  return {
    name: hasBandEquip
      ? 'Programa sin equipo — bandas + peso corporal'
      : 'Programa de peso corporal',
    split_type: splitType,
    total_days: plan.days.length,
    total_weeks: 12,
    days,
    sourcePlan: plan,
  };
}
