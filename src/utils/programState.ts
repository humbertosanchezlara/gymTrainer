import { supabase } from '../lib/supabase';
import type { Program, ProgramDayExercise } from '../types';

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

export async function fetchProgramProgressState(
  userId: string,
  program: Pick<Program, 'created_at' | 'total_days' | 'total_weeks'>
): Promise<ProgramProgressState> {
  const [countRes, lastSessionRes] = await Promise.all([
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', program.created_at)
      .not('block_num', 'is', null),
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

  const sessionCount = countRes.count ?? 0;
  return deriveProgramProgressState(program, sessionCount, lastSessionRes.data?.date ?? null);
}

export function deriveProgramProgressState(
  program: Pick<Program, 'total_days' | 'total_weeks'>,
  sessionCount: number,
  lastSessionDate: string | null = null
): ProgramProgressState {
  const totalWeeks = program.total_weeks ?? 12;
  const totalDays = Math.max(program.total_days, 1);
  const totalProgramSessions = totalDays * totalWeeks;
  const programComplete = sessionCount >= totalProgramSessions;
  const completedWeeks = Math.floor(sessionCount / totalDays);
  const unclampedWeek = completedWeeks + 1;
  const currentWeek = programComplete ? totalWeeks : Math.min(unclampedWeek, totalWeeks);
  const currentDay = programComplete ? totalDays : (sessionCount % totalDays) + 1;
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
