import type { PainPattern, UserInjury, InjurySide } from '../types';
import { supabase } from './supabase';

export interface InjuryDraft {
  enabled: boolean;
  body_part: string;
  side: InjurySide;
  pain_pattern: PainPattern;
  trigger_sensation: string;
  avoided_exercise_names: string;
  tolerated_exercise_names: string;
}

export const DEFAULT_INJURY_DRAFT: InjuryDraft = {
  enabled: false,
  body_part: 'rodilla_menisco',
  side: 'left',
  pain_pattern: 'delayed_next_day',
  trigger_sensation: 'El cuádriceps se tensa al día siguiente si se sobrecarga.',
  avoided_exercise_names: 'Barra Back Squat, Sentadilla Búlgara, Zancadas, Sentadilla Goblet',
  tolerated_exercise_names: 'Prensa de Piernas, Prensa Horizontal (Máquina), Extensión de Pierna, Hip Thrust (Barra), Peso Muerto Rumano, Curl Femoral (Tumbado), Curl Femoral (Sentado)',
};

function splitNames(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinNames(value: string[] | null | undefined): string {
  return (value ?? []).join(', ');
}

export async function fetchActiveInjuries(userId: string): Promise<UserInjury[]> {
  const { data, error } = await supabase
    .from('user_injuries')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true);

  if (error) {
    console.warn('[injuryProfile] Could not fetch injuries:', error);
    return [];
  }

  return (data ?? []) as UserInjury[];
}

export async function fetchPrimaryInjuryDraft(userId: string): Promise<InjuryDraft> {
  const { data, error } = await supabase
    .from('user_injuries')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return DEFAULT_INJURY_DRAFT;

  const injury = data as UserInjury;
  return {
    enabled: true,
    body_part: injury.body_part,
    side: injury.side,
    pain_pattern: injury.pain_pattern,
    trigger_sensation: injury.trigger_sensation ?? '',
    avoided_exercise_names: joinNames(injury.avoided_exercise_names),
    tolerated_exercise_names: joinNames(injury.tolerated_exercise_names),
  };
}

export async function savePrimaryInjuryDraft(userId: string, draft: InjuryDraft): Promise<UserInjury[]> {
  if (!draft.enabled) {
    await supabase
      .from('user_injuries')
      .update({ active: false })
      .eq('user_id', userId)
      .eq('active', true);
    return [];
  }

  const { data: existing } = await supabase
    .from('user_injuries')
    .select('id')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const payload = {
    user_id: userId,
    body_part: draft.body_part.trim() || DEFAULT_INJURY_DRAFT.body_part,
    side: draft.side,
    pain_pattern: draft.pain_pattern,
    trigger_sensation: draft.trigger_sensation.trim() || null,
    avoided_exercise_names: splitNames(draft.avoided_exercise_names),
    tolerated_exercise_names: splitNames(draft.tolerated_exercise_names),
    clean_weeks_required: 2,
    progression_order: ['reps', 'weight'],
    active: true,
  };

  if (existing?.id) {
    await supabase.from('user_injuries').update(payload).eq('id', existing.id);
  } else {
    await supabase.from('user_injuries').insert(payload);
  }

  return fetchActiveInjuries(userId);
}
