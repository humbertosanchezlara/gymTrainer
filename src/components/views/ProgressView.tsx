import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Session, SessionLog, WorkingWeight, Exercise } from '../../types';
import { ProgressTableSkeleton } from '../skeletons';
import { NoWeightsEmpty, NoSessionsEmpty } from '../EmptyState';
import { ChevronDown } from 'lucide-react';

// ─── Animation variants ───────────────────────────────────
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const fadeUp = {
  hidden: { y: 18, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

type SessionWithLogs = Session & { logs: (SessionLog & { exercise: Exercise })[] };

// ─── Component ────────────────────────────────────────────
export default function ProgressView() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithLogs[]>([]);
  const [weights, setWeights] = useState<WorkingWeight[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-8 max-w-3xl">
      <motion.div variants={fadeUp}>
        <h2 className="text-4xl font-headline font-extrabold tracking-tight mb-1 text-on-surface">Progreso</h2>
        <p className="text-on-surface-variant font-body text-sm">Tu historial de entrenamiento y pesos de trabajo actuales</p>
      </motion.div>

      {/* Current Working Weights */}
      <motion.div variants={fadeUp} className="card-elevated rounded-xl p-6 md:p-8">
        <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-5">Pesos de Trabajo Actuales</h3>
        {loading ? (
          <ProgressTableSkeleton />
        ) : weights.length === 0 ? (
          <NoWeightsEmpty />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {weights.map((w) => (
              <div key={w.id} className="bg-surface-container-high/50 rounded-xl p-4 border border-outline-variant/10">
                <span className="text-on-surface-variant text-[10px] font-bold tracking-widest uppercase block truncate">
                  {(w.exercise as unknown as { name?: string })?.name}
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
          <NoSessionsEmpty />
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
                    <span className="text-on-surface-variant text-xs">{new Date(s.date).toLocaleDateString()}</span>
                    <ChevronDown size={14} className="text-on-surface-variant/30 group-open:rotate-180 transition-transform duration-200" />
                  </div>
                </summary>
                {s.logs && s.logs.length > 0 && (
                  <div className="px-4 pb-4 pt-1 border-t border-outline-variant/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
                          <th className="text-left py-2 font-normal">Ejercicio</th>
                          <th className="text-center py-2 font-normal">Series × Reps</th>
                          <th className="text-center py-2 font-normal">Peso</th>
                          <th className="text-center py-2 font-normal">RPE</th>
                        </tr>
                      </thead>
                      <tbody className="text-on-surface font-body">
                        {s.logs.map((log) => (
                          <tr key={log.id} className="border-t border-outline-variant/8">
                            <td className="py-2">{(log.exercise as unknown as { name?: string })?.name ?? '—'}</td>
                            <td className="text-center py-2">{log.sets} × {log.reps_per_set}</td>
                            <td className="text-center py-2">{log.weight}<span className="text-primary ml-0.5 text-xs font-bold">kg</span></td>
                            <td className="text-center py-2 text-on-surface-variant">{log.rpe ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {s.notes && <p className="text-on-surface-variant text-xs mt-3 italic">{s.notes}</p>}
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
