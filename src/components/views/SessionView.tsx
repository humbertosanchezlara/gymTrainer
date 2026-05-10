import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { useIsMobile } from '../../hooks/useBreakpoint';
import type { Exercise } from '../../types';
import ExerciseDetailModal from '../ExerciseDetailModal';
import {
  Loader2,
} from 'lucide-react';
import { ensureWeekGenerated, generateAndSaveNextWeek } from '../../lib/openaiProgramGenerator';
import { fetchActiveInjuries } from '../../lib/injuryProfile';
import { createPendingInjuryCheckins, fetchRecentInjuryCheckins } from '../../lib/injuryCheckins';
import type { TravelDayContext } from '../../lib/openaiTravelGenerator';
import type { ProgramSessionSelection, Tab } from '../MainShell';
import type { RangeStatus, UserInjury } from '../../types';
import { fetchProgramDayForWeekOrFallback, fetchProgramProgressState, getBlockInfo, normalizeProgramDayExercise } from '../../utils/programState';
import { injuryAffectsExercise } from '../../engine/injuryExerciseRules';
import { decideInjuryProgression } from '../../engine/injuryProgression';
import { SessionTopBar } from './session/SessionTopBar';
import { SessionHeaderCard } from './session/SessionHeaderCard';
import { SessionTravelBanner } from './session/SessionTravelBanner';
import { SessionBlockProgress } from './session/SessionBlockProgress';
import { SessionAlertBanner } from './session/SessionAlertBanner';
import { SessionRpeGuide } from './session/SessionRpeGuide';
import { SessionExerciseCard } from './session/SessionExerciseCard';
import { SessionSavePanel } from './session/SessionSavePanel';
import { SessionProgressionGuide } from './session/SessionProgressionGuide';

// ─── Types ────────────────────────────────────────────────
export interface SessionLogEntry {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps_per_set: number;
  weight: number;
  rpe: number;
  notes: string;
  range_status?: RangeStatus;
  target_reps_min?: number;
  target_reps_max?: number;
  target_rpe?: number;
}

type ProgressionAction = 'up' | 'keep' | 'warn';

interface ProgressionResult {
  exercise_name: string;
  prev_weight: number;
  next_weight: number;
  action: ProgressionAction;
  note?: string;
}

interface PreviousExercisePerformance {
  reps: number;
  weight: number;
  rpe: number | null;
  sessionName: string;
}

interface SessionDraft {
  dayNum: number;
  weekNum: number;
  sessionName: string;
  logs: SessionLogEntry[];
}

type SaveSessionInsert = {
  user_id: string;
  program_id?: string | null;
  name: string;
  week_num: number | null;
  day_num?: number | null;
  block_num: number | null;
};

type SaveSessionLogInsert = {
  session_id: string;
  exercise_id: string;
  sets: number;
  reps_per_set: number;
  weight: number;
  rpe: number | null;
  notes: string | null;
  range_status?: RangeStatus;
};

function sessionDraftKey(userId: string) {
  return `session_draft_${userId}`;
}

/**
 * Double-progression rule:
 *   ↑  reps >= target_reps_max  AND  rpe <= target_rpe       → +2.5 kg next session
 *   ⚠  rpe > target_rpe + 1.5  OR   reps < target_reps_min  → flag (weight unchanged)
 *   →  everything else                                         → keep
 */
function computeProgression(log: SessionLogEntry): ProgressionResult {
  const { weight, reps_per_set, rpe, target_reps_min, target_reps_max, target_rpe } = log;

  if (target_reps_max === undefined || target_rpe === undefined) {
    return { exercise_name: log.exercise_name, prev_weight: weight, next_weight: weight, action: 'keep' };
  }

  const hitMaxReps  = reps_per_set >= target_reps_max;
  const rpeOnTarget = rpe <= target_rpe;
  const tooHard     = rpe > target_rpe + 1.5;
  const tooLowReps  = target_reps_min !== undefined && reps_per_set < target_reps_min;

  if (hitMaxReps && rpeOnTarget) {
    const next = Math.round((weight + 2.5) / 2.5) * 2.5;
    return { exercise_name: log.exercise_name, prev_weight: weight, next_weight: next, action: 'up' };
  }
  if (tooHard || tooLowReps) {
    return { exercise_name: log.exercise_name, prev_weight: weight, next_weight: weight, action: 'warn' };
  }
  return { exercise_name: log.exercise_name, prev_weight: weight, next_weight: weight, action: 'keep' };
}

async function fetchLatestExercisePerformances(
  userId: string,
  programCreatedAt: string,
  exerciseIds: string[]
): Promise<Map<string, PreviousExercisePerformance>> {
  const uniqueIds = [...new Set(exerciseIds.filter(Boolean))];
  const latestByExercise = new Map<string, PreviousExercisePerformance>();
  if (uniqueIds.length === 0) return latestByExercise;

  const { data } = await supabase
    .from('sessions')
    .select('name, created_at, logs:session_logs(exercise_id, reps_per_set, weight, rpe)')
    .eq('user_id', userId)
    .gte('created_at', programCreatedAt)
    .not('block_num', 'is', null)
    .order('created_at', { ascending: false })
    .limit(60);

  for (const session of data ?? []) {
    const logs = Array.isArray(session.logs) ? session.logs : [];
    for (const log of logs) {
      if (!uniqueIds.includes(log.exercise_id) || latestByExercise.has(log.exercise_id)) continue;
      latestByExercise.set(log.exercise_id, {
        reps: Number(log.reps_per_set) || 0,
        weight: Number(log.weight) || 0,
        rpe: log.rpe === null || log.rpe === undefined ? null : Number(log.rpe),
        sessionName: session.name || 'Última sesión',
      });
    }
  }

  return latestByExercise;
}

// ─── Component ────────────────────────────────────────────
interface SessionViewProps {
  onNavigate: (t: Tab) => void;
  travelDraft: SessionLogEntry[] | null;
  travelContext: TravelDayContext | null;
  programSelection: ProgramSessionSelection | null;
  onClearTravel: () => void;
}

const BLOCKS = [
  { name: 'Volumen',    num: 1, desc: 'Alto volumen, intensidad moderada' },
  { name: 'Intensidad', num: 2, desc: 'Volumen moderado, alta intensidad' },
  { name: 'Pico',       num: 3, desc: 'Bajo volumen, máxima intensidad' },
  { name: 'Descarga',   num: 4, desc: 'Volumen e intensidad bajos — recuperación' },
] as const;

export default function SessionView({ onNavigate, travelDraft, travelContext, programSelection, onClearTravel }: SessionViewProps) {
  const { user } = useAuth();
  const toast = useToast();
  const isMobile = useIsMobile();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [injuries, setInjuries] = useState<UserInjury[]>([]);
  const [sessionName, setSessionName] = useState('');
  const [weekNum, setWeekNum] = useState<number>(1);
  const [blockNum, setBlockNum] = useState<number>(1);
  const [blockName, setBlockName] = useState('Volumen');
  const [dayNum, setDayNum] = useState<number>(1);
  const [logs, setLogs] = useState<SessionLogEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingProgram, setLoadingProgram] = useState(true);
  const [hasProgram, setHasProgram] = useState(false);
  const [detailExercise, setDetailExercise] = useState<string | null>(null);
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);
  const [progressionResults, setProgressionResults] = useState<ProgressionResult[]>([]);
  const [deloadApplied, setDeloadApplied] = useState<{ days: number; percentage: number } | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);
  const [programCreatedAt, setProgramCreatedAt] = useState<string | null>(null);
  const [totalDays, setTotalDays] = useState<number>(0);
  const [currentSessCount, setCurrentSessCount] = useState<number>(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [latestPerformance, setLatestPerformance] = useState<Map<string, PreviousExercisePerformance>>(new Map());
  const draftRestoredRef = useRef(false);

  // Persist draft to localStorage whenever logs or sessionName change
  useEffect(() => {
    if (!user || loadingProgram || !draftRestoredRef.current || travelDraft) return;
    const draft: SessionDraft = { dayNum, weekNum, sessionName, logs };
    localStorage.setItem(sessionDraftKey(user.id), JSON.stringify(draft));
  }, [logs, sessionName, user, dayNum, weekNum, loadingProgram, travelDraft]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    const loadSession = async () => {
      setSaveError(null);
      const { data: exData } = await supabase
        .from('exercises')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'NO')
        .order('category');
      if (exData) setExercises(exData);
      const activeInjuries = await fetchActiveInjuries(userId);
      setInjuries(activeInjuries);

      const { data: program } = await supabase
        .from('programs')
        .select('id, total_days, total_weeks, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!program) {
        setLoadingProgram(false);
        return;
      }

      setHasProgram(true);
      const progress = await fetchProgramProgressState(userId, program);

      let daysSinceLast = 0;
      if (progress.lastSessionDate) {
        const lastDate = new Date(progress.lastSessionDate);
        const today = new Date();
        daysSinceLast = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      }

      const sessCount = progress.sessionCount;
      const selectedProgramDay = programSelection?.programId === program.id ? programSelection : null;
      const currentDayNum = selectedProgramDay?.dayNum ?? progress.currentDay;
      const currentWeek = selectedProgramDay?.weekNum ?? progress.currentWeek;
      const selectedBlock = selectedProgramDay ? getBlockInfo(selectedProgramDay.weekNum) : progress;
      const { blockNum: bNum, blockName: bName } = selectedBlock;

      setDayNum(currentDayNum);
      setWeekNum(currentWeek);
      setBlockNum(bNum);
      setBlockName(bName);
      setProgramId(program.id);
      setProgramCreatedAt(program.created_at);
      setTotalDays(program.total_days);
      setCurrentSessCount(sessCount);

      // Intercept for travel draft
      if (travelDraft) {
        const name = travelContext
          ? `Día ${travelContext.label} · ${travelContext.focus}`
          : 'Sesión Fuera del Gym';
        setSessionName(name);
        setDayNum(0);
        setWeekNum(0);
        setBlockNum(0);
        setBlockName('Fuera del Gym');
        setLogs(travelDraft);
        setLatestPerformance(new Map());
        setLoadingProgram(false);
        setHasProgram(true);
        draftRestoredRef.current = true;
        return;
      }

      // Check if there's a saved draft for this same day/week
      const savedDraft = localStorage.getItem(sessionDraftKey(userId));
      if (savedDraft) {
        try {
          const draft: SessionDraft = JSON.parse(savedDraft);
          if (draft.dayNum === currentDayNum && draft.weekNum === currentWeek) {
            if (!Array.isArray(draft.logs)) {
              // Draft is corrupt (non-array logs from old code) — discard it
              localStorage.removeItem(sessionDraftKey(userId));
            } else {
              setSessionName(draft.sessionName);
              setLogs(draft.logs);
              const performance = await fetchLatestExercisePerformances(
                userId,
                program.created_at,
                draft.logs.map((log) => log.exercise_id)
              );
              setLatestPerformance(performance);
              setLoadingProgram(false);
              draftRestoredRef.current = true;
              return;
            }
          }
        } catch {
          localStorage.removeItem(sessionDraftKey(userId));
        }
      }

      let generationFailed = false;
      try {
        await ensureWeekGenerated(userId, program.id, currentWeek);
      } catch (error) {
        generationFailed = true;
        console.error('[SessionView] Week generation failed:', error);
        setSaveError(`No se pudo generar la semana ${currentWeek}. Bloqueamos la sesión para evitar que entrenes con la plantilla de la semana 1.`);
      }
      const dayResult = await fetchProgramDayForWeekOrFallback(program.id, currentWeek, currentDayNum);

      if (dayResult.day && !(generationFailed && dayResult.isFallback && dayResult.sourceWeek !== currentWeek)) {
        setSessionName(dayResult.day.day_name);

        const { data: wwData } = await supabase
          .from('working_weights')
          .select('exercise_id, weight')
          .eq('user_id', user.id);

        const weightMap = new Map<string, number>();
        if (wwData) {
          for (const ww of wwData) weightMap.set(ww.exercise_id, Number(ww.weight));
        }

        const applyPenalty = daysSinceLast >= 14;
        const penaltyScale = daysSinceLast >= 21 ? 0.85 : 0.90;

        if (applyPenalty) {
          setDeloadApplied({ days: daysSinceLast, percentage: Math.round((1 - penaltyScale) * 100) });
        }

        const dayExercises: Array<{
          exercise_id: string;
          exercise_name: string;
          sets: number;
          reps_min: number;
          reps_max: number;
          weight: number;
          rpe: number;
        }> = (Array.isArray(dayResult.day.exercises) ? dayResult.day.exercises : []).map((ex: unknown) =>
          normalizeProgramDayExercise(ex as Record<string, unknown>)
        );
        const preFilled: SessionLogEntry[] = dayExercises.map((ex) => {
          let currentWeight = weightMap.get(ex.exercise_id) ?? ex.weight ?? 0;
          let rpe = ex.rpe || 7;

          if (applyPenalty && currentWeight > 0) {
            currentWeight = Math.round((currentWeight * penaltyScale) / 2.5) * 2.5;
            rpe = Math.max(5, rpe - 1);
          }

          return {
            exercise_id: ex.exercise_id,
            exercise_name: ex.exercise_name,
            sets: ex.sets,
            reps_per_set: ex.reps_min ?? 8,
            weight: currentWeight,
            rpe,
            notes: applyPenalty && currentWeight > 0 ? 'Carga reducida (Readaptación)' : '',
            range_status: 'unknown',
            target_reps_min: ex.reps_min,
            target_reps_max: ex.reps_max,
            target_rpe: ex.rpe,
          };
        });

        const performance = await fetchLatestExercisePerformances(
          userId,
          program.created_at,
          preFilled.map((log) => log.exercise_id)
        );
        setLatestPerformance(performance);
        setLogs(preFilled);
      } else if (generationFailed) {
        setSessionName('');
        setLogs([]);
        setLatestPerformance(new Map());
      }

      setLoadingProgram(false);
      draftRestoredRef.current = true;
    };

    loadSession();
  }, [programSelection, travelContext, travelDraft, user]);

  const addLog = () => {
    setLogs([...logs, { exercise_id: '', exercise_name: '', sets: 3, reps_per_set: 8, weight: 0, rpe: 7, notes: '', range_status: 'unknown' }]);
  };

  const updateLog = (idx: number, field: string, value: string | number) => {
    const updated = [...logs];
    const entry = { ...updated[idx] } as SessionLogEntry & Record<string, unknown>;
    entry[field] = value;
    if (field === 'exercise_id') {
      const found = exercises.find(e => e.id === value);
      entry.exercise_name = found?.name ?? '';
    }
    updated[idx] = entry;
    setLogs(updated);
  };

  const removeLog = (idx: number) => {
    setLogs(logs.filter((_, i) => i !== idx));
    setConfirmDeleteIdx(null);
  };

  const handleSave = async () => {
    if (!user || !sessionName || logs.length === 0 || saving || saved) return;
    setSaving(true);
    setSaveError(null);

    try {
      let session: { id: string } | null = null;
      let existingLogCount = 0;

      if (!travelDraft && programId && weekNum > 0 && dayNum > 0) {
        let existingQuery = supabase
          .from('sessions')
          .select('id, logs:session_logs(id)')
          .eq('user_id', user.id)
          .eq('program_id', programId)
          .eq('week_num', weekNum)
          .eq('day_num', dayNum)
          .not('block_num', 'is', null)
          .order('created_at', { ascending: true })
          .limit(1);

        if (programCreatedAt) {
          existingQuery = existingQuery.gte('created_at', programCreatedAt);
        }

        let { data: existing, error: existingErr } = await existingQuery.maybeSingle();
        if (existingErr && /program_id|day_num/.test(existingErr.message)) {
          let legacyExistingQuery = supabase
            .from('sessions')
            .select('id, logs:session_logs(id)')
            .eq('user_id', user.id)
            .eq('week_num', weekNum)
            .eq('name', sessionName)
            .not('block_num', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1);

          if (programCreatedAt) {
            legacyExistingQuery = legacyExistingQuery.gte('created_at', programCreatedAt);
          }

          ({ data: existing, error: existingErr } = await legacyExistingQuery.maybeSingle());
        }
        if (existingErr) throw existingErr;
        if (existing) {
          session = { id: existing.id };
          existingLogCount = Array.isArray(existing.logs) ? existing.logs.length : 0;
        }
      }

      if (!session) {
        const sessionPayload: SaveSessionInsert = {
          user_id: user.id,
          program_id: programId,
          name: sessionName,
          week_num: weekNum === 0 ? null : weekNum,
          day_num: weekNum === 0 ? null : dayNum,
          block_num: blockNum === 0 ? null : blockNum,
        };

        let sessionInsert = await supabase
          .from('sessions')
          .insert(sessionPayload)
          .select()
          .single();

        if (sessionInsert.error && /program_id|day_num/.test(sessionInsert.error.message)) {
          const { program_id, day_num, ...legacySessionPayload } = sessionPayload;
          sessionInsert = await supabase
            .from('sessions')
            .insert(legacySessionPayload)
            .select()
            .single();
        }

        const { data: createdSession, error: sErr } = sessionInsert;
        if (sErr || !createdSession) throw sErr ?? new Error('No se pudo crear la sesión');
        session = createdSession;
      }

      if (!session) throw new Error('No se pudo crear o recuperar la sesión');

      const logRows: SaveSessionLogInsert[] = logs.filter(l => l.exercise_id).map(l => ({
        session_id: session.id,
        exercise_id: l.exercise_id,
        sets: l.sets,
        reps_per_set: l.reps_per_set,
        weight: l.weight,
        rpe: l.rpe || null,
        notes: l.notes || null,
        range_status: l.range_status ?? 'unknown',
      }));

      if (logRows.length > 0 && existingLogCount === 0) {
        let { error: logErr } = await supabase.from('session_logs').insert(logRows);
        if (logErr && /range_status/.test(logErr.message)) {
          const legacyLogRows = logRows.map(({ range_status, ...row }) => row);
          ({ error: logErr } = await supabase.from('session_logs').insert(legacyLogRows));
        }
        if (logErr) throw logErr;
      }

      await createPendingInjuryCheckins({
        userId: user.id,
        sessionId: session.id,
        logs: logs.filter(l => l.exercise_id),
        exercises,
        injuries,
      });

      const progressions: ProgressionResult[] = [];
      for (const l of logs.filter(l => l.exercise_id && l.weight > 0)) {
        const exercise = exercises.find((item) => item.id === l.exercise_id);
        const affectedInjury = exercise ? injuryAffectsExercise(exercise, injuries) : null;
        let result = computeProgression(l);

        if (affectedInjury) {
          const recentCheckins = await fetchRecentInjuryCheckins(user.id, affectedInjury.id);
          const decision = decideInjuryProgression({
            injury: affectedInjury,
            currentLog: {
              reps_per_set: l.reps_per_set,
              rpe: l.rpe,
              range_status: l.range_status ?? 'unknown',
              target_reps_max: l.target_reps_max,
              target_rpe: l.target_rpe,
            },
            recentCheckins,
          });
          const scaled = decision.weightScale
            ? Math.round((l.weight * decision.weightScale) / 2.5) * 2.5
            : decision.weightDeltaPercent
              ? Math.round((l.weight * (1 + decision.weightDeltaPercent / 100)) / 2.5) * 2.5
              : l.weight;
          result = {
            exercise_name: l.exercise_name,
            prev_weight: l.weight,
            next_weight: scaled,
            action: decision.decision === 'advance_weight' ? 'up' : decision.decision === 'deload' ? 'warn' : 'keep',
            note: decision.note,
          };
        }

        progressions.push(result);
        const { error: wwErr } = await supabase.from('working_weights').upsert(
          { user_id: user.id, exercise_id: l.exercise_id, weight: result.next_weight, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,exercise_id' }
        );
        if (wwErr) throw wwErr;
      }

      const notable = progressions.filter(r => r.action !== 'keep');
      setProgressionResults(notable);

      localStorage.removeItem(sessionDraftKey(user.id));
      onClearTravel();
      setSaving(false);
      setSaved(true);

      if (programId && totalDays > 0 && !travelDraft && weekNum > 0) {
        const sessAfter = currentSessCount + 1;
        if (sessAfter % totalDays === 0) {
          const nextWeekNum = Math.floor(sessAfter / totalDays) + 1;
          generateAndSaveNextWeek(user.id, programId, nextWeekNum).catch(err => {
            console.error('[background] Next week generation failed:', err);
          });
        }
      }

      toast.success('Sesión guardada correctamente');
      setTimeout(() => { onNavigate('dashboard'); }, notable.length > 0 ? 4000 : 1500);
    } catch (err) {
      console.error('[handleSave] Error:', err);
      setSaveError('No se pudo guardar la sesión. Intenta nuevamente.');
      setSaving(false);
    }
  };

  // ─── Loading ───────────────────────────────────────────────
  if (loadingProgram) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--muted)' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const blockDesc = BLOCKS.find(b => b.num === blockNum)?.desc ?? '';

  // ─── Render ────────────────────────────────────────────────
  return (
    <div
      className="forge-fade"
      style={{
        minHeight: '100vh',
        background: 'var(--paper)',
        color: 'var(--ink)',
        paddingBottom: 80,
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .session-num-input::-webkit-inner-spin-button,
        .session-num-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .session-num-input { -moz-appearance: textfield; }
      `}</style>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <SessionTopBar travelDraft={Boolean(travelDraft)} onBack={() => { onClearTravel(); onNavigate('dashboard'); }} />

      {/* ── Content ─────────────────────────────────────────── */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: isMobile ? '24px 16px' : '32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <SessionHeaderCard
          sessionName={sessionName}
          onSessionNameChange={setSessionName}
          isMobile={isMobile}
          travelContext={travelContext}
          hasProgram={hasProgram}
          weekNum={weekNum}
          dayNum={dayNum}
          blockName={blockName}
        />

        {/* Return-to-gym banner */}
        {travelDraft && <SessionTravelBanner onReturnToGym={() => { onClearTravel(); onNavigate('dashboard'); }} />}

        {/* Periodization bar */}
        {hasProgram && blockNum > 0 && <SessionBlockProgress blocks={BLOCKS} blockNum={blockNum} blockDesc={blockDesc} />}

        {/* Deload / readaptation banner */}
        {deloadApplied && (
          <SessionAlertBanner
            title="Modo de Readaptación Activado"
            description={`Han pasado ${deloadApplied.days} días desde tu última sesión de gimnasio. Cargas reducidas ${deloadApplied.percentage}% — RPE objetivo también bajó.`}
          />
        )}

        {saveError && (
          <div style={{
            border: '1px solid color-mix(in oklab, var(--accent), transparent 70%)',
            background: 'color-mix(in oklab, var(--accent), transparent 94%)',
            borderRadius: 12,
            padding: '12px 16px',
            fontSize: 13,
            lineHeight: 1.5,
          }}>
            {saveError}
          </div>
        )}

        {/* RPE reference */}
        {hasProgram && !travelDraft && <SessionProgressionGuide />}
        <SessionRpeGuide />

        {/* ── Exercise log cards ──────────────────────────────── */}
        {(Array.isArray(logs) ? logs : []).map((log, i) => (
          <SessionExerciseCard
            key={`log-${i}-${log.exercise_id}`}
            log={log}
            index={i}
            exercises={exercises}
            isMobile={isMobile}
            isTravelDraft={Boolean(travelDraft)}
            previousPerformance={latestPerformance.get(log.exercise_id) ?? null}
            confirmDelete={confirmDeleteIdx === i}
            onShowTechnique={setDetailExercise}
            onAskDelete={setConfirmDeleteIdx}
            onCancelDelete={() => setConfirmDeleteIdx(null)}
            onRemove={removeLog}
              onUpdate={updateLog}
            />
        ))}

        <SessionSavePanel
          canSave={Boolean(sessionName)}
          saving={saving}
          saved={saved}
          progressionResults={progressionResults}
          showSaveActions={Array.isArray(logs) && logs.length > 0}
          onAddExercise={addLog}
          onSave={handleSave}
        />
      </main>

      {/* Exercise detail modal */}
      {detailExercise && (
        <ExerciseDetailModal exerciseName={detailExercise} onClose={() => setDetailExercise(null)} />
      )}
    </div>
  );
}
