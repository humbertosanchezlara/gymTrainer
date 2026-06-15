import type { Exercise, ProgramDayExercise } from '../types';
import { estimateWeight } from '../engine/weightEstimator';
import { supabase } from '../lib/supabase';
import { normalizeProgramDayExercise } from './programState';

export interface ProgramExerciseReplacementRule {
  from_exercise_id: string;
  to_exercise_id: string;
  compatible_categories: string[];
  from_week_num: number;
}

interface PersistReplacementParams {
  userId: string;
  programId: string;
  fromExerciseId: string;
  toExerciseId: string;
  currentWeek: number;
  compatibleCategories?: string[];
}

interface ApplyReplacementRulesParams {
  days: Array<{ exercises: ProgramDayExercise[] }>;
  rules: ProgramExerciseReplacementRule[];
  exercises: Exercise[];
  profile: {
    bodyweight?: number | null;
    training_experience?: string | null;
    gender?: string | null;
  } | null;
  workingWeights?: Map<string, number>;
}

function stripCalibrationPrefix(notes: string): string {
  return notes
    .replace('Peso de calibración — ajusta después de la sesión 1 · ', '')
    .replace('Peso de calibración — ajusta según tus sensaciones · ', '')
    .replace('Peso de calibración — ', '');
}

function buildReplacementNotes(notes: string, needsCalibration: boolean): string {
  const cleanNotes = stripCalibrationPrefix(notes);
  if (!needsCalibration) return cleanNotes;
  return cleanNotes ? `Peso de calibración — ${cleanNotes}` : 'Peso de calibración — ajusta según tus sensaciones';
}

export function buildReplacementProgramExercise(
  current: ProgramDayExercise,
  replacement: Exercise,
  replacementWeight: number,
  needsCalibration: boolean
): ProgramDayExercise {
  return {
    ...current,
    exercise_id: replacement.id,
    exercise_name: replacement.name,
    category: replacement.category,
    weight: replacementWeight,
    is_calibration: needsCalibration,
    notes: buildReplacementNotes(current.notes, needsCalibration),
  };
}

export function estimateReplacementWeight(
  replacement: Exercise,
  profile: ApplyReplacementRulesParams['profile'],
  workingWeights?: Map<string, number>
): { weight: number; needsCalibration: boolean } {
  const existingWeight = workingWeights?.get(replacement.id);
  if (existingWeight !== undefined) {
    return { weight: existingWeight, needsCalibration: false };
  }

  return {
    weight: Math.round(
      estimateWeight(
        replacement.name,
        Number(profile?.bodyweight) || 75,
        profile?.training_experience ?? 'intermediate',
        profile?.gender ?? 'male'
      ) / 2.5
    ) * 2.5,
    needsCalibration: true,
  };
}

export function applyProgramExerciseReplacementRules<TDay extends { exercises: ProgramDayExercise[] }>({
  days,
  rules,
  exercises,
  profile,
  workingWeights,
}: ApplyReplacementRulesParams & { days: TDay[] }): TDay[] {
  if (rules.length === 0) return days;

  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const sortedRules = [...rules].sort((a, b) => a.from_week_num - b.from_week_num);

  return days.map((day) => {
    let changed = false;
    let updatedExercises = day.exercises.map((exercise) => normalizeProgramDayExercise(exercise));

    for (const rule of sortedRules) {
      const replacement = exerciseById.get(rule.to_exercise_id);
      if (!replacement) continue;

      const alreadyHasReplacement = updatedExercises.some((entry) => entry.exercise_id === replacement.id);
      const replacementCategories = rule.compatible_categories.length > 0
        ? rule.compatible_categories
        : [replacement.category];

      let replacedSource = false;
      updatedExercises = updatedExercises.flatMap((exercise) => {
        if (exercise.exercise_id !== rule.from_exercise_id) return [exercise];
        changed = true;
        replacedSource = true;
        if (alreadyHasReplacement) return [];

        const { weight, needsCalibration } = estimateReplacementWeight(replacement, profile, workingWeights);
        return [buildReplacementProgramExercise(exercise, replacement, weight, needsCalibration)];
      });

      if (replacedSource || alreadyHasReplacement) continue;

      const compatibleIndex = updatedExercises.findIndex((exercise) =>
        exercise.role === 'accessory' && replacementCategories.includes(exercise.category)
      );
      if (compatibleIndex === -1) continue;

      const { weight, needsCalibration } = estimateReplacementWeight(replacement, profile, workingWeights);
      updatedExercises = updatedExercises.map((exercise, index) =>
        index === compatibleIndex
          ? buildReplacementProgramExercise(exercise, replacement, weight, needsCalibration)
          : exercise
      );
      changed = true;
    }

    return changed ? { ...day, exercises: updatedExercises } as TDay : day;
  }) as TDay[];
}

export async function fetchProgramExerciseReplacementRules(
  programId: string,
  weekNum: number
): Promise<ProgramExerciseReplacementRule[]> {
  const { data, error } = await supabase
    .from('program_exercise_replacements')
    .select('from_exercise_id, to_exercise_id, compatible_categories, from_week_num')
    .eq('program_id', programId)
    .eq('is_active', true)
    .lte('from_week_num', weekNum);

  if (error) {
    if (error.code === '42P01' || /program_exercise_replacements/.test(error.message)) {
      console.warn('[program replacements] table missing; skipping persistent replacement rules');
      return [];
    }
    throw error;
  }

  return (data ?? []).map((rule) => ({
    from_exercise_id: String(rule.from_exercise_id),
    to_exercise_id: String(rule.to_exercise_id),
    compatible_categories: Array.isArray(rule.compatible_categories) ? rule.compatible_categories as string[] : [],
    from_week_num: Number(rule.from_week_num) || 1,
  }));
}

export async function persistProgramExerciseReplacement({
  userId,
  programId,
  fromExerciseId,
  toExerciseId,
  currentWeek,
  compatibleCategories,
}: PersistReplacementParams): Promise<void> {
  const { error } = await supabase
    .from('program_exercise_replacements')
    .upsert(
      {
        user_id: userId,
        program_id: programId,
        from_exercise_id: fromExerciseId,
        to_exercise_id: toExerciseId,
        from_week_num: currentWeek,
        compatible_categories: compatibleCategories ?? [],
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'program_id,from_exercise_id' }
    );

  if (error) {
    if (error.code === '42P01' || /program_exercise_replacements/.test(error.message)) {
      console.warn('[program replacements] table missing; replacement rule was not persisted');
      return;
    }
    throw error;
  }
}
