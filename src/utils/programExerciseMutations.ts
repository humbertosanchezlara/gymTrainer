import type { Exercise, ProgramDayExercise } from '../types';
import { estimateWeight } from '../engine/weightEstimator';
import { supabase } from '../lib/supabase';
import { normalizeProgramDayExercise } from './programState';
import { isExerciseSuitableForProfile } from '../engine/exerciseSuitability';
import { fetchActiveInjuries } from '../lib/injuryProfile';

interface ReplaceExerciseParams {
  userId: string;
  programId: string;
  currentWeek: number;
  fromExerciseId: string;
  toExerciseId: string;
  compatibleCategories?: string[];
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

function normalizeText(value?: string | null): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function dayMatchesCompatibleCategories(
  exercises: ProgramDayExercise[],
  dayName: string | null | undefined,
  compatibleCategories: string[],
): boolean {
  if (compatibleCategories.length === 0) return false;

  const dayCategorySet = new Set(exercises.map((exercise) => exercise.category));
  if (compatibleCategories.some((category) => dayCategorySet.has(category))) return true;

  const normalizedDayName = normalizeText(dayName);
  const hasPullCategory = compatibleCategories.some((category) => category.startsWith('PULL_'));
  const hasPushCategory = compatibleCategories.some((category) => category.startsWith('PUSH_'));
  const hasLegCategory = compatibleCategories.some((category) =>
    ['QUAD_DOMINANT', 'POSTERIOR_CHAIN', 'CALVES'].includes(category)
  );

  if (hasPullCategory && /pull|jalon|espalda|back/.test(normalizedDayName)) return true;
  if (hasPushCategory && /push|empuje|pecho|hombro/.test(normalizedDayName)) return true;
  if (hasLegCategory && /pierna|lower|leg|sentadilla/.test(normalizedDayName)) return true;

  return false;
}

export async function replaceExerciseInProgram({
  userId,
  programId,
  currentWeek,
  fromExerciseId,
  toExerciseId,
  compatibleCategories,
}: ReplaceExerciseParams): Promise<ReplaceExerciseResult> {
  if (fromExerciseId === toExerciseId) {
    throw new Error('El ejercicio de origen y destino no pueden ser iguales.');
  }

  const [{ data: exercises }, { data: profile }, { data: workingWeightRow }, injuries] = await Promise.all([
    supabase.from('exercises').select('*').eq('user_id', userId),
    supabase.from('profiles').select('bodyweight, training_experience, gender, limitations').eq('id', userId).single(),
    supabase.from('working_weights').select('weight').eq('user_id', userId).eq('exercise_id', toExerciseId).maybeSingle(),
    fetchActiveInjuries(userId),
  ]);

  const allExercises = (exercises ?? []) as Exercise[];
  const removed = allExercises.find((exercise) => exercise.id === fromExerciseId);
  const replacement = allExercises.find((exercise) => exercise.id === toExerciseId);

  if (!removed || !replacement) {
    throw new Error('No se encontró alguno de los ejercicios seleccionados.');
  }

  const suitabilityProfile = profile ? { ...profile, injuries } : { injuries };
  if (!isExerciseSuitableForProfile(replacement, suitabilityProfile)) {
    throw new Error('El reemplazo no es adecuado para el perfil actual.');
  }

  const canCrossCategoryReplace = compatibleCategories?.includes(replacement.category) ?? false;

  if (removed.category !== replacement.category && !canCrossCategoryReplace) {
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
    .select('id, day_name, exercises, week_num')
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
    const canReplaceInDay = removed.category === replacement.category || dayMatchesCompatibleCategories(
      normalized,
      day.day_name,
      compatibleCategories ?? [],
    );

    if (!canReplaceInDay) continue;

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
