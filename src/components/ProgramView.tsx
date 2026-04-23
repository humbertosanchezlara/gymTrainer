import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Program, ProgramDay, ProgramDayExercise } from '../types';
import { BLOCKS } from '../engine/programGenerator';
import { Loader2, ChevronDown } from 'lucide-react';
import { useIsMobile } from '../hooks/useBreakpoint';

export default function ProgramView() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState(1);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('sessions')
      .select('week_num')
      .eq('user_id', user.id)
      .order('week_num', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data: sessionData }) => {
        if (sessionData?.week_num) {
          setCurrentWeek(sessionData.week_num);
          setSelectedWeek(sessionData.week_num);
        }
      });

    supabase
      .from('programs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setProgram(data);
          supabase
            .from('program_days')
            .select('*')
            .eq('program_id', data.id)
            .order('day_number')
            .then(({ data: dayData }) => {
              if (dayData) setDays(dayData);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      });
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--muted)' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="forge-fade" style={{ maxWidth: 640 }}>
        <div style={{ border: '1px solid var(--rule)', borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <h2 className="d-m" style={{ margin: 0 }}>Aún no hay programa</h2>
          <p className="body" style={{ color: 'var(--muted)', marginTop: 12 }}>Completa el onboarding para generar tu primer programa de entrenamiento.</p>
        </div>
      </div>
    );
  }

  const totalWeeks = program.total_weeks ?? 12;
  const selectedBlock = BLOCKS.find(b => b.weeks.includes(selectedWeek)) ?? BLOCKS[0];

  return (
    <div className="forge-fade" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Block bar */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '4fr 4fr 3fr 1fr', gap: 4 }}>
        {BLOCKS.map((block) => {
          const isCurrent = block.weeks.includes(currentWeek);
          return (
            <div key={block.name} style={{
              padding: '12px 16px',
              background: isCurrent ? 'var(--ink)' : 'transparent',
              color: isCurrent ? 'var(--paper)' : 'var(--muted)',
              border: `1px ${isCurrent ? 'solid var(--ink)' : 'dashed var(--rule)'}`,
              borderRadius: 6,
            }}>
              <div className="uc" style={{ opacity: isCurrent ? .8 : .6 }}>{block.name}</div>
              <div className="mono caption" style={{ marginTop: 4, opacity: isCurrent ? .7 : .5 }}>
                Sem {block.weeks[0]}–{block.weeks[block.weeks.length - 1]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Week strip */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${totalWeeks}, 1fr)`, gap: 4, minWidth: isMobile ? totalWeeks * 56 : undefined }}>
          {Array.from({ length: totalWeeks }).map((_, i) => {
            const w = i + 1;
            const isSel = selectedWeek === w;
            const isCur = currentWeek === w;
            const block = BLOCKS.find(b => b.weeks.includes(w));
            return (
              <button key={w} onClick={() => setSelectedWeek(w)} style={{
                padding: isMobile ? '12px 4px' : '20px 8px',
                background: isSel ? 'var(--ink)' : 'transparent',
                color: isSel ? 'var(--paper)' : 'var(--ink)',
                border: '1px solid',
                borderColor: isSel ? 'var(--ink)' : isCur ? 'var(--accent)' : 'var(--rule)',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'var(--sans)',
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'flex-start',
                gap: isMobile ? 4 : 8,
                transition: 'background .15s, color .15s',
                minWidth: isMobile ? 52 : undefined,
              }}>
                <div className="mono caption" style={{ opacity: .6, fontSize: isMobile ? 8 : undefined }}>SEM</div>
                <div className="serif" style={{ fontSize: isMobile ? 20 : 28, lineHeight: 1, fontStyle: 'italic' }}>{w}</div>
                {!isMobile && <div className="caption mono" style={{ opacity: .5, fontSize: 9 }}>
                  {block?.name.slice(0, 3).toUpperCase()}
                </div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected week detail */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: 24 }}>
        <div>
          <div className="uc" style={{ color: 'var(--muted)' }}>Semana {selectedWeek}</div>
          <h2 className="d-l" style={{ margin: 0, marginTop: 8 }}>{selectedBlock.name}</h2>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div className="uc" style={{ color: 'var(--muted)', marginBottom: 4 }}>Reps objetivo</div>
              <div className="mono" style={{ fontWeight: 600 }}>{selectedBlock.repsMin}–{selectedBlock.repsMax}</div>
            </div>
            <div>
              <div className="uc" style={{ color: 'var(--muted)', marginBottom: 4 }}>RPE objetivo</div>
              <div className="mono" style={{ fontWeight: 600 }}>{selectedBlock.rpeMin}–{selectedBlock.rpeMax}</div>
              <div className="caption" style={{ color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: 4 }}>¿Qué es RPE?</strong>
                RPE mide cuántas repeticiones te quedaron en el tanque al terminar la serie. No mide el peso ni el dolor — mide tu percepción de cuánto te faltó para el fallo.
                <span style={{ display: 'block', marginTop: 8 }}>
                  <strong style={{ color: 'var(--ink)' }}>10</strong> = fallo total · <strong style={{ color: 'var(--ink)' }}>9</strong> = queda 1 · <strong style={{ color: 'var(--ink)' }}>8</strong> = quedan 2 · <strong style={{ color: 'var(--ink)' }}>7</strong> = quedan 3
                </span>
                <span style={{ display: 'block', marginTop: 8 }}>
                  Este bloque entrena a RPE {selectedBlock.rpeMin}–{selectedBlock.rpeMax}: termina cada serie sintiendo que podrías haber hecho{' '}
                  {selectedBlock.rpeMax <= 7 ? '3 o más repeticiones más.' :
                   selectedBlock.rpeMax <= 8 ? '2–3 repeticiones más.' :
                   selectedBlock.rpeMax <= 9 ? '1–2 repeticiones más.' :
                   '0–1 repeticiones más (al límite).'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
            {days.map((day, i) => {
              const exercises = (Array.isArray(day.exercises) ? day.exercises : []) as ProgramDayExercise[];
              const isExpanded = expandedDay === day.day_number;
              return (
                <div key={day.id}>
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : day.day_number)}
                    style={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr 24px' : '60px 1fr 80px 24px',
                      gap: isMobile ? 8 : 16,
                      padding: isMobile ? '16px' : '20px 24px',
                      alignItems: 'center',
                      borderTop: i === 0 ? 'none' : '1px solid var(--rule)',
                      background: 'transparent',
                      border: 'none',
                      borderTopColor: 'var(--rule)',
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopStyle: 'solid',
                      cursor: 'pointer',
                      fontFamily: 'var(--sans)',
                      color: 'var(--ink)',
                      textAlign: 'left',
                    }}
                  >
                    {!isMobile && <span className="mono uc" style={{ color: 'var(--muted)' }}>Día {day.day_number}</span>}
                    <div>
                      <span className="d-s" style={{ fontWeight: 600 }}>{day.day_name}</span>
                      {isMobile && <div className="mono caption" style={{ color: 'var(--muted)', marginTop: 2 }}>Día {day.day_number} · {exercises.length > 0 ? `${exercises.length} ej.` : '—'}</div>}
                    </div>
                    {!isMobile && <span className="mono caption">{exercises.length > 0 ? `${exercises.length} ej.` : '—'}</span>}
                    <ChevronDown size={16} style={{ color: 'var(--muted)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                  </button>

                  {isExpanded && exercises.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
                      {exercises.map((ex, ei) => (
                        <div key={ei} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr auto' : '32px 1fr 80px 80px', gap: isMobile ? '8px 12px' : 12, padding: isMobile ? '12px 16px' : '14px 24px', borderTop: ei === 0 ? 'none' : '1px solid var(--rule)', alignItems: 'center' }}>
                          {!isMobile && <span className="mono caption" style={{ color: 'var(--muted)' }}>{String(ei+1).padStart(2,'0')}</span>}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{ex.exercise_name}</div>
                            {isMobile
                              ? <div className="mono caption" style={{ color: 'var(--muted)', marginTop: 2 }}>{ex.sets}×{ex.reps_min}{ex.reps_max && ex.reps_max !== ex.reps_min ? `–${ex.reps_max}` : ''}{ex.role ? ` · ${ex.role}` : ''}</div>
                              : ex.role && <div className="caption" style={{ color: 'var(--muted)', marginTop: 2 }}>{ex.role}</div>}
                          </div>
                          {!isMobile && <div className="mono" style={{ fontSize: 13 }}>{ex.sets}×{ex.reps_min}{ex.reps_max && ex.reps_max !== ex.reps_min ? `–${ex.reps_max}` : ''}</div>}
                          <div className="mono caption" style={{ color: 'var(--accent)' }}>{ex.rpe ? `RPE ${ex.rpe}` : ''}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
