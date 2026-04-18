import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Exercise, Session, SessionLog, WorkingWeight } from '../types';
import { CATEGORY_LABELS, DEFAULT_EXERCISES, type MovementCategory, type ExerciseStatus } from '../types';
import { generateProgram } from '../engine/programGenerator';
import { deriveEngineProfile, generateNoEquipmentProgram } from '../engine/noEquipmentAdapter';
import ProgramView from './ProgramView';
import {
  Activity, Dumbbell, BookOpen, LineChart, ClipboardList,
  Plus, Check, ChevronDown, ChevronRight,
  LogOut, Save, Trash2, RefreshCw, Loader2, Send, Sparkles, Info,
  Clock, Eye, X, AlertTriangle
} from 'lucide-react';
import ExerciseDetailModal from './ExerciseDetailModal';
import { getCatalogEntry } from '../data/exerciseCatalog';

// ─── Animation Variants ───────────────────────────────────
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const fadeUp = {
  hidden: { y: 18, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

// ─── Nav Items ────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', label: 'Inicio', icon: Activity },
  { id: 'program', label: 'Programa', icon: ClipboardList },
  { id: 'session', label: 'Entrenar', icon: Dumbbell },
  { id: 'library', label: 'Ajustes', icon: BookOpen },
  { id: 'progress', label: 'Progreso', icon: LineChart },
] as const;

type Tab = typeof NAV[number]['id'];

// ─── Main Shell ───────────────────────────────────────────
export default function MainShell() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [travelDraft, setTravelDraft] = useState<SessionLogEntry[] | null>(null);

  return (
    <div className="min-h-screen bg-surface relative selection:bg-primary-container selection:text-on-primary-container">
      {/* Ambient light */}
      <div className="fixed top-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary-container/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[30vw] h-[30vw] rounded-full bg-secondary-container/8 blur-[100px] pointer-events-none" />

      {/* Desktop layout */}
      <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row min-h-screen relative z-10">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex flex-col justify-between w-72 px-8 py-12 border-r border-outline-variant/15">
          <div>
            <h1 className="text-5xl font-headline font-extrabold leading-[0.85] tracking-tighter mb-2 text-on-surface">
              FIT<span className="text-primary">.</span>
            </h1>
            <p className="text-on-surface-variant text-sm font-body mb-14">Entrenamiento basado en evidencia</p>

            <nav className="flex flex-col gap-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`flex items-center gap-4 py-3.5 px-5 rounded-xl transition-all duration-300 text-left font-headline font-bold text-base tracking-tight relative overflow-hidden ${
                      active ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebarActive"
                        className="absolute inset-0 bg-primary-container/25 border border-primary-container/30 rounded-xl"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <Icon size={18} className="relative z-10 shrink-0" />
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <button
            onClick={signOut}
            className="flex items-center gap-3 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors text-sm font-body px-5 py-3"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </aside>

        {/* Content */}
        <main className="flex-1 px-6 py-8 pb-28 lg:px-12 lg:py-12 overflow-y-auto">
          <AnimatePresence mode="wait">
            {tab === 'dashboard' && <DashboardView key="dash" onNavigate={setTab} onStartTravel={(draft) => { setTravelDraft(draft); setTab('session'); }} />}
            {tab === 'program' && <ProgramView key="prog-view" />}
            {tab === 'session' && <SessionView key="sess" onNavigate={setTab} travelDraft={travelDraft} onClearTravel={() => setTravelDraft(null)} />}
            {tab === 'library' && <LibraryView key="lib" />}
            {tab === 'progress' && <ProgressView key="prog" />}
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 glass-nav">
        <div className="flex justify-around py-3 max-w-md mx-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 transition-all duration-200 relative ${
                  active ? 'text-primary' : 'text-on-surface-variant/50'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-headline font-bold tracking-wide">{item.label}</span>
                {active && (
                  <motion.div
                    layoutId="mobileActive"
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════
// ─── Smart Adjustment Parser ─────────────────────────────
interface SessionAdjustment {
  type: 'deload' | 'reduce_time' | 'swap_exercise' | 'swap_specific' | 'general';
  weightScale?: number;
  rpeDelta?: number;
  maxExercises?: number;
  targetExerciseName?: string;  // for swap_specific: name fragment to match
  reason: string;
  details: string;
}

function parseAdjustmentRequest(text: string): SessionAdjustment[] {
  const lower = text.toLowerCase();
  const adjustments: SessionAdjustment[] = [];

  // Fatigue detection: sleep, tiredness, soreness, heavy feeling
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

  // Pain detection
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

  // Time reduction
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

  // Equipment issues
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

  // Exercise swap — "cambiar X", "quitar X", "reemplazar X", "sustituir X", "en lugar de X", "no quiero X"
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

  // If nothing specific detected, treat as general adjustment
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

function DashboardView({ onNavigate, onStartTravel }: { onNavigate: (t: Tab) => void, onStartTravel: (d: SessionLogEntry[]) => void }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [nextDayName, setNextDayName] = useState<string | null>(null);
  const [nextDayNum, setNextDayNum] = useState<number | null>(null);
  const [programComplete, setProgramComplete] = useState(false);
  const [completedWeeks, setCompletedWeeks] = useState(0);

  // Smart adjustment state
  const [adjustInput, setAdjustInput] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustResult, setAdjustResult] = useState<SessionAdjustment[] | null>(null);

  const [showTravelSetup, setShowTravelSetup] = useState(false);
  const [travelDays, setTravelDays] = useState(3);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(5),
      supabase.from('programs').select('id, total_days, total_weeks, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(async ([sRes, pRes]) => {
      if (sRes.data) setSessions(sRes.data);

      if (pRes.data) {
        // Count ONLY sessions for this program (after creation, and not travel sessions)
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

    });
  }, [user]);

  const handleAdjust = async () => {
    if (!adjustInput.trim() || !user) return;
    setAdjusting(true);
    setAdjustResult(null);

    try {
      const adjustments = parseAdjustmentRequest(adjustInput);

      // Fetch the current program and next day's exercises
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
          const exercises = dayData.exercises as any[];
          let adjusted = [...exercises];

          for (const adj of adjustments) {
            if (adj.weightScale) {
              adjusted = adjusted.map((ex) => ({
                ...ex,
                weight: Math.round((ex.weight * adj.weightScale!) / 2.5) * 2.5,
              }));
            }
            if (adj.rpeDelta) {
              adjusted = adjusted.map((ex) => ({
                ...ex,
                rpe: Math.max(5, Math.min(10, (ex.rpe ?? 7) + adj.rpeDelta!)),
              }));
            }
            if (adj.maxExercises) {
              // Keep primaries/secondaries first, trim accessories
              const primaries = adjusted.filter((e) => e.role === 'primary');
              const secondaries = adjusted.filter((e) => e.role === 'secondary');
              const accessories = adjusted.filter((e) => e.role === 'accessory');
              adjusted = [...primaries, ...secondaries, ...accessories].slice(0, adj.maxExercises);
            }
            if (adj.type === 'swap_specific' && adj.targetExerciseName) {
              // Find the exercise in the current day that best matches the target name
              const target = adj.targetExerciseName.toLowerCase();
              const targetWords = target.split(/\s+/).filter(w => w.length > 2);
              const matchIdx = adjusted.findIndex((ex) => {
                const exName = (ex.name as string ?? '').toLowerCase();
                return targetWords.some(w => exName.includes(w)) || exName.includes(target);
              });

              if (matchIdx !== -1) {
                const matchedEx = adjusted[matchIdx];
                // Fetch user exercises in same category that are NOT already in the day
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
                  // Update the details with actual names
                  adj.details = `"${matchedEx.name}" reemplazado por "${substitute.name}".`;
                } else {
                  adj.details = `No se encontró sustituto disponible para "${matchedEx.name}" en la misma categoría.`;
                }
              } else {
                adj.details = `No se encontró "${adj.targetExerciseName}" en tu sesión de hoy. Verifica el nombre del ejercicio.`;
              }
            }
          }

          // Mark non-swap exercises as adjusted
          const nonSwapReasons = adjustments.filter(a => a.type !== 'swap_specific').map(a => a.reason);
          if (nonSwapReasons.length > 0) {
            adjusted = adjusted.map((ex) => {
              if (ex.notes === 'Sustituido por solicitud') return ex;
              return { ...ex, notes: 'Ajustado — ' + nonSwapReasons.join(', ') };
            });
          }

          // Update in Supabase
          await supabase
            .from('program_days')
            .update({ exercises: adjusted })
            .eq('id', dayData.id);
        }
      }

      setAdjustResult(adjustments);
      setAdjustInput('');
    } catch (err) {
      console.error('Error applying adjustments:', err);
    } finally {
      setAdjusting(false);
    }
  };

  const handleTravelModeClick = async () => {
    if (!user) return;
    setAdjusting(true); // use spinner visually
    try {
      const [{ data: profile }, { data: exercises }] = await Promise.all([
        supabase.from('profiles').select('training_experience, session_minutes, goal').eq('id', user.id).single(),
        supabase.from('exercises').select('*').eq('user_id', user.id).in('status', ['YES', 'SUB'])
      ]);

      const eProf = deriveEngineProfile({
        experience: profile?.training_experience || 'intermediate',
        scheduleDays: travelDays,
        sessionMinutes: profile?.session_minutes || 45,
        goal: profile?.goal || 'general'
      });
      
      const travelProg = generateNoEquipmentProgram(eProf, exercises || []);
      const day = travelProg.days[0]; // grab day 1 pattern

      // --- AUTO-INSERT MISSING EXERCISES ---
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
            const match = inserted.find(i => i.name === missing.exercise_name);
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
        weight: 0, // bodyweight/bands
        rpe: ex.rpe || 8,
        notes: ex.notes || 'Modo viaje'
      }));

      onStartTravel(travelDraft);
      setShowTravelSetup(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAdjusting(false);
    }
  };

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
              <button
                onClick={() => onNavigate('library')}
                className="bg-primary text-on-primary font-headline font-bold px-6 py-3 rounded-full text-sm tracking-tight hover:scale-[1.03] active:scale-95 transition-all shadow-md flex items-center gap-2"
              >
                <RefreshCw size={15} />
                Iniciar Nuevo Ciclo
              </button>
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
          <button
            onClick={() => onNavigate('session')}
            className="flex-1 sm:flex-none justify-center bg-primary-container text-on-primary-container font-headline font-bold px-8 py-4 rounded-full text-lg tracking-tight hover:scale-[1.03] active:scale-95 transition-all shadow-lg shadow-primary-container/25 flex items-center gap-2 group/btn"
          >
            Comenzar Rutina
            <Dumbbell size={18} className="group-hover/btn:rotate-12 transition-transform" />
          </button>
          
          {!showTravelSetup ? (
            <button
              onClick={() => setShowTravelSetup(true)}
              disabled={adjusting}
              className="flex-1 sm:flex-none justify-center bg-surface-container-high/60 text-on-surface font-headline font-bold px-6 py-4 rounded-full text-sm tracking-tight hover:bg-surface-container-high hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-2 border border-outline-variant/20 disabled:opacity-50"
            >
              <span>✈️ Modo Viaje</span>
            </button>
          ) : (
            <div className="flex-1 sm:flex-none flex items-center gap-3 bg-surface-container-high/60 rounded-full px-6 py-2 border border-outline-variant/20">
               <span className="text-sm font-headline font-bold text-on-surface">Días/sem:</span>
               <input 
                 type="number" min="1" max="6" 
                 value={travelDays} 
                 onChange={(e) => setTravelDays(Number(e.target.value))} 
                 className="w-12 bg-transparent text-center border-b border-primary text-on-surface font-headline font-bold focus:outline-none" 
               />
               <button 
                 onClick={handleTravelModeClick} 
                 disabled={adjusting}
                 className="bg-primary text-on-primary px-4 py-2 rounded-full text-xs font-bold transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-1"
               >
                 {adjusting ? <Loader2 size={14} className="animate-spin" /> : 'Generar'}
               </button>
               <button 
                 onClick={() => setShowTravelSetup(false)} 
                 className="text-on-surface-variant hover:text-error transition-colors p-1"
               >
                 <X size={18}/>
               </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Smart Adjustment Chat */}
      <motion.div variants={fadeUp} className="card-elevated rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-primary" />
          <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Ajuste Inteligente</h3>
        </div>
        <p className="text-on-surface-variant/70 text-sm font-body mb-4">
          Dime cómo te sientes o qué ejercicio quieres cambiar y lo ajusto.
        </p>

        <div className="flex gap-2 mb-2">
          <textarea
            value={adjustInput}
            onChange={(e) => setAdjustInput(e.target.value)}
            placeholder='Ej: "Cambiar press inclinado" o "Dormí poco y me duele el hombro"'
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
          <p className="text-on-surface-variant/50 font-body text-sm py-8 text-center">Sin sesiones registradas</p>
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
                <span className="text-on-surface-variant/50 text-sm">{new Date(s.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SESSION / TRAINING VIEW — Auto-fill from program
// ═══════════════════════════════════════════════════════════
interface SessionLogEntry {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps_per_set: number;
  weight: number;
  rpe: number;
  notes: string;
  // Targets from program_days — used for progression logic
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

interface SessionDraft {
  dayNum: number;
  weekNum: number;
  sessionName: string;
  logs: SessionLogEntry[];
}

function sessionDraftKey(userId: string) {
  return `session_draft_${userId}`;
}

function SessionView({ 
  onNavigate, 
  travelDraft,
  onClearTravel
}: { 
  onNavigate: (t: Tab) => void,
  travelDraft: SessionLogEntry[] | null,
  onClearTravel: () => void
}) {
  const { user } = useAuth();
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
  const [deloadApplied, setDeloadApplied] = useState<{ days: number, percentage: number } | null>(null);
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
        setBlockNum(0); // 0 translates to null on save
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

        const dayExercises = (programDay.exercises || []) as any[];
        const preFilled: SessionLogEntry[] = dayExercises.map((ex: any) => {
          let currentWeight = weightMap.get(ex.exercise_id) ?? ex.weight ?? 0;
          let rpe = ex.rpe ?? 7;

          if (applyPenalty && currentWeight > 0) {
            currentWeight = Math.round((currentWeight * penaltyScale) / 2.5) * 2.5;
            rpe = Math.max(5, rpe - 1);
          }

          return {
            exercise_id: ex.exercise_id,
            exercise_name: ex.exercise_name || '—',
            sets: ex.sets,
            reps_per_set: ex.reps_max ?? ex.reps_min ?? 8,
            weight: currentWeight,
            rpe,
            notes: applyPenalty && currentWeight > 0 ? 'Carga reducida (Readaptación)' : '',
            // Store program targets for progression calculation at save time
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

  const updateLog = (idx: number, field: string, value: any) => {
    const updated = [...logs];
    (updated[idx] as any)[field] = value;
    if (field === 'exercise_id') {
      const found = exercises.find(e => e.id === value);
      updated[idx].exercise_name = found?.name ?? '';
    }
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

    // ── Progression logic ─────────────────────────────────────
    // For each logged exercise, compute whether weight should advance,
    // stay, or be flagged. Only 'up' actions change the stored weight.
    const progressions: ProgressionResult[] = [];

    for (const l of logs.filter(l => l.exercise_id && l.weight > 0)) {
      const result = computeProgression(l);
      progressions.push(result);

      await supabase.from('working_weights').upsert(
        {
          user_id: user.id,
          exercise_id: l.exercise_id,
          weight: result.next_weight,   // already incremented if 'up'
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,exercise_id' }
      );
    }

    // Only surface results that are noteworthy (up or warn)
    const notable = progressions.filter(r => r.action !== 'keep');
    setProgressionResults(notable);

    localStorage.removeItem(sessionDraftKey(user.id));
    onClearTravel();
    setSaving(false);
    setSaved(true);

    // If there's progression info show it briefly; otherwise go straight to dashboard
    setTimeout(() => {
      onNavigate('dashboard');
    }, notable.length > 0 ? 4000 : 1500);
  };

  if (loadingProgram) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
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
          className="w-full bg-transparent border-b border-outline-variant/20 pb-2 text-on-surface text-lg font-headline font-bold placeholder:text-on-surface-variant/30 outline-none focus:border-primary transition-colors mb-3"
        />
        <div className="flex gap-4 mb-3">
          <div className="flex-1">
            <label className="text-on-surface-variant/60 text-[10px] font-bold uppercase tracking-widest block mb-1">Semana</label>
            <p className="text-center text-on-surface font-headline font-extrabold text-2xl">{weekNum}</p>
          </div>
          <div className="flex-1">
            <label className="text-on-surface-variant/60 text-[10px] font-bold uppercase tracking-widest block mb-1">Bloque</label>
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
            <p className="text-on-surface-variant/40 text-[10px] font-body text-center">
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
                  <span className="text-[10px] font-bold text-on-surface-variant/70 whitespace-nowrap">{getRestLabel(log.rpe)}</span>
                </div>

                {confirmDeleteIdx === i ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => removeLog(i)}
                      className="flex items-center gap-1 text-[10px] font-bold text-error bg-error-container/40 hover:bg-error-container/70 px-2 py-1 rounded-full transition-colors"
                    >
                      <Trash2 size={10} /> Borrar
                    </button>
                    <button
                      onClick={() => setConfirmDeleteIdx(null)}
                      className="text-on-surface-variant/50 hover:text-on-surface-variant transition-colors p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteIdx(i)}
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
              {[
                { label: 'Series', field: 'sets', val: log.sets },
                { label: 'Reps', field: 'reps_per_set', val: log.reps_per_set },
                { label: 'Peso (kg)', field: 'weight', val: log.weight },
                { label: 'RPE', field: 'rpe', val: log.rpe },
              ].map((f) => (
                <div key={f.field}>
                  <label className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest block mb-1.5">{f.label}</label>
                  <input
                    type="number"
                    value={f.val}
                    onChange={(e) => updateLog(i, f.field, +e.target.value)}
                    className={inputNumCls}
                    inputMode="decimal"
                  />
                </div>
              ))}
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

// ═══════════════════════════════════════════════════════════
//  EXERCISE LIBRARY VIEW
// ═══════════════════════════════════════════════════════════
function LibraryView() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<MovementCategory | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerated, setRegenerated] = useState(false);
  const [detailExercise, setDetailExercise] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProgram, setDeletingProgram] = useState(false);
  const [programDeleted, setProgramDeleted] = useState(false);

  const fetchExercises = async () => {
    if (!user) return;
    const { data } = await supabase.from('exercises').select('*').eq('user_id', user.id).order('category').order('name');
    if (data) setExercises(data);
    setLoading(false);
  };

  useEffect(() => { fetchExercises(); }, [user]);

  const seedLibrary = async () => {
    if (!user) return;
    setSeeding(true);
    const rows = DEFAULT_EXERCISES.map((e) => ({
      user_id: user.id,
      name: e.name,
      category: e.category,
      status: 'YES' as ExerciseStatus,
    }));
    await supabase.from('exercises').upsert(rows, { onConflict: 'user_id,name' });
    await fetchExercises();
    setSeeding(false);
  };

  const toggleStatus = async (ex: Exercise) => {
    const next: ExerciseStatus = ex.status === 'YES' ? 'SUB' : ex.status === 'SUB' ? 'NO' : 'YES';
    await supabase.from('exercises').update({ status: next }).eq('id', ex.id);
    setExercises(exercises.map((e) => e.id === ex.id ? { ...e, status: next } : e));
  };

  const regenerateProgram = async () => {
    if (!user) return;
    setRegenerating(true);
    setRegenerated(false);

    try {
      // Fetch profile for generation params
      const { data: profile } = await supabase
        .from('profiles')
        .select('bodyweight, height, training_experience, goal, schedule_days, session_minutes, gender, equipment_access')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Fetch current YES exercises
      const { data: yesExercises } = await supabase
        .from('exercises')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'YES');

      if (!yesExercises || yesExercises.length === 0) throw new Error('No exercises with YES status');

      // Fetch current working weights — these reflect the user's actual progress,
      // not initial estimates, so the regenerated program continues from where they are
      const { data: wwData } = await supabase
        .from('working_weights')
        .select('exercise_id, weight, exercise:exercises(name)')
        .eq('user_id', user.id);

      const keyLifts = { squat: 0, bench: 0, deadlift: 0, ohp: 0 };
      const workingWeightMap = new Map<string, number>();
      if (wwData) {
        for (const ww of wwData) {
          const name = (ww.exercise as any)?.name;
          workingWeightMap.set(ww.exercise_id, Number(ww.weight));
          if (name === 'Barra Back Squat') keyLifts.squat = Number(ww.weight);
          if (name === 'Barra Press de Banca') keyLifts.bench = Number(ww.weight);
          if (name === 'Peso Muerto Convencional') keyLifts.deadlift = Number(ww.weight);
          if (name === 'Barra Press Militar') keyLifts.ohp = Number(ww.weight);
        }
      }

      // Determine where the user is in the program based on completed sessions
      const { data: oldProgram } = await supabase
        .from('programs')
        .select('id, total_days, total_weeks')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: totalSessions } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Count past programs to derive cycle number (1 = first program ever)
      const { count: programCount } = await supabase
        .from('programs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const sessCount = totalSessions ?? 0;
      const hasHistory = sessCount > 0;

      // Cycle = how many full 12-week programs have been completed + 1
      // A program is "completed" if sessions >= total_days × total_weeks
      const prevCompleted = oldProgram
        ? sessCount >= (oldProgram.total_days * (oldProgram.total_weeks ?? 12)) ? 1 : 0
        : 0;
      const cycleNumber = Math.max(1, (programCount ?? 1) - 1 + prevCompleted);

      const bw = Number(profile.bodyweight) || 75;
      const ht = Number(profile.height) || 170;
      const bmi = bw / ((ht / 100) ** 2);

      const isNoEq = profile.equipment_access === 'no_equipment';
      const program = isNoEq
        ? generateNoEquipmentProgram(
            deriveEngineProfile({
              experience: profile.training_experience,
              scheduleDays: profile.schedule_days,
              sessionMinutes: profile.session_minutes ?? 60,
              goal: profile.goal,
            }),
            yesExercises,
            1
          )
        : generateProgram(
            yesExercises,
            profile.schedule_days,
            bw,
            profile.training_experience,
            keyLifts.squat > 0 ? keyLifts : undefined,
            profile.goal,
            bmi,
            profile.session_minutes ?? 60,
            profile.gender ?? 'male',
            cycleNumber
          );

      // If user has session history, override generated weights with actual working
      // weights and remove calibration flags — the user has already calibrated
      if (hasHistory && !isNoEq) {
        for (const day of program.days) {
          for (const ex of day.exercises) {
            const actualWeight = workingWeightMap.get(ex.exercise_id);
            if (actualWeight !== undefined) {
              ex.weight = actualWeight;
            }
            ex.is_calibration = false;
            ex.notes = '';
          }
        }
      }

      // Delete old program days (but NOT sessions — those are the user's history)
      if (oldProgram) {
        await supabase.from('program_days').delete().eq('program_id', oldProgram.id);
        await supabase.from('programs').delete().eq('id', oldProgram.id);
      }

      // Insert new program
      const { data: savedProgram, error: pErr } = await supabase
        .from('programs')
        .insert({
          user_id: user.id,
          name: program.name,
          split_type: program.split_type,
          total_days: program.total_days,
        })
        .select()
        .single();

      if (pErr || !savedProgram) throw pErr;

      const dayRows = program.days.map((d) => ({
        program_id: savedProgram.id,
        day_number: d.day_number,
        day_name: d.day_name,
        exercises: d.exercises,
      }));
      await supabase.from('program_days').insert(dayRows);

      // Clear any stale session draft so the next Entrenar load
      // reads fresh exercises from the newly generated program_days
      localStorage.removeItem(sessionDraftKey(user.id));

      setRegenerated(true);
      setTimeout(() => setRegenerated(false), 3000);
    } catch (err) {
      console.error('Program regeneration failed:', err);
    }

    setRegenerating(false);
  };

  const deleteProgram = async (keepWeights: boolean) => {
    if (!user) return;
    setDeletingProgram(true);
    try {
      const { data: prog } = await supabase
        .from('programs')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prog) {
        await supabase.from('program_days').delete().eq('program_id', prog.id);
        await supabase.from('programs').delete().eq('id', prog.id);
      }

      if (!keepWeights) {
        await supabase.from('working_weights').delete().eq('user_id', user.id);
      }

      localStorage.removeItem(sessionDraftKey(user.id));
      setProgramDeleted(true);
      setShowDeleteModal(false);
      setTimeout(() => setProgramDeleted(false), 4000);
    } catch (err) {
      console.error('Error eliminando programa:', err);
    }
    setDeletingProgram(false);
  };

  const grouped = Object.entries(CATEGORY_LABELS).map(([cat, label]) => ({
    category: cat as MovementCategory,
    label,
    items: exercises.filter((e) => e.category === cat),
  }));

  const statusColor: Record<ExerciseStatus, string> = {
    YES: 'bg-primary-container/30 text-primary border-primary-container/50',
    SUB: 'bg-secondary-container/40 text-secondary border-secondary-container/60',
    NO: 'bg-error-container/30 text-error border-error-container/50',
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6 max-w-2xl">
      <motion.div variants={fadeUp} className="flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight mb-1 text-on-surface">Ajusta tu Programa</h2>
          <p className="text-on-surface-variant font-body text-sm mb-1">Elige qué ejercicios incluir en tu programa. Toca el estado para cambiarlo:</p>
          <ul className="text-on-surface-variant font-body text-sm space-y-0.5 mb-1">
            <li><span className="text-primary font-bold">YES</span> — incluido en tu programa</li>
            <li><span className="text-on-surface font-bold">SUB</span> — usado como sustituto si falta equipo</li>
            <li><span className="text-on-surface-variant font-bold">NO</span> — excluido del programa</li>
          </ul>
          <p className="text-on-surface-variant/70 font-body text-xs">Una vez que hagas tus cambios, toca <span className="font-bold text-primary">Actualizar Programa</span> al final de la lista para regenerar tu plan.</p>
        </div>
        {exercises.length === 0 && !loading && (
          <button
            onClick={seedLibrary}
            disabled={seeding}
            className="bg-primary-container text-on-primary-container font-headline font-bold px-5 py-2.5 rounded-xl text-sm tracking-tight hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50"
          >
            {seeding ? 'Cargando...' : 'Cargar Biblioteca'}
          </button>
        )}
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="card-elevated rounded-xl h-16 animate-pulse" />)}
        </div>
      ) : (
        grouped.filter(g => g.items.length > 0).map((group) => (
          <motion.div key={group.category} variants={fadeUp} className="card-elevated rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === group.category ? null : group.category)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-container-high/50 transition-colors"
            >
              <span className="font-headline font-bold text-lg tracking-tight text-on-surface">{group.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-on-surface-variant/40 text-sm font-body">{group.items.length}</span>
                <motion.div animate={{ rotate: expanded === group.category ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight size={16} className="text-on-surface-variant/40" />
                </motion.div>
              </div>
            </button>

            <AnimatePresence>
              {expanded === group.category && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 space-y-1">
                    {group.items.map((ex) => (
                      <div key={ex.id} className="flex items-center justify-between py-2.5 px-3 -mx-1 rounded-lg hover:bg-surface-container-high/40 transition-colors">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-on-surface font-body text-sm truncate">{ex.name}</span>
                          {getCatalogEntry(ex.name) && (
                            <button
                              onClick={() => setDetailExercise(ex.name)}
                              className="shrink-0 p-0.5 rounded-full text-primary/40 hover:text-primary transition-colors"
                              title="Ver instrucciones"
                            >
                              <Info size={14} />
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => toggleStatus(ex)}
                          className={`shrink-0 text-xs font-headline font-bold px-3 py-1 rounded-full border ${statusColor[ex.status]} transition-all hover:scale-105 active:scale-95`}
                        >
                          {ex.status}
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))
      )}

      {/* Regenerate Program Button */}
      {!loading && exercises.length > 0 && (
        <motion.div variants={fadeUp} className="pt-4 pb-8">
          <button
            onClick={regenerateProgram}
            disabled={regenerating}
            className={`w-full font-headline font-bold py-4 rounded-full text-lg tracking-tight flex items-center justify-center gap-3 transition-all shadow-lg disabled:opacity-40 ${
              regenerated
                ? 'bg-green-100 text-green-700 shadow-green-100/20'
                : 'bg-primary-container text-on-primary-container shadow-primary-container/20 hover:scale-[1.02] active:scale-95'
            }`}
          >
            {regenerated ? (
              <><Check size={20} /> Programa Actualizado</>
            ) : regenerating ? (
              <><Loader2 size={18} className="animate-spin" /> Regenerando Programa...</>
            ) : (
              <><RefreshCw size={18} /> Actualizar Programa</>
            )}
          </button>
          <p className="text-on-surface-variant/40 text-xs font-body text-center mt-2">
            Regenera tu programa de 12 semanas con los ejercicios activos actuales.
          </p>

          {/* Delete Program Button */}
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={deletingProgram}
            className="w-full mt-3 font-headline font-bold py-3.5 rounded-full text-base tracking-tight flex items-center justify-center gap-2 transition-all border border-error/30 text-error hover:bg-error/8 active:scale-95 disabled:opacity-40"
          >
            <Trash2 size={16} />
            Eliminar Programa Actual
          </button>

          {programDeleted && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-600 text-xs font-body text-center mt-2 flex items-center justify-center gap-1"
            >
              <Check size={12} /> Programa eliminado. Ve a Ajustes para generar uno nuevo.
            </motion.p>
          )}
        </motion.div>
      )}

      {/* Delete Program Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-error-container/30 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} className="text-error" />
                </div>
                <h3 className="text-on-surface font-headline font-bold text-lg">Eliminar Programa</h3>
              </div>
              <p className="text-on-surface-variant font-body text-sm mb-5">
                ¿Qué deseas hacer con tu historial de pesos registrados?
              </p>

              <div className="space-y-3 mb-5">
                <button
                  onClick={() => deleteProgram(true)}
                  disabled={deletingProgram}
                  className="w-full text-left p-4 rounded-xl border border-primary/20 bg-primary-container/10 hover:bg-primary-container/20 transition-colors group disabled:opacity-50"
                >
                  <p className="font-headline font-bold text-on-surface text-sm mb-0.5 group-hover:text-primary transition-colors">
                    Conservar pesos históricos
                  </p>
                  <p className="text-on-surface-variant/70 text-xs font-body">
                    El nuevo programa arrancará con tus cargas actuales. Recomendado si continúas entrenando.
                  </p>
                </button>

                <button
                  onClick={() => deleteProgram(false)}
                  disabled={deletingProgram}
                  className="w-full text-left p-4 rounded-xl border border-error/20 bg-error-container/10 hover:bg-error-container/20 transition-colors group disabled:opacity-50"
                >
                  <p className="font-headline font-bold text-error text-sm mb-0.5">
                    Eliminar todo (incluyendo pesos)
                  </p>
                  <p className="text-on-surface-variant/70 text-xs font-body">
                    Reinicio completo. El siguiente programa estimará pesos desde cero.
                  </p>
                </button>
              </div>

              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full py-2.5 rounded-full text-on-surface-variant font-body text-sm hover:bg-surface-container-high/50 transition-colors"
              >
                Cancelar
              </button>

              {deletingProgram && (
                <div className="flex items-center justify-center gap-2 mt-3 text-on-surface-variant/60 text-xs">
                  <Loader2 size={14} className="animate-spin" />
                  Eliminando...
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

// ═══════════════════════════════════════════════════════════
//  PROGRESS VIEW
// ═══════════════════════════════════════════════════════════
function ProgressView() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<(Session & { logs: (SessionLog & { exercise: Exercise })[] })[]>([]);
  const [weights, setWeights] = useState<WorkingWeight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('sessions').select('*, logs:session_logs(*, exercise:exercises(*))').eq('user_id', user.id).order('date', { ascending: false }).limit(20),
      supabase.from('working_weights').select('*, exercise:exercises(*)').eq('user_id', user.id).order('weight', { ascending: false }),
    ]).then(([sRes, wRes]) => {
      if (sRes.data) setSessions(sRes.data as any);
      if (wRes.data) setWeights(wRes.data);
      setLoading(false);
    });
  }, [user]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-8 max-w-3xl">
      <motion.div variants={fadeUp}>
        <h2 className="text-4xl font-headline font-extrabold tracking-tight mb-1 text-on-surface">Progreso</h2>
        <p className="text-on-surface-variant font-body text-sm">Tu historial de entrenamiento y pesos de trabajo actuales</p>
      </motion.div>

      {/* Current Working Weights */}
      <motion.div variants={fadeUp} className="card-elevated rounded-xl p-6 md:p-8">
        <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-5">Pesos de Trabajo Actuales</h3>
        {weights.length === 0 ? (
          <p className="text-on-surface-variant/50 font-body text-sm text-center py-6">Aún no hay pesos registrados</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {weights.map((w) => (
              <div key={w.id} className="bg-surface-container-high/50 rounded-xl p-4 border border-outline-variant/10">
                <span className="text-on-surface-variant text-[10px] font-bold tracking-widest uppercase block truncate">
                  {(w.exercise as any)?.name}
                </span>
                <div className="mt-1">
                  <span className="text-2xl font-headline font-extrabold text-on-surface">{w.weight}</span>
                  <span className="text-primary font-headline font-bold text-sm ml-1">kg</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Session History */}
      <motion.div variants={fadeUp} className="card-elevated rounded-xl p-6 md:p-8">
        <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-5">Historial de Sesiones</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-surface-container-high/50 rounded-xl animate-pulse" />)}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-on-surface-variant/50 font-body text-sm text-center py-6">Aún no hay sesiones</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <details key={s.id} className="group bg-surface-container-high/30 rounded-xl border border-outline-variant/10 overflow-hidden">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-high/50 transition-colors list-none">
                  <div className="flex items-center gap-4">
                    <span className="text-primary font-headline font-bold text-sm">
                      {s.block_num ? `B${s.block_num}W${s.week_num}` : '—'}
                    </span>
                    <span className="text-on-surface font-body">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-on-surface-variant/40 text-xs">{new Date(s.date).toLocaleDateString()}</span>
                    <ChevronDown size={14} className="text-on-surface-variant/30 group-open:rotate-180 transition-transform duration-200" />
                  </div>
                </summary>
                {s.logs && s.logs.length > 0 && (
                  <div className="px-4 pb-4 pt-1 border-t border-outline-variant/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-on-surface-variant/50 text-[10px] font-bold uppercase tracking-widest">
                          <th className="text-left py-2 font-normal">Ejercicio</th>
                          <th className="text-center py-2 font-normal">Series × Reps</th>
                          <th className="text-center py-2 font-normal">Peso</th>
                          <th className="text-center py-2 font-normal">RPE</th>
                        </tr>
                      </thead>
                      <tbody className="text-on-surface font-body">
                        {s.logs.map((log) => (
                          <tr key={log.id} className="border-t border-outline-variant/8">
                            <td className="py-2">{(log.exercise as any)?.name ?? '—'}</td>
                            <td className="text-center py-2">{log.sets} × {log.reps_per_set}</td>
                            <td className="text-center py-2">{log.weight}<span className="text-primary ml-0.5 text-xs font-bold">kg</span></td>
                            <td className="text-center py-2 text-on-surface-variant">{log.rpe ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {s.notes && <p className="text-on-surface-variant/40 text-xs mt-3 italic">{s.notes}</p>}
                  </div>
                )}
              </details>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
