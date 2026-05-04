import type { Exercise } from '../types';
import type { UserInjury } from '../types';
import { injurySuitabilityScore, isExerciseAllowedByInjuries } from './injuryExerciseRules';

export interface ExerciseSuitabilityProfile {
  gender?: string | null;
  training_experience?: string | null;
  limitations?: string | null;
  injuries?: UserInjury[] | null;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const GENERIC_EXERCISE_WORDS = new Set([
  'barra',
  'cable',
  'mancuerna',
  'mancuernas',
  'maquina',
  'press',
  'remo',
  'sentadilla',
  'squat',
  'peso',
  'muerto',
  'curl',
  'extension',
  'elevacion',
  'jalon',
]);

function significantTokens(value: string): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 3);
}

export function exerciseConflictsWithLimitations(exerciseName: string, limitations?: string | null): boolean {
  if (!limitations?.trim()) return false;

  const normalizedLimitations = normalizeText(limitations);
  const exercisePhrase = normalizeText(exerciseName);
  if (normalizedLimitations.includes(exercisePhrase)) return true;

  const exerciseTokens = significantTokens(exerciseName);
  if (exerciseTokens.length === 0) return false;

  const allTokensPresent = exerciseTokens.every((token) => normalizedLimitations.includes(token));
  if (allTokensPresent) return true;

  const distinctiveTokens = exerciseTokens.filter((token) => !GENERIC_EXERCISE_WORDS.has(token));
  return distinctiveTokens.length > 0 && distinctiveTokens.every((token) => normalizedLimitations.includes(token));
}

function isWeightedPullUp(exerciseName: string): boolean {
  const name = normalizeText(exerciseName);
  return name.includes('dominadas con lastre') || name.includes('weighted pull');
}

function isAssistedPullUp(exerciseName: string): boolean {
  const name = normalizeText(exerciseName);
  return name.includes('dominadas con apoyo') || name.includes('assisted pull');
}

function shouldPreferAssistedPullUp(profile?: ExerciseSuitabilityProfile | null): boolean {
  const experience = profile?.training_experience ?? 'intermediate';
  const gender = profile?.gender ?? 'male';
  return gender === 'female' || experience === 'beginner';
}

export function isExerciseSuitableForProfile(
  exercise: Pick<Exercise, 'name'>,
  profile?: ExerciseSuitabilityProfile | null,
): boolean {
  const experience = profile?.training_experience ?? 'intermediate';

  if (exerciseConflictsWithLimitations(exercise.name, profile?.limitations)) {
    return false;
  }

  if (!isExerciseAllowedByInjuries(exercise as Pick<Exercise, 'name' | 'category'>, profile)) {
    return false;
  }

  if (isWeightedPullUp(exercise.name)) {
    return experience === 'advanced';
  }

  return true;
}

export function exerciseSuitabilityScore(
  exercise: Pick<Exercise, 'name'>,
  profile?: ExerciseSuitabilityProfile | null,
): number {
  const experience = profile?.training_experience ?? 'intermediate';
  const gender = profile?.gender ?? 'male';
  const name = normalizeText(exercise.name);

  if (isWeightedPullUp(exercise.name) && !isExerciseSuitableForProfile(exercise, profile)) {
    return -1000;
  }

  if (isAssistedPullUp(exercise.name) && shouldPreferAssistedPullUp(profile)) {
    return 34;
  }

  if (isAssistedPullUp(exercise.name)) {
    return experience === 'advanced' ? -8 : 12;
  }

  if ((name === 'dominadas' || name.includes('dominadas supinacion')) && gender === 'female' && experience !== 'advanced') {
    return -18;
  }

  return injurySuitabilityScore(exercise as Pick<Exercise, 'name' | 'category'>, profile);
}
