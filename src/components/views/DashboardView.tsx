import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { useIsMobile } from '../../hooks/useBreakpoint';
import {
  generateTravelBlock,
  getCachedTravelBlock,
  getNextTravelSession,
  saveTravelBlock,
  type TravelBlockConfig,
  type CachedTravelBlock,
} from '../../lib/openaiTravelGenerator';
import { parseAdjustmentWithAI } from '../../lib/openaiAdjust';
import { Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import Modal from '../Modal';
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
  const [nextDayId, setNextDayId] = useState<string | null>(null);
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

        const weekNum = Math.floor(sessCount / pRes.data.total_days) + 1;
        const dayNum = (sessCount % pRes.data.total_days) + 1;
        setNextDayNum(dayNum);

        // Try week-specific day first, fall back to week 1 (base program)
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
      const exerciseNames = todayExercises.map(e => e.exercise_name || e.name || '').filter(Boolean);
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
      const config: TravelBlockConfig = {
        hasBands: travelHasBands,
        hasPullupBar: travelHasPullupBar,
        travelDays,
        volumeLevel: travelVolume,
      };

      let block: CachedTravelBlock | null = getCachedTravelBlock(user.id, config);

      if (!block) {
        const generated = await generateTravelBlock(user.id, config);
        block = {
          days: generated,
          current_index: 0,
          config,
          generated_at: new Date().toISOString(),
        };
        saveTravelBlock(user.id, block);
      }

      const { entries } = await getNextTravelSession(user.id, block);

      block = { ...block, current_index: (block.current_index + 1) % block.days.length };
      saveTravelBlock(user.id, block);

      onStartTravel(entries);
      setShowTravelSetup(false);
    } catch {
      toast.error('Error al generar la sesión fuera del gym.');
    } finally {
      setAdjusting(false);
    }
  };

  const weekNum = completedWeeks + 1;
  const blockName = getBlockInfo(weekNum);

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
      <div style={{ background: 'var(--ink)', color: 'var(--paper)', borderRadius: 16, padding: isMobile ? '20px' : '28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* 1 — compact info row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="uc" style={{ opacity: .5, fontSize: 11 }}>{programComplete ? 'Entrena hoy' : 'Hoy entrenas'}</span>
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>
              {nextDayName || (programComplete ? 'Sesión libre' : 'Tu rutina')}
            </span>
          </div>
          {todayExercises.length > 0 && (
            <span className="mono caption" style={{ opacity: .45 }}>{todayExercises.length} ejercicios</span>
          )}
        </div>

        {/* 2 — start button */}
        <button
          onClick={onStartSession}
          className="btn btn-accent btn-xl"
          style={{ width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
        >
          Empezar entrenamiento <ArrowRight size={20}/>
        </button>

        {/* 3 — AI adjust chat */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="uc" style={{ opacity: .45, fontSize: 10 }}>Ajustar sesión de hoy</div>
          <textarea
            value={adjustInput}
            onChange={e => setAdjustInput(e.target.value)}
            placeholder='Ej: "me duele el hombro" · "solo tengo 30 min" · "estoy muy cansado"'
            rows={3}
            className="forge-field"
            style={{ resize: 'none', background: 'rgba(241,237,228,0.07)', border: '1px solid rgba(241,237,228,0.15)', color: 'var(--paper)', borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.5, fontFamily: 'var(--sans)', width: '100%', boxSizing: 'border-box' }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && adjustInput.trim()) { e.preventDefault(); handleAdjust(); } }}
          />
          <button
            onClick={handleAdjust}
            disabled={!adjustInput.trim() || adjusting}
            className="btn btn-ghost"
            style={{ alignSelf: 'flex-end', color: 'var(--paper)', borderColor: 'rgba(241,237,228,0.2)', opacity: (!adjustInput.trim() || adjusting) ? .4 : 1 }}
          >
            {adjusting ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Ajustar con IA'}
          </button>
        </div>

        {/* 4 — travel mode */}
        <button
          onClick={() => setShowTravelSetup(true)}
          className="btn btn-ghost btn-lg"
          style={{ width: '100%', justifyContent: 'center', color: 'var(--paper)', borderColor: 'rgba(241,237,228,0.15)', marginTop: 2 }}
        >
          Sesión fuera del gym
        </button>
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
