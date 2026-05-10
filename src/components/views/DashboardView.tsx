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
import type { ProgramSessionSelection, Tab } from '../MainShell';
import type { UserInjury } from '../../types';
import { HeroSession } from '../forge/HeroSession';
import { AdjustWithAI } from '../forge/AdjustWithAI';
import { ContextCards } from '../forge/ContextCards';
import {
  fetchCompletedProgramSlots,
  fetchProgramDayForWeekOrFallback,
  fetchProgramProgressState,
  fetchProgramWeekDaysOrFallback,
  normalizeProgramDayExercise,
  programSlotKey,
} from '../../utils/programState';
import { inferReplacementCategories, rankReplacementCandidates, normalizeReplacementText } from '../../utils/exerciseReplacement';
import { DashboardProgramCompleteBanner } from './dashboard/DashboardProgramCompleteBanner';
import { DashboardTravelModeCard } from './dashboard/DashboardTravelModeCard';
import { DashboardProgramLinkCard } from './dashboard/DashboardProgramLinkCard';
import { DashboardTravelSetupModal } from './dashboard/DashboardTravelSetupModal';
import { DashboardSwitchDayCard } from './dashboard/DashboardSwitchDayCard';
import { DashboardSwitchDayModal } from './dashboard/DashboardSwitchDayModal';
import { isExerciseSuitableForProfile } from '../../engine/exerciseSuitability';

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

interface TrainingContext {
  gender: string;
  training_experience: string;
  limitations?: string | null;
  injuries?: UserInjury[] | null;
}

interface PendingProgramDay {
  id: string;
  day_number: number;
  day_name: string;
  exerciseCount: number;
  isCurrent: boolean;
}

// ─── Component ────────────────────────────────────────────
interface DashboardViewProps {
  onNavigate: (t: Tab) => void;
  onStartSession: (selection?: ProgramSessionSelection | null) => void;
  onStartTravel: (d: SessionLogEntry[], context: TravelDayContext) => void;
}

function estimateDuration(exerciseCount: number): string {
  const min = exerciseCount * 7;
  const max = exerciseCount * 10;
  return `${min}–${max} min`;
}

function normalizeText(value?: string | null): string {
  return normalizeReplacementText(value);
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
  const [pendingProgramDays, setPendingProgramDays] = useState<PendingProgramDay[]>([]);
  const [showSwitchDayModal, setShowSwitchDayModal] = useState(false);
  const [programId, setProgramId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [programComplete, setProgramComplete] = useState(false);
  const [completedWeeks, setCompletedWeeks] = useState(0);
  const [weeklyCompletedCount, setWeeklyCompletedCount] = useState(0);
  const [todayExercises, setTodayExercises] = useState<ProgramDayExercise[]>([]);
  const [trainingContext, setTrainingContext] = useState<TrainingContext | null>(null);
  const [pendingCheckin, setPendingCheckin] = useState<PendingInjuryCheckin | null>(null);
  const [programLoadError, setProgramLoadError] = useState<string | null>(null);

  const [adjustInput, setAdjustInput] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustedSummary, setAdjustedSummary] = useState<string | null>(null);
  const [originalExercises, setOriginalExercises] = useState<ProgramDayExercise[] | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);
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
        const [weekResult, completedSlots] = await Promise.all([
          fetchProgramWeekDaysOrFallback(pRes.data.id, weekNum),
          fetchCompletedProgramSlots(userId, pRes.data),
        ]);
        const pendingDays = weekResult.days
          .filter((day) => !completedSlots.has(programSlotKey(weekNum, day.day_number)))
          .map((day) => ({
            id: day.id,
            day_number: day.day_number,
            day_name: day.day_name,
            exerciseCount: Array.isArray(day.exercises) ? day.exercises.length : 0,
            isCurrent: day.day_number === dayNum,
          }));
        setWeeklyCompletedCount(
          weekResult.days.filter((day) => completedSlots.has(programSlotKey(weekNum, day.day_number))).length
        );
        setPendingProgramDays(pendingDays);

        const selectedDayNum = pendingDays.some((day) => day.day_number === dayNum)
          ? dayNum
          : pendingDays[0]?.day_number ?? dayNum;
        const dayResult = {
          day: weekResult.days.find((day) => day.day_number === selectedDayNum) ?? null,
          sourceWeek: weekResult.sourceWeek,
          isFallback: weekResult.isFallback,
        };

        if (dayResult.day && !(generationFailed && dayResult.isFallback && dayResult.sourceWeek !== weekNum)) {
          setNextDayName(dayResult.day.day_name);
          setNextDayId(dayResult.day.id);
          setNextDayNum(dayResult.day.day_number);
          setTodayExercises(dayResult.day.exercises.map((exercise) => normalizeProgramDayExercise(exercise)));
        } else if (generationFailed) {
          setNextDayName(null);
          setNextDayId(null);
          setPendingProgramDays([]);
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

  const handleSwitchDay = async (dayNum: number) => {
    if (!programId) return;
    const dayResult = await fetchProgramDayForWeekOrFallback(programId, currentWeek, dayNum);
    if (!dayResult.day) {
      toast.error('No se pudo cargar esa sesión.');
      return;
    }

    setNextDayName(dayResult.day.day_name);
    setNextDayId(dayResult.day.id);
    setNextDayNum(dayResult.day.day_number);
    setTodayExercises(dayResult.day.exercises.map((exercise) => normalizeProgramDayExercise(exercise)));
    setOriginalExercises(null);
    setAdjustedSummary(null);
    if (user) localStorage.removeItem(sessionDraftKey(user.id));
    setShowSwitchDayModal(false);
    toast.success(`Sesión de hoy cambiada a ${dayResult.day.day_name}`);
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
  const weeklyCompleted = weeklyCompletedCount;

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
  const selectedProgramSession = programId && nextDayNum && nextDayName
    ? { programId, weekNum: currentWeek, dayNum: nextDayNum, dayName: nextDayName }
    : null;

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
        onStart={() => onStartSession(selectedProgramSession)}
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

      {todayExercises.length > 0 && !programComplete && (
        <DashboardSwitchDayCard
          selectedDayName={nextDayName}
          pendingCount={pendingProgramDays.length}
          onClick={() => setShowSwitchDayModal(true)}
        />
      )}

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

      <DashboardSwitchDayModal
        isOpen={showSwitchDayModal}
        onClose={() => setShowSwitchDayModal(false)}
        pendingDays={pendingProgramDays}
        selectedDayNum={nextDayNum}
        onSelectDay={handleSwitchDay}
      />
    </div>
  );
}
