import { ChevronDown } from 'lucide-react';
import type { Exercise, Session, SessionLog } from '../../../types';

type SessionWithLogs = Session & { logs: (SessionLog & { exercise: Exercise | Exercise[] | null })[] };

interface ProgressSessionHistoryProps {
  sessions: SessionWithLogs[];
  expandedSession: string | null;
  onToggle: (sessionId: string) => void;
  isMobile: boolean;
}

const KG_TO_LBS = 2.20462;
const kgToLbs = (kg: number) => Math.round(kg * KG_TO_LBS);

function flattenExercise(exercise: Exercise | Exercise[] | null | undefined): Exercise | null {
  if (!exercise) return null;
  return Array.isArray(exercise) ? exercise[0] ?? null : exercise;
}

export function ProgressSessionHistory({ sessions, expandedSession, onToggle, isMobile }: ProgressSessionHistoryProps) {
  if (sessions.length === 0) {
    return (
      <div style={{ border: '1px dashed var(--rule)', borderRadius: 16, padding: 48, textAlign: 'center' }}>
        <div className="body" style={{ color: 'var(--muted)' }}>Sin sesiones registradas todavía.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="uc" style={{ margin: '0 0 16px', color: 'var(--muted)' }}>Historial de sesiones</div>
      <div style={{ border: '1px solid var(--rule)', borderRadius: 16, overflow: 'hidden' }}>
        {sessions.map((session, index) => {
          const isOpen = expandedSession === session.id;
          return (
            <div key={session.id}>
              <button
                onClick={() => onToggle(session.id)}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 24px' : '80px 1fr 120px 24px',
                  gap: isMobile ? 8 : 16,
                  padding: isMobile ? '14px 16px' : '20px 24px',
                  alignItems: 'center',
                  borderTop: index === 0 ? 'none' : '1px solid var(--rule)',
                  background: 'transparent',
                  border: 'none',
                  borderTopColor: 'var(--rule)',
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopStyle: 'solid',
                  cursor: 'pointer',
                  fontFamily: 'var(--sans)',
                  color: 'var(--ink)',
                  textAlign: 'left',
                }}
              >
                {!isMobile && (
                  <span className="mono caption" style={{ color: 'var(--muted)' }}>
                    {new Date(session.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                )}
                <div>
                  <span className="d-s" style={{ fontWeight: 600 }}>{session.name}</span>
                  {isMobile && (
                    <div className="mono caption" style={{ color: 'var(--muted)', marginTop: 2 }}>
                      {new Date(session.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      {session.block_num ? ` · B${session.block_num} Sem ${session.week_num}` : ''}
                    </div>
                  )}
                </div>
                {!isMobile && (
                  <span className="mono caption" style={{ color: 'var(--muted)' }}>
                    {session.block_num ? `B${session.block_num} Sem ${session.week_num}` : 'Viaje / libre'}
                  </span>
                )}
                <ChevronDown size={16} style={{ color: 'var(--muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </button>

              {isOpen && session.logs && session.logs.length > 0 && (
                <div style={{ borderTop: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
                  {session.logs.map((log, logIndex) => {
                    const exercise = flattenExercise(log.exercise);
                    return (
                      <div
                        key={log.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '1fr auto' : '1fr 80px 80px 60px',
                          gap: isMobile ? '8px 12px' : 12,
                          padding: isMobile ? '12px 16px' : '14px 24px',
                          borderTop: logIndex === 0 ? 'none' : '1px solid var(--rule)',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{exercise?.name ?? '—'}</div>
                          {isMobile && (
                            <div className="mono caption" style={{ color: 'var(--muted)', marginTop: 2 }}>
                              {log.sets} × {log.reps_per_set} · {log.weight} kg / {kgToLbs(log.weight)} lb
                            </div>
                          )}
                        </div>
                        {!isMobile && <div className="mono" style={{ fontSize: 13 }}>{log.sets} × {log.reps_per_set}</div>}
                        {!isMobile && <div className="mono" style={{ fontSize: 13 }}>{log.weight} kg<span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 4 }}>/ {kgToLbs(log.weight)} lb</span></div>}
                        <div className="mono caption" style={{ color: 'var(--muted)' }}>RPE {log.rpe ?? '—'}</div>
                      </div>
                    );
                  })}
                  {session.notes && (
                    <div style={{ padding: '12px 24px', borderTop: '1px solid var(--rule)' }}>
                      <span className="body-s" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>{session.notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
