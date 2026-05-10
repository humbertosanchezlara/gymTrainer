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

export function formatProgressionResult(result: ProgressionResult): string {
  const detail = result.note ? ` (${result.note})` : '';

  if (result.action === 'up') {
    return `${result.exercise_name}: subir de ${result.prev_weight} kg (${kgToLbs(result.prev_weight)} lb) a ${result.next_weight} kg (${kgToLbs(result.next_weight)} lb)${detail}`;
  }

  return `${result.exercise_name}: revisar peso${detail}`;
}

export function buildSessionProgressionNotes(results: ProgressionResult[]): string | null {
  const notable = results.filter((result) => result.action !== 'keep');
  if (notable.length === 0) return null;

  return `Ajustes sugeridos para la próxima sesión:\n${notable.map((result) => `- ${formatProgressionResult(result)}`).join('\n')}`;
}
