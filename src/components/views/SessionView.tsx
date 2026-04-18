import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import type { Exercise } from '../../types';
import { SessionLogSkeleton } from '../skeletons';
import ExerciseDetailModal from '../ExerciseDetailModal';
import { getCatalogEntry } from '../../data/exerciseCatalog';
import {
  Plus, Check, Save, Trash2, Clock, Eye, X, AlertTriangle
} from 'lucide-react';
import type { Tab } from '../MainShell';

// ─── Animation variants ───────────────────────────────────
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const fadeUp = {
  hidden: { y: 18, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

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

export default function SessionView({ onNavigate, travelDraft, onClearTravel }: SessionViewProps) {
  const { user } = useAuth();
  const toast = useToast();
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
        const diffMs = today.getTime() - lastDate.getTime();
        daysSinceLast = Math.floor(diffMs / (1000 * 3600 * 24));
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
        setBlockName('Modo Viaje (Pausado)');
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
          for (const ww of wwData) {
            weightMap.set(ww.exercise_id, Number(ww.weight));
          }
        }

        const applyPenalty = daysSinceLast >= 14;
        const penaltyScale = daysSinceLast >= 21 ? 0.85 : 0.90;

        if (applyPenalty) {
          setDeloadApplied({ days: daysSinceLast, percentage: Math.round((1 - penaltyScale) * 100) });
        }

        const dayExercises = (programDay.exercises || []) as Array<Record<string, unknown>>;
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
        block_num: blockNum === 0 ? null : blockNum
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
        {
          user_id: user.id,
          exercise_id: l.exercise_id,
          weight: result.next_weight,
          updated_at: new Date().toISOString(),
        },
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

    setTimeout(() => {
      onNavigate('dashboard');
    }, notable.length > 0 ? 4000 : 1500);
  };

  if (loadingProgram) {
    return <SessionLogSkeleton />;
  }

  const inputNumCls = "w-full bg-white dark:bg-white/10 border border-outline-variant/30 rounded-lg py-2.5 px-3 text-center text-on-surface outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body text-sm shadow-sm";

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6 max-w-2xl">
      <motion.div variants={fadeUp}>
        <div className="flex items-start justify-between gap-4 mb-1">
          <h2 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface">
            {hasProgram ? sessionName || 'Registrar Sesión' : 'Registrar Sesión'}
          </h2>
          {travelDraft && (
            <button
              onClick={() => { onClearTravel(); onNavigate('dashboard'); }}
              aria-label="Salir del modo viaje"
              className="mt-2 text-xs text-error font-bold flex items-center gap-1 hover:opacity-80 transition-opacity bg-error/10 px-3 py-1.5 rounded-full"
            >
              <X size={14} /> Salir del viaje
            </button>
          )}
        </div>
        <p className="text-on-surface-variant font-body text-sm">
          {hasProgram ? (
            <>
              Día {dayNum} · Semana {weekNum} · <span className="text-primary font-bold">{blockName}</span>
            </>
          ) : (
            'Registra tu trabajo. Los pesos se actualizan automáticamente.'
          )}
        </p>
      </motion.div>

      {/* Session Meta */}
      <motion.div variants={fadeUp} className="card-elevated rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Detalles de la Sesión</span>
        </div>
        <input
          type="text"
          placeholder="Nombre de la sesión"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          aria-label="Nombre de la sesión"
          aria-required="true"
          className="w-full bg-transparent border-b border-outline-variant/20 pb-2 text-on-surface text-lg font-headline font-bold placeholder:text-on-surface-variant/30 outline-none focus:border-primary transition-colors mb-3"
        />
        <div className="flex gap-4 mb-3">
          <div className="flex-1">
            <label className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest block mb-1">Semana</label>
            <p className="text-center text-on-surface font-headline font-extrabold text-2xl">{weekNum}</p>
          </div>
          <div className="flex-1">
            <label className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest block mb-1">Bloque</label>
            <p className="text-center text-primary font-headline font-extrabold text-2xl">{blockName || blockNum}</p>
          </div>
        </div>

        {/* Periodization progress bar */}
        {hasProgram && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {([
                { name: 'Volumen', weeks: 4, num: 1 },
                { name: 'Intensidad', weeks: 4, num: 2 },
                { name: 'Pico', weeks: 3, num: 3 },
                { name: 'Descarga', weeks: 1, num: 4 },
              ] as const).map((b) => {
                const isActive = blockNum === b.num;
                const isPast = blockNum > b.num;
                return (
                  <div key={b.num} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`h-1.5 w-full rounded-full transition-all ${
                        isActive
                          ? 'bg-primary-container'
                          : isPast
                          ? 'bg-primary/30'
                          : 'bg-outline-variant/15'
                      }`}
                    />
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${
                      isActive ? 'text-primary' : 'text-on-surface-variant/30'
                    }`}>
                      {b.name}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-on-surface-variant text-[10px] font-body text-center">
              {blockNum === 1 && 'Alto volumen, intensidad moderada — construyendo base muscular'}
              {blockNum === 2 && 'Volumen moderado, alta intensidad — ganando fuerza'}
              {blockNum === 3 && 'Bajo volumen, máxima intensidad — expresando fuerza'}
              {blockNum === 4 && 'Volumen e intensidad bajos — recuperación activa'}
            </p>
          </div>
        )}
      </motion.div>

      {deloadApplied && (
        <motion.div variants={fadeUp} className="bg-primary-container/20 border-l-4 border-primary rounded-r-xl px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-primary mt-0.5 shrink-0" size={18} />
            <div>
              <p className="text-on-surface font-headline font-bold text-sm">Modo de Readaptación Activado</p>
              <p className="text-on-surface-variant text-xs font-body mt-1">
                Han pasado {deloadApplied.days} días desde tu última sesión de gimnasio principal. Se han reducido automáticamente tus cargas un {deloadApplied.percentage}% y el RPE objetivo ha bajado respecto al predeterminado para facilitar tu regreso sin excesos.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* RPE Reference Banner */}
      <motion.div variants={fadeUp} className="bg-primary-container/15 border border-primary-container/30 rounded-xl px-4 py-3">
        <p className="text-[11px] font-bold text-primary/70 uppercase tracking-widest mb-1">RPE — Esfuerzo Percibido</p>
        <p className="text-on-surface-variant text-xs font-body leading-relaxed">
          <span className="text-on-surface font-medium">6</span> = quedan 4+ reps ·{' '}
          <span className="text-on-surface font-medium">7</span> = quedan 3 ·{' '}
          <span className="text-on-surface font-medium">8</span> = quedan 2 ·{' '}
          <span className="text-on-surface font-medium">9</span> = queda 1 ·{' '}
          <span className="text-on-surface font-medium">10</span> = fallo muscular
        </p>
      </motion.div>

      {/* Exercise Logs */}
      <AnimatePresence>
        {logs.map((log, i) => (
          <motion.div
            key={`log-${i}-${log.exercise_id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: i * 0.04 }}
            className="card-elevated rounded-xl p-5 space-y-3"
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {log.exercise_name ? (
                  <div>
                    <span className="text-on-surface font-headline font-bold text-lg tracking-tight leading-tight block">{log.exercise_name}</span>
                    {getCatalogEntry(log.exercise_name) && (
                      <button
                        onClick={() => setDetailExercise(log.exercise_name)}
                        aria-label={`Ver técnica de ${log.exercise_name}`}
                        className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors group"
                      >
                        <Eye size={11} className="group-hover:scale-110 transition-transform" />
                        Ver técnica
                      </button>
                    )}
                  </div>
                ) : (
                  <select
                    value={log.exercise_id}
                    onChange={(e) => updateLog(i, 'exercise_id', e.target.value)}
                    aria-label="Seleccionar ejercicio"
                    className="w-full bg-transparent text-on-surface font-headline font-bold text-lg outline-none appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-surface">Seleccionar ejercicio...</option>
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id} className="bg-surface">{ex.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Rest time chip + delete */}
              <div className="flex items-center gap-2 shrink-0 pt-0.5">
                <div className="flex items-center gap-1 bg-surface-container-highest/60 rounded-full px-2.5 py-1">
                  <Clock size={10} className="text-on-surface-variant/60" />
                  <span className="text-[10px] font-bold text-on-surface-variant whitespace-nowrap">{getRestLabel(log.rpe)}</span>
                </div>

                {confirmDeleteIdx === i ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => removeLog(i)}
                      aria-label={`Confirmar eliminar ${log.exercise_name || 'ejercicio'}`}
                      className="flex items-center gap-1 text-[10px] font-bold text-error bg-error-container/40 hover:bg-error-container/70 px-2 py-1 rounded-full transition-colors"
                    >
                      <Trash2 size={10} /> Borrar
                    </button>
                    <button
                      onClick={() => setConfirmDeleteIdx(null)}
                      aria-label="Cancelar eliminación"
                      className="text-on-surface-variant/50 hover:text-on-surface-variant transition-colors p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteIdx(i)}
                    aria-label={`Eliminar ${log.exercise_name || 'ejercicio'}`}
                    className="text-on-surface-variant/30 hover:text-error transition-colors p-1"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Delete confirmation warning */}
            {confirmDeleteIdx === i && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 bg-error-container/20 border border-error/20 rounded-lg px-3 py-2"
              >
                <AlertTriangle size={12} className="text-error shrink-0" />
                <p className="text-[11px] text-error/80 font-body">¿Eliminar <span className="font-bold">{log.exercise_name || 'este ejercicio'}</span>?</p>
              </motion.div>
            )}

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest block mb-1.5">Series</label>
                <input
                  type="number"
                  value={log.sets}
                  onChange={(e) => updateLog(i, 'sets', +e.target.value)}
                  aria-label="Series"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  className={inputNumCls}
                />
              </div>
              <div>
                <label className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest block mb-1.5">Reps</label>
                <input
                  type="number"
                  value={log.reps_per_set}
                  onChange={(e) => updateLog(i, 'reps_per_set', +e.target.value)}
                  aria-label="Repeticiones"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  className={inputNumCls}
                />
              </div>
              <div>
                <label className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest block mb-1.5">Peso (kg)</label>
                <input
                  type="number"
                  value={log.weight}
                  onChange={(e) => updateLog(i, 'weight', +e.target.value)}
                  aria-label="Peso (kg)"
                  inputMode="decimal"
                  step="2.5"
                  min="0"
                  className={inputNumCls}
                />
              </div>
              <div>
                <label className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest block mb-1.5">RPE</label>
                <input
                  type="number"
                  value={log.rpe}
                  onChange={(e) => updateLog(i, 'rpe', +e.target.value)}
                  aria-label="RPE (esfuerzo percibido)"
                  inputMode="numeric"
                  step="1"
                  min="5"
                  max="10"
                  className={inputNumCls}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add Exercise */}
      <motion.button
        variants={fadeUp}
        onClick={addLog}
        className="w-full border border-dashed border-outline-variant/30 rounded-xl py-4 text-on-surface-variant/50 hover:text-primary hover:border-primary/30 transition-all font-headline font-bold flex items-center justify-center gap-2 text-sm"
      >
        <Plus size={16} /> Agregar Ejercicio
      </motion.button>

      {/* Save */}
      {logs.length > 0 && (
        <motion.div variants={fadeUp} className="pt-2 space-y-3">
          <button
            onClick={handleSave}
            disabled={saving || !sessionName}
            className="w-full bg-primary-container text-on-primary-container font-headline font-bold py-4 rounded-full text-lg tracking-tight flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary-container/20 disabled:opacity-40"
          >
            {saved ? <><Check size={20} /> ¡Guardado!</> : saving ? 'Guardando...' : <><Save size={18} /> Guardar Sesión</>}
          </button>

          {/* Progression summary — shown after save */}
          <AnimatePresence>
            {saved && progressionResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="card-elevated rounded-xl p-4 space-y-2"
              >
                <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
                  Progresión automática
                </p>
                {progressionResults.map((r) => (
                  <div key={r.exercise_name} className="flex items-center justify-between gap-3">
                    <span className="text-on-surface font-body text-sm truncate">{r.exercise_name}</span>
                    {r.action === 'up' ? (
                      <span className="shrink-0 flex items-center gap-1 text-xs font-headline font-bold text-primary bg-primary-container/30 px-2.5 py-1 rounded-full">
                        ↑ {r.prev_weight} → {r.next_weight} kg
                      </span>
                    ) : (
                      <span className="shrink-0 flex items-center gap-1 text-xs font-headline font-bold text-secondary bg-secondary-container/30 px-2.5 py-1 rounded-full">
                        ⚠ Peso elevado — revisa
                      </span>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Exercise Detail Modal */}
      {detailExercise && (
        <ExerciseDetailModal
          exerciseName={detailExercise}
          onClose={() => setDetailExercise(null)}
        />
      )}
    </motion.div>
  );
}
