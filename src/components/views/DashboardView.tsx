import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { deriveEngineProfile, generateNoEquipmentProgram } from '../../engine/noEquipmentAdapter';
import { DashboardSkeleton } from '../skeletons';
import {
  Dumbbell, RefreshCw, Loader2, Send, Sparkles, Check, Plane
} from 'lucide-react';
import Modal from '../Modal';
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
interface SessionAdjustment {
  type: 'deload' | 'reduce_time' | 'swap_exercise' | 'swap_specific' | 'general';
  weightScale?: number;
  rpeDelta?: number;
  maxExercises?: number;
  targetExerciseName?: string;
  reason: string;
  details: string;
}

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

// ─── Smart Adjustment Parser ─────────────────────────────
function parseAdjustmentRequest(text: string): SessionAdjustment[] {
  const lower = text.toLowerCase();
  const adjustments: SessionAdjustment[] = [];

  const fatigueKeywords = ['cansado', 'cansada', 'fatigado', 'fatigada', 'pesado', 'pesada',
    'agotado', 'agotada', 'dormí', 'dormi', 'sueño', 'sueno', 'desvelé', 'desvele',
    'no descansé', 'no descanse', 'mal dormido', 'mal dormida', 'horas de sueño',
    'exhausto', 'exhausta', 'drenado', 'drenada'];
  const sleepMatch = lower.match(/dorm[ií]\s*(\d+)\s*hora/);
  const hasFatigue = fatigueKeywords.some(k => lower.includes(k));
  const lowSleep = sleepMatch && parseInt(sleepMatch[1]) < 6;

  if (hasFatigue || lowSleep) {
    const severity = lowSleep && parseInt(sleepMatch![1]) <= 4 ? 0.75 : 0.80;
    adjustments.push({
      type: 'deload',
      weightScale: severity,
      rpeDelta: -1.5,
      reason: 'Fatiga detectada',
      details: lowSleep
        ? `Descanso insuficiente (${sleepMatch![1]}h). Peso reducido ${Math.round((1 - severity) * 100)}%, RPE -1.5`
        : `Fatiga general. Peso reducido ${Math.round((1 - severity) * 100)}%, RPE -1.5`,
    });
  }

  const painKeywords = ['dolor', 'duele', 'molestia', 'lesión', 'lesion', 'lastimé', 'lastime',
    'inflamado', 'inflamada', 'pinzamiento', 'contractura'];
  const hasPain = painKeywords.some(k => lower.includes(k));

  if (hasPain) {
    adjustments.push({
      type: 'deload',
      weightScale: 0.70,
      rpeDelta: -2,
      reason: 'Dolor / molestia reportada',
      details: 'Peso reducido 30%, RPE -2. Presta atención a la técnica y detente si el dolor persiste.',
    });
  }

  const timeMatch = lower.match(/(\d+)\s*min/);
  const timeKeywords = ['poco tiempo', 'rápido', 'rapido', 'corta', 'prisa', 'apurado', 'apurada',
    'menos tiempo', 'acortar', 'reducir tiempo'];
  const hasTimeConstraint = timeKeywords.some(k => lower.includes(k)) || timeMatch;

  if (hasTimeConstraint) {
    const minutes = timeMatch ? parseInt(timeMatch[1]) : 30;
    const maxEx = Math.max(3, Math.floor((minutes - 5) / 7));
    adjustments.push({
      type: 'reduce_time',
      maxExercises: maxEx,
      reason: 'Sesión reducida',
      details: timeMatch
        ? `Ajustada a ${minutes} min (~${maxEx} ejercicios). Se priorizan compuestos.`
        : `Sesión acortada (~${maxEx} ejercicios). Se priorizan compuestos.`,
    });
  }

  const equipKeywords = ['no tengo', 'sin barra', 'sin mancuerna', 'no hay', 'falta equipo',
    'equipo', 'máquina', 'maquina', 'rota', 'ocupada', 'ocupado'];
  const hasEquipIssue = equipKeywords.some(k => lower.includes(k));

  if (hasEquipIssue) {
    adjustments.push({
      type: 'swap_exercise',
      reason: 'Problema de equipamiento',
      details: 'Los ejercicios que requieran el equipo faltante se sustituirán por alternativas disponibles.',
    });
  }

  const swapPatterns = [
    /(?:cambiar?|quitar?|reemplazar?|sustituir?|cambia|quita|reemplaza|sustituye)\s+(?:el\s+|la\s+|los\s+|las\s+)?(.{4,40}?)(?:\s+por\s+|\s+con\s+|\s*$)/i,
    /(?:en lugar de|en vez de)\s+(?:el\s+|la\s+)?(.{4,40}?)(?:\s*$|\s*,)/i,
    /(?:no quiero|no me gusta)\s+(?:el\s+|la\s+)?(.{4,40}?)(?:\s*$|\s*,)/i,
  ];
  for (const pattern of swapPatterns) {
    const m = text.match(pattern);
    if (m && m[1]) {
      const target = m[1].trim().replace(/[.,!?]+$/, '');
      if (target.length >= 3) {
        adjustments.push({
          type: 'swap_specific',
          targetExerciseName: target,
          reason: `Cambio de ejercicio`,
          details: `Se buscará un sustituto para "${target}" dentro de la misma categoría muscular.`,
        });
        break;
      }
    }
  }

  if (adjustments.length === 0) {
    adjustments.push({
      type: 'general',
      weightScale: 0.90,
      rpeDelta: -1,
      reason: 'Ajuste general',
      details: 'Se aplicó una reducción moderada: peso -10%, RPE -1.',
    });
  }

  return adjustments;
}

// ─── Component ────────────────────────────────────────────
interface DashboardViewProps {
  onNavigate: (t: Tab) => void;
  onStartTravel: (d: SessionLogEntry[]) => void;
}

export default function DashboardView({ onNavigate, onStartTravel }: DashboardViewProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Array<{ id: string; name: string; date: string; block_num: number | null }>>([]);
  const [nextDayName, setNextDayName] = useState<string | null>(null);
  const [nextDayNum, setNextDayNum] = useState<number | null>(null);
  const [programComplete, setProgramComplete] = useState(false);
  const [completedWeeks, setCompletedWeeks] = useState(0);

  const [adjustInput, setAdjustInput] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustResult, setAdjustResult] = useState<SessionAdjustment[] | null>(null);

  const [showTravelSetup, setShowTravelSetup] = useState(false);
  const [travelDays, setTravelDays] = useState(3);
  const [travelHasBands, setTravelHasBands] = useState(true);
  const [travelHasPullupBar, setTravelHasPullupBar] = useState(false);
  const [travelVolume, setTravelVolume] = useState<'basic' | 'intermediate' | 'advanced'>('intermediate');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(5),
      supabase.from('programs').select('id, total_days, total_weeks, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(async ([sRes, pRes]) => {
      if (sRes.data) setSessions(sRes.data);

      if (pRes.data) {
        const { count: totalSessions } = await supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', pRes.data.created_at)
          .not('block_num', 'is', null);

        const sessCount = totalSessions ?? 0;
        const totalProgramSessions = pRes.data.total_days * (pRes.data.total_weeks ?? 12);
        const weeksCompleted = Math.floor(sessCount / pRes.data.total_days);
        setCompletedWeeks(Math.min(weeksCompleted, pRes.data.total_weeks ?? 12));

        if (sessCount >= totalProgramSessions) {
          setProgramComplete(true);
          setLoading(false);
          return;
        }

        const dayNum = (sessCount % pRes.data.total_days) + 1;
        setNextDayNum(dayNum);
        const { data: dayData } = await supabase
          .from('program_days')
          .select('day_name')
          .eq('program_id', pRes.data.id)
          .eq('day_number', dayNum)
          .maybeSingle();
        if (dayData) setNextDayName(dayData.day_name);
      }

      setLoading(false);
    });
  }, [user]);

  const handleAdjust = async () => {
    if (!adjustInput.trim() || !user) return;
    setAdjusting(true);
    setAdjustResult(null);

    try {
      const adjustments = parseAdjustmentRequest(adjustInput);

      const { data: prog } = await supabase
        .from('programs')
        .select('id, total_days')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prog && nextDayNum) {
        const { data: dayData } = await supabase
          .from('program_days')
          .select('id, exercises')
          .eq('program_id', prog.id)
          .eq('day_number', nextDayNum)
          .maybeSingle();

        if (dayData && dayData.exercises) {
          const exercises = dayData.exercises as Array<Record<string, unknown>>;
          let adjusted = [...exercises];

          for (const adj of adjustments) {
            if (adj.weightScale) {
              adjusted = adjusted.map((ex) => ({
                ...ex,
                weight: Math.round(((ex.weight as number) * adj.weightScale!) / 2.5) * 2.5,
              }));
            }
            if (adj.rpeDelta) {
              adjusted = adjusted.map((ex) => ({
                ...ex,
                rpe: Math.max(5, Math.min(10, ((ex.rpe as number) ?? 7) + adj.rpeDelta!)),
              }));
            }
            if (adj.maxExercises) {
              const primaries = adjusted.filter((e) => e.role === 'primary');
              const secondaries = adjusted.filter((e) => e.role === 'secondary');
              const accessories = adjusted.filter((e) => e.role === 'accessory');
              adjusted = [...primaries, ...secondaries, ...accessories].slice(0, adj.maxExercises);
            }
            if (adj.type === 'swap_specific' && adj.targetExerciseName) {
              const target = adj.targetExerciseName.toLowerCase();
              const targetWords = target.split(/\s+/).filter(w => w.length > 2);
              const matchIdx = adjusted.findIndex((ex) => {
                const exName = ((ex.name as string) ?? '').toLowerCase();
                return targetWords.some(w => exName.includes(w)) || exName.includes(target);
              });

              if (matchIdx !== -1) {
                const matchedEx = adjusted[matchIdx];
                const currentIds = new Set(adjusted.map((e) => e.exercise_id));
                const { data: candidates } = await supabase
                  .from('exercises')
                  .select('id, name, category')
                  .eq('user_id', user.id)
                  .in('status', ['YES', 'SUB'])
                  .eq('category', matchedEx.category)
                  .neq('id', matchedEx.exercise_id);

                const substitute = candidates?.find(c => !currentIds.has(c.id));
                if (substitute) {
                  adjusted[matchIdx] = {
                    ...matchedEx,
                    exercise_id: substitute.id,
                    name: substitute.name,
                    notes: `Sustituido por solicitud`,
                  };
                  adj.details = `"${matchedEx.name}" reemplazado por "${substitute.name}".`;
                } else {
                  adj.details = `No se encontró sustituto disponible para "${matchedEx.name}" en la misma categoría.`;
                }
              } else {
                adj.details = `No se encontró "${adj.targetExerciseName}" en tu sesión de hoy. Verifica el nombre del ejercicio.`;
              }
            }
          }

          const nonSwapReasons = adjustments.filter(a => a.type !== 'swap_specific').map(a => a.reason);
          if (nonSwapReasons.length > 0) {
            adjusted = adjusted.map((ex) => {
              if (ex.notes === 'Sustituido por solicitud') return ex;
              return { ...ex, notes: 'Ajustado — ' + nonSwapReasons.join(', ') };
            });
          }

          await supabase
            .from('program_days')
            .update({ exercises: adjusted })
            .eq('id', dayData.id);
        }
      }

      setAdjustResult(adjustments);
      setAdjustInput('');
      toast.success('Ajustes aplicados a tu próxima sesión');
    } catch (err) {
      console.error('Error applying adjustments:', err);
      toast.error('No se pudieron aplicar los ajustes. Intenta de nuevo.');
    } finally {
      setAdjusting(false);
    }
  };

  const handleTravelModeClick = async () => {
    if (!user) return;
    setAdjusting(true);
    try {
      const [{ data: profile }, { data: exercises }] = await Promise.all([
        supabase.from('profiles').select('training_experience, session_minutes, goal').eq('id', user.id).single(),
        supabase.from('exercises').select('*').eq('user_id', user.id).in('status', ['YES', 'SUB'])
      ]);

      const eProf = deriveEngineProfile({
        experience: profile?.training_experience || 'intermediate',
        scheduleDays: travelDays,
        sessionMinutes: profile?.session_minutes || 45,
        goal: profile?.goal || 'general',
        hasBands: travelHasBands,
        hasPullupBar: travelHasPullupBar,
        volumeLevel: travelVolume,
      });

      const travelProg = generateNoEquipmentProgram(eProf, exercises || []);
      const day = travelProg.days[0];

      const missingExercises = day.exercises.filter(ex => ex.exercise_id.startsWith('MISSING:'));
      if (missingExercises.length > 0) {
        const namesToInsert = Array.from(new Set(missingExercises.map(ex => ex.exercise_name)));
        const inserts = namesToInsert.map(name => {
          const cat = missingExercises.find(e => e.exercise_name === name)?.category || 'CORE';
          return { user_id: user.id, name, category: cat, status: 'YES' };
        });

        const { data: inserted } = await supabase.from('exercises').insert(inserts).select();

        if (inserted) {
          missingExercises.forEach(missing => {
            const match = inserted.find((i: { name: string; id: string }) => i.name === missing.exercise_name);
            if (match) {
              missing.exercise_id = match.id;
            } else {
              missing.exercise_id = '';
            }
          });
        }
      }

      const travelDraft: SessionLogEntry[] = day.exercises.map(ex => ({
        exercise_id: ex.exercise_id.startsWith('MISSING:') ? '' : ex.exercise_id,
        exercise_name: ex.exercise_name,
        sets: ex.sets,
        reps_per_set: ex.reps_max || ex.reps_min || 10,
        weight: 0,
        rpe: ex.rpe || 8,
        notes: ex.notes || 'Modo viaje'
      }));

      onStartTravel(travelDraft);
      setShowTravelSetup(false);
    } catch (err) {
      console.error(err);
      toast.error('Error al generar la rutina de viaje.');
    } finally {
      setAdjusting(false);
    }
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-8">

      {/* Program Complete Banner */}
      <AnimatePresence>
        {programComplete && (
          <motion.div
            variants={fadeUp}
            className="relative overflow-hidden rounded-2xl p-6 md:p-8 bg-gradient-to-br from-primary-container/40 to-secondary-container/30 border border-primary/20 shadow-lg"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3" />
            <div className="relative z-10">
              <p className="text-primary font-headline font-bold text-xs uppercase tracking-widest mb-2">
                🏆 ¡Programa completado!
              </p>
              <h3 className="text-on-surface font-headline font-extrabold text-2xl mb-1">
                Terminaste las {completedWeeks} semanas
              </h3>
              <p className="text-on-surface-variant font-body text-sm mb-5 max-w-sm">
                Completaste un ciclo completo. Es hora de un nuevo programa progresivo con mayor intensidad y volumen basado en tus cargas actuales.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('library')}
                className="bg-primary text-on-primary font-headline font-bold px-6 py-3 rounded-full text-sm tracking-tight shadow-md flex items-center gap-2"
              >
                <RefreshCw size={15} />
                Iniciar Nuevo Ciclo
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero card */}
      <motion.div variants={fadeUp} className="glass-panel rounded-xl p-8 md:p-12 relative overflow-hidden group shadow-xl shadow-on-surface/3">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-container/20 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3 transition-transform duration-700 group-hover:scale-[1.4]" />
        <h2 className="text-3xl md:text-4xl font-headline font-extrabold mb-2 relative z-10 text-on-surface">¿Listo para entrenar?</h2>
        <p className="text-on-surface-variant mb-2 max-w-md relative z-10 font-body">
          {sessions.length === 0
            ? 'Aún no tienes sesiones. Comienza la primera.'
            : `Última sesión: ${sessions[0]?.name ?? '—'}`}
        </p>
        {nextDayName && !programComplete && (
          <p className="text-primary mb-8 relative z-10 font-headline font-bold text-sm tracking-tight">
            Siguiente: Día {nextDayNum} — {nextDayName}
          </p>
        )}
        {(!nextDayName || programComplete) && <div className="mb-8" />}
        <div className="flex flex-col sm:flex-row gap-4 relative z-10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('session')}
            className="flex-1 sm:flex-none justify-center bg-primary-container text-on-primary-container font-headline font-bold px-8 py-4 rounded-full text-lg tracking-tight shadow-lg shadow-primary-container/25 flex items-center gap-2 group/btn"
          >
            Comenzar Rutina
            <Dumbbell size={18} className="group-hover/btn:rotate-12 transition-transform" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowTravelSetup(true)}
            disabled={adjusting}
            className="flex-1 sm:flex-none justify-center bg-surface-container-high/60 text-on-surface font-headline font-bold px-6 py-4 rounded-full text-sm tracking-tight hover:bg-surface-container-high border border-outline-variant/20 disabled:opacity-50 flex items-center gap-2"
          >
            <Plane size={16} /> Modo Viaje
          </motion.button>

          {/* Travel Setup Modal */}
          <Modal
            isOpen={showTravelSetup}
            onClose={() => setShowTravelSetup(false)}
            title="✈️ Modo Viaje"
            description="Configura tu rutina según lo que tienes disponible ahora mismo."
            size="md"
            actions={
              <>
                <button
                  onClick={() => setShowTravelSetup(false)}
                  className="px-5 py-2.5 rounded-full text-sm font-headline font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTravelModeClick}
                  disabled={adjusting}
                  className="bg-primary-container text-on-primary-container font-headline font-bold px-6 py-2.5 rounded-full text-sm flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-md disabled:opacity-50"
                >
                  {adjusting ? <><Loader2 size={14} className="animate-spin" /> Generando...</> : <><Check size={14} /> Generar Rutina</>}
                </button>
              </>
            }
          >
            <div className="space-y-6">
              {/* Días por semana */}
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Días por semana</label>
                  <span className="text-3xl font-headline font-extrabold text-primary">{travelDays}</span>
                </div>
                <input
                  type="range" min={2} max={5} value={travelDays}
                  onChange={(e) => setTravelDays(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-outline-variant/20 rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-on-surface-variant/40 text-xs mt-1.5 font-body">
                  <span>2</span><span>3</span><span>4</span><span>5</span>
                </div>
              </div>

              {/* Ligas / Bandas */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">¿Tienes ligas o bandas?</label>
                <div className="flex gap-2">
                  {([{ value: true, label: 'Sí, tengo' }, { value: false, label: 'No tengo' }] as const).map(opt => (
                    <button key={String(opt.value)} type="button" onClick={() => setTravelHasBands(opt.value)}
                      className={`flex-1 py-2.5 rounded-full font-headline font-bold text-sm border transition-all ${travelHasBands === opt.value ? 'bg-primary-container text-on-primary-container border-primary-container shadow-sm' : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:bg-surface-container'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Barras de calistenia */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">¿Tienes acceso a barras de calistenia?</label>
                <p className="text-on-surface-variant/60 text-xs font-body mb-3">Barra de dominadas, anillas, barras paralelas, etc.</p>
                <div className="flex gap-2">
                  {([{ value: true, label: 'Sí tengo' }, { value: false, label: 'No tengo' }] as const).map(opt => (
                    <button key={String(opt.value)} type="button" onClick={() => setTravelHasPullupBar(opt.value)}
                      className={`flex-1 py-2.5 rounded-full font-headline font-bold text-sm border transition-all ${travelHasPullupBar === opt.value ? 'bg-primary-container text-on-primary-container border-primary-container shadow-sm' : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:bg-surface-container'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volumen */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Volumen que toleras</label>
                <div className="flex flex-col gap-2">
                  {([
                    { value: 'basic', label: 'Básico', desc: '5 – 10 reps por serie' },
                    { value: 'intermediate', label: 'Intermedio', desc: '10 – 20 reps por serie' },
                    { value: 'advanced', label: 'Avanzado', desc: '20+ reps por serie' },
                  ] as const).map(opt => (
                    <button key={opt.value} type="button" onClick={() => setTravelVolume(opt.value)}
                      className={`w-full px-4 py-3 rounded-xl font-headline font-bold text-sm border text-left flex items-center justify-between transition-all ${travelVolume === opt.value ? 'bg-primary-container text-on-primary-container border-primary-container shadow-sm' : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:bg-surface-container'}`}>
                      <span>{opt.label}</span>
                      <span className={`text-xs font-body font-normal ${travelVolume === opt.value ? 'text-on-primary-container/70' : 'text-on-surface-variant/50'}`}>{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Modal>
        </div>
      </motion.div>

      {/* Smart Adjustment Chat */}
      <motion.div variants={fadeUp} className="card-elevated rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-primary" />
          <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Ajuste Inteligente</h3>
        </div>
        <p className="text-on-surface-variant text-sm font-body mb-4">
          Dime cómo te sientes o qué ejercicio quieres cambiar y lo ajusto.
        </p>

        <div className="flex gap-2 mb-2">
          <textarea
            value={adjustInput}
            onChange={(e) => setAdjustInput(e.target.value)}
            placeholder='Ej: "Cambiar press inclinado" o "Dormí poco y me duele el hombro"'
            aria-label="Mensaje de ajuste inteligente"
            className="flex-1 bg-surface-container-high/50 border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface font-body text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-on-surface-variant/40"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (adjustInput.trim()) handleAdjust();
              }
            }}
          />
          <button
            onClick={handleAdjust}
            disabled={!adjustInput.trim() || adjusting}
            aria-label="Enviar ajuste"
            className="self-end bg-primary-container text-on-primary-container rounded-xl px-4 py-3 font-headline font-bold text-sm hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
          >
            {adjusting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Ajustar
          </button>
        </div>

        {/* Quick suggestion chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['😴 Dormí poco', '🤕 Me duele algo', '⏱ Poco tiempo', '🔧 Falta equipo', '🔄 Cambiar ejercicio'].map((chip) => (
            <button
              key={chip}
              onClick={() => {
                const map: Record<string, string> = {
                  '😴 Dormí poco': 'Dormí muy poco, me siento cansado',
                  '🤕 Me duele algo': 'Tengo dolor muscular, me siento adolorido',
                  '⏱ Poco tiempo': 'Solo tengo 30 minutos hoy',
                  '🔧 Falta equipo': 'No tengo barra disponible hoy',
                  '🔄 Cambiar ejercicio': 'Cambiar ',
                };
                setAdjustInput(map[chip] ?? chip);
              }}
              className="text-xs font-body bg-surface-container-high/50 border border-outline-variant/15 rounded-full px-3 py-1.5 text-on-surface-variant hover:bg-primary-container/20 hover:text-primary transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Adjustment results */}
        <AnimatePresence>
          {adjustResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {adjustResult.map((adj, i) => (
                <div key={i} className="bg-primary-container/15 border border-primary-container/25 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-primary font-headline font-bold text-sm">{adj.reason}</span>
                  </div>
                  <p className="text-on-surface-variant text-sm font-body">{adj.details}</p>
                </div>
              ))}
              <p className="text-primary/70 text-xs font-body flex items-center gap-1">
                <Check size={12} /> Los ajustes se aplicaron a tu próxima sesión
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Recent Sessions */}
      <motion.div variants={fadeUp} className="card-elevated rounded-xl p-6 md:p-8">
        <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-4">Sesiones Recientes</h3>
        {sessions.length === 0 ? (
          <p className="text-on-surface-variant font-body text-sm py-8 text-center">Sin sesiones registradas</p>
        ) : (
          <div className="divide-y divide-outline-variant/15">
            {sessions.map((s) => (
              <div key={s.id} className="flex justify-between items-center py-3.5 hover:bg-surface-container-high/50 -mx-3 px-3 rounded-lg transition-colors">
                <div className="flex gap-4 items-center">
                  <span className="text-primary font-headline font-bold text-sm w-12">
                    {s.block_num ? `B${s.block_num}` : '—'}
                  </span>
                  <span className="text-on-surface font-body">{s.name}</span>
                </div>
                <span className="text-on-surface-variant text-sm">{new Date(s.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
