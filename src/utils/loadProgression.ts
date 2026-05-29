export interface PerformanceForLoadEstimate {
  reps: number;
  weight: number;
  rpe: number | null;
}

export interface LoadTarget {
  repsMin?: number;
  repsMax?: number;
  rpe?: number;
}

export function roundToWeightIncrement(weight: number, increment = 2.5): number {
  return Math.round(weight / increment) * increment;
}

function rpeToRir(rpe: number | null | undefined): number | null {
  if (rpe === null || rpe === undefined || Number.isNaN(rpe)) return null;
  return Math.max(0, Math.min(5, 10 - rpe));
}

function estimateOneRepMax(weight: number, repsToFailure: number): number {
  return weight * (1 + repsToFailure / 30);
}

export function estimateWeightForRepTarget(
  previous: PerformanceForLoadEstimate,
  target: LoadTarget,
): number | null {
  const targetRepsMax = target.repsMax;
  if (!targetRepsMax || previous.weight <= 0) return null;

  const previousRir = rpeToRir(previous.rpe);
  const targetRir = rpeToRir(target.rpe);
  if (previousRir === null || targetRir === null) return null;

  const targetRepsMin = target.repsMin ?? targetRepsMax;
  const targetReps = Math.round((targetRepsMin + targetRepsMax) / 2);
  const previousRepsToFailure = previous.reps + previousRir;
  const targetRepsToFailure = targetReps + targetRir;
  if (Math.abs(previousRepsToFailure - targetRepsToFailure) < 2) return null;

  const previousE1rm = estimateOneRepMax(previous.weight, previous.reps + previousRir);
  const estimated = previousE1rm / (1 + (targetReps + targetRir) / 30);
  const rounded = roundToWeightIncrement(estimated);

  return rounded > 0 && rounded !== previous.weight ? rounded : null;
}
