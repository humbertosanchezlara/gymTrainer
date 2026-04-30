import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Program, ProgramDay, ProgramDayExercise } from '../types';
import { BLOCKS } from '../engine/programGenerator';
import { Loader2, ChevronDown } from 'lucide-react';
import { fetchProgramProgressState, fetchProgramWeekDays, fetchProgramWeekDaysOrFallback } from '../utils/programState';

export default function ProgramView() {
  const { user } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [showRPE, setShowRPE] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentDay, setCurrentDay] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [generatedWeek, setGeneratedWeek] = useState(true);
  const [sourceWeek, setSourceWeek] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    Promise.resolve(
      supabase
        .from('programs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ).then(async ({ data }) => {
      if (!mounted) return;
      if (data) {
        setProgram(data);
        const progress = await fetchProgramProgressState(user.id, data);
        if (!mounted) return;
        setCurrentWeek(progress.currentWeek);
        setCurrentDay(progress.currentDay);
        setSelectedWeek(progress.currentWeek);
      } else {
        setLoading(false);
      }
    }).catch(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    if (!program) return;
    let cancelled = false;

    const loadWeek = async () => {
      setLoading(true);
      try {
        if (selectedWeek === currentWeek) {
          const result = await fetchProgramWeekDaysOrFallback(program.id, selectedWeek);
          if (cancelled) return;
          setDays(result.days);
          setGeneratedWeek(!result.isFallback || result.sourceWeek === selectedWeek);
          setSourceWeek(result.sourceWeek);
        } else {
          const explicitDays = await fetchProgramWeekDays(program.id, selectedWeek);
          if (cancelled) return;
          setDays(explicitDays);
          setGeneratedWeek(explicitDays.length > 0);
          setSourceWeek(explicitDays.length > 0 ? selectedWeek : null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadWeek().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [program, selectedWeek, currentWeek]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--muted)' }} />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="forge-fade" style={{ maxWidth: 640 }}>
        <div style={{ border: '1px solid var(--rule)', borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <h2 className="d-m" style={{ margin: 0 }}>Aún no hay programa</h2>
          <p style={{ color: 'var(--muted)', marginTop: 12, fontSize: 14 }}>Completa el onboarding para generar tu primer programa de entrenamiento.</p>
        </div>
      </div>
    );
  }

  const totalWeeks = program.total_weeks ?? 12;
  const block = BLOCKS.find(b => b.weeks.includes(selectedWeek)) ?? BLOCKS[0];
  const todayDayNumber = selectedWeek === currentWeek ? currentDay : -1;
  const weekNumbers = Array.from({ length: totalWeeks }, (_, index) => index + 1);

  return (
    <div className="forge-fade">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .program-rpe-collapse {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 320ms cubic-bezier(.2,.7,.2,1);
        }
        .program-rpe-collapse.open { grid-template-rows: 1fr; }
        .program-rpe-collapse > div { overflow: hidden; }
      `}</style>

      {/* Context badge */}
      <div style={{
        background: 'var(--ink)',
        color: 'var(--paper)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 20,
      }}>
        <div style={{
          fontFamily: 'var(--sans)',
          fontSize: 38,
          fontWeight: 700,
          lineHeight: 1,
          minWidth: 38,
          textAlign: 'center',
          letterSpacing: '-0.03em',
        }}>{selectedWeek}</div>

        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(241,237,228,0.15)' }} />

        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 9.5,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            opacity: 0.55,
          }}>SEMANA {selectedWeek} / {totalWeeks}</div>
          <div style={{
            fontFamily: 'var(--sans)',
            fontSize: 20,
            fontWeight: 600,
            marginTop: 2,
            letterSpacing: '-0.02em',
          }}>Bloque {block.name}</div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            opacity: 0.55,
            marginBottom: 2,
          }}>OBJETIVO</div>
          <div style={{
            fontFamily: 'var(--sans)',
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}>{block.repsMin}–{block.repsMax} reps · RPE {block.rpeMin}–{block.rpeMax}</div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
        gap: 8,
        marginBottom: 18,
      }}>
        {weekNumbers.map((week) => {
          const isCurrent = week === currentWeek;
          const isSelected = week === selectedWeek;
          const weekBlock = BLOCKS.find((entry) => entry.weeks.includes(week)) ?? BLOCKS[0];
          return (
            <button
              key={week}
              type="button"
              onClick={() => setSelectedWeek(week)}
              style={{
                borderRadius: 12,
                border: isSelected ? '1.5px solid var(--ink)' : '1px solid var(--rule)',
                background: isSelected ? 'var(--paper-2)' : 'transparent',
                padding: '10px 8px',
                cursor: 'pointer',
                fontFamily: 'var(--sans)',
                color: 'var(--ink)',
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>{week}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                {isCurrent ? 'Actual' : weekBlock.name}
              </div>
            </button>
          );
        })}
      </div>

      {!generatedWeek && (
        <div style={{
          background: 'var(--paper-2)',
          border: '1px solid var(--rule)',
          borderRadius: 14,
          padding: '14px 16px',
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Semana aún no generada</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
            Forge todavía no ha generado el detalle de la semana {selectedWeek}. Esta fase seguirá el bloque {block.name}
            {' '}con objetivo de {block.repsMin}–{block.repsMax} reps y RPE {block.rpeMin}–{block.rpeMax}.
          </div>
        </div>
      )}

      {generatedWeek && sourceWeek !== null && sourceWeek !== selectedWeek && (
        <div style={{
          background: 'var(--paper-2)',
          border: '1px solid var(--rule)',
          borderRadius: 14,
          padding: '14px 16px',
          marginBottom: 16,
          fontSize: 12.5,
          color: 'var(--muted)',
        }}>
          Mostrando la plantilla base de la semana {sourceWeek} mientras se genera el detalle actualizado.
        </div>
      )}

      {/* Esta semana header + RPE toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 10.5,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}>ESTA SEMANA</div>

        <button
          onClick={() => setShowRPE(s => !s)}
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: 0,
          }}
        >
          <span style={{
            width: 13,
            height: 13,
            borderRadius: '50%',
            border: '1px solid rgba(0,0,0,0.15)',
            fontSize: 9,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}>?</span>
          QUÉ ES RPE
        </button>
      </div>

      {/* RPE info banner — collapsible */}
      <div className={`program-rpe-collapse${showRPE ? ' open' : ''}`}>
        <div>
          <div style={{ marginBottom: 14 }}>
            <div style={{
              background: 'var(--ink)',
              color: 'var(--paper)',
              borderRadius: 10,
              padding: '14px 16px',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}>
              <button
                onClick={() => setShowRPE(false)}
                style={{
                  width: 22,
                  height: 22,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  background: 'rgba(241,237,228,0.12)',
                  border: 'none',
                  flexShrink: 0,
                  fontSize: 14,
                  color: 'var(--paper)',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}>×</button>
              <div>
                <div style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  opacity: 0.55,
                  marginBottom: 6,
                }}>QUÉ ES RPE</div>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                  Reps que te quedaron en el tanque al terminar la serie.
                  En este bloque (RPE {block.rpeMin}–{block.rpeMax}) deberías sentir que podrías
                  haber hecho{' '}
                  {block.rpeMax <= 7 ? '3 o más repeticiones más.' :
                   block.rpeMax <= 8 ? '2–3 repeticiones más.' :
                   block.rpeMax <= 9 ? '1–2 repeticiones más.' :
                   '0–1 repeticiones más (al límite).'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Day cards */}
      {generatedWeek && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {days.map(day => {
          const exercises = (Array.isArray(day.exercises) ? day.exercises : []) as ProgramDayExercise[];
          const isExpanded = expandedDay === day.day_number;
          const isToday = day.day_number === todayDayNumber;

          return (
            <div
              key={day.id}
              style={{
                background: 'var(--paper-2)',
                borderRadius: 10,
                overflow: 'hidden',
                outline: isToday ? '1.5px solid var(--ink)' : 'none',
              }}
            >
              <button
                onClick={() => setExpandedDay(isExpanded ? null : day.day_number)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 18px',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  color: 'var(--ink)',
                  textAlign: 'left',
                  fontFamily: 'var(--sans)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {isToday && (
                    <div style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 9,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent)',
                      padding: '3px 7px',
                      borderRadius: 3,
                      flexShrink: 0,
                    }}>HOY</div>
                  )}
                  <div>
                    <div style={{
                      fontFamily: 'var(--sans)',
                      fontWeight: 600,
                      fontSize: 17,
                      letterSpacing: '-0.02em',
                    }}>{day.day_name}</div>
                    <div style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 11,
                      letterSpacing: '0.04em',
                      color: 'var(--muted)',
                      marginTop: 2,
                    }}>DÍA {day.day_number} · {exercises.length} EJ.</div>
                  </div>
                </div>
                <ChevronDown
                  size={14}
                  style={{
                    color: 'var(--muted)',
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 280ms ease',
                    flexShrink: 0,
                  }}
                />
              </button>

              {isExpanded && exercises.length > 0 && (
                <div>
                  {exercises.map((ex, ei) => (
                    <div key={ei} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 10,
                      padding: '14px 18px',
                      borderTop: '1px solid rgba(181,169,141,0.35)',
                      alignItems: 'center',
                    }}>
                      <div>
                        <div style={{
                          fontFamily: 'var(--sans)',
                          fontWeight: 500,
                          fontSize: 15,
                          letterSpacing: '-0.01em',
                          color: 'var(--ink)',
                        }}>{ex.exercise_name}</div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginTop: 3,
                          fontFamily: 'var(--mono)',
                          fontSize: 11,
                          letterSpacing: '0.02em',
                          color: 'var(--muted)',
                        }}>
                          <span>{ex.sets}×{ex.reps_min}{ex.reps_max && ex.reps_max !== ex.reps_min ? `–${ex.reps_max}` : ''}</span>
                          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--muted)', flexShrink: 0 }} />
                          <span style={{
                            fontFamily: 'var(--mono)',
                            fontSize: 9,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color: ex.role === 'primary' ? 'var(--ink)' : ex.role === 'secondary' ? 'var(--ink-2)' : 'var(--muted)',
                            fontWeight: ex.role === 'primary' ? 600 : 400,
                          }}>{ex.role}</span>
                        </div>
                      </div>
                      {ex.rpe > 0 && (
                        <div style={{
                          color: 'var(--accent)',
                          fontFamily: 'var(--mono)',
                          fontSize: 11,
                          letterSpacing: '0.08em',
                          fontWeight: 500,
                          flexShrink: 0,
                        }}>RPE {ex.rpe}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
