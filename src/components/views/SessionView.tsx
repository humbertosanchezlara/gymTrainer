import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { useIsMobile } from '../../hooks/useBreakpoint';
import type { Exercise } from '../../types';
import ExerciseDetailModal from '../ExerciseDetailModal';
import { getCatalogEntry } from '../../data/exerciseCatalog';
import {
  Plus, Check, Save, Trash2, Clock, Eye, X, AlertTriangle, Loader2, ArrowLeft,
} from 'lucide-react';
import type { Tab } from '../MainShell';

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

function getBlockInfo(week: number): { blockNum: number; blockName: string } {
  if (week <= 4) return { blockNum: 1, blockName: 'Volumen' };
  if (week <= 8) return { blockNum: 2, blockName: 'Intensidad' };
  if (week <= 11) return { blockNum: 3, blockName: 'Pico' };
  return { blockNum: 4, blockName: 'Descarga' };
}

function getRestLabel(rpe: number): string {
  if (rpe >= 8) return '3–5 min';
  if (rpe >= 6) return '2–3 min';
  return '60–90 seg';
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
  onClearTravel: () => void;
}

const BLOCKS = [
  { name: 'Volumen',    num: 1, desc: 'Alto volumen, intensidad moderada' },
  { name: 'Intensidad', num: 2, desc: 'Volumen moderado, alta intensidad' },
  { name: 'Pico',       num: 3, desc: 'Bajo volumen, máxima intensidad' },
  { name: 'Descarga',   num: 4, desc: 'Volumen e intensidad bajos — recuperación' },
] as const;

export default function SessionView({ onNavigate, travelDraft, onClearTravel }: SessionViewProps) {
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
      const { data: exData } = await supabase
        .from('exercises')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'YES')
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

      const { count: totalSessions } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', program.created_at)
        .not('block_num', 'is', null);

      const { data: lastGymSession } = await supabase
        .from('sessions')
        .select('date')
        .eq('user_id', user.id)
        .gte('created_at', program.created_at)
        .not('block_num', 'is', null)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      let daysSinceLast = 0;
      if (lastGymSession) {
        const lastDate = new Date(lastGymSession.date);
        const today = new Date();
        daysSinceLast = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      }

      const sessCount = totalSessions ?? 0;
      const currentDayNum = (sessCount % program.total_days) + 1;
      const currentWeek = Math.floor(sessCount / program.total_days) + 1;
      const { blockNum: bNum, blockName: bName } = getBlockInfo(currentWeek);

      setDayNum(currentDayNum);
      setWeekNum(currentWeek);
      setBlockNum(bNum);
      setBlockName(bName);

      // Intercept for travel draft
      if (travelDraft) {
        setSessionName('✈️ Rutina de Viaje (Bandas/Corporal)');
        setDayNum(0);
        setWeekNum(0);
        setBlockNum(0);
        setBlockName('Modo Viaje');
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
            setSessionName(draft.sessionName);
            setLogs(draft.logs);
            setLoadingProgram(false);
            draftRestoredRef.current = true;
            return;
          }
        } catch {
          localStorage.removeItem(sessionDraftKey(user.id));
        }
      }

      const { data: programDay } = await supabase
        .from('program_days')
        .select('*')
        .eq('program_id', program.id)
        .eq('day_number', currentDayNum)
        .maybeSingle();

      if (programDay) {
        setSessionName(programDay.day_name);

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

        const dayExercises = (Array.isArray(programDay.exercises) ? programDay.exercises : []) as Array<Record<string, unknown>>;
        const preFilled: SessionLogEntry[] = dayExercises.map((ex) => {
          let currentWeight = weightMap.get(ex.exercise_id as string) ?? (ex.weight as number) ?? 0;
          let rpe = (ex.rpe as number) ?? 7;

          if (applyPenalty && currentWeight > 0) {
            currentWeight = Math.round((currentWeight * penaltyScale) / 2.5) * 2.5;
            rpe = Math.max(5, rpe - 1);
          }

          return {
            exercise_id: ex.exercise_id as string,
            exercise_name: (ex.exercise_name as string) || '—',
            sets: ex.sets as number,
            reps_per_set: (ex.reps_max as number) ?? (ex.reps_min as number) ?? 8,
            weight: currentWeight,
            rpe,
            notes: applyPenalty && currentWeight > 0 ? 'Carga reducida (Readaptación)' : '',
            target_reps_min: ex.reps_min as number | undefined,
            target_reps_max: ex.reps_max as number | undefined,
            target_rpe: ex.rpe as number | undefined,
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

    if (sErr || !session) { setSaving(false); return; }

    const logRows = logs.filter(l => l.exercise_id).map(l => ({
      session_id: session.id,
      exercise_id: l.exercise_id,
      sets: l.sets,
      reps_per_set: l.reps_per_set,
      weight: l.weight,
      rpe: l.rpe || null,
      notes: l.notes || null,
    }));

    await supabase.from('session_logs').insert(logRows);

    const progressions: ProgressionResult[] = [];
    for (const l of logs.filter(l => l.exercise_id && l.weight > 0)) {
      const result = computeProgression(l);
      progressions.push(result);
      await supabase.from('working_weights').upsert(
        { user_id: user.id, exercise_id: l.exercise_id, weight: result.next_weight, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,exercise_id' }
      );
    }

    const notable = progressions.filter(r => r.action !== 'keep');
    setProgressionResults(notable);

    localStorage.removeItem(sessionDraftKey(user.id));
    onClearTravel();
    setSaving(false);
    setSaved(true);

    toast.success('Sesión guardada correctamente');
    setTimeout(() => { onNavigate('dashboard'); }, notable.length > 0 ? 4000 : 1500);
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
      <header className="forge-topnav">
        <div style={{
          maxWidth: 720, margin: '0 auto',
          padding: isMobile ? '0 16px' : '0 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56,
        }}>
          <button
            onClick={() => { onClearTravel(); onNavigate('dashboard'); }}
            className="btn btn-ghost"
            style={{ gap: 6, padding: '8px 12px' }}
          >
            <ArrowLeft size={14} /> Hoy
          </button>

          {travelDraft && (
            <div className="uc" style={{ color: 'var(--accent)', fontSize: 10 }}>✈️ Modo Viaje</div>
          )}

          <div style={{ width: 80 }} />
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────── */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: isMobile ? '24px 16px' : '32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--rule)', paddingBottom: 16 }}>
          <input
            type="text"
            value={sessionName}
            onChange={e => setSessionName(e.target.value)}
            placeholder="Nombre de la sesión"
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'var(--sans)', fontWeight: 700, letterSpacing: '-0.02em',
              fontSize: isMobile ? 26 : 32, color: 'var(--ink)', width: '100%',
              padding: 0,
            }}
          />
          <div className="mono caption" style={{ marginTop: 8, color: 'var(--muted)' }}>
            {hasProgram && weekNum > 0
              ? `Día ${dayNum} · Semana ${weekNum} · ${blockName}`
              : hasProgram
              ? blockName
              : 'Registra tu trabajo. Los pesos se actualizan automáticamente.'}
          </div>
        </div>

        {/* Periodization bar */}
        {hasProgram && blockNum > 0 && (
          <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 20px' }}>
            <div className="uc" style={{ color: 'var(--muted)', marginBottom: 12 }}>Bloque actual</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {BLOCKS.map(b => {
                const isActive = blockNum === b.num;
                const isPast = blockNum > b.num;
                return (
                  <div key={b.num} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                    <div style={{
                      height: 3, width: '100%', borderRadius: 99,
                      background: isActive ? 'var(--accent)' : isPast ? 'var(--ink)' : 'var(--rule)',
                      transition: 'background .2s',
                    }} />
                    <span className="mono caption" style={{
                      fontSize: 9,
                      color: isActive ? 'var(--accent)' : isPast ? 'var(--ink)' : 'var(--muted)',
                      fontWeight: isActive ? 700 : 400,
                    }}>
                      {b.name.slice(0, isActive ? 20 : 3).toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
            {blockDesc && (
              <div className="caption" style={{ marginTop: 10, color: 'var(--muted)', textAlign: 'center' }}>
                {blockDesc}
              </div>
            )}
          </div>
        )}

        {/* Deload / readaptation banner */}
        {deloadApplied && (
          <div style={{
            borderLeft: '3px solid var(--accent)',
            borderRadius: '0 8px 8px 0',
            background: 'color-mix(in oklab, var(--accent), transparent 92%)',
            padding: '12px 16px',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <AlertTriangle size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Modo de Readaptación Activado</div>
              <div className="caption" style={{ color: 'var(--muted)' }}>
                Han pasado {deloadApplied.days} días desde tu última sesión de gimnasio.
                Cargas reducidas {deloadApplied.percentage}% — RPE objetivo también bajó.
              </div>
            </div>
          </div>
        )}

        {/* RPE reference */}
        <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '12px 16px' }}>
          <div className="uc" style={{ color: 'var(--muted)', marginBottom: 6 }}>RPE — Esfuerzo Percibido</div>
          <div className="mono caption" style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--ink)' }}>6</strong> = quedan 4+ reps ·{' '}
            <strong style={{ color: 'var(--ink)' }}>7</strong> = quedan 3 ·{' '}
            <strong style={{ color: 'var(--ink)' }}>8</strong> = quedan 2 ·{' '}
            <strong style={{ color: 'var(--ink)' }}>9</strong> = queda 1 ·{' '}
            <strong style={{ color: 'var(--ink)' }}>10</strong> = fallo
          </div>
        </div>

        {/* ── Exercise log cards ──────────────────────────────── */}
        {logs.map((log, i) => (
          <div
            key={`log-${i}-${log.exercise_id}`}
            style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}
          >
            {/* Exercise name + controls */}
            <div style={{
              padding: isMobile ? '14px 16px' : '18px 24px',
              borderBottom: '1px solid var(--rule)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {log.exercise_name ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>{log.exercise_name}</div>
                    {getCatalogEntry(log.exercise_name) && (
                      <button
                        onClick={() => setDetailExercise(log.exercise_name)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4,
                          color: 'var(--accent)', fontFamily: 'var(--sans)',
                          fontSize: 11, fontWeight: 700, padding: '4px 0',
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}
                      >
                        <Eye size={11} /> Ver técnica
                      </button>
                    )}
                  </>
                ) : (
                  <select
                    value={log.exercise_id}
                    onChange={e => updateLog(i, 'exercise_id', e.target.value)}
                    style={{
                      width: '100%', background: 'transparent', border: 'none', outline: 'none',
                      fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 15,
                      color: 'var(--ink)', cursor: 'pointer',
                    }}
                  >
                    <option value="">Seleccionar ejercicio…</option>
                    {exercises.map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Rest chip + delete */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  border: '1px solid var(--rule)', borderRadius: 999, padding: '4px 10px',
                }}>
                  <Clock size={10} style={{ color: 'var(--muted)' }} />
                  <span className="mono caption" style={{ whiteSpace: 'nowrap' }}>{getRestLabel(log.rpe)}</span>
                </div>

                {confirmDeleteIdx === i ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => removeLog(i)}
                      className="btn btn-ghost"
                      style={{ padding: '4px 10px', fontSize: 12, color: '#ba1a1a', borderColor: '#ba1a1a', gap: 4 }}
                    >
                      <Trash2 size={11} /> Borrar
                    </button>
                    <button onClick={() => setConfirmDeleteIdx(null)} className="btn btn-ghost" style={{ padding: 6 }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteIdx(i)}
                    className="btn btn-ghost"
                    style={{ padding: 6, color: 'var(--muted)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Delete confirmation */}
            {confirmDeleteIdx === i && (
              <div style={{
                padding: '10px 16px',
                background: 'color-mix(in oklab, #ba1a1a, transparent 92%)',
                borderBottom: '1px solid var(--rule)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <AlertTriangle size={12} style={{ color: '#ba1a1a', flexShrink: 0 }} />
                <span className="caption" style={{ color: '#ba1a1a' }}>
                  ¿Eliminar <strong>{log.exercise_name || 'este ejercicio'}</strong>?
                </span>
              </div>
            )}

            {/* 4-column input grid — 1px gap creates divider lines */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--rule)' }}>
              {/* SERIES */}
              <div style={{ background: 'var(--paper)', padding: isMobile ? '12px 6px' : '14px 16px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <span className="uc" style={{ color: 'var(--muted)', fontSize: 9 }}>SERIES</span>
                <input
                  type="number"
                  className="session-num-input"
                  value={log.sets}
                  onChange={e => updateLog(i, 'sets', +e.target.value)}
                  inputMode="numeric"
                  step={1}
                  min={1}
                  style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: isMobile ? 20 : 24, fontWeight: 600, color: 'var(--ink)', outline: 'none' }}
                />
              </div>
              {/* REPS */}
              <div style={{ background: 'var(--paper)', padding: isMobile ? '12px 6px' : '14px 16px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <span className="uc" style={{ color: 'var(--muted)', fontSize: 9 }}>REPS</span>
                <input
                  type="number"
                  className="session-num-input"
                  value={log.reps_per_set}
                  onChange={e => updateLog(i, 'reps_per_set', +e.target.value)}
                  inputMode="numeric"
                  step={1}
                  min={1}
                  style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: isMobile ? 20 : 24, fontWeight: 600, color: 'var(--ink)', outline: 'none' }}
                />
              </div>
              {/* PESO */}
              <div style={{ background: 'var(--paper)', padding: isMobile ? '12px 6px' : '14px 16px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <span className="uc" style={{ color: 'var(--muted)', fontSize: 9 }}>{isMobile ? 'kg' : 'PESO (kg)'}</span>
                <input
                  type="number"
                  className="session-num-input"
                  value={log.weight}
                  onChange={e => updateLog(i, 'weight', +e.target.value)}
                  inputMode="decimal"
                  step={2.5}
                  min={0}
                  style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: isMobile ? 20 : 24, fontWeight: 600, color: 'var(--ink)', outline: 'none' }}
                />
              </div>
              {/* RPE */}
              <div style={{ background: 'var(--paper)', padding: isMobile ? '12px 6px' : '14px 16px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <span className="uc" style={{ color: 'var(--muted)', fontSize: 9 }}>RPE</span>
                <input
                  type="number"
                  className="session-num-input"
                  value={log.rpe}
                  onChange={e => updateLog(i, 'rpe', +e.target.value)}
                  inputMode="numeric"
                  step={1}
                  min={5}
                  max={10}
                  style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: isMobile ? 20 : 24, fontWeight: 600, color: 'var(--accent)', outline: 'none' }}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Add exercise */}
        <button
          onClick={addLog}
          style={{
            background: 'transparent',
            border: '1px dashed var(--rule)',
            borderRadius: 12,
            padding: '16px 24px',
            cursor: 'pointer',
            fontFamily: 'var(--sans)',
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'color .15s, border-color .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ink)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--rule)'; }}
        >
          <Plus size={16} /> Agregar ejercicio
        </button>

        {/* Save button */}
        {logs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={handleSave}
              disabled={saving || !sessionName}
              className="btn btn-ink btn-xl"
              style={{ justifyContent: 'center', opacity: (saving || !sessionName) ? 0.4 : 1 }}
            >
              {saved
                ? <><Check size={18} /> ¡Guardado!</>
                : saving
                ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Guardando…</>
                : <><Save size={16} /> Guardar sesión</>}
            </button>

            {/* Progression summary — shown after save */}
            {saved && progressionResults.length > 0 && (
              <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--rule)' }}>
                  <div className="uc" style={{ color: 'var(--muted)' }}>Progresión automática</div>
                </div>
                {progressionResults.map(r => (
                  <div
                    key={r.exercise_name}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 12, padding: '12px 20px', borderTop: '1px solid var(--rule)',
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{r.exercise_name}</span>
                    {r.action === 'up'
                      ? <span className="mono caption" style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>↑ {r.prev_weight} → {r.next_weight} kg</span>
                      : <span className="mono caption" style={{ color: 'var(--muted)', flexShrink: 0 }}>⚠ Revisa el peso</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Exercise detail modal */}
      {detailExercise && (
        <ExerciseDetailModal exerciseName={detailExercise} onClose={() => setDetailExercise(null)} />
      )}
    </div>
  );
}
