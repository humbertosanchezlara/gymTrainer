import { useState, useEffect } from 'react';

import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
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
import { Loader2, ArrowRight, MapPin, RefreshCw } from 'lucide-react';
import Modal from '../Modal';
import type { Tab } from '../MainShell';
import { HeroSession } from '../forge/HeroSession';
import { AdjustWithAI } from '../forge/AdjustWithAI';
import { ContextCards } from '../forge/ContextCards';
import { fetchProgramProgressState, normalizeProgramDayExercise } from '../../utils/programState';

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

export default function DashboardView({ onNavigate, onStartSession, onStartTravel }: DashboardViewProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Array<{ id: string; name: string; date: string; block_num: number | null }>>([]);
  const [nextDayName, setNextDayName] = useState<string | null>(null);
  const [nextDayNum, setNextDayNum] = useState<number | null>(null);
  const [nextDayId, setNextDayId] = useState<string | null>(null);
  const [programComplete, setProgramComplete] = useState(false);
  const [completedWeeks, setCompletedWeeks] = useState(0);
  const [todayExercises, setTodayExercises] = useState<ProgramDayExercise[]>([]);

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
    Promise.all([
      supabase.from('sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(5),
      supabase.from('programs').select('id, total_days, total_weeks, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(async ([sRes, pRes]) => {
      if (sRes.data) setSessions(sRes.data);

      if (pRes.data) {
        const progress = await fetchProgramProgressState(user.id, pRes.data);
        const sessCount = progress.sessionCount;
        const weeksCompleted = Math.floor(sessCount / pRes.data.total_days);
        setCompletedWeeks(Math.min(weeksCompleted, pRes.data.total_weeks ?? 12));

        if (progress.programComplete) {
          setProgramComplete(true);
          setLoading(false);
          return;
        }

        const weekNum = progress.currentWeek;
        const dayNum = progress.currentDay;
        setNextDayNum(dayNum);

        let { data: dayData } = await supabase
          .from('program_days')
          .select('id, day_name, exercises')
          .eq('program_id', pRes.data.id)
          .eq('week_num', weekNum)
          .eq('day_number', dayNum)
          .maybeSingle();

        if (!dayData) {
          ({ data: dayData } = await supabase
            .from('program_days')
            .select('id, day_name, exercises')
            .eq('program_id', pRes.data.id)
            .eq('week_num', 1)
            .eq('day_number', dayNum)
            .maybeSingle());
        }

        if (dayData) {
          setNextDayName(dayData.day_name);
          setNextDayId(dayData.id);
          const exArr = dayData.exercises;
          if (Array.isArray(exArr)) {
            setTodayExercises(exArr.map((ex) => normalizeProgramDayExercise(ex as Record<string, unknown>)));
          }
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

  const handleAdjust = async () => {
    if (!adjustInput.trim() || !user) return;
    setAdjusting(true);
    setAdjustError(null);
    const snapshot = [...todayExercises];
    try {
      const exerciseNames = todayExercises
        .map((e) => e.exercise_name)
        .filter((name): name is string => Boolean(name));
      const adjustments = await parseAdjustmentWithAI(adjustInput, exerciseNames);

      if (nextDayId) {
        const { data: dayData } = await supabase
          .from('program_days').select('id, exercises')
          .eq('id', nextDayId).maybeSingle();

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
                const exName = ((ex.exercise_name as string) ?? '').toLowerCase();
                return targetWords.some(w => exName.includes(w)) || exName.includes(target);
              });
              if (matchIdx !== -1) {
                const matchedEx = adjusted[matchIdx];
                const currentIds = new Set(adjusted.map((e) => e.exercise_id));
                const { data: candidates } = await supabase.from('exercises').select('id, name, category')
                  .eq('user_id', user.id).in('status', ['YES', 'SUB']).eq('category', matchedEx.category).neq('id', matchedEx.exercise_id);
                const substitute = candidates?.find(c => !currentIds.has(c.id));
                if (substitute) {
                  adjusted[matchIdx] = { ...matchedEx, exercise_id: substitute.id, exercise_name: substitute.name, notes: 'Sustituido por solicitud' };
                }
              }
            }
          }

          await supabase.from('program_days').update({ exercises: adjusted }).eq('id', dayData.id);
          setTodayExercises(adjusted.map((ex) => normalizeProgramDayExercise(ex as Record<string, unknown>)));
          setOriginalExercises(snapshot);
          setAdjustedSummary(adjustments[0]?.details ?? 'Sesión ajustada según tu solicitud.');
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

  const weekNum = completedWeeks + 1;
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
      {programComplete && (
        <div style={{
          border: '1px solid var(--accent)', borderRadius: 16, padding: '20px 24px',
          background: 'color-mix(in oklab, var(--accent), transparent 94%)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
        }}>
          <div>
            <div style={{ color: 'var(--accent)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              ¡Programa completado!
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              Completaste las <em style={{ color: 'var(--accent)' }}>{completedWeeks} semanas</em>. Hora de un nuevo ciclo.
            </div>
          </div>
          <button onClick={() => onNavigate('library')} className="btn btn-ghost" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            <RefreshCw size={14} /> Nuevo ciclo
          </button>
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
      <button
        type="button"
        onClick={() => setShowTravelSetup(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, width: '100%', padding: '16px 20px', textAlign: 'left',
          background: 'color-mix(in oklab, var(--ink), transparent 97%)',
          border: '1px solid var(--rule)',
          borderRadius: 20, cursor: 'pointer',
          fontFamily: 'var(--sans)', transition: 'border-color .15s, background .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--muted)'; e.currentTarget.style.background = 'color-mix(in oklab, var(--ink), transparent 94%)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--rule)'; e.currentTarget.style.background = 'color-mix(in oklab, var(--ink), transparent 97%)'; }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'var(--ink)', color: 'var(--paper)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <MapPin size={16} />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Sesión fuera del gym</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Entrena en casa o viajando</span>
          </span>
        </span>
        <ArrowRight size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
      </button>

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
      <button
        type="button"
        onClick={() => onNavigate('program')}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '16px 20px',
          background: 'transparent',
          border: '1px dashed var(--rule)',
          borderRadius: 20, cursor: 'pointer',
          fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 14,
          color: 'var(--ink)', transition: 'border-color .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--muted)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--rule)'; }}
      >
        <span>Ver programa completo</span>
        <ArrowRight size={16} />
      </button>

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
            <button
              onClick={() => handleTravelModeClick(true)}
              disabled={adjusting}
              className="btn btn-ghost"
              title="Descarta el bloque guardado y genera uno nuevo con IA"
            >
              Regenerar
            </button>
            <button onClick={() => handleTravelModeClick(false)} disabled={adjusting} className="btn btn-ink" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {adjusting ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
              {adjusting && travelGenerating ? 'Generando con IA…' : 'Siguiente sesión'}
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
          <div>
            <div className="uc" style={{ color: 'var(--muted)', marginBottom: 8 }}>Ejercicios que prefieres evitar</div>
            <div className="body-s" style={{ color: 'var(--muted)', marginBottom: 10, lineHeight: 1.5 }}>
              Separa por comas. Ej: burpees, sentadillas con salto, jumping jacks
            </div>
            <input
              type="text"
              value={travelDisliked}
              onChange={e => setTravelDisliked(e.target.value)}
              placeholder="burpees, jumping jacks..."
              className="forge-field"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
