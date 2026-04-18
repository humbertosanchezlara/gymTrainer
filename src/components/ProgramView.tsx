import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Program, ProgramDay, ProgramDayExercise } from '../types';
import { BLOCKS } from '../engine/programGenerator';
import { getGymProgressionNote } from '../engine/gymProgressionNotes';
import { ChevronRight, Zap, Flame, Trophy, Battery, TrendingUp } from 'lucide-react';

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { y: 14, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

const BLOCK_ICONS = [Zap, Flame, Trophy, Battery];
const BLOCK_COLORS = [
  'text-primary',
  'text-amber-600',
  'text-rose-500',
  'text-sky-500',
];
const BLOCK_BG = [
  'bg-primary-container/30',
  'bg-amber-100/60',
  'bg-rose-100/60',
  'bg-sky-100/60',
];

const ROLE_BADGES: Record<string, string> = {
  primary: 'bg-primary-container/30 text-primary border-primary-container/50',
  secondary: 'bg-secondary-container/40 text-secondary border-secondary-container/60',
  accessory: 'bg-surface-container-highest/60 text-on-surface-variant border-outline-variant/20',
};

const ROLE_LABELS: Record<string, string> = {
  primary: 'principal',
  secondary: 'secundario',
  accessory: 'accesorio',
};

export default function ProgramView() {
  const { user } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);

  useEffect(() => {
    if (!user) return;

    // Fetch current week from sessions (max week_num completed)
    supabase
      .from('sessions')
      .select('week_num')
      .eq('user_id', user.id)
      .order('week_num', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data: sessionData }) => {
        if (sessionData?.week_num) setCurrentWeek(sessionData.week_num);
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
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!program) {
    return (
      <motion.div variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0 }} className="max-w-2xl">
        <motion.div variants={fadeUp} className="glass-panel rounded-xl p-12 text-center shadow-xl shadow-on-surface/3">
          <h2 className="text-3xl font-headline font-extrabold mb-3 text-on-surface">Aún no hay programa</h2>
          <p className="text-on-surface-variant font-body">Completa el onboarding para generar tu primer programa de entrenamiento.</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-8 max-w-3xl">
      {/* Program Header */}
      <motion.div variants={fadeUp}>
        <h2 className="text-4xl font-headline font-extrabold tracking-tight mb-1 text-on-surface">{program.name}</h2>
        <p className="text-on-surface-variant font-body text-sm">{program.total_weeks} semanas · {program.total_days} días/semana · Periodización por bloques</p>
      </motion.div>

      {/* Block Overview */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {BLOCKS.map((block, i) => {
          const Icon = BLOCK_ICONS[i];
          return (
            <div key={block.name} className={`card-elevated rounded-xl p-4 group hover:shadow-md transition-shadow`}>
              <div className={`flex items-center gap-2 mb-2 ${BLOCK_COLORS[i]}`}>
                <div className={`w-7 h-7 rounded-full ${BLOCK_BG[i]} flex items-center justify-center`}>
                  <Icon size={14} />
                </div>
                <span className="font-headline font-bold text-sm">{block.name}</span>
              </div>
              <div className="text-on-surface-variant/60 text-xs font-body space-y-0.5">
                <div>Sem {block.weeks[0]}–{block.weeks[block.weeks.length - 1]}</div>
                <div>{block.repsMin}–{block.repsMax} reps</div>
                <div>RPE {block.rpeMin}–{block.rpeMax}</div>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Training Days */}
      <motion.div variants={fadeUp} className="space-y-3">
        <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">Rutina Semanal</h3>

        {days.map((day) => {
          const isExpanded = expandedDay === day.day_number;
          const exercises = (day.exercises || []) as ProgramDayExercise[];

          return (
            <motion.div
              key={day.id}
              variants={fadeUp}
              className="card-elevated rounded-xl overflow-hidden"
            >
              {/* Day Header */}
              <button
                onClick={() => setExpandedDay(isExpanded ? null : day.day_number)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-container-high/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-primary font-headline font-bold text-sm w-12">
                    Día {day.day_number}
                  </span>
                  <span className="font-headline font-bold text-lg tracking-tight text-on-surface">{day.day_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-on-surface-variant/40 text-xs font-body">{exercises.length} ejercicios</span>
                  <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronRight size={16} className="text-on-surface-variant/40" />
                  </motion.div>
                </div>
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5">
                      {/* Progression note for current week */}
                      <div className="flex items-start gap-2 mb-4 bg-primary-container/15 border border-primary-container/30 rounded-xl px-4 py-3">
                        <TrendingUp size={14} className="text-primary mt-0.5 shrink-0" />
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary block mb-0.5">
                            Semana {currentWeek} — Foco de progresión
                          </span>
                          <p className="text-on-surface-variant text-xs font-body leading-relaxed">
                            {getGymProgressionNote(day.day_name, currentWeek)}
                          </p>
                        </div>
                      </div>

                      {/* Exercise table */}
                      <div className="bg-surface-container-high/30 rounded-xl border border-outline-variant/10 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-on-surface-variant/50 text-[10px] font-bold uppercase tracking-widest border-b border-outline-variant/10">
                              <th className="text-left py-3 px-4 font-normal">Ejercicio</th>
                              <th className="text-center py-3 px-2 font-normal hidden md:table-cell">Rol</th>
                              <th className="text-center py-3 px-2 font-normal">Series</th>
                              <th className="text-center py-3 px-2 font-normal">Reps</th>
                              <th className="text-center py-3 px-2 font-normal">Peso</th>
                              <th className="text-center py-3 px-2 font-normal">RPE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {exercises.map((ex, i) => (
                              <tr key={i} className="border-t border-outline-variant/8 hover:bg-surface-container-highest/30 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-on-surface font-body">{ex.exercise_name}</span>
                                    {ex.is_calibration && (
                                      <span className="text-[8px] text-amber-600/70 font-bold uppercase tracking-widest">cal</span>
                                    )}
                                    {ex.notes?.includes('c/lado') && (
                                      <span className="text-[8px] bg-secondary-container/40 text-secondary font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full">c/lado</span>
                                    )}
                                  </div>
                                  {/* Rest time chip */}
                                  {(() => {
                                    const m = ex.notes?.match(/(\d+)s descanso/);
                                    return m ? (
                                      <span className="text-[10px] text-on-surface-variant/50 font-body mt-0.5 block">{m[1]}s descanso</span>
                                    ) : null;
                                  })()}
                                </td>
                                <td className="text-center py-3 px-2 hidden md:table-cell">
                                  <span className={`text-[10px] font-headline font-bold px-2 py-0.5 rounded-full border ${ROLE_BADGES[ex.role] || ROLE_BADGES.accessory}`}>
                                    {ROLE_LABELS[ex.role] || ex.role}
                                  </span>
                                </td>
                                <td className="text-center py-3 px-2 text-on-surface font-body">{ex.sets}</td>
                                <td className="text-center py-3 px-2 text-on-surface font-body">
                                  {ex.notes?.startsWith('⏱')
                                    ? `${ex.reps_min}s`
                                    : ex.reps_min === ex.reps_max
                                    ? ex.reps_min
                                    : `${ex.reps_min}–${ex.reps_max}`}
                                </td>
                                <td className="text-center py-3 px-2">
                                  {ex.weight > 0 ? (
                                    <>
                                      <span className="text-on-surface font-headline font-bold">{ex.weight}</span>
                                      <span className="text-primary text-xs font-bold ml-0.5">kg</span>
                                    </>
                                  ) : (
                                    <span className="text-on-surface-variant/70 text-[10px] font-headline font-bold uppercase tracking-widest">BW / Banda</span>
                                  )}
                                </td>
                                <td className="text-center py-3 px-2 text-on-surface-variant font-body">{ex.rpe}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Notes */}
                      {day.day_number === 1 && (
                        <p className="text-on-surface-variant/50 text-xs mt-3 italic font-body">
                          La semana 1 es de calibración — ajusta los pesos después de tu primera sesión si algo se siente muy ligero o muy pesado.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Periodization info */}
      <motion.div variants={fadeUp} className="card-elevated rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Protocolo de Progresión</h3>
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary-container/20 px-2.5 py-1 rounded-full">
            Sem {currentWeek} / 12
          </span>
        </div>
        <div className="space-y-2 text-sm text-on-surface-variant font-body">
          <p>• <span className="text-on-surface font-medium">Compuestos superiores:</span> +2.5 kg al completar el tope de reps al RPE objetivo por 2 sesiones</p>
          <p>• <span className="text-on-surface font-medium">Compuestos inferiores:</span> +5 kg usando el mismo criterio</p>
          <p>• <span className="text-on-surface font-medium">Accesorios:</span> Primero agrega reps, luego peso</p>
          <p>• <span className="text-on-surface font-medium">Isométricos / tiempo:</span> Suma 5s cada semana que llegues al tiempo objetivo</p>
          <p>• <span className="text-on-surface font-medium">Unilaterales:</span> Iguala el lado más débil antes de subir carga</p>
          <p>• <span className="text-on-surface font-medium">Deload:</span> Auto-programado en la Semana 12</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
