import OpenAI from 'openai';
import { supabase } from './supabase';
import type { MovementCategory } from '../types';

// ─── Types ────────────────────────────────────────────────────

export type TravelDayLabel = 'A' | 'B' | 'C' | 'D';

export interface TravelExercise {
  exercise_name: string;
  category: MovementCategory;
  sets: number;
  reps_min: number;
  reps_max: number;
  is_timed: boolean;
  seconds?: number;
  is_unilateral: boolean;
  tempo?: string;
  notes: string;
}

export interface TravelDay {
  label: TravelDayLabel;
  focus: string;
  session_difficulty: number;
  estimated_minutes: number;
  exercises: TravelExercise[];
}

export interface TravelBlockConfig {
  hasBands: boolean;
  hasPullupBar: boolean;
  travelDays: number;
  volumeLevel: 'basic' | 'intermediate' | 'advanced';
  dislikedExercises?: string[];
}

export interface CachedTravelBlock {
  days: TravelDay[];
  config: TravelBlockConfig;
  current_index: number;
  generated_at: string;
}

export interface TravelDayContext {
  label: TravelDayLabel;
  focus: string;
  session_difficulty: number;
  estimated_minutes: number;
}

// ─── Resolved travel session ready for SessionView ───────────

export interface ResolvedTravelSession {
  day: TravelDay;
  entries: Array<{
    exercise_id: string;
    exercise_name: string;
    sets: number;
    reps_per_set: number;
    weight: number;
    rpe: number;
    notes: string;
  }>;
}

// ─── Abstract profile ─────────────────────────────────────────

interface AbstractProfile {
  experience_level: string;
  strength_level: 'low' | 'medium' | 'high';
  volume_tolerance: 'low' | 'medium' | 'high';
  strong_patterns: string[];
  weak_patterns: string[];
  recent_adherence: 'low' | 'normal' | 'high';
  target_rpe: number;
  limitations: string;
}

function buildAbstractProfile(
  profile: {
    training_experience: string;
    bodyweight: number;
    schedule_days: number;
    session_minutes: number;
    goal: string;
    limitations?: string | null;
  },
  workingWeights: Map<string, number>,
  recentSessionCount: number
): AbstractProfile {
  const bw = profile.bodyweight || 75;

  // Strength level from lift/bodyweight ratios
  const squat = workingWeights.get('squat') ?? 0;
  const bench = workingWeights.get('bench') ?? 0;
  const deadlift = workingWeights.get('deadlift') ?? 0;
  const ohp = workingWeights.get('ohp') ?? 0;

  const ratios: number[] = [];
  if (squat > 0) ratios.push(squat / bw);
  if (bench > 0) ratios.push(bench / bw);
  if (deadlift > 0) ratios.push(deadlift / bw);
  if (ohp > 0) ratios.push(ohp / bw);

  const avgRatio = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
  const strength_level: AbstractProfile['strength_level'] =
    avgRatio > 0.9 ? 'high' : avgRatio > 0.55 ? 'medium' : 'low';

  // Volume tolerance
  const volume_tolerance: AbstractProfile['volume_tolerance'] =
    profile.session_minutes > 60 || profile.training_experience === 'advanced'
      ? 'high'
      : profile.session_minutes > 40
      ? 'medium'
      : 'low';

  // Recent adherence (last ~4 weeks expected)
  const expectedSessions = profile.schedule_days * 4;
  const adherenceRatio = expectedSessions > 0 ? recentSessionCount / expectedSessions : 0;
  const recent_adherence: AbstractProfile['recent_adherence'] =
    adherenceRatio >= 0.8 ? 'high' : adherenceRatio >= 0.45 ? 'normal' : 'low';

  // Strong/weak patterns from lift ratios
  const strong_patterns: string[] = [];
  const weak_patterns: string[] = [];

  if (squat > 0 && deadlift > 0 && squat / bw > 0.9) strong_patterns.push('lower body (quad dominant)');
  if (deadlift > 0 && deadlift / bw > 1.2) strong_patterns.push('posterior chain / hip hinge');
  if (bench > 0 && bench / bw > 0.8) strong_patterns.push('horizontal push');
  if (ohp > 0 && ohp / bw > 0.6) strong_patterns.push('vertical push');

  if (bench > 0 && ohp > 0 && bench / ohp > 2.0) weak_patterns.push('overhead pressing');
  if (squat > 0 && deadlift > 0 && deadlift / squat < 1.1) weak_patterns.push('hip hinge pattern');
  if (strong_patterns.length === 0 && weak_patterns.length === 0) {
    // Fallback based on experience
    if (profile.training_experience === 'beginner') weak_patterns.push('compound movement technique');
  }

  const target_rpe =
    profile.training_experience === 'beginner' ? 7 :
    profile.training_experience === 'advanced' ? 8.5 : 8;

  return {
    experience_level: profile.training_experience,
    strength_level,
    volume_tolerance,
    strong_patterns,
    weak_patterns,
    recent_adherence,
    target_rpe,
    limitations: profile.limitations || 'ninguna',
  };
}

// ─── Day structure definitions ────────────────────────────────

const DAY_STRUCTURES: Record<TravelDayLabel, { focus: string; description: string }> = {
  A: {
    focus: 'Full body (énfasis lower)',
    description: '2-3 ejercicios de piernas (patrón squat + bisagra de cadera), 1-2 upper body, 1-2 core. Compound primero, accesorios al final.',
  },
  B: {
    focus: 'Upper + Core',
    description: '2 push (horizontal + vertical), 2 pull (horizontal + vertical o dominadas), 2 core. Equilibrio completo de tren superior.',
  },
  C: {
    focus: 'Conditioning / Full body',
    description: 'Circuito de cuerpo completo, alta densidad, menos descanso (30-60s). Movimientos compuestos, foco metabólico y cardiovascular.',
  },
  D: {
    focus: 'Lower + Accesorios',
    description: 'Unilateral de piernas (Búlgara, zancadas, step-ups), posterior chain, glúteos, pantorrillas. Complementa los días anteriores.',
  },
};

// ─── LocalStorage cache ───────────────────────────────────────

function cacheKey(userId: string) {
  return `travel_block_${userId}`;
}

export function getCachedTravelBlock(userId: string, config: TravelBlockConfig): CachedTravelBlock | null {
  try {
    const stored = localStorage.getItem(cacheKey(userId));
    if (!stored) return null;
    const block = JSON.parse(stored) as CachedTravelBlock;

    // Invalidate if equipment, volume, days or disliked exercises changed
    const sortedDislikedStored = [...(block.config.dislikedExercises ?? [])].sort().join(',');
    const sortedDislikedNew = [...(config.dislikedExercises ?? [])].sort().join(',');
    if (
      block.config.hasBands !== config.hasBands ||
      block.config.hasPullupBar !== config.hasPullupBar ||
      block.config.volumeLevel !== config.volumeLevel ||
      block.config.travelDays !== config.travelDays ||
      sortedDislikedStored !== sortedDislikedNew
    ) return null;

    // Invalidate if older than 7 days
    const ageMs = Date.now() - new Date(block.generated_at).getTime();
    if (ageMs > 7 * 24 * 3600 * 1000) return null;

    return block;
  } catch {
    return null;
  }
}

export function saveTravelBlock(userId: string, block: CachedTravelBlock): void {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(block));
  } catch {
    // localStorage quota — ignore
  }
}

export function clearTravelBlock(userId: string): void {
  localStorage.removeItem(cacheKey(userId));
}

// ─── LLM call ────────────────────────────────────────────────

async function callLLM(
  abstractProfile: AbstractProfile,
  config: TravelBlockConfig,
  excludedExercises: string[],
  numDays: number
): Promise<TravelDay[]> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('VITE_OPENAI_API_KEY not configured');
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const labels: TravelDayLabel[] = (['A', 'B', 'C', 'D'] as TravelDayLabel[]).slice(0, numDays);
  const equipment = [
    'peso corporal',
    config.hasBands ? 'bandas elásticas' : null,
    config.hasPullupBar ? 'barra de dominadas / calistenia' : null,
  ].filter(Boolean).join(', ');

  const systemPrompt = `Eres un entrenador de élite especializado en entrenamiento sin equipamiento. Generas sesiones de entrenamiento estructuradas y variadas para cuando el usuario está fuera del gym.

REGLAS:
- Usa SOLO ejercicios de peso corporal y/o bandas (según equipo disponible)
- Todas las instrucciones y nombres de ejercicios en ESPAÑOL
- Cada día tiene una estructura fija (ver contexto) — respétala
- Sin mencionar pesos en kg — usa tempo, pausas, unilateral, reps y densidad para graduar dificultad
- Si un ejercicio es isométrico (plancha, wall sit), usa is_timed:true y seconds
- Si es unilateral (zancada, sentadilla búlgara), usa is_unilateral:true y anota "c/lado" en notes
- El campo "tempo" es opcional pero muy valorado para progresión sin carga (ej: "3-1-1")
- Usa RPE objetivo consistente por sesión según session_difficulty
- Responde SOLO con JSON válido`;

  const context = {
    equipo_disponible: equipment,
    volumen: config.volumeLevel,
    perfil_abstracto: abstractProfile,
    dias_a_generar: labels,
    estructuras_por_dia: Object.fromEntries(
      labels.map(l => [l, DAY_STRUCTURES[l]])
    ),
    ejercicios_a_evitar: excludedExercises.length > 0 ? excludedExercises : 'ninguno',
    instrucciones_adicionales: [
      'Usa variaciones de tempo (ej: "3-1-2") para graduar la dificultad en accesorios.',
      'En el día C (conditioning), reduce el descanso entre series a 30-45s para efecto metabólico.',
      'Si el usuario tiene patrones fuertes, añade variantes más demandantes (ej: pistol squat, archer push-up).',
      'Asegúrate de que los días sean claramente distintos en estímulo y selección de ejercicios.',
    ],
  };

  const outputSchema = `{
  "days": [
    {
      "label": "A",
      "focus": "Full body (énfasis lower)",
      "session_difficulty": 7,
      "estimated_minutes": 45,
      "exercises": [
        {
          "exercise_name": "Sentadilla Búlgara",
          "category": "QUAD_DOMINANT",
          "sets": 3,
          "reps_min": 8,
          "reps_max": 12,
          "is_timed": false,
          "is_unilateral": true,
          "tempo": "3-1-1",
          "notes": "c/lado · pausa 1s abajo · 60s descanso"
        }
      ]
    }
  ]
}`;

  const resp = await client.chat.completions.create({
    model: 'gpt-5.4-mini',
    max_completion_tokens: 4000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'developer', content: systemPrompt },
      {
        role: 'user',
        content: `Genera ${numDays} día(s) de entrenamiento fuera del gym.\n\nContexto:\n${JSON.stringify(context, null, 2)}\n\nDevuelve exactamente este formato:\n${outputSchema}`,
      },
    ],
  });

  const text = resp.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(text) as { days: TravelDay[] };

  if (!parsed.days || !Array.isArray(parsed.days) || parsed.days.length === 0) {
    throw new Error('LLM returned invalid travel block structure');
  }

  return parsed.days;
}

// ─── Resolve exercises to DB IDs ─────────────────────────────

async function resolveExercises(
  userId: string,
  travelExercises: TravelExercise[]
): Promise<Map<string, string>> {
  // Fetch all user exercises
  const { data: existing } = await supabase
    .from('exercises')
    .select('id, name')
    .eq('user_id', userId);

  const nameToId = new Map<string, string>(
    (existing ?? []).map(e => [e.name.toLowerCase(), e.id])
  );

  const idByName = new Map<string, string>();
  const toInsert: Array<{ user_id: string; name: string; category: string; status: string }> = [];

  for (const ex of travelExercises) {
    const lowerName = ex.exercise_name.toLowerCase();
    const existingId = nameToId.get(lowerName);
    if (existingId) {
      idByName.set(ex.exercise_name, existingId);
    } else {
      toInsert.push({
        user_id: userId,
        name: ex.exercise_name,
        category: ex.category,
        status: 'YES',
      });
    }
  }

  if (toInsert.length > 0) {
    // Deduplicate by name before inserting
    const unique = toInsert.filter(
      (r, i, arr) => arr.findIndex(x => x.name === r.name) === i
    );
    const { data: inserted } = await supabase
      .from('exercises')
      .insert(unique)
      .select('id, name');
    if (inserted) {
      for (const row of inserted) {
        idByName.set(row.name, row.id);
      }
    }
  }

  return idByName;
}

// ─── Public: generate a travel block ─────────────────────────

export async function generateTravelBlock(
  userId: string,
  config: TravelBlockConfig
): Promise<TravelDay[]> {
  // Fetch everything needed in parallel
  const [
    { data: profile },
    { data: excludedExercises },
    { data: wwData },
    { count: recentCount },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('training_experience, bodyweight, schedule_days, session_minutes, goal, limitations')
      .eq('id', userId)
      .single(),
    supabase
      .from('exercises')
      .select('name')
      .eq('user_id', userId)
      .eq('status', 'NO'),
    supabase
      .from('working_weights')
      .select('weight, exercise:exercises(name)')
      .eq('user_id', userId),
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString()),
  ]);

  // Build working weight map keyed by lift name
  const workingWeights = new Map<string, number>();
  if (wwData) {
    for (const ww of wwData) {
      const exRaw = ww.exercise;
      const ex = (Array.isArray(exRaw) ? exRaw[0] : exRaw) as { name: string } | null;
      if (!ex) continue;
      if (ex.name === 'Barra Back Squat') workingWeights.set('squat', Number(ww.weight));
      if (ex.name === 'Barra Press de Banca') workingWeights.set('bench', Number(ww.weight));
      if (ex.name === 'Peso Muerto Convencional') workingWeights.set('deadlift', Number(ww.weight));
      if (ex.name === 'Barra Press Militar') workingWeights.set('ohp', Number(ww.weight));
    }
  }

  const abstractProfile = buildAbstractProfile(
    {
      training_experience: profile?.training_experience ?? 'intermediate',
      bodyweight: Number(profile?.bodyweight) || 75,
      schedule_days: Number(profile?.schedule_days) || 3,
      session_minutes: Number(profile?.session_minutes) || 45,
      goal: profile?.goal ?? 'general',
      limitations: profile?.limitations,
    },
    workingWeights,
    recentCount ?? 0
  );

  const excluded = [
    ...(excludedExercises ?? []).map(e => e.name),
    ...(config.dislikedExercises ?? []),
  ];
  const numDays = Math.min(Math.max(config.travelDays, 2), 4);

  return callLLM(abstractProfile, config, excluded, numDays);
}

// ─── Public: get next session from block (with rotation) ──────

export async function getNextTravelSession(
  userId: string,
  block: CachedTravelBlock
): Promise<ResolvedTravelSession> {
  const day = block.days[block.current_index % block.days.length];

  // Collect all unique exercises in this day
  const allExercises = day.exercises;
  const idMap = await resolveExercises(userId, allExercises);

  const rpeForDifficulty = Math.min(10, Math.max(5, Math.round(day.session_difficulty * 0.9)));

  const entries = day.exercises.map(ex => {
    const exercise_id = idMap.get(ex.exercise_name) ?? '';
    const reps_per_set = ex.is_timed ? (ex.seconds ?? 30) : (ex.reps_max || ex.reps_min || 10);

    const notesParts = [
      ex.tempo ? `${ex.tempo} tempo` : null,
      ex.is_unilateral ? 'c/lado' : null,
      ex.notes,
    ].filter(Boolean);

    return {
      exercise_id,
      exercise_name: ex.exercise_name,
      sets: ex.sets,
      reps_per_set,
      weight: 0,
      rpe: rpeForDifficulty,
      notes: notesParts.join(' · ') || 'Fuera del gym',
    };
  });

  return { day, entries };
}
