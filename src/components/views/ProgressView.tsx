import { useState, useEffect } from 'react';

const KG_TO_LBS = 2.20462;
function kgToLbs(kg: number): number { return Math.round(kg * KG_TO_LBS); }
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Session, SessionLog, WorkingWeight, Exercise } from '../../types';
import { Loader2, ChevronDown } from 'lucide-react';
import { useIsMobile } from '../../hooks/useBreakpoint';

type SessionWithLogs = Session & { logs: (SessionLog & { exercise: Exercise })[] };

export default function ProgressView() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [sessions, setSessions] = useState<SessionWithLogs[]>([]);
  const [weights, setWeights] = useState<WorkingWeight[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('sessions').select('*, logs:session_logs(*, exercise:exercises(*))').eq('user_id', user.id).order('date', { ascending: false }).limit(20),
      supabase.from('working_weights').select('*, exercise:exercises(*)').eq('user_id', user.id).order('weight', { ascending: false }),
    ]).then(([sRes, wRes]) => {
      if (sRes.data) setSessions(sRes.data as SessionWithLogs[]);
      if (wRes.data) setWeights(wRes.data);
      setLoading(false);
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

  return (
    <div className="forge-fade" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--rule)', paddingBottom: 16 }}>
        <div>
          <div className="uc" style={{ color: 'var(--muted)' }}>Progreso</div>
          <h1 className="d-l" style={{ margin: 0, marginTop: 8 }}>
            {sessions.length > 0 ? `${sessions.length} sesiones` : 'Tu historial'}
          </h1>
        </div>
        {weights.length > 0 && (
          <div className="mono caption" style={{ textAlign: 'right' }}>
            {weights.length} pesos de trabajo actuales
          </div>
        )}
      </div>

      {/* Summary stats */}
      {sessions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 0, border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
          {[
            { k: 'Sesiones', v: String(sessions.length), sub: 'registradas' },
            { k: 'Última sesión', v: sessions.length > 0 ? new Date(sessions[0].date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—', sub: sessions[0]?.name ?? '' },
            { k: 'Pesos activos', v: String(weights.length), sub: 'ejercicios' },
            { k: 'Bloque actual', v: sessions[0]?.block_num ? `B${sessions[0].block_num}` : '—', sub: sessions[0]?.week_num ? `Semana ${sessions[0].week_num}` : '' },
          ].map((m, i) => (
            <div key={m.k} style={{ padding: isMobile ? 16 : 24, borderLeft: isMobile ? (i % 2 === 0 ? 'none' : '1px solid var(--rule)') : (i === 0 ? 'none' : '1px solid var(--rule)'), borderTop: isMobile && i >= 2 ? '1px solid var(--rule)' : 'none' }}>
              <div className="uc" style={{ color: 'var(--muted)' }}>{m.k}</div>
              <div className="d-l" style={{ marginTop: 8, fontWeight: 600 }}>{m.v}</div>
              <div className="caption" style={{ color: 'var(--muted)', marginTop: 4 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Working weights */}
      {weights.length > 0 && (
        <div>
          <div className="uc" style={{ marginBottom: 16, color: 'var(--muted)' }}>Pesos de trabajo actuales</div>
          <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
            {weights.map((w, i) => (
              <div key={w.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, padding: '20px 24px', alignItems: 'center', borderTop: i === 0 ? 'none' : '1px solid var(--rule)' }}>
                <div className="d-s" style={{ fontWeight: 600 }}>
                  {(w.exercise as unknown as { name?: string })?.name ?? '—'}
                </div>
                <div className="mono" style={{ fontSize: 22, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0 }}>
                  <span>{w.weight}<span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 3, fontWeight: 400 }}>kg</span></span>
                  <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}>{kgToLbs(w.weight)}<span style={{ fontSize: 10, marginLeft: 2 }}>lb</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session history */}
      {sessions.length === 0 ? (
        <div style={{ border: '1px dashed var(--rule)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <div className="body" style={{ color: 'var(--muted)' }}>Sin sesiones registradas todavía.</div>
        </div>
      ) : (
        <div>
          <div className="uc" style={{ margin: '0 0 16px', color: 'var(--muted)' }}>Historial de sesiones</div>
          <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
            {sessions.map((s, i) => {
              const isOpen = expandedSession === s.id;
              return (
                <div key={s.id}>
                  <button
                    onClick={() => setExpandedSession(isOpen ? null : s.id)}
                    style={{ width: '100%', display: 'grid', gridTemplateColumns: isMobile ? '1fr 24px' : '80px 1fr 120px 24px', gap: isMobile ? 8 : 16, padding: isMobile ? '14px 16px' : '20px 24px', alignItems: 'center', borderTop: i === 0 ? 'none' : '1px solid var(--rule)', background: 'transparent', border: 'none', borderTopColor: 'var(--rule)', borderTopWidth: i === 0 ? 0 : 1, borderTopStyle: 'solid', cursor: 'pointer', fontFamily: 'var(--sans)', color: 'var(--ink)', textAlign: 'left' }}
                  >
                    {!isMobile && <span className="mono caption" style={{ color: 'var(--muted)' }}>
                      {new Date(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>}
                    <div>
                      <span className="d-s" style={{ fontWeight: 600 }}>{s.name}</span>
                      {isMobile && <div className="mono caption" style={{ color: 'var(--muted)', marginTop: 2 }}>
                        {new Date(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        {s.block_num ? ` · B${s.block_num} Sem ${s.week_num}` : ''}
                      </div>}
                    </div>
                    {!isMobile && <span className="mono caption" style={{ color: 'var(--muted)' }}>
                      {s.block_num ? `B${s.block_num} Sem ${s.week_num}` : '—'}
                    </span>}
                    <ChevronDown size={16} style={{ color: 'var(--muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                  </button>

                  {isOpen && s.logs && s.logs.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
                      {s.logs.map((log, li) => (
                        <div key={log.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr auto' : '1fr 80px 80px 60px', gap: isMobile ? '8px 12px' : 12, padding: isMobile ? '12px 16px' : '14px 24px', borderTop: li === 0 ? 'none' : '1px solid var(--rule)', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>
                              {(log.exercise as unknown as { name?: string })?.name ?? '—'}
                            </div>
                            {isMobile && <div className="mono caption" style={{ color: 'var(--muted)', marginTop: 2 }}>{log.sets} × {log.reps_per_set} · {log.weight} kg / {kgToLbs(log.weight)} lb</div>}
                          </div>
                          {!isMobile && <div className="mono" style={{ fontSize: 13 }}>{log.sets} × {log.reps_per_set}</div>}
                          {!isMobile && <div className="mono" style={{ fontSize: 13 }}>{log.weight} kg<span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 4 }}>/ {kgToLbs(log.weight)} lb</span></div>}
                          <div className="mono caption" style={{ color: 'var(--muted)' }}>RPE {log.rpe ?? '—'}</div>
                        </div>
                      ))}
                      {s.notes && (
                        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--rule)' }}>
                          <span className="body-s" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>{s.notes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
