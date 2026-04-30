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
import { generateAndSaveNextWeek } from '../../lib/openaiProgramGenerator';
import type { TravelDayContext } from '../../lib/openaiTravelGenerator';
import type { Tab } from '../MainShell';
import { fetchProgramDayForWeekOrFallback, fetchProgramProgressState, normalizeProgramDayExercise } from '../../utils/programState';
import { SessionTopBar } from './session/SessionTopBar';
import { SessionHeaderCard } from './session/SessionHeaderCard';
import { SessionTravelBanner } from './session/SessionTravelBanner';
import { SessionBlockProgress } from './session/SessionBlockProgress';
import { SessionAlertBanner } from './session/SessionAlertBanner';
import { SessionRpeGuide } from './session/SessionRpeGuide';
import { SessionExerciseCard } from './session/SessionExerciseCard';
import { SessionSavePanel } from './session/SessionSavePanel';

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

type ProgressionAction = 'up' | 'keep' | 'warn';

interface ProgressionResult {
  exercise_name: string;
  prev_weight: number;
  next_weight: number;
  action: ProgressionAction;
}

interface SessionDraft {
  dayNum: number;
  weekNum: number;
  sessionName: string;
  logs: SessionLogEntry[];
}

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

// ─── Component ────────────────────────────────────────────
interface SessionViewProps {
  onNavigate: (t: Tab) => void;
  travelDraft: SessionLogEntry[] | null;
  travelContext: TravelDayContext | null;
  onClearTravel: () => void;
}

const BLOCKS = [
  { name: 'Volumen',    num: 1, desc: 'Alto volumen, intensidad moderada' },
  { name: 'Intensidad', num: 2, desc: 'Volumen moderado, alta intensidad' },
  { name: 'Pico',       num: 3, desc: 'Bajo volumen, máxima intensidad' },
  { name: 'Descarga',   num: 4, desc: 'Volumen e intensidad bajos — recuperación' },
] as const;

export default function SessionView({ onNavigate, travelDraft, travelContext, onClearTravel }: SessionViewProps) {
  const { user } = useAuth();
  const toast = useToast();
  const isMobile = useIsMobile();

  const [exercises, setExercises] = useState<Exercise[]>([]);
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
  const [totalDays, setTotalDays] = useState<number>(0);
  const [currentSessCount, setCurrentSessCount] = useState<number>(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const draftRestoredRef = useRef(false);

  // Persist draft to localStorage whenever logs or sessionName change
  useEffect(() => {
    if (!user || loadingProgram || !draftRestoredRef.current || travelDraft) return;
    const draft: SessionDraft = { dayNum, weekNum, sessionName, logs };
    localStorage.setItem(sessionDraftKey(user.id), JSON.stringify(draft));
  }, [logs, sessionName, user, dayNum, weekNum, loadingProgram, travelDraft]);

  useEffect(() => {
    if (!user) return;

    const loadSession = async () => {
      setSaveError(null);
      const { data: exData } = await supabase
        .from('exercises')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'NO')
        .order('category');
      if (exData) setExercises(exData);

      const { data: program } = await supabase
        .from('programs')
        .select('id, total_days, total_weeks, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!program) {
        setLoadingProgram(false);
        return;
      }

      setHasProgram(true);
      const progress = await fetchProgramProgressState(user.id, program);

      let daysSinceLast = 0;
      if (progress.lastSessionDate) {
        const lastDate = new Date(progress.lastSessionDate);
        const today = new Date();
        daysSinceLast = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      }

      const sessCount = progress.sessionCount;
      const currentDayNum = progress.currentDay;
      const currentWeek = progress.currentWeek;
      const { blockNum: bNum, blockName: bName } = progress;

      setDayNum(currentDayNum);
      setWeekNum(currentWeek);
      setBlockNum(bNum);
      setBlockName(bName);
      setProgramId(program.id);
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
        setLoadingProgram(false);
        setHasProgram(true);
        draftRestoredRef.current = true;
        return;
      }

      // Check if there's a saved draft for this same day/week
      const savedDraft = localStorage.getItem(sessionDraftKey(user.id));
      if (savedDraft) {
        try {
          const draft: SessionDraft = JSON.parse(savedDraft);
          if (draft.dayNum === currentDayNum && draft.weekNum === currentWeek) {
            if (!Array.isArray(draft.logs)) {
              // Draft is corrupt (non-array logs from old code) — discard it
              localStorage.removeItem(sessionDraftKey(user.id));
            } else {
              setSessionName(draft.sessionName);
              setLogs(draft.logs);
              setLoadingProgram(false);
              draftRestoredRef.current = true;
              return;
            }
          }
        } catch {
          localStorage.removeItem(sessionDraftKey(user.id));
        }
      }

      const dayResult = await fetchProgramDayForWeekOrFallback(program.id, currentWeek, currentDayNum);

      if (dayResult.day) {
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
            target_reps_min: ex.reps_min,
            target_reps_max: ex.reps_max,
            target_rpe: ex.rpe,
          };
        });

        setLogs(preFilled);
      }

      setLoadingProgram(false);
      draftRestoredRef.current = true;
    };

    loadSession();
  }, [user]);

  const addLog = () => {
    setLogs([...logs, { exercise_id: '', exercise_name: '', sets: 3, reps_per_set: 8, weight: 0, rpe: 7, notes: '' }]);
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
    if (!user || !sessionName || logs.length === 0) return;
    setSaving(true);
    setSaveError(null);

    try {
      const { data: session, error: sErr } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          name: sessionName,
          week_num: weekNum === 0 ? null : weekNum,
          block_num: blockNum === 0 ? null : blockNum,
        })
        .select()
        .single();

      if (sErr || !session) throw sErr ?? new Error('No se pudo crear la sesión');

      const logRows = logs.filter(l => l.exercise_id).map(l => ({
        session_id: session.id,
        exercise_id: l.exercise_id,
        sets: l.sets,
        reps_per_set: l.reps_per_set,
        weight: l.weight,
        rpe: l.rpe || null,
        notes: l.notes || null,
      }));

      if (logRows.length > 0) {
        const { error: logErr } = await supabase.from('session_logs').insert(logRows);
        if (logErr) throw logErr;
      }

      const progressions: ProgressionResult[] = [];
      for (const l of logs.filter(l => l.exercise_id && l.weight > 0)) {
        const result = computeProgression(l);
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
