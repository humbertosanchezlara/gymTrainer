export type ProgressionAction = 'up' | 'keep' | 'warn';

export interface ProgressionResult {
  exercise_name: string;
  prev_weight: number;
  next_weight: number;
  action: ProgressionAction;
  note?: string;
}

const KG_TO_LBS = 2.20462;

export function kgToLbs(kg: number): number {
  return Math.round(kg * KG_TO_LBS);
}

function formatKg(kg: number): string {
  return Number.isInteger(kg) ? `${kg}` : `${kg.toFixed(1)}`;
}

function formatWeight(kg: number): string {
  return `${formatKg(kg)} kg (${kgToLbs(kg)} lb)`;
}

export function formatProgressionResult(result: ProgressionResult): string {
  const detail = result.note ? ` (${result.note})` : '';

  if (result.action === 'up') {
    return `${result.exercise_name}: subir de ${formatWeight(result.prev_weight)} a ${formatWeight(result.next_weight)}${detail}`;
  }

  if (result.next_weight < result.prev_weight) {
    return `${result.exercise_name}: bajar de ${formatWeight(result.prev_weight)} a ${formatWeight(result.next_weight)}${detail}`;
  }

  return `${result.exercise_name}: mantener ${formatWeight(result.prev_weight)}; no subas hasta cumplir reps y RPE objetivo${detail}`;
}

export function buildSessionProgressionNotes(results: ProgressionResult[]): string | null {
  const notable = results.filter((result) => result.action !== 'keep');
  if (notable.length === 0) return null;

  return `Ajustes sugeridos para la próxima sesión:\n${notable.map((result) => `- ${formatProgressionResult(result)}`).join('\n')}`;
}
