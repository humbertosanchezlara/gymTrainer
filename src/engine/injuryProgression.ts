import type { InjuryCheckin, RangeStatus, SessionLog, SymptomLevel, UserInjury } from '../types';

export type InjuryProgressionDecisionType = 'advance_range' | 'advance_reps' | 'advance_weight' | 'hold' | 'deload';

export interface InjuryProgressionDecision {
  decision: InjuryProgressionDecisionType;
  rationale: string;
  weightScale?: number;
  weightDeltaPercent?: number;
  repDelta?: number;
  rangeStatus?: RangeStatus;
  note?: string;
}

function isoWeekKey(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function symptomExceeds(level: SymptomLevel, threshold: SymptomLevel): boolean {
  const order: SymptomLevel[] = ['none', 'mild_self_resolving', 'lasting_hours'];
  return order.indexOf(level) > order.indexOf(threshold);
}

export function countCleanWeeks(
  checkins: Pick<InjuryCheckin, 'checkin_date' | 'symptom_level'>[],
  threshold: SymptomLevel = 'mild_self_resolving',
): number {
  const completed = checkins.filter((checkin) => checkin.symptom_level !== 'pending');
  const byWeek = new Map<string, Pick<InjuryCheckin, 'checkin_date' | 'symptom_level'>[]>();

  for (const checkin of completed) {
    const week = isoWeekKey(checkin.checkin_date);
    const list = byWeek.get(week) ?? [];
    list.push(checkin);
    byWeek.set(week, list);
  }

  let clean = 0;
  for (const week of [...byWeek.keys()].sort().reverse()) {
    const dirty = byWeek.get(week)!.some((checkin) => symptomExceeds(checkin.symptom_level, threshold));
    if (dirty) break;
    clean += 1;
  }

  return clean;
}

export function decideInjuryProgression(params: {
  injury: UserInjury;
  currentLog: Pick<SessionLog, 'reps_per_set' | 'rpe' | 'range_status'> & {
    target_reps_max?: number;
    target_rpe?: number;
  };
  recentCheckins: Pick<InjuryCheckin, 'checkin_date' | 'symptom_level'>[];
}): InjuryProgressionDecision {
  const { injury, currentLog, recentCheckins } = params;
  const completedCheckins = recentCheckins.filter((checkin) => checkin.symptom_level !== 'pending');
  const lastCheckin = completedCheckins[completedCheckins.length - 1];

  if (lastCheckin?.symptom_level === 'lasting_hours') {
    return {
      decision: 'deload',
      rationale: 'La última señal post-sesión duró horas. Reduce carga o rango antes de progresar.',
      weightScale: 0.9,
      rangeStatus: 'partial',
      note: 'Deload por señal de lesión',
    };
  }

  const cleanWeeks = countCleanWeeks(completedCheckins);
  const required = injury.clean_weeks_required || 2;
  if (cleanWeeks < required) {
    return {
      decision: 'hold',
      rationale: `${cleanWeeks}/${required} semanas limpias. Mantén carga y rango.`,
      note: 'Mantener por progresión de lesión',
    };
  }

  const order = injury.progression_order?.length ? injury.progression_order : ['range', 'reps', 'weight'];
  const rangeMaxed = currentLog.range_status === 'target';
  const repsMaxed = Boolean(currentLog.target_reps_max && currentLog.reps_per_set >= currentLog.target_reps_max);
  const rpeOnTarget = !currentLog.target_rpe || !currentLog.rpe || currentLog.rpe <= currentLog.target_rpe;

  for (const step of order) {
    if (step === 'range' && !rangeMaxed) {
      return {
        decision: 'advance_range',
        rationale: `${cleanWeeks} semanas limpias. Prueba un poco más de rango sin forzar.`,
        rangeStatus: 'target',
        note: 'Progresar rango con control',
      };
    }

    if (step === 'reps' && !repsMaxed) {
      return {
        decision: 'advance_reps',
        rationale: `${cleanWeeks} semanas limpias. Sube 1 rep antes de tocar peso.`,
        repDelta: 1,
        note: 'Progresar reps antes de peso',
      };
    }

    if (step === 'weight' && repsMaxed && rpeOnTarget) {
      return {
        decision: 'advance_weight',
        rationale: `${cleanWeeks} semanas limpias con rango y reps objetivo. Sube peso gradualmente.`,
        weightDeltaPercent: 5,
        note: 'Progresión por lesión: +5%',
      };
    }
  }

  return {
    decision: 'hold',
    rationale: 'Todavía no se cumplen las condiciones para subir peso.',
    note: 'Mantener por control de lesión',
  };
}
