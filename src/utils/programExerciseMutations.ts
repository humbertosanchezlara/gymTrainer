import type { Exercise, ProgramDayExercise } from '../types';
import { estimateWeight } from '../engine/weightEstimator';
import { supabase } from '../lib/supabase';
import { normalizeProgramDayExercise } from './programState';

interface ReplaceExerciseParams {
  userId: string;
  programId: string;
  currentWeek: number;
  fromExerciseId: string;
  toExerciseId: string;
}

interface ReplaceExerciseResult {
  updatedDayIds: string[];
  replacement: Exercise;
  removed: Exercise;
  usedExistingWeight: boolean;
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

function buildReplacementExercise(
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

export async function replaceExerciseInProgram({
  userId,
  programId,
  currentWeek,
  fromExerciseId,
  toExerciseId,
}: ReplaceExerciseParams): Promise<ReplaceExerciseResult> {
  if (fromExerciseId === toExerciseId) {
    throw new Error('El ejercicio de origen y destino no pueden ser iguales.');
  }

  const [{ data: exercises }, { data: profile }, { data: workingWeightRow }] = await Promise.all([
    supabase.from('exercises').select('*').eq('user_id', userId),
    supabase.from('profiles').select('bodyweight, training_experience, gender').eq('id', userId).single(),
    supabase.from('working_weights').select('weight').eq('user_id', userId).eq('exercise_id', toExerciseId).maybeSingle(),
  ]);

  const allExercises = (exercises ?? []) as Exercise[];
  const removed = allExercises.find((exercise) => exercise.id === fromExerciseId);
  const replacement = allExercises.find((exercise) => exercise.id === toExerciseId);

  if (!removed || !replacement) {
    throw new Error('No se encontró alguno de los ejercicios seleccionados.');
  }

  if (removed.category !== replacement.category) {
    throw new Error('El reemplazo debe pertenecer a la misma categoría.');
  }

  const existingWeight = workingWeightRow?.weight ? Number(workingWeightRow.weight) : null;
  const replacementWeight = existingWeight ?? (
    Math.round(
      estimateWeight(
        replacement.name,
        Number(profile?.bodyweight) || 75,
        profile?.training_experience ?? 'intermediate',
        profile?.gender ?? 'male'
      ) / 2.5
    ) * 2.5
  );
  const needsCalibration = existingWeight === null;

  const { data: futureDays, error: futureDaysError } = await supabase
    .from('program_days')
    .select('id, exercises, week_num')
    .eq('program_id', programId)
    .gte('week_num', currentWeek)
    .order('week_num')
    .order('day_number');

  if (futureDaysError) throw futureDaysError;

  const updatedDayIds: string[] = [];

  for (const day of futureDays ?? []) {
    const normalized = (Array.isArray(day.exercises) ? day.exercises : []).map((exercise) =>
      normalizeProgramDayExercise(exercise as Record<string, unknown>)
    );
    const alreadyHasReplacement = normalized.some(
      (exercise) => exercise.exercise_id === toExerciseId && exercise.exercise_id !== fromExerciseId
    );

    let changed = false;
    const updatedExercises = normalized.flatMap((exercise) => {
      if (exercise.exercise_id !== fromExerciseId) return [exercise];
      changed = true;
      if (alreadyHasReplacement) return [];
      return [buildReplacementExercise(exercise, replacement, replacementWeight, needsCalibration)];
    });

    if (!changed) continue;

    const { error: updateError } = await supabase
      .from('program_days')
      .update({ exercises: updatedExercises })
      .eq('id', day.id);

    if (updateError) throw updateError;
    updatedDayIds.push(day.id);
  }

  const [{ error: disableError }, { error: enableError }] = await Promise.all([
    supabase.from('exercises').update({ status: 'NO' }).eq('id', fromExerciseId),
    supabase.from('exercises').update({ status: 'YES' }).eq('id', toExerciseId),
  ]);

  if (disableError) throw disableError;
  if (enableError) throw enableError;

  return {
    updatedDayIds,
    replacement,
    removed,
    usedExistingWeight: existingWeight !== null,
  };
}
