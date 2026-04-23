import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { useIsMobile } from '../../hooks/useBreakpoint';
import { deriveEngineProfile, generateNoEquipmentProgram, NO_EQUIPMENT_DEFAULT_EXERCISES } from '../../engine/noEquipmentAdapter';
import { Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import Modal from '../Modal';
import type { Tab } from '../MainShell';

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

interface ProgramDayExercise {
  exercise_id?: string;
  exercise_name?: string;
  name?: string; // legacy alias — some older rows may still use this
  sets?: number;
  reps_min?: number;
  reps_max?: number;
  weight?: number;
  rpe?: number;
  role?: string;
  category?: string;
  notes?: string;
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
      type: 'deload', weightScale: severity, rpeDelta: -1.5,
      reason: 'Fatiga detectada',
      details: lowSleep
        ? `Descanso insuficiente (${sleepMatch![1]}h). Peso reducido ${Math.round((1 - severity) * 100)}%, RPE -1.5`
        : `Fatiga general. Peso reducido ${Math.round((1 - severity) * 100)}%, RPE -1.5`,
    });
  }

  const painKeywords = ['dolor', 'duele', 'molestia', 'lesión', 'lesion', 'lastimé', 'lastime',
    'inflamado', 'inflamada', 'pinzamiento', 'contractura'];
  if (painKeywords.some(k => lower.includes(k))) {
    adjustments.push({
      type: 'deload', weightScale: 0.70, rpeDelta: -2,
      reason: 'Dolor / molestia reportada',
      details: 'Peso reducido 30%, RPE -2. Presta atención a la técnica y detente si el dolor persiste.',
    });
  }

  const timeMatch = lower.match(/(\d+)\s*min/);
  const timeKeywords = ['poco tiempo', 'rápido', 'rapido', 'corta', 'prisa', 'apurado', 'apurada',
    'menos tiempo', 'acortar', 'reducir tiempo'];
  if (timeKeywords.some(k => lower.includes(k)) || timeMatch) {
    const minutes = timeMatch ? parseInt(timeMatch[1]) : 30;
    const maxEx = Math.max(3, Math.floor((minutes - 5) / 7));
    adjustments.push({
      type: 'reduce_time', maxExercises: maxEx,
      reason: 'Sesión reducida',
      details: timeMatch
        ? `Ajustada a ${minutes} min (~${maxEx} ejercicios). Se priorizan compuestos.`
        : `Sesión acortada (~${maxEx} ejercicios). Se priorizan compuestos.`,
    });
  }

  if (['no tengo', 'sin barra', 'sin mancuerna', 'no hay', 'falta equipo', 'equipo', 'máquina', 'maquina', 'rota', 'ocupada', 'ocupado'].some(k => lower.includes(k))) {
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
          type: 'swap_specific', targetExerciseName: target,
          reason: 'Cambio de ejercicio',
          details: `Se buscará un sustituto para "${target}" dentro de la misma categoría muscular.`,
        });
        break;
      }
    }
  }

  if (adjustments.length === 0) {
    adjustments.push({
      type: 'general', weightScale: 0.90, rpeDelta: -1,
      reason: 'Ajuste general',
      details: 'Se aplicó una reducción moderada: peso -10%, RPE -1.',
    });
  }

  return adjustments;
}

// ─── Component ────────────────────────────────────────────
interface DashboardViewProps {
  onNavigate: (t: Tab) => void;
  onStartSession: () => void;
  onStartTravel: (d: SessionLogEntry[]) => void;
}

function getBlockInfo(week: number): string {
  if (week <= 4) return 'Volumen';
  if (week <= 8) return 'Intensidad';
  if (week <= 11) return 'Pico';
  return 'Descarga';
}

export default function DashboardView({ onNavigate, onStartSession, onStartTravel }: DashboardViewProps) {
  const { user } = useAuth();
  const toast = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Array<{ id: string; name: string; date: string; block_num: number | null }>>([]);
  const [nextDayName, setNextDayName] = useState<string | null>(null);
  const [nextDayNum, setNextDayNum] = useState<number | null>(null);
  const [programComplete, setProgramComplete] = useState(false);
  const [completedWeeks, setCompletedWeeks] = useState(0);
  const [todayExercises, setTodayExercises] = useState<ProgramDayExercise[]>([]);

  const [adjustInput, setAdjustInput] = useState('');
  const [adjusting, setAdjusting] = useState(false);

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
          .select('day_name, exercises')
          .eq('program_id', pRes.data.id)
          .eq('day_number', dayNum)
          .maybeSingle();

        if (dayData) {
          setNextDayName(dayData.day_name);
          const exArr = dayData.exercises;
          if (Array.isArray(exArr)) setTodayExercises(exArr as ProgramDayExercise[]);
        }
      }

      setLoading(false);
    });
  }, [user]);

  const handleAdjust = async () => {
    if (!adjustInput.trim() || !user) return;
    setAdjusting(true);
    try {
      const adjustments = parseAdjustmentRequest(adjustInput);
      const { data: prog } = await supabase
        .from('programs').select('id, total_days').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (prog && nextDayNum) {
        const { data: dayData } = await supabase
          .from('program_days').select('id, exercises')
          .eq('program_id', prog.id).eq('day_number', nextDayNum).maybeSingle();

        if (dayData?.exercises && Array.isArray(dayData.exercises)) {
          const exercises = dayData.exercises as Array<Record<string, unknown>>;
          let adjusted = [...exercises];

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
                const { data: candidates } = await supabase.from('exercises').select('id, name, category')
                  .eq('user_id', user.id).in('status', ['YES', 'SUB']).eq('category', matchedEx.category).neq('id', matchedEx.exercise_id);
                const substitute = candidates?.find(c => !currentIds.has(c.id));
                if (substitute) {
                  adjusted[matchIdx] = { ...matchedEx, exercise_id: substitute.id, name: substitute.name, notes: 'Sustituido por solicitud' };
                }
              }
            }
          }

          await supabase.from('program_days').update({ exercises: adjusted }).eq('id', dayData.id);
          setTodayExercises(adjusted as ProgramDayExercise[]);
        }
      }

      setAdjustInput('');
      toast.success('Ajustes aplicados a tu próxima sesión');
    } catch {
      toast.error('No se pudieron aplicar los ajustes. Intenta de nuevo.');
    } finally {
      setAdjusting(false);
    }
  };

  const handleTravelModeClick = async () => {
    if (!user) return;
    setAdjusting(true);
    try {
      // Pre-seed all band/bodyweight exercises so the engine can always find them
      await supabase.from('exercises').upsert(
        NO_EQUIPMENT_DEFAULT_EXERCISES.map(ex => ({
          user_id: user.id,
          name: ex.name,
          category: ex.category,
          status: 'YES' as const,
        })),
        { onConflict: 'user_id,name', ignoreDuplicates: true }
      );

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
            missing.exercise_id = match ? match.id : '';
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
        notes: ex.notes || 'Fuera del gym',
      }));

      onStartTravel(travelDraft);
      setShowTravelSetup(false);
    } catch {
      toast.error('Error al generar la sesión fuera del gym.');
    } finally {
      setAdjusting(false);
    }
  };

  const weekNum = completedWeeks + 1;
  const blockName = getBlockInfo(weekNum);
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
  const timeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--muted)' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="forge-fade" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--rule)', paddingBottom: 16, flexWrap: 'wrap' as const, gap: 8 }}>
        <div>
          <div className="uc" style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>
            Buenos días{user?.email ? `, ${user.email.split('@')[0]}` : ''}
          </div>
          <div className="mono caption" style={{ marginTop: 6 }}>{today} · {timeStr}</div>
        </div>
        <div className="mono caption" style={{ textAlign: 'right' }}>
          Bloque {blockName} · Semana {weekNum}/12{nextDayNum ? ` · Día ${nextDayNum}` : ''}
        </div>
      </div>

      {/* Program complete banner */}
      {programComplete && (
        <div style={{ border: '1px solid var(--accent)', borderRadius: 12, padding: 24, background: 'color-mix(in oklab, var(--accent), transparent 94%)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
          <div>
            <div className="uc" style={{ color: 'var(--accent)', marginBottom: 6 }}>¡Programa completado!</div>
            <div className="d-s" style={{ fontWeight: 600 }}>Completaste las <span className="serif" style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{completedWeeks} semanas</span>. Hora de un nuevo ciclo.</div>
          </div>
          <button onClick={() => onNavigate('library')} className="btn btn-ghost" style={{ whiteSpace: 'nowrap' }}>
            <RefreshCw size={14}/> Nuevo ciclo
          </button>
        </div>
      )}

      {/* Primary action card */}
      <div style={{ background: 'var(--ink)', color: 'var(--paper)', borderRadius: 16, padding: isMobile ? '28px 24px' : '40px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: isMobile ? 24 : 32, alignItems: 'end', minHeight: isMobile ? 'auto' : 320 }}>
        <div>
          <div className="uc" style={{ opacity: .6, marginBottom: 24 }}>
            {programComplete ? 'Entrena hoy' : 'Hoy entrenas'}
          </div>
          <h1 className="d-xl" style={{ margin: 0 }}>
            {nextDayName || (programComplete ? 'Sesión libre' : 'Tu rutina')}
            {nextDayName ? '.' : ''}
          </h1>
          <div style={{ display: 'flex', gap: 24, marginTop: 32, flexWrap: 'wrap' }}>
            <div>
              <div className="mono caption" style={{ opacity: .5 }}>EJERCICIOS</div>
              <div className="d-m" style={{ marginTop: 4 }}>{todayExercises.length || '—'}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
          <button
            onClick={onStartSession}
            className="btn btn-accent btn-xl"
            style={{ width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
          >
            Empezar entrenamiento <ArrowRight size={20}/>
          </button>
          <button
            onClick={() => setShowTravelSetup(true)}
            className="btn btn-ghost btn-lg"
            style={{ width: '100%', justifyContent: 'center', color: 'var(--paper)', borderColor: 'rgba(241,237,228,0.2)' }}
          >
            Sesión fuera del gym
          </button>
        </div>
      </div>

      {/* Exercise preview + side rail */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : todayExercises.length > 0 ? '1fr 280px' : '1fr', gap: 24, alignItems: 'start' }}>
      {todayExercises.length > 0 && (
        <div>
          <div className="uc" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
            <span>Ejercicios de hoy</span>
            <span className="mono">{todayExercises.length} de {todayExercises.length}</span>
          </div>
          <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
            {todayExercises.map((e, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '40px 1fr 100px 100px', gap: isMobile ? '4px' : 16, padding: isMobile ? '14px 16px' : '20px 24px', borderTop: i === 0 ? 'none' : '1px solid var(--rule)', alignItems: 'center' }}>
                {!isMobile && <span className="mono caption" style={{ color: 'var(--muted)' }}>{String(i+1).padStart(2,'0')}</span>}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{e.exercise_name || e.name || '—'}</div>
                  {isMobile && <div className="mono caption" style={{ color: 'var(--muted)', marginTop: 2 }}>{e.sets}×{e.reps_min}{e.reps_max && e.reps_max !== e.reps_min ? `–${e.reps_max}` : ''} · {e.weight ? `${e.weight} kg` : 'BW'}</div>}
                </div>
                {!isMobile && <div className="mono" style={{ fontSize: 14 }}>{e.sets}×{e.reps_min}{e.reps_max && e.reps_max !== e.reps_min ? `–${e.reps_max}` : ''}</div>}
                {!isMobile && <div className="mono" style={{ fontSize: 14 }}>{e.weight ? `${e.weight} kg` : 'BW'}</div>}
              </div>
            ))}
          </div>

          {/* Quick adjust */}
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <input
              value={adjustInput}
              onChange={e => setAdjustInput(e.target.value)}
              placeholder='Ej: "poco tiempo" o "me duele el hombro"'
              className="forge-field"
              style={{ flex: 1 }}
              onKeyDown={e => { if (e.key === 'Enter' && adjustInput.trim()) handleAdjust(); }}
            />
            <button
              onClick={handleAdjust}
              disabled={!adjustInput.trim() || adjusting}
              className="btn btn-ink"
              style={{ opacity: (!adjustInput.trim() || adjusting) ? .4 : 1 }}
            >
              {adjusting ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Ajustar'}
            </button>
          </div>
        </div>
      )}

      {/* Side rail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Week progress */}
        <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: 24 }}>
          <div className="uc" style={{ color: 'var(--muted)', marginBottom: 16 }}>Esta semana</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span className="d-l" style={{ fontWeight: 600 }}>{Math.min(nextDayNum ? nextDayNum - 1 : 0, 7)}</span>
            <span className="body-s" style={{ color: 'var(--muted)' }}>sesiones completadas</span>
          </div>
          <div className="mono caption" style={{ marginTop: 12, color: 'var(--muted)' }}>Semana {weekNum} de 12 · {blockName}</div>
        </div>

        {/* Last session */}
        {sessions.length > 0 && (
          <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: 24 }}>
            <div className="uc" style={{ color: 'var(--muted)', marginBottom: 16 }}>Última sesión</div>
            <div className="d-s" style={{ fontWeight: 600 }}>{sessions[0].name}</div>
            <div className="caption" style={{ color: 'var(--muted)', marginTop: 4 }}>
              {new Date(sessions[0].date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              {sessions[0].block_num ? ` · Bloque ${sessions[0].block_num}` : ''}
            </div>
          </div>
        )}

        {/* Program link */}
        <button
          onClick={() => onNavigate('program')}
          style={{ background: 'transparent', border: '1px dashed var(--rule)', borderRadius: 12, padding: 24, textAlign: 'left', cursor: 'pointer', color: 'var(--ink)', fontFamily: 'var(--sans)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span className="body" style={{ fontWeight: 600 }}>Ver programa completo</span>
          <ArrowRight size={16}/>
        </button>
      </div>
      </div>{/* /exercise preview + side rail grid */}

      {/* Travel setup modal */}
      <Modal
        isOpen={showTravelSetup}
        onClose={() => setShowTravelSetup(false)}
        title="Sesión fuera del gym"
        description="Configura tu rutina según lo que tienes disponible."
        size="md"
        actions={
          <>
            <button onClick={() => setShowTravelSetup(false)} className="btn btn-ghost">Cancelar</button>
            <button onClick={handleTravelModeClick} disabled={adjusting} className="btn btn-ink" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {adjusting ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
              Generar sesión
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div className="uc" style={{ color: 'var(--muted)', marginBottom: 12 }}>Días por semana fuera</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setTravelDays(n)} className={`btn ${travelDays === n ? 'btn-ink' : 'btn-ghost'}`}>{n} {n === 1 ? 'día' : 'días'}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="uc" style={{ color: 'var(--muted)', marginBottom: 12 }}>Equipo disponible</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={travelHasBands} onChange={e => setTravelHasBands(e.target.checked)} />
                <span className="body">Bandas elásticas</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={travelHasPullupBar} onChange={e => setTravelHasPullupBar(e.target.checked)} />
                <span className="body">Barra de dominadas / calistenia</span>
              </label>
            </div>
          </div>
          <div>
            <div className="uc" style={{ color: 'var(--muted)', marginBottom: 12 }}>Volumen</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(['basic', 'intermediate', 'advanced'] as const).map(v => (
                <button key={v} onClick={() => setTravelVolume(v)} className={`btn btn-sq ${travelVolume === v ? 'btn-ink' : 'btn-ghost'}`} style={{ justifyContent: 'flex-start', borderRadius: 8 }}>
                  {{ basic: 'Básico (5-10 reps)', intermediate: 'Intermedio (10-20 reps)', advanced: 'Avanzado (20+ reps)' }[v]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
