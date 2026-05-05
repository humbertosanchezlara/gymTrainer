import type { Exercise, MovementCategory, UserInjury } from '../types';

export interface InjuryExerciseTags {
  kneeSafe?: boolean;
  highKneeFlexion?: boolean;
  rehabFriendly?: boolean;
  axialLoad?: boolean;
  sensitive?: boolean;
}

export interface InjurySuitabilityProfile {
  injuries?: UserInjury[] | null;
  limitations?: string | null;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function includesName(list: string[] | null | undefined, exerciseName: string): boolean {
  const exercise = normalizeText(exerciseName);
  return (list ?? []).some((item) => {
    const normalized = normalizeText(item);
    return exercise.includes(normalized) || normalized.includes(exercise);
  });
}

function isKneeInjury(injury: Pick<UserInjury, 'body_part'>): boolean {
  const bodyPart = normalizeText(injury.body_part);
  return /rodilla|knee|menisc/.test(bodyPart);
}

function nameMatchesAny(name: string, patterns: RegExp[]): boolean {
  const normalized = normalizeText(name);
  return patterns.some((pattern) => pattern.test(normalized));
}

const HIGH_KNEE_FLEXION = [
  /bulgara/,
  /bulgarian/,
  /zancada/,
  /desplante/,
  /lunge/,
  /sentadilla/,
  /squat/,
  /step ups?/,
  /subidas? al cajon/,
  /aductores/,
];

const KNEE_SAFE = [
  /prensa/,
  /leg press/,
  /extension de pierna/,
  /leg extension/,
  /tke/,
  /curl femoral/,
  /leg curl/,
  /hip thrust/,
  /peso muerto rumano/,
  /romanian deadlift/,
  /patada de gluteo/,
  /abductores/,
  /elevacion talones/,
  /calf raise/,
];

const REHAB_FRIENDLY = [
  /band/,
  /banda/,
  /isometr/,
  /balance/,
  /equilibrio/,
  /bosu/,
  /bossu/,
  /plancha/,
  /bird dog/,
  /dead bug/,
];

export function getInjuryExerciseTags(exerciseName: string, category?: MovementCategory | string | null): InjuryExerciseTags {
  const highKneeFlexion = nameMatchesAny(exerciseName, HIGH_KNEE_FLEXION);
  const kneeSafe = nameMatchesAny(exerciseName, KNEE_SAFE);
  const rehabFriendly = nameMatchesAny(exerciseName, REHAB_FRIENDLY);
  const axialLoad = nameMatchesAny(exerciseName, [/back squat/, /barra back squat/, /press militar/, /peso muerto convencional/]);
  const sensitive = highKneeFlexion || category === 'QUAD_DOMINANT';

  return { highKneeFlexion, kneeSafe, rehabFriendly, axialLoad, sensitive };
}

export function injuryAffectsExercise(
  exercise: Pick<Exercise, 'name' | 'category'>,
  injuries?: UserInjury[] | null,
): UserInjury | null {
  const activeInjuries = (injuries ?? []).filter((injury) => injury.active);
  for (const injury of activeInjuries) {
    if (includesName(injury.avoided_exercise_names, exercise.name) || includesName(injury.tolerated_exercise_names, exercise.name)) {
      return injury;
    }

    const tags = getInjuryExerciseTags(exercise.name, exercise.category);
    if (isKneeInjury(injury) && (tags.highKneeFlexion || tags.kneeSafe || exercise.category === 'QUAD_DOMINANT')) {
      return injury;
    }
  }

  return null;
}

export function isExerciseAllowedByInjuries(
  exercise: Pick<Exercise, 'name' | 'category'>,
  profile?: InjurySuitabilityProfile | null,
): boolean {
  const activeInjuries = (profile?.injuries ?? []).filter((injury) => injury.active);
  if (activeInjuries.length === 0) return true;

  for (const injury of activeInjuries) {
    if (includesName(injury.avoided_exercise_names, exercise.name)) return false;
    if (includesName(injury.tolerated_exercise_names, exercise.name)) continue;

    const tags = getInjuryExerciseTags(exercise.name, exercise.category);
    if (isKneeInjury(injury) && tags.highKneeFlexion && !tags.kneeSafe) return false;
  }

  return true;
}

export function injurySuitabilityScore(
  exercise: Pick<Exercise, 'name' | 'category'>,
  profile?: InjurySuitabilityProfile | null,
): number {
  const activeInjuries = (profile?.injuries ?? []).filter((injury) => injury.active);
  if (activeInjuries.length === 0) return 0;

  let score = 0;
  for (const injury of activeInjuries) {
    const tags = getInjuryExerciseTags(exercise.name, exercise.category);
    if (includesName(injury.tolerated_exercise_names, exercise.name)) score += 60;
    if (isKneeInjury(injury) && tags.kneeSafe) score += 34;
    if (tags.rehabFriendly) score += 14;
    if (isKneeInjury(injury) && tags.highKneeFlexion && !tags.kneeSafe) score -= 120;
  }

  return score;
}

export function injuryGuidanceNote(
  exercise: Pick<Exercise, 'name' | 'category'>,
  injuries?: UserInjury[] | null,
): string | null {
  const injury = injuryAffectsExercise(exercise, injuries);
  if (!injury) return null;

  const tags = getInjuryExerciseTags(exercise.name, exercise.category);
  if (includesName(injury.tolerated_exercise_names, exercise.name) || tags.kneeSafe) {
    return 'Rango controlado · no fuerces profundidad · observa la señal de mañana';
  }

  return null;
}
