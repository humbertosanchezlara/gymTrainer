import type { Exercise, InjuryCheckin, SessionLog, SymptomLevel, UserInjury } from '../types';
import { injuryAffectsExercise } from '../engine/injuryExerciseRules';
import { supabase } from './supabase';

export interface PendingInjuryCheckin extends InjuryCheckin {
  injury: UserInjury;
}

function tomorrowIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function createPendingInjuryCheckins(params: {
  userId: string;
  sessionId: string;
  logs: Array<Pick<SessionLog, 'exercise_id'>>;
  exercises: Exercise[];
  injuries: UserInjury[];
}): Promise<void> {
  const { userId, sessionId, logs, exercises, injuries } = params;
  const delayedInjuries = new Map<string, UserInjury>();

  for (const log of logs) {
    const exercise = exercises.find((item) => item.id === log.exercise_id);
    if (!exercise) continue;
    const injury = injuryAffectsExercise(exercise, injuries);
    if (injury?.pain_pattern === 'delayed_next_day') {
      delayedInjuries.set(injury.id, injury);
    }
  }

  const rows = [...delayedInjuries.values()].map((injury) => ({
    user_id: userId,
    injury_id: injury.id,
    session_id: sessionId,
    checkin_date: tomorrowIsoDate(),
    symptom_level: 'pending' as SymptomLevel,
  }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from('injury_checkins')
    .upsert(rows, { onConflict: 'injury_id,session_id' });

  if (error) throw error;
}

export async function fetchPendingInjuryCheckin(userId: string): Promise<PendingInjuryCheckin | null> {
  const { data, error } = await supabase
    .from('injury_checkins')
    .select('*, injury:user_injuries(*)')
    .eq('user_id', userId)
    .eq('symptom_level', 'pending')
    .lte('checkin_date', todayIsoDate())
    .order('checkin_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as PendingInjuryCheckin;
}

export async function submitInjuryCheckin(
  checkinId: string,
  symptomLevel: Exclude<SymptomLevel, 'pending'>,
  freeText?: string,
): Promise<void> {
  const { error } = await supabase
    .from('injury_checkins')
    .update({ symptom_level: symptomLevel, free_text: freeText || null })
    .eq('id', checkinId);

  if (error) throw error;
}

export async function fetchRecentInjuryCheckins(
  userId: string,
  injuryId: string,
): Promise<InjuryCheckin[]> {
  const { data, error } = await supabase
    .from('injury_checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('injury_id', injuryId)
    .neq('symptom_level', 'pending')
    .order('checkin_date', { ascending: true })
    .limit(30);

  if (error) {
    console.warn('[injuryCheckins] Could not fetch recent checkins:', error);
    return [];
  }

  return (data ?? []) as InjuryCheckin[];
}
