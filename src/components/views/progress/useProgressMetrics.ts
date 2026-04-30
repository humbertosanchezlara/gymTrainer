import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Exercise, Session, SessionLog, WorkingWeight } from '../../../types';

type SessionWithLogs = Session & { logs: (SessionLog & { exercise: Exercise | Exercise[] | null })[] };
type WeightWithExercise = WorkingWeight & { exercise?: Exercise | Exercise[] | null };

export interface WeeklyMetric {
  week: number;
  sessions: number;
  volume: number;
  avgRpe: number | null;
  label: string;
}

export interface LiftSnapshot {
  exerciseName: string;
  currentWeight: number;
  unitWeightLbs: number;
  latestLoggedWeight: number | null;
  lastSessionDate: string | null;
}

export interface ProgressMetricsState {
  sessions: SessionWithLogs[];
  weights: WeightWithExercise[];
  weeklyMetrics: WeeklyMetric[];
  liftSnapshots: LiftSnapshot[];
  summary: {
    totalSessions: number;
    gymSessions: number;
    currentBlockLabel: string;
    currentWeekLabel: string;
    recentWeeklyVolume: number;
    avgSessionsPerWeek: number;
    avgRpe: number | null;
  };
  loading: boolean;
}

const KG_TO_LBS = 2.20462;
const kgToLbs = (kg: number) => Math.round(kg * KG_TO_LBS);

function flattenExercise(exercise: Exercise | Exercise[] | null | undefined): Exercise | null {
  if (!exercise) return null;
  return Array.isArray(exercise) ? exercise[0] ?? null : exercise;
}

function getBlockLabel(blockNum: number | null): string {
  if (blockNum === 1) return 'Volumen';
  if (blockNum === 2) return 'Intensidad';
  if (blockNum === 3) return 'Pico';
  if (blockNum === 4) return 'Descarga';
  return '—';
}

export function useProgressMetrics(userId: string | undefined): ProgressMetricsState {
  const [sessions, setSessions] = useState<SessionWithLogs[]>([]);
  const [weights, setWeights] = useState<WeightWithExercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [sessionsRes, weightsRes] = await Promise.all([
          supabase
            .from('sessions')
            .select('*, logs:session_logs(*, exercise:exercises(*))')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(80),
          supabase
            .from('working_weights')
            .select('*, exercise:exercises(*)')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false }),
        ]);

        if (cancelled) return;
        setSessions((sessionsRes.data ?? []) as SessionWithLogs[]);
        setWeights((weightsRes.data ?? []) as WeightWithExercise[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [userId]);

  const metrics = useMemo(() => {
    const gymSessions = sessions.filter((session) => session.block_num !== null && session.week_num !== null);
    const weekMap = new Map<number, WeeklyMetric>();
    let totalRpe = 0;
    let totalRpeCount = 0;

    const exerciseLatest = new Map<string, { weight: number; date: string }>();

    for (const session of gymSessions) {
      const week = session.week_num ?? 0;
      const logs = Array.isArray(session.logs) ? session.logs : [];
      const volume = logs.reduce((sum, log) => sum + (Number(log.sets) || 0) * (Number(log.reps_per_set) || 0) * Math.max(Number(log.weight) || 0, 0), 0);
      let weekRpeTotal = 0;
      let weekRpeCount = 0;

      for (const log of logs) {
        const exercise = flattenExercise(log.exercise);
        if (exercise && Number(log.weight) > 0) {
          const current = exerciseLatest.get(exercise.name);
          const date = session.date;
          if (!current || new Date(date).getTime() > new Date(current.date).getTime()) {
            exerciseLatest.set(exercise.name, { weight: Number(log.weight), date });
          }
        }

        if (log.rpe !== null && log.rpe !== undefined) {
          weekRpeTotal += Number(log.rpe);
          weekRpeCount += 1;
          totalRpe += Number(log.rpe);
          totalRpeCount += 1;
        }
      }

      const existing = weekMap.get(week);
      const nextMetric: WeeklyMetric = {
        week,
        sessions: (existing?.sessions ?? 0) + 1,
        volume: (existing?.volume ?? 0) + volume,
        avgRpe: null,
        label: `Sem ${week}`,
      };

      const aggregateRpeTotal = (existing?.avgRpe ?? 0) * (existing?.sessions ?? 0) + (weekRpeCount > 0 ? weekRpeTotal / weekRpeCount : 0);
      const aggregateRpeCount = (existing?.sessions ?? 0) + (weekRpeCount > 0 ? 1 : 0);
      nextMetric.avgRpe = aggregateRpeCount > 0 ? aggregateRpeTotal / aggregateRpeCount : null;

      weekMap.set(week, nextMetric);
    }

    const weeklyMetrics = Array.from(weekMap.values()).sort((a, b) => a.week - b.week);
    const lastEightWeeks = weeklyMetrics.slice(-8);
    const latestGymSession = gymSessions[0] ?? null;
    const currentBlockLabel = latestGymSession ? getBlockLabel(latestGymSession.block_num) : '—';
    const currentWeekLabel = latestGymSession?.week_num ? `Semana ${latestGymSession.week_num}` : '—';
    const recentWeeklyVolume = lastEightWeeks.at(-1)?.volume ?? 0;
    const avgSessionsPerWeek = weeklyMetrics.length > 0
      ? Number((weeklyMetrics.reduce((sum, entry) => sum + entry.sessions, 0) / weeklyMetrics.length).toFixed(1))
      : 0;
    const avgRpe = totalRpeCount > 0 ? Number((totalRpe / totalRpeCount).toFixed(1)) : null;

    const liftSnapshots = weights
      .map((weightRow) => {
        const exercise = flattenExercise(weightRow.exercise);
        if (!exercise) return null;
        const latest = exerciseLatest.get(exercise.name) ?? null;
        return {
          exerciseName: exercise.name,
          currentWeight: Number(weightRow.weight),
          unitWeightLbs: kgToLbs(Number(weightRow.weight)),
          latestLoggedWeight: latest?.weight ?? null,
          lastSessionDate: latest?.date ?? null,
        } satisfies LiftSnapshot;
      })
      .filter((item): item is LiftSnapshot => Boolean(item))
      .sort((a, b) => b.currentWeight - a.currentWeight)
      .slice(0, 8);

    return {
      weeklyMetrics: lastEightWeeks,
      liftSnapshots,
      summary: {
        totalSessions: sessions.length,
        gymSessions: gymSessions.length,
        currentBlockLabel,
        currentWeekLabel,
        recentWeeklyVolume,
        avgSessionsPerWeek,
        avgRpe,
      },
    };
  }, [sessions, weights]);

  return {
    sessions,
    weights,
    weeklyMetrics: metrics.weeklyMetrics,
    liftSnapshots: metrics.liftSnapshots,
    summary: metrics.summary,
    loading,
  };
}
