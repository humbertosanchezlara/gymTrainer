import { ChevronDown } from 'lucide-react';
import type { ProgramDay, ProgramDayExercise } from '../../../types';

interface ProgramDayCardsProps {
  days: ProgramDay[];
  expandedDay: number | null;
  onToggleDay: (dayNumber: number) => void;
  todayDayNumber: number;
}

export function ProgramDayCards({ days, expandedDay, onToggleDay, todayDayNumber }: ProgramDayCardsProps) {
  return (
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
              onClick={() => onToggleDay(day.day_number)}
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
                {exercises.map((ex, index) => (
                  <div key={`${day.id}-${index}-${ex.exercise_id}`} style={{
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
  );
}
