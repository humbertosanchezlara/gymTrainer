import { exerciseSuitabilityScore } from '../engine/exerciseSuitability';
import type { UserInjury } from '../types';

export interface ReplaceableProgramExercise {
  exercise_id?: string;
  exercise_name?: string;
  name?: string;
  sets?: number;
  reps_min?: number;
  reps_max?: number;
  weight?: number;
  rpe?: number;
  role?: string;
  category?: string;
  notes?: string;
}

export interface ReplacementCandidate {
  id: string;
  name: string;
  category: string;
  rank: 1 | 2 | 3;
  reason: string;
}

export interface ReplacementTrainingContext {
  gender: string;
  training_experience: string;
  limitations?: string | null;
  injuries?: UserInjury[] | null;
}

const PULL_CATEGORIES = ['PULL_VERTICAL', 'PULL_HORIZONTAL'];
const PUSH_CATEGORIES = ['PUSH_HORIZONTAL', 'PUSH_VERTICAL'];
const LEG_CATEGORIES = ['QUAD_DOMINANT', 'POSTERIOR_CHAIN', 'CALVES'];

export function normalizeReplacementText(value?: string | null): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function dayIncludesAny(todayExercises: ReplaceableProgramExercise[], categories: string[]): boolean {
  const categorySet = new Set(categories);
  return todayExercises.some((exercise) => exercise.category && categorySet.has(exercise.category));
}

export function inferReplacementCategories(
  selected: ReplaceableProgramExercise,
  todayExercises: ReplaceableProgramExercise[],
  dayName: string | null,
): string[] {
  const selectedCategory = selected.category;
  if (!selectedCategory) return [];

  const normalizedDayName = normalizeReplacementText(dayName);
  const looksLikePullDay = /pull|jalon|espalda|back/.test(normalizedDayName) || dayIncludesAny(todayExercises, PULL_CATEGORIES);
  const looksLikePushDay = /push|empuje|pecho|hombro/.test(normalizedDayName) || dayIncludesAny(todayExercises, PUSH_CATEGORIES);
  const looksLikeLegDay = /pierna|lower|leg|sentadilla/.test(normalizedDayName) || dayIncludesAny(todayExercises, LEG_CATEGORIES);

  if (looksLikePullDay && LEG_CATEGORIES.includes(selectedCategory)) {
    return PULL_CATEGORIES;
  }

  if (!looksLikePullDay && looksLikePushDay && LEG_CATEGORIES.includes(selectedCategory)) {
    return PUSH_CATEGORIES;
  }

  if (
    !looksLikePullDay
    && !looksLikePushDay
    && looksLikeLegDay
    && [...PULL_CATEGORIES, ...PUSH_CATEGORIES].includes(selectedCategory)
  ) {
    return LEG_CATEGORIES;
  }

  return [selectedCategory];
}

function candidateNameScore(candidateName: string, selected: ReplaceableProgramExercise, dayName: string | null): number {
  const candidate = normalizeReplacementText(candidateName);
  const selectedName = normalizeReplacementText(selected.exercise_name ?? selected.name);
  const normalizedDayName = normalizeReplacementText(dayName);
  let score = 0;

  if (/jalon|dominada|pull/.test(candidate) && /jalon|pull|espalda|back/.test(normalizedDayName)) score += 16;
  if (/remo/.test(candidate) && /espalda|back|pull/.test(normalizedDayName)) score += 12;
  if (/press|banca|pecho/.test(candidate) && /push|empuje|pecho/.test(normalizedDayName)) score += 14;
  if (/sentadilla|prensa|squat/.test(candidate) && /pierna|leg|lower/.test(normalizedDayName)) score += 14;
  if (/peso muerto|rumano|curl femoral|hip thrust/.test(candidate) && /posterior|pierna|leg|lower/.test(normalizedDayName)) score += 12;

  if (/barra/.test(candidate) && /barra/.test(selectedName)) score += 5;
  if (/mancuerna/.test(candidate) && /mancuerna/.test(selectedName)) score += 5;
  if (/maquina/.test(candidate) && /maquina/.test(selectedName)) score += 4;
  if (/cable|polea/.test(candidate) && /cable|polea/.test(selectedName)) score += 4;

  return score;
}

export function rankReplacementCandidates(
  candidates: Array<{ id: string; name: string; category: string }>,
  selected: ReplaceableProgramExercise,
  todayExercises: ReplaceableProgramExercise[],
  dayName: string | null,
  replacementCategories: string[],
  trainingContext: ReplacementTrainingContext | null,
): ReplacementCandidate[] {
  const categoryCounts = todayExercises.reduce<Record<string, number>>((counts, exercise) => {
    if (!exercise.category) return counts;
    counts[exercise.category] = (counts[exercise.category] ?? 0) + 1;
    return counts;
  }, {});

  return candidates
    .map((candidate) => {
      const categoryIndex = replacementCategories.indexOf(candidate.category);
      const categoryScore = categoryIndex === -1 ? 0 : (replacementCategories.length - categoryIndex) * 30;
      const dayScore = (categoryCounts[candidate.category] ?? 0) * 18;
      const selectedScore = selected.category === candidate.category ? 16 : 0;
      const score = categoryScore
        + dayScore
        + selectedScore
        + candidateNameScore(candidate.name, selected, dayName)
        + exerciseSuitabilityScore(candidate, trainingContext);
      const reason = selected.category === candidate.category
        ? 'Misma categoría del ejercicio original'
        : categoryCounts[candidate.category]
          ? 'Encaja mejor con el enfoque de esta sesión'
          : 'Compatible con el patrón del día';

      return { ...candidate, score, reason };
    })
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      return scoreDiff === 0 ? a.name.localeCompare(b.name, 'es') : scoreDiff;
    })
    .slice(0, 3)
    .map((candidate, index) => ({
      id: candidate.id,
      name: candidate.name,
      category: candidate.category,
      rank: (index + 1) as 1 | 2 | 3,
      reason: candidate.reason,
    }));
}
