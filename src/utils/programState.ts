import { supabase } from '../lib/supabase';
import type { ExerciseStatus, Program, ProgramDay, ProgramDayExercise } from '../types';

type LegacyProgramDayExercise = {
  exercise_id?: string;
  exercise_name?: string;
  name?: string;
  category?: string;
  role?: string;
  sets?: number;
  reps_min?: number;
  reps_max?: number;
  rpe?: number;
  weight?: number;
  is_calibration?: boolean;
  notes?: string;
};

export interface ProgramProgressState {
  sessionCount: number;
  currentWeek: number;
  currentDay: number;
  blockNum: number;
  blockName: string;
  programComplete: boolean;
  lastSessionDate: string | null;
}

export interface ProgramDayLoadResult {
  day: ProgramDay | null;
  sourceWeek: number | null;
  isFallback: boolean;
}

export interface ProgramWeekLoadResult {
  days: ProgramDay[];
  sourceWeek: number | null;
  isFallback: boolean;
}

type ProgressSessionRow = {
  id: string;
  week_num: number | null;
  day_num?: number | null;
  logs?: Array<{ id: string }>;
};

export type CompletedProgramSlotSet = Set<string>;

export function programSlotKey(weekNum: number, dayNum: number): string {
  return `${weekNum}:${dayNum}`;
}

export function getBlockInfo(week: number): { blockNum: number; blockName: string } {
  if (week <= 4) return { blockNum: 1, blockName: 'Volumen' };
  if (week <= 8) return { blockNum: 2, blockName: 'Intensidad' };
  if (week <= 11) return { blockNum: 3, blockName: 'Pico' };
  return { blockNum: 4, blockName: 'Descarga' };
}

export function normalizeProgramDayExercise(exercise: LegacyProgramDayExercise): ProgramDayExercise {
  return {
    exercise_id: exercise.exercise_id ?? '',
    exercise_name: exercise.exercise_name ?? exercise.name ?? '—',
    category: exercise.category ?? 'CORE',
    role: exercise.role === 'primary' || exercise.role === 'secondary' ? exercise.role : 'accessory',
    sets: exercise.sets ?? 0,
    reps_min: exercise.reps_min ?? 0,
    reps_max: exercise.reps_max ?? 0,
    rpe: exercise.rpe ?? 7,
    weight: exercise.weight ?? 0,
    is_calibration: exercise.is_calibration ?? false,
    notes: exercise.notes ?? '',
  };
}

export function normalizeExerciseStatus(status: ExerciseStatus | 'SUB' | null | undefined): ExerciseStatus {
  return status === 'NO' ? 'NO' : 'YES';
}

export function isExerciseEnabled(status: ExerciseStatus | 'SUB' | null | undefined): boolean {
  return normalizeExerciseStatus(status) === 'YES';
}

function normalizeProgramDay(day: ProgramDay): ProgramDay {
  return {
    ...day,
    exercises: (Array.isArray(day.exercises) ? day.exercises : []).map((exercise) =>
      normalizeProgramDayExercise(exercise as unknown as Record<string, unknown>)
    ),
  };
}

export async function fetchProgramWeekDays(
  programId: string,
  weekNum: number
): Promise<ProgramDay[]> {
  const { data, error } = await supabase
    .from('program_days')
    .select('*')
    .eq('program_id', programId)
    .eq('week_num', weekNum)
    .order('day_number');

  if (error) throw error;
  return (data ?? []).map((day) => normalizeProgramDay(day as ProgramDay));
}

export async function fetchProgramWeekDaysOrFallback(
  programId: string,
  weekNum: number,
  fallbackWeekNum = 1
): Promise<ProgramWeekLoadResult> {
  const primaryDays = await fetchProgramWeekDays(programId, weekNum);
  if (primaryDays.length > 0 || weekNum === fallbackWeekNum) {
    return { days: primaryDays, sourceWeek: primaryDays.length > 0 ? weekNum : null, isFallback: false };
  }

  const fallbackDays = await fetchProgramWeekDays(programId, fallbackWeekNum);
  return {
    days: fallbackDays,
    sourceWeek: fallbackDays.length > 0 ? fallbackWeekNum : null,
    isFallback: fallbackDays.length > 0,
  };
}

export async function fetchProgramDayForWeekOrFallback(
  programId: string,
  weekNum: number,
  dayNum: number,
  fallbackWeekNum = 1
): Promise<ProgramDayLoadResult> {
  const { days, sourceWeek, isFallback } = await fetchProgramWeekDaysOrFallback(programId, weekNum, fallbackWeekNum);
  return {
    day: days.find((day) => day.day_number === dayNum) ?? null,
    sourceWeek,
    isFallback,
  };
}

export async function fetchProgramProgressState(
  userId: string,
  program: Pick<Program, 'id' | 'created_at' | 'total_days' | 'total_weeks'>
): Promise<ProgramProgressState> {
  const [initialSessionsRes, lastSessionRes] = await Promise.all([
    fetchProgressSessions(userId, program.created_at, true),
    supabase
      .from('sessions')
      .select('date')
      .eq('user_id', userId)
      .gte('created_at', program.created_at)
      .not('block_num', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const sessionsRes = initialSessionsRes.error && /day_num/.test(initialSessionsRes.error.message)
    ? await fetchProgressSessions(userId, program.created_at, false)
    : initialSessionsRes;
  const sessions = (sessionsRes.data ?? []) as unknown as ProgressSessionRow[];
  const completedSessions = sessions.filter((session) =>
    Array.isArray(session.logs) && session.logs.length > 0
  );
  const hasScheduledSlots = completedSessions.some((session) =>
    typeof session.week_num === 'number' && typeof session.day_num === 'number'
  );
  const completedSlotKeys = hasScheduledSlots
    ? new Set(
        completedSessions
          .filter((session) => typeof session.week_num === 'number' && typeof session.day_num === 'number')
          .map((session) => programSlotKey(session.week_num as number, session.day_num as number))
      )
    : null;
  const sessionCount = hasScheduledSlots
    ? completedSlotKeys?.size ?? 0
    : completedSessions.length;
  return deriveProgramProgressState(program, sessionCount, lastSessionRes.data?.date ?? null, completedSlotKeys);
}

function fetchProgressSessions(userId: string, programCreatedAt: string, includeDayNum: boolean) {
  return supabase
    .from('sessions')
    .select(includeDayNum ? 'id, week_num, day_num, logs:session_logs(id)' : 'id, week_num, logs:session_logs(id)')
    .eq('user_id', userId)
    .gte('created_at', programCreatedAt)
    .not('block_num', 'is', null)
    .order('created_at', { ascending: true });
}

export function deriveProgramProgressState(
  program: Pick<Program, 'total_days' | 'total_weeks'>,
  sessionCount: number,
  lastSessionDate: string | null = null,
  completedSlotKeys: CompletedProgramSlotSet | null = null,
): ProgramProgressState {
  const totalWeeks = program.total_weeks ?? 12;
  const totalDays = Math.max(program.total_days, 1);
  const totalProgramSessions = totalDays * totalWeeks;
  const programComplete = sessionCount >= totalProgramSessions;

  let currentWeek: number;
  let currentDay: number;
  if (!programComplete && completedSlotKeys) {
    currentWeek = totalWeeks;
    currentDay = totalDays;

    for (let week = 1; week <= totalWeeks; week += 1) {
      const firstPendingDay = Array.from({ length: totalDays }, (_, index) => index + 1)
        .find((day) => !completedSlotKeys.has(programSlotKey(week, day)));
      if (firstPendingDay) {
        currentWeek = week;
        currentDay = firstPendingDay;
        break;
      }
    }
  } else {
    const completedWeeks = Math.floor(sessionCount / totalDays);
    const unclampedWeek = completedWeeks + 1;
    currentWeek = programComplete ? totalWeeks : Math.min(unclampedWeek, totalWeeks);
    currentDay = programComplete ? totalDays : (sessionCount % totalDays) + 1;
  }
  const { blockNum, blockName } = getBlockInfo(currentWeek);

  return {
    sessionCount,
    currentWeek,
    currentDay,
    blockNum,
    blockName,
    programComplete,
    lastSessionDate,
  };
}

export async function fetchCompletedProgramSlots(
  userId: string,
  program: Pick<Program, 'created_at'>
): Promise<CompletedProgramSlotSet> {
  const initialSessionsRes = await fetchProgressSessions(userId, program.created_at, true);
  const sessionsRes = initialSessionsRes.error && /day_num/.test(initialSessionsRes.error.message)
    ? await fetchProgressSessions(userId, program.created_at, false)
    : initialSessionsRes;
  if (sessionsRes.error) throw sessionsRes.error;

  const sessions = (sessionsRes.data ?? []) as unknown as ProgressSessionRow[];
  return new Set(
    sessions
      .filter((session) =>
        Array.isArray(session.logs)
        && session.logs.length > 0
        && typeof session.week_num === 'number'
        && typeof session.day_num === 'number'
      )
      .map((session) => programSlotKey(session.week_num as number, session.day_num as number))
  );
}
