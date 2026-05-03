import type { Exercise } from '../types';

export interface ExerciseSuitabilityProfile {
  gender?: string | null;
  training_experience?: string | null;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
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

  return 0;
}
