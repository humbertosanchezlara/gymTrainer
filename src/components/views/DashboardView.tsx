import { useState, useEffect } from 'react';

import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ensureWeekGenerated } from '../../lib/openaiProgramGenerator';
import { supabase } from '../../lib/supabase';
import {
  generateTravelBlock,
  getCachedTravelBlock,
  getNextTravelSession,
  saveTravelBlock,
  clearTravelBlock,
  type TravelBlockConfig,
  type CachedTravelBlock,
  type TravelDayContext,
} from '../../lib/openaiTravelGenerator';
import { parseAdjustmentWithAI } from '../../lib/openaiAdjust';
import { fetchActiveInjuries } from '../../lib/injuryProfile';
import { fetchPendingInjuryCheckin, submitInjuryCheckin, type PendingInjuryCheckin } from '../../lib/injuryCheckins';
import { Loader2 } from 'lucide-react';
import type { Tab } from '../MainShell';
import type { UserInjury } from '../../types';
import { HeroSession } from '../forge/HeroSession';
import { AdjustWithAI } from '../forge/AdjustWithAI';
import { ContextCards } from '../forge/ContextCards';
import { fetchProgramDayForWeekOrFallback, fetchProgramProgressState, normalizeProgramDayExercise } from '../../utils/programState';
import { replaceExerciseInProgram } from '../../utils/programExerciseMutations';
import { DashboardProgramCompleteBanner } from './dashboard/DashboardProgramCompleteBanner';
import { DashboardReplaceExerciseCard } from './dashboard/DashboardReplaceExerciseCard';
import { DashboardTravelModeCard } from './dashboard/DashboardTravelModeCard';
import { DashboardProgramLinkCard } from './dashboard/DashboardProgramLinkCard';
import { DashboardTravelSetupModal } from './dashboard/DashboardTravelSetupModal';
import { DashboardReplaceExerciseModal } from './dashboard/DashboardReplaceExerciseModal';
import { exerciseSuitabilityScore, isExerciseSuitableForProfile } from '../../engine/exerciseSuitability';

// ─── Types ────────────────────────────────────────────────

export interface SessionLogEntry {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps_per_set: number;
  weight: number;
  rpe: number;
  notes: string;
  target_reps_min?: number;
  target_reps_max?: number;
  target_rpe?: number;
}

interface ProgramDayExercise {
  exercise_id?: string;
  exercise_name?: string;
  name?: string;
  sets?: number;
  reps_min?: number;
  reps_max?: number;
  weight?: number;
  rpe?: number;
  role?: string;
  category?: string;
  notes?: string;
}

interface ReplacementCandidate {
  id: string;
  name: string;
  category: string;
  rank: 1 | 2 | 3;
  reason: string;
}

interface TrainingContext {
  gender: string;
  training_experience: string;
  limitations?: string | null;
  injuries?: UserInjury[] | null;
}

// ─── Component ────────────────────────────────────────────
interface DashboardViewProps {
  onNavigate: (t: Tab) => void;
  onStartSession: () => void;
  onStartTravel: (d: SessionLogEntry[], context: TravelDayContext) => void;
}

function estimateDuration(exerciseCount: number): string {
  const min = exerciseCount * 7;
  const max = exerciseCount * 10;
  return `${min}–${max} min`;
}

const PULL_CATEGORIES = ['PULL_VERTICAL', 'PULL_HORIZONTAL'];
const PUSH_CATEGORIES = ['PUSH_HORIZONTAL', 'PUSH_VERTICAL'];
const LEG_CATEGORIES = ['QUAD_DOMINANT', 'POSTERIOR_CHAIN', 'CALVES'];

function normalizeText(value?: string | null): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function dayIncludesAny(todayExercises: ProgramDayExercise[], categories: string[]): boolean {
  const categorySet = new Set(categories);
  return todayExercises.some((exercise) => exercise.category && categorySet.has(exercise.category));
}

function inferReplacementCategories(
  selected: ProgramDayExercise,
  todayExercises: ProgramDayExercise[],
  dayName: string | null,
): string[] {
  const selectedCategory = selected.category;
  if (!selectedCategory) return [];

  const normalizedDayName = normalizeText(dayName);
  const looksLikePullDay = /pull|jalon|espalda|back/.test(normalizedDayName) || dayIncludesAny(todayExercises, PULL_CATEGORIES);
  const looksLikePushDay = /push|empuje|pecho|hombro/.test(normalizedDayName) || dayIncludesAny(todayExercises, PUSH_CATEGORIES);
  const looksLikeLegDay = /pierna|lower|leg|sentadilla/.test(normalizedDayName) || dayIncludesAny(todayExercises, LEG_CATEGORIES);

  if (looksLikePullDay && LEG_CATEGORIES.includes(selectedCategory)) {
    return PULL_CATEGORIES;
  }

  if (!looksLikePullDay && looksLikePushDay && LEG_CATEGORIES.includes(selectedCategory)) {
    return PUSH_CATEGORIES;
  }

  if (
    !looksLikePullDay
    && !looksLikePushDay
    && looksLikeLegDay
    && [...PULL_CATEGORIES, ...PUSH_CATEGORIES].includes(selectedCategory)
  ) {
    return LEG_CATEGORIES;
  }

  return [selectedCategory];
}

function candidateNameScore(candidateName: string, selected: ProgramDayExercise, dayName: string | null): number {
  const candidate = normalizeText(candidateName);
  const selectedName = normalizeText(selected.exercise_name ?? selected.name);
  const normalizedDayName = normalizeText(dayName);
  let score = 0;

  if (/jalon|dominada|pull/.test(candidate) && /jalon|pull|espalda|back/.test(normalizedDayName)) score += 16;
  if (/remo/.test(candidate) && /espalda|back|pull/.test(normalizedDayName)) score += 12;
  if (/press|banca|pecho/.test(candidate) && /push|empuje|pecho/.test(normalizedDayName)) score += 14;
  if (/sentadilla|prensa|squat/.test(candidate) && /pierna|leg|lower/.test(normalizedDayName)) score += 14;
  if (/peso muerto|rumano|curl femoral|hip thrust/.test(candidate) && /posterior|pierna|leg|lower/.test(normalizedDayName)) score += 12;

  if (/barra/.test(candidate) && /barra/.test(selectedName)) score += 5;
  if (/mancuerna/.test(candidate) && /mancuerna/.test(selectedName)) score += 5;
  if (/maquina/.test(candidate) && /maquina/.test(selectedName)) score += 4;
  if (/cable|polea/.test(candidate) && /cable|polea/.test(selectedName)) score += 4;

  return score;
}

function rankReplacementCandidates(
  candidates: Array<{ id: string; name: string; category: string }>,
  selected: ProgramDayExercise,
  todayExercises: ProgramDayExercise[],
  dayName: string | null,
  replacementCategories: string[],
  trainingContext: TrainingContext | null,
): ReplacementCandidate[] {
  const categoryCounts = todayExercises.reduce<Record<string, number>>((counts, exercise) => {
    if (!exercise.category) return counts;
    counts[exercise.category] = (counts[exercise.category] ?? 0) + 1;
    return counts;
  }, {});

  return candidates
    .map((candidate) => {
      const categoryIndex = replacementCategories.indexOf(candidate.category);
      const categoryScore = categoryIndex === -1 ? 0 : (replacementCategories.length - categoryIndex) * 30;
      const dayScore = (categoryCounts[candidate.category] ?? 0) * 18;
      const selectedScore = selected.category === candidate.category ? 16 : 0;
      const score = categoryScore
        + dayScore
        + selectedScore
        + candidateNameScore(candidate.name, selected, dayName)
        + exerciseSuitabilityScore(candidate, trainingContext);
      const reason = selected.category === candidate.category
        ? 'Misma categoría del ejercicio original'
        : categoryCounts[candidate.category]
          ? 'Encaja mejor con el enfoque de esta sesión'
          : 'Compatible con el patrón del día';

      return { ...candidate, score, reason };
    })
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      return scoreDiff === 0 ? a.name.localeCompare(b.name, 'es') : scoreDiff;
    })
    .slice(0, 3)
    .map((candidate, index) => ({
      id: candidate.id,
      name: candidate.name,
      category: candidate.category,
      rank: (index + 1) as 1 | 2 | 3,
      reason: candidate.reason,
    }));
}

function sessionDraftKey(userId: string) {
  return `session_draft_${userId}`;
}

export default function DashboardView({ onNavigate, onStartSession, onStartTravel }: DashboardViewProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Array<{ id: string; name: string; date: string; block_num: number | null }>>([]);
  const [nextDayName, setNextDayName] = useState<string | null>(null);
  const [nextDayNum, setNextDayNum] = useState<number | null>(null);
  const [nextDayId, setNextDayId] = useState<string | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [programComplete, setProgramComplete] = useState(false);
  const [completedWeeks, setCompletedWeeks] = useState(0);
  const [todayExercises, setTodayExercises] = useState<ProgramDayExercise[]>([]);
  const [trainingContext, setTrainingContext] = useState<TrainingContext | null>(null);
  const [pendingCheckin, setPendingCheckin] = useState<PendingInjuryCheckin | null>(null);
  const [programLoadError, setProgramLoadError] = useState<string | null>(null);

  const [adjustInput, setAdjustInput] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustedSummary, setAdjustedSummary] = useState<string | null>(null);
  const [originalExercises, setOriginalExercises] = useState<ProgramDayExercise[] | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ProgramDayExercise | null>(null);
  const [replacementCandidates, setReplacementCandidates] = useState<ReplacementCandidate[]>([]);
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [replaceError, setReplaceError] = useState<string | null>(null);

  const [showTravelSetup, setShowTravelSetup] = useState(false);
  const [travelDays, setTravelDays] = useState(3);
  const [travelHasBands, setTravelHasBands] = useState(true);
  const [travelHasPullupBar, setTravelHasPullupBar] = useState(false);
  const [travelVolume, setTravelVolume] = useState<'basic' | 'intermediate' | 'advanced'>('intermediate');
  const [travelDisliked, setTravelDisliked] = useState('');

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    Promise.all([
      supabase.from('sessions').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(5),
      supabase.from('programs').select('id, total_days, total_weeks, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('profiles').select('gender, training_experience, limitations').eq('id', userId).maybeSingle(),
      fetchActiveInjuries(userId),
      fetchPendingInjuryCheckin(userId),
    ]).then(async ([sRes, pRes, profileRes, injuries, checkin]) => {
      setProgramLoadError(null);
      setPendingCheckin(checkin);
      if (sRes.data) setSessions(sRes.data);
      if (profileRes.data) {
        setTrainingContext({
          gender: profileRes.data.gender ?? 'male',
          training_experience: profileRes.data.training_experience ?? 'intermediate',
          limitations: profileRes.data.limitations ?? null,
          injuries,
        });
      }

      if (pRes.data) {
        const progress = await fetchProgramProgressState(userId, pRes.data);
        const sessCount = progress.sessionCount;
        const weeksCompleted = Math.floor(sessCount / pRes.data.total_days);
        setCompletedWeeks(Math.min(weeksCompleted, pRes.data.total_weeks ?? 12));
        setProgramId(pRes.data.id);
        setCurrentWeek(progress.currentWeek);

        if (progress.programComplete) {
          setProgramComplete(true);
          setLoading(false);
          return;
        }

        const weekNum = progress.currentWeek;
        const dayNum = progress.currentDay;
        setNextDayNum(dayNum);

        let generationFailed = false;
        try {
          await ensureWeekGenerated(userId, pRes.data.id, weekNum);
        } catch (error) {
          generationFailed = true;
          console.error('[DashboardView] Week generation failed:', error);
          setProgramLoadError(`No se pudo generar la semana ${weekNum}. Evitamos mostrarte una rutina vieja para que no entrenes con el detalle incorrecto.`);
        }
        const dayResult = await fetchProgramDayForWeekOrFallback(pRes.data.id, weekNum, dayNum);

        if (dayResult.day && !(generationFailed && dayResult.isFallback && dayResult.sourceWeek !== weekNum)) {
          setNextDayName(dayResult.day.day_name);
          setNextDayId(dayResult.day.id);
          setTodayExercises(dayResult.day.exercises.map((exercise) => normalizeProgramDayExercise(exercise)));
        } else if (generationFailed) {
          setNextDayName(null);
          setNextDayId(null);
          setTodayExercises([]);
        }
      }

      setLoading(false);
    });
  }, [user]);

  const handleRevert = async () => {
    if (!originalExercises || !nextDayId) return;
    try {
      await supabase.from('program_days').update({ exercises: originalExercises }).eq('id', nextDayId);
      setTodayExercises(originalExercises);
      setOriginalExercises(null);
      setAdjustedSummary(null);
      toast.success('Sesión revertida al plan original');
    } catch {
      toast.error('No se pudo revertir. Intenta de nuevo.');
    }
  };

  const handleSubmitCheckin = async (level: 'none' | 'mild_self_resolving' | 'lasting_hours') => {
    if (!pendingCheckin) return;
    try {
      await submitInjuryCheckin(pendingCheckin.id, level);
      setPendingCheckin(null);
      toast.success('Check-in de lesión guardado');
    } catch {
      toast.error('No se pudo guardar el check-in.');
    }
  };

  const handleAdjust = async () => {
    if (!adjustInput.trim() || !user) return;
    setAdjusting(true);
    setAdjustError(null);
    const snapshot = [...todayExercises];
    try {
      const adjustments = await parseAdjustmentWithAI(adjustInput, {
        dayName: nextDayName,
        exercises: todayExercises
          .filter((exercise) => Boolean(exercise.exercise_name))
          .map((exercise) => ({
            name: exercise.exercise_name ?? '',
            category: exercise.category,
            role: exercise.role,
            sets: exercise.sets,
            repsMin: exercise.reps_min,
            repsMax: exercise.reps_max,
          })),
      });

      if (nextDayId) {
        const { data: dayData } = await supabase
          .from('program_days').select('id, day_name, exercises')
          .eq('id', nextDayId).maybeSingle();

        if (dayData?.exercises && Array.isArray(dayData.exercises)) {
          const exercises = dayData.exercises as Array<Record<string, unknown>>;
          let adjusted = [...exercises];
          const replacementSummaries: string[] = [];

          for (const adj of adjustments) {
            if (adj.weightScale) {
              adjusted = adjusted.map((ex) => ({ ...ex, weight: Math.round(((ex.weight as number) * adj.weightScale!) / 2.5) * 2.5 }));
            }
            if (adj.rpeDelta) {
              adjusted = adjusted.map((ex) => ({ ...ex, rpe: Math.max(5, Math.min(10, ((ex.rpe as number) ?? 7) + adj.rpeDelta!)) }));
            }
            if (adj.maxExercises) {
              const primaries = adjusted.filter((e) => e.role === 'primary');
              const secondaries = adjusted.filter((e) => e.role === 'secondary');
              const accessories = adjusted.filter((e) => e.role === 'accessory');
              adjusted = [...primaries, ...secondaries, ...accessories].slice(0, adj.maxExercises);
            }
            if (adj.type === 'swap_specific' || adj.type === 'swap_exercise') {
              const normalizedAdjusted = adjusted.map((ex) => normalizeProgramDayExercise(ex as Record<string, unknown>));
              let matchIdx = -1;

              if (adj.type === 'swap_specific' && adj.targetExerciseName) {
                const target = normalizeText(adj.targetExerciseName);
                const targetWords = target.split(/\s+/).filter(w => w.length > 2);
                matchIdx = normalizedAdjusted.findIndex((ex) => {
                  const exName = normalizeText(ex.exercise_name);
                  return targetWords.some(w => exName.includes(w)) || exName.includes(target);
                });
              } else {
                matchIdx = normalizedAdjusted.findIndex((ex) => ex.role === 'primary' || ex.role === 'secondary');
              }

              if (matchIdx !== -1) {
                const matchedEx = normalizedAdjusted[matchIdx];
                const currentIds = new Set(normalizedAdjusted.map((e) => e.exercise_id));
                const replacementCategories = inferReplacementCategories(matchedEx, normalizedAdjusted, dayData.day_name ?? nextDayName);
                if (replacementCategories.length === 0) continue;
                const { data: candidates } = await supabase.from('exercises').select('id, name, category')
                  .eq('user_id', user.id)
                  .neq('status', 'NO')
                  .in('category', replacementCategories)
                  .neq('id', matchedEx.exercise_id);
                const [substitute] = rankReplacementCandidates(
                  (candidates ?? []).filter(candidate => !currentIds.has(candidate.id) && isExerciseSuitableForProfile(candidate, trainingContext)),
                  matchedEx,
                  normalizedAdjusted,
                  dayData.day_name ?? nextDayName,
                  replacementCategories,
                  trainingContext,
                );

                if (substitute) {
                  adjusted[matchIdx] = {
                    ...adjusted[matchIdx],
                    exercise_id: substitute.id,
                    exercise_name: substitute.name,
                    category: substitute.category,
                    notes: `Sustituido por chat inteligente · ${substitute.reason}`,
                  };
                  replacementSummaries.push(`${substitute.name} reemplazó a ${matchedEx.exercise_name}.`);
                }
              }
            }
          }

          await supabase.from('program_days').update({ exercises: adjusted }).eq('id', dayData.id);
          setTodayExercises(adjusted.map((ex) => normalizeProgramDayExercise(ex as Record<string, unknown>)));
          setOriginalExercises(snapshot);
          setAdjustedSummary(
            [adjustments[0]?.details ?? 'Sesión ajustada según tu solicitud.', ...replacementSummaries]
              .filter(Boolean)
              .join(' ')
          );
        }
      }

      setAdjustInput('');
    } catch (err) {
      console.error('[handleAdjust] Error:', err);
      setAdjustError('No se pudieron aplicar los ajustes. Intenta de nuevo.');
      toast.error('No se pudieron aplicar los ajustes. Intenta de nuevo.');
    } finally {
      setAdjusting(false);
    }
  };

  const openReplaceModal = () => {
    setSelectedExercise(null);
    setReplacementCandidates([]);
    setReplaceError(null);
    setShowReplaceModal(true);
  };

  const selectExerciseForReplacement = async (exercise: ProgramDayExercise) => {
    if (!user) return;
    setSelectedExercise(exercise);
    setReplaceError(null);
    setReplaceLoading(true);
    try {
      const currentIds = new Set(todayExercises.map((item) => item.exercise_id));
      const replacementCategories = inferReplacementCategories(exercise, todayExercises, nextDayName);
      if (replacementCategories.length === 0) {
        setReplacementCandidates([]);
        return;
      }
      const { data } = await supabase
        .from('exercises')
        .select('id, name, category')
        .eq('user_id', user.id)
        .neq('status', 'NO')
        .in('category', replacementCategories)
        .neq('id', exercise.exercise_id);
      setReplacementCandidates(
        rankReplacementCandidates(
          (data ?? []).filter((candidate) => !currentIds.has(candidate.id) && isExerciseSuitableForProfile(candidate, trainingContext)),
          exercise,
          todayExercises,
          nextDayName,
          replacementCategories,
          trainingContext,
        ),
      );
    } catch {
      setReplaceError('No se pudieron cargar reemplazos para este ejercicio.');
    } finally {
      setReplaceLoading(false);
    }
  };

  const applyPersistentReplacement = async (candidateId: string) => {
    if (!user || !programId || !selectedExercise) return;
    setReplaceLoading(true);
    setReplaceError(null);
    try {
      const compatibleCategories = inferReplacementCategories(selectedExercise, todayExercises, nextDayName);
      const result = await replaceExerciseInProgram({
        userId: user.id,
        programId,
        currentWeek,
        fromExerciseId: selectedExercise.exercise_id ?? '',
        toExerciseId: candidateId,
        compatibleCategories,
      });
      localStorage.removeItem(sessionDraftKey(user.id));
      const refreshed = nextDayNum
        ? await fetchProgramDayForWeekOrFallback(programId, currentWeek, nextDayNum)
        : null;
      if (refreshed?.day) {
        setNextDayName(refreshed.day.day_name);
        setNextDayId(refreshed.day.id);
        setTodayExercises(refreshed.day.exercises.map((exercise) => normalizeProgramDayExercise(exercise)));
      }
      setOriginalExercises(null);
      setAdjustedSummary(null);
      setShowReplaceModal(false);
      setSelectedExercise(null);
      setReplacementCandidates([]);
      toast.success(
        result.usedExistingWeight
          ? `${result.replacement.name} reemplazó a ${result.removed.name}.`
          : `${result.replacement.name} reemplazó a ${result.removed.name} con peso de calibración.`
      );
    } catch {
      setReplaceError('No se pudo aplicar el reemplazo. Intenta de nuevo.');
    } finally {
      setReplaceLoading(false);
    }
  };

  const [travelGenerating, setTravelGenerating] = useState(false);

  const handleTravelModeClick = async (skipCache = false) => {
    if (!user) return;
    setAdjusting(true);
    setTravelGenerating(false);
    try {
      const dislikedExercises = travelDisliked
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const config: TravelBlockConfig = {
        hasBands: travelHasBands,
        hasPullupBar: travelHasPullupBar,
        travelDays,
        volumeLevel: travelVolume,
        dislikedExercises,
      };

      let block: CachedTravelBlock | null = skipCache ? null : getCachedTravelBlock(user.id, config);

      if (!block) {
        if (skipCache) clearTravelBlock(user.id);
        setTravelGenerating(true);
        const generated = await generateTravelBlock(user.id, config);
        block = {
          days: generated,
          current_index: 0,
          config,
          generated_at: new Date().toISOString(),
        };
        saveTravelBlock(user.id, block);
      }

      const { day, entries } = await getNextTravelSession(user.id, block);

      block = { ...block, current_index: (block.current_index + 1) % block.days.length };
      saveTravelBlock(user.id, block);

      const context: TravelDayContext = {
        label: day.label,
        focus: day.focus,
        session_difficulty: day.session_difficulty,
        estimated_minutes: day.estimated_minutes,
      };

      onStartTravel(entries, context);
      setShowTravelSetup(false);
    } catch {
      toast.error('Error al generar la sesión fuera del gym.');
    } finally {
      setAdjusting(false);
      setTravelGenerating(false);
    }
  };

  const weekNum = currentWeek;
  const blockName = weekNum <= 4 ? 'Volumen' : weekNum <= 8 ? 'Intensidad' : weekNum <= 11 ? 'Pico' : 'Descarga';
  const weeklyCompleted = Math.min(nextDayNum ? nextDayNum - 1 : 0, 7);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--muted)' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const sessionName = nextDayName || (programComplete ? 'Sesión libre' : 'Tu rutina');
  const lastSession = sessions[0] ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Program complete banner */}
      {programComplete && <DashboardProgramCompleteBanner completedWeeks={completedWeeks} onNewCycle={() => onNavigate('library')} />}

      {pendingCheckin && (
        <div style={{ border: '1px solid var(--rule)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div className="uc" style={{ color: 'var(--muted)', marginBottom: 6 }}>Check-in de lesión</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              ¿Cómo amaneció {pendingCheckin.injury.side === 'left' ? 'la zona izquierda' : pendingCheckin.injury.side === 'right' ? 'la zona derecha' : 'la zona afectada'}?
            </div>
            {pendingCheckin.injury.trigger_sensation && (
              <div className="caption" style={{ color: 'var(--muted)', marginTop: 4 }}>{pendingCheckin.injury.trigger_sensation}</div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => handleSubmitCheckin('none')}>Sin síntomas</button>
            <button className="btn btn-ghost" onClick={() => handleSubmitCheckin('mild_self_resolving')}>Leve y se fue</button>
            <button className="btn btn-ghost" onClick={() => handleSubmitCheckin('lasting_hours')}>Duró horas</button>
          </div>
        </div>
      )}

      {/* Hero: today's session */}
      <HeroSession
        sessionName={sessionName}
        exerciseCount={todayExercises.length}
        duration={todayExercises.length > 0 ? estimateDuration(todayExercises.length) : undefined}
        onStart={onStartSession}
        isAdjusting={adjusting}
        adjustedSummary={adjustedSummary}
        onRevert={originalExercises ? handleRevert : undefined}
      />

      {programLoadError && (
        <div style={{
          border: '1px solid color-mix(in oklab, var(--accent), transparent 70%)',
          background: 'color-mix(in oklab, var(--accent), transparent 94%)',
          color: 'var(--ink)',
          borderRadius: 14,
          padding: '12px 14px',
          fontSize: 13,
          lineHeight: 1.5,
        }}>
          {programLoadError}
        </div>
      )}

      {todayExercises.length > 0 && !programComplete && <DashboardReplaceExerciseCard onClick={openReplaceModal} />}

      {/* AI adjust */}
      <AdjustWithAI
        value={adjustInput}
        onChange={setAdjustInput}
        onSubmit={handleAdjust}
        loading={adjusting}
      />
      {adjustError && (
        <div style={{
          border: '1px solid color-mix(in oklab, var(--accent), transparent 70%)',
          background: 'color-mix(in oklab, var(--accent), transparent 94%)',
          color: 'var(--ink)',
          borderRadius: 14,
          padding: '12px 14px',
          fontSize: 13,
        }}>
          {adjustError}
        </div>
      )}

      {/* Travel mode */}
      <DashboardTravelModeCard onClick={() => setShowTravelSetup(true)} />

      {/* Context cards */}
      <ContextCards
        weeklyCompleted={weeklyCompleted}
        weekIndex={weekNum}
        totalWeeks={12}
        blockLabel={blockName}
        lastSessionName={lastSession?.name}
        lastSessionDate={lastSession ? new Date(lastSession.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : undefined}
        lastSessionBlock={lastSession?.block_num ? `Bloque ${lastSession.block_num}` : undefined}
      />

      {/* Ver programa completo */}
      <DashboardProgramLinkCard onClick={() => onNavigate('program')} />

      <DashboardTravelSetupModal
        isOpen={showTravelSetup}
        onClose={() => setShowTravelSetup(false)}
        travelDays={travelDays}
        onTravelDaysChange={setTravelDays}
        travelHasBands={travelHasBands}
        onTravelHasBandsChange={setTravelHasBands}
        travelHasPullupBar={travelHasPullupBar}
        onTravelHasPullupBarChange={setTravelHasPullupBar}
        travelVolume={travelVolume}
        onTravelVolumeChange={setTravelVolume}
        travelDisliked={travelDisliked}
        onTravelDislikedChange={setTravelDisliked}
        adjusting={adjusting}
        travelGenerating={travelGenerating}
        onRegenerate={() => handleTravelModeClick(true)}
        onNextSession={() => handleTravelModeClick(false)}
      />

      <DashboardReplaceExerciseModal
        isOpen={showReplaceModal}
        onClose={() => {
          if (replaceLoading) return;
          setShowReplaceModal(false);
          setSelectedExercise(null);
          setReplacementCandidates([]);
          setReplaceError(null);
        }}
        todayExercises={todayExercises}
        selectedExercise={selectedExercise}
        replacementCandidates={replacementCandidates}
        replaceLoading={replaceLoading}
        replaceError={replaceError}
        onSelectExercise={selectExerciseForReplacement}
        onBack={() => {
          setSelectedExercise(null);
          setReplacementCandidates([]);
          setReplaceError(null);
        }}
        onApplyReplacement={applyPersistentReplacement}
      />
    </div>
  );
}
