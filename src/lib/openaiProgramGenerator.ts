import OpenAI from 'openai';
import type { Exercise } from '../types';
import {
  generateProgram,
  getBlockForWeek,
  type GeneratedDay,
} from '../engine/programGenerator';
import { estimateWeight } from '../engine/weightEstimator';
import { supabase } from './supabase';
import { isExerciseEnabled } from '../utils/programState';
import { exerciseSuitabilityScore, isExerciseSuitableForProfile } from '../engine/exerciseSuitability';

// ─── Types ────────────────────────────────────────────────────

export interface AIGeneratorProfile {
  bodyweight: number;
  height: number;
  training_experience: string;
  goal: string;
  schedule_days: number;
  session_minutes: number;
  gender: string;
  limitations?: string | null;
}

export interface WeekGenerationResult {
  programName: string;
  splitType: string;
  totalDays: number;
  days: GeneratedDay[];
}

interface ExerciseStat {
  exercise_id: string;
  exercise_name: string;
  category: string;
  avg_weight: number;
  avg_rpe: number;
  avg_reps: number;
  sessions_count: number;
  trend: 'improving' | 'stable' | 'struggling';
}

export interface WeekSummary {
  week_num: number;
  block_name: string;
  exercise_stats: ExerciseStat[];
}

const generationInFlight = new Map<string, Promise<void>>();

// ─── History summarization ────────────────────────────────────

export function summarizeWeekData(
  logs: Array<{
    exercise_id: string;
    exercise_name: string;
    category: string;
    weight: number;
    reps: number;
    rpe: number;
  }>,
  weekNum: number,
  blockName: string
): WeekSummary {
  const byExercise = new Map<string, {
    name: string;
    category: string;
    weights: number[];
    rpes: number[];
    reps: number[];
  }>();

  for (const log of logs) {
    if (!byExercise.has(log.exercise_id)) {
      byExercise.set(log.exercise_id, { name: log.exercise_name, category: log.category, weights: [], rpes: [], reps: [] });
    }
    const entry = byExercise.get(log.exercise_id)!;
    if (log.weight > 0) entry.weights.push(log.weight);
    if (log.rpe > 0) entry.rpes.push(log.rpe);
    if (log.reps > 0) entry.reps.push(log.reps);
  }

  const stats: ExerciseStat[] = [];
  for (const [id, data] of byExercise) {
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const avgRpe = avg(data.rpes);
    const avgWeight = avg(data.weights);
    const avgReps = avg(data.reps);

    let trend: ExerciseStat['trend'] = 'stable';
    if (avgRpe > 0 && avgRpe <= 6.5) trend = 'improving';
    if (avgRpe >= 9) trend = 'struggling';

    stats.push({
      exercise_id: id,
      exercise_name: data.name,
      category: data.category,
      avg_weight: Math.round(avgWeight * 10) / 10,
      avg_rpe: Math.round(avgRpe * 10) / 10,
      avg_reps: Math.round(avgReps * 10) / 10,
      sessions_count: data.weights.length,
      trend,
    });
  }

  return { week_num: weekNum, block_name: blockName, exercise_stats: stats };
}

// ─── LLM enhancement ─────────────────────────────────────────

interface LLMExercise {
  exercise_id: string;
  exercise_name: string;
  role: string;
  notes: string;
}

interface LLMWeekPlan {
  days: Array<{ day_number: number; exercises: LLMExercise[] }>;
}

function roundToNearest2_5(value: number): number {
  return Math.round(value / 2.5) * 2.5;
}

function computeExerciseWeight(
  exercise: Exercise,
  role: 'primary' | 'secondary' | 'accessory',
  profile: AIGeneratorProfile,
  workingWeights?: Map<string, number>
): number {
  const baseWeight = workingWeights?.get(exercise.id)
    ?? estimateWeight(exercise.name, profile.bodyweight, profile.training_experience, profile.gender);

  if (role === 'accessory') {
    return roundToNearest2_5(baseWeight * 0.9);
  }

  return roundToNearest2_5(baseWeight);
}

function sanitizeGeneratedDays(params: {
  days: GeneratedDay[];
  exercises: Exercise[];
  profile: AIGeneratorProfile;
  weekNum: number;
  workingWeights?: Map<string, number>;
}): GeneratedDay[] {
  const { days, exercises, profile, weekNum, workingWeights } = params;
  const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const exercisesByCategory = new Map<string, Exercise[]>();

  for (const exercise of exercises) {
    if (!isExerciseEnabled(exercise.status) || !isExerciseSuitableForProfile(exercise, profile)) continue;
    const list = exercisesByCategory.get(exercise.category) ?? [];
    list.push(exercise);
    list.sort((a, b) => exerciseSuitabilityScore(b, profile) - exerciseSuitabilityScore(a, profile));
    exercisesByCategory.set(exercise.category, list);
  }

  const block = getBlockForWeek(weekNum);
  const weekOffsetInBlock = Math.max(block.weeks.indexOf(weekNum), 0);
  let remainingWeeklyAccessorySwaps = weekOffsetInBlock === 0 ? 0 : 2;

  return days.map((day, dayIndex) => {
    const usedIds = new Set<string>();

    const normalizedExercises = day.exercises.map((generatedExercise, exerciseIndex) => {
      const category = generatedExercise.category;
      const categoryExercises = exercisesByCategory.get(category) ?? [];
      const currentExercise = exerciseMap.get(generatedExercise.exercise_id);
      const hasValidCategory = currentExercise?.category === category;
      const hasSuitableExercise = currentExercise ? isExerciseSuitableForProfile(currentExercise, profile) : false;
      const isDuplicate = usedIds.has(generatedExercise.exercise_id);

      let resolvedExercise =
        hasValidCategory && hasSuitableExercise && !isDuplicate
          ? currentExercise ?? null
          : categoryExercises.find((candidate) => !usedIds.has(candidate.id)) ?? null;

      if (
        resolvedExercise &&
        generatedExercise.role === 'accessory' &&
        remainingWeeklyAccessorySwaps > 0 &&
        weekOffsetInBlock > 0
      ) {
        const resolvedExerciseId = resolvedExercise.id;
        const alternatives = categoryExercises.filter(
          (candidate) => candidate.id !== resolvedExerciseId && !usedIds.has(candidate.id)
        );

        if (alternatives.length > 0) {
          const pickIndex = (weekOffsetInBlock - 1 + dayIndex + exerciseIndex) % alternatives.length;
          resolvedExercise = alternatives[pickIndex];
          remainingWeeklyAccessorySwaps -= 1;
        }
      }

      if (!resolvedExercise) {
        if (currentExercise && !usedIds.has(currentExercise.id)) {
          usedIds.add(currentExercise.id);
        }
        return generatedExercise;
      }

      usedIds.add(resolvedExercise.id);

      return {
        ...generatedExercise,
        exercise_id: resolvedExercise.id,
        exercise_name: resolvedExercise.name,
        category: resolvedExercise.category,
        weight: computeExerciseWeight(resolvedExercise, generatedExercise.role, profile, workingWeights),
      };
    });

    return {
      ...day,
      exercises: normalizedExercises,
    };
  });
}

async function enhanceWithAI(
  baseDays: GeneratedDay[],
  exercises: Exercise[],
  profile: AIGeneratorProfile,
  weekNum: number,
  previousSummary?: WeekSummary,
  workingWeights?: Map<string, number>
): Promise<GeneratedDay[]> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('VITE_OPENAI_API_KEY not configured');

  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  const block = getBlockForWeek(weekNum);

  // Group available exercises by category for the LLM to choose from
  const byCategory: Record<string, Array<{ id: string; name: string }>> = {};
  for (const ex of exercises) {
    if (!isExerciseSuitableForProfile(ex, profile)) continue;
    if (!byCategory[ex.category]) byCategory[ex.category] = [];
    byCategory[ex.category].push({ id: ex.id, name: ex.name });
    byCategory[ex.category].sort((a, b) => exerciseSuitabilityScore(b, profile) - exerciseSuitabilityScore(a, profile));
  }

  const systemPrompt = `Eres un entrenador de fuerza experto en periodización. Mejora la selección de ejercicios y añade instrucciones de variación a un programa ya estructurado.

REGLAS ESTRICTAS (en orden de prioridad):
1. LIMITACIONES DEL USUARIO (MÁXIMA PRIORIDAD): Si cualquier ejercicio del programa base aparece en las limitaciones/lesiones del usuario (independientemente de su rol: primary, secondary o accessory), DEBES reemplazarlo obligatoriamente por otro ejercicio válido de la misma categoría de la biblioteca. Esta regla anula todas las demás.
2. SOLO usa exercise_id y exercise_name de la biblioteca proporcionada (nunca inventes IDs)
3. Ejercicios PRIMARY y SECONDARY sin conflicto de limitación: mantén el mismo ejercicio, solo mejora las notas (tempo, agarre, pausa)
4. Ejercicios ACCESSORY: puedes sustituir por otro de la misma categoría si el rendimiento lo justifica
5. Si hay tendencia "struggling" en un accesorio → sustituye por variante más fácil de la misma categoría
6. Si hay tendencia "improving" → añade nota de posible aumento de peso la próxima sesión
7. Notas breves y concretas: "3-1-1 tempo · 90s descanso" o "agarre neutro · excéntrico lento"
8. Máximo 2 cambios de accesorios por semana dentro del mismo bloque (no aplica a cambios por limitaciones)
9. No programes Dominadas con Lastre salvo que el perfil sea avanzado; para perfiles femeninos o beginner prioriza Dominadas con Apoyo cuando exista, luego jalones en polea o variantes sin lastre.
10. Responde SOLO con JSON válido`;

  const context = {
    bloque: { nombre: block.name, semana: weekNum, reps: `${block.repsMin}-${block.repsMax}`, rpe: `${block.rpeMin}-${block.rpeMax}` },
    perfil: {
      experiencia: profile.training_experience,
      objetivo: profile.goal,
      genero: profile.gender,
      limitaciones: profile.limitations || 'ninguna',
    },
    biblioteca_por_categoria: byCategory,
    programa_base: baseDays.map(day => ({
      dia: day.day_number,
      nombre: day.day_name,
      ejercicios: day.exercises.map(ex => ({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        category: ex.category,
        role: ex.role,
        sets: ex.sets,
        reps: `${ex.reps_min}-${ex.reps_max}`,
        rpe: ex.rpe,
      })),
    })),
    semana_anterior: previousSummary
      ? {
          semana: previousSummary.week_num,
          bloque: previousSummary.block_name,
          ejercicios: previousSummary.exercise_stats.map(s => ({
            nombre: s.exercise_name,
            category: s.category,
            tendencia: s.trend,
            rpe_promedio: s.avg_rpe,
            peso_promedio: s.avg_weight,
          })),
        }
      : null,
  };

  const resp = await client.chat.completions.create({
    model: 'gpt-5.4-mini',
    max_completion_tokens: 3000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'developer', content: systemPrompt },
      {
        role: 'user',
        content: `${JSON.stringify(context, null, 2)}\n\nDevuelve exactamente: { "days": [{ "day_number": N, "exercises": [{ "exercise_id": "...", "exercise_name": "...", "role": "primary|secondary|accessory", "notes": "..." }] }] }`,
      },
    ],
  });

  const text = resp.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(text) as LLMWeekPlan;

  if (!parsed.days || !Array.isArray(parsed.days)) {
    throw new Error('LLM returned invalid structure');
  }

  const exerciseMap = new Map(exercises.map(e => [e.id, e]));

  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const conflictsWithLimitations = (exerciseName: string): boolean => {
    if (!profile.limitations) return false;
    const limNorm = norm(profile.limitations);
    // All significant words (>3 chars) of the exercise name must appear in the limitations text
    const words = norm(exerciseName).split(/\s+/).filter(w => w.length > 3);
    return words.length > 0 && words.every(w => limNorm.includes(w));
  };

  const aiMergedDays = baseDays.map(baseDay => {
    const llmDay = parsed.days.find(d => d.day_number === baseDay.day_number);
    if (!llmDay || !Array.isArray(llmDay.exercises)) return baseDay;

    // Only keep LLM choices with valid IDs from the library
    const validLLM = llmDay.exercises.filter(
      lx => exerciseMap.has(lx.exercise_id) && isExerciseEnabled(exerciseMap.get(lx.exercise_id)!.status)
    );
    if (validLLM.length === 0) return baseDay;

    const mergedExercises = baseDay.exercises.map((baseEx, idx) => {
      const llmEx = validLLM[idx];
      if (!llmEx) return baseEx;

      const selectedEx = exerciseMap.get(llmEx.exercise_id);
      if (!selectedEx || selectedEx.category !== baseEx.category) {
        return { ...baseEx, notes: llmEx.notes || baseEx.notes };
      }

      // Primary/secondary: keep exercise unless it conflicts with user limitations
      if ((baseEx.role === 'primary' || baseEx.role === 'secondary') && !conflictsWithLimitations(baseEx.exercise_name)) {
        return { ...baseEx, notes: llmEx.notes || baseEx.notes };
      }

      // Accessory (or primary/secondary with limitation conflict): allow swap
      if (selectedEx.id === baseEx.exercise_id) {
        return { ...baseEx, notes: llmEx.notes || baseEx.notes };
      }

      const newWeight = computeExerciseWeight(selectedEx, baseEx.role, profile, workingWeights);

      return {
        ...baseEx,
        exercise_id: selectedEx.id,
        exercise_name: selectedEx.name,
        category: selectedEx.category,
        weight: newWeight,
        notes: llmEx.notes || baseEx.notes,
      };
    });

    return { ...baseDay, exercises: mergedExercises };
  });

  return aiMergedDays;
}

// ─── Public: generate one week (with AI + local fallback) ─────

export async function generateWeekWithAI(params: {
  weekNum: number;
  exercises: Exercise[];
  profile: AIGeneratorProfile;
  keyLifts: { squat: number; bench: number; deadlift: number; ohp: number };
  cycleNumber: number;
  workingWeights?: Map<string, number>;
  previousSummary?: WeekSummary;
}): Promise<WeekGenerationResult> {
  const { weekNum, exercises, profile, keyLifts, cycleNumber, workingWeights, previousSummary } = params;

  const bmi = profile.bodyweight / ((profile.height / 100) ** 2);

  // Override key lifts from current working weights
  const effectiveLifts = { ...keyLifts };
  if (workingWeights) {
    for (const ex of exercises) {
      const w = workingWeights.get(ex.id);
      if (!w) continue;
      if (ex.name === 'Barra Back Squat') effectiveLifts.squat = w;
      if (ex.name === 'Barra Press de Banca') effectiveLifts.bench = w;
      if (ex.name === 'Peso Muerto Convencional') effectiveLifts.deadlift = w;
      if (ex.name === 'Barra Press Militar') effectiveLifts.ohp = w;
    }
  }

  const baseProgram = generateProgram(
    exercises,
    profile.schedule_days,
    profile.bodyweight,
    profile.training_experience,
    effectiveLifts,
    profile.goal,
    bmi,
    profile.session_minutes,
    profile.gender,
    cycleNumber,
    weekNum
  );

  // For weeks 2+: apply current working weights and clear calibration flag
  if (weekNum > 1 && workingWeights) {
    for (const day of baseProgram.days) {
      for (const ex of day.exercises) {
        const w = workingWeights.get(ex.exercise_id);
        if (w !== undefined) {
          ex.weight = w;
          ex.is_calibration = false;
          // Strip calibration note prefix, keep rest timing
          ex.notes = ex.notes.replace('Peso de calibración — ajusta después de la sesión 1 · ', '').replace('Peso de calibración — ', '');
        }
      }
    }
  }

  let finalDays: GeneratedDay[];
  try {
    finalDays = await enhanceWithAI(baseProgram.days, exercises, profile, weekNum, previousSummary, workingWeights);
  } catch (err) {
    console.error('[AI program generator] Enhancement failed, using local engine:', err);
    finalDays = baseProgram.days;
  }

  finalDays = sanitizeGeneratedDays({
    days: finalDays,
    exercises,
    profile,
    weekNum,
    workingWeights,
  });

  return {
    programName: baseProgram.name,
    splitType: baseProgram.split_type,
    totalDays: baseProgram.total_days,
    days: finalDays,
  };
}

// ─── Public: background generate & save next week ────────────

export async function generateAndSaveNextWeek(
  userId: string,
  programId: string,
  nextWeekNum: number
): Promise<void> {
  // Idempotent guard
  const { count: existing } = await supabase
    .from('program_days')
    .select('id', { count: 'exact', head: true })
    .eq('program_id', programId)
    .eq('week_num', nextWeekNum);
  if ((existing ?? 0) > 0) return;

  const [{ data: profile }, { data: exercises }, { data: wwData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('exercises').select('*').eq('user_id', userId).neq('status', 'NO'),
    supabase.from('working_weights').select('exercise_id, weight').eq('user_id', userId),
  ]);

  if (!profile || !exercises || exercises.length === 0) return;

  const workingWeights = new Map<string, number>();
  const keyLifts = { squat: 0, bench: 0, deadlift: 0, ohp: 0 };
  if (wwData) {
    for (const ww of wwData) {
      workingWeights.set(ww.exercise_id, Number(ww.weight));
    }
    for (const ex of exercises) {
      const w = workingWeights.get(ex.id);
      if (!w) continue;
      if (ex.name === 'Barra Back Squat') keyLifts.squat = w;
      if (ex.name === 'Barra Press de Banca') keyLifts.bench = w;
      if (ex.name === 'Peso Muerto Convencional') keyLifts.deadlift = w;
      if (ex.name === 'Barra Press Militar') keyLifts.ohp = w;
    }
  }

  // Fetch previous week's session logs to build a performance summary
  const prevWeekNum = nextWeekNum - 1;
  let previousSummary: WeekSummary | undefined;

  const { data: prevSessions } = await supabase
    .from('sessions')
    .select('id, block_num')
    .eq('user_id', userId)
    .eq('week_num', prevWeekNum)
    .not('block_num', 'is', null);

  if (prevSessions && prevSessions.length > 0) {
    const sessionIds = prevSessions.map(s => s.id);
    const { data: logs } = await supabase
      .from('session_logs')
      .select('exercise_id, reps_per_set, weight, rpe, exercise:exercises(name, category)')
      .in('session_id', sessionIds);

    if (logs && logs.length > 0) {
      const blockNum = prevSessions[0].block_num ?? 1;
      const blockName = blockNum === 1 ? 'Volumen' : blockNum === 2 ? 'Intensidad' : blockNum === 3 ? 'Pico' : 'Descarga';

      const mappedLogs = logs
        .map(l => {
          const exRaw = l.exercise;
          const ex = (Array.isArray(exRaw) ? exRaw[0] : exRaw) as { name: string; category: string } | null;
          return {
            exercise_id: l.exercise_id,
            exercise_name: ex?.name ?? '',
            category: ex?.category ?? '',
            weight: Number(l.weight),
            reps: Number(l.reps_per_set),
            rpe: Number(l.rpe) || 0,
          };
        })
        .filter(l => l.exercise_name);

      previousSummary = summarizeWeekData(mappedLogs, prevWeekNum, blockName);
    }
  }

  const { count: programCount } = await supabase
    .from('programs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const cycleNumber = Math.max(1, (programCount ?? 1) - 1);

  const result = await generateWeekWithAI({
    weekNum: nextWeekNum,
    exercises,
    profile: {
      bodyweight: Number(profile.bodyweight),
      height: Number(profile.height),
      training_experience: profile.training_experience,
      goal: profile.goal,
      session_minutes: Number(profile.session_minutes) || 60,
      gender: profile.gender || 'male',
      limitations: profile.limitations,
      schedule_days: Number(profile.schedule_days),
    },
    keyLifts,
    cycleNumber,
    workingWeights,
    previousSummary,
  });

  const rows = result.days.map(d => ({
    program_id: programId,
    day_number: d.day_number,
    day_name: d.day_name,
    exercises: d.exercises,
    week_num: nextWeekNum,
  }));

  const { error } = await supabase
    .from('program_days')
    .upsert(rows, {
      onConflict: 'program_id,week_num,day_number',
      ignoreDuplicates: true,
    });

  if (error) {
    throw error;
  }
}

export async function ensureWeekGenerated(
  userId: string,
  programId: string,
  weekNum: number
): Promise<boolean> {
  if (weekNum <= 1) return false;

  const generationKey = `${programId}:${weekNum}`;
  const { count: existing } = await supabase
    .from('program_days')
    .select('id', { count: 'exact', head: true })
    .eq('program_id', programId)
    .eq('week_num', weekNum);

  if ((existing ?? 0) > 0) return false;

  const inFlight = generationInFlight.get(generationKey);
  if (inFlight) {
    await inFlight;
    return true;
  }

  const generationPromise = generateAndSaveNextWeek(userId, programId, weekNum)
    .finally(() => {
      generationInFlight.delete(generationKey);
    });

  generationInFlight.set(generationKey, generationPromise);
  await generationPromise;
  return true;
}
