import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import type { Exercise } from '../../types';
import { DEFAULT_EXERCISES, type MovementCategory, type ExerciseStatus, CATEGORY_LABELS } from '../../types';
import { generateProgram } from '../../engine/programGenerator';
import { deriveEngineProfile, generateNoEquipmentProgram } from '../../engine/noEquipmentAdapter';
import Modal from '../Modal';
import { NoExercisesEmpty } from '../EmptyState';
import ExerciseDetailModal from '../ExerciseDetailModal';
import { getCatalogEntry } from '../../data/exerciseCatalog';
import {
  ChevronRight, RefreshCw, Loader2, Trash2, Info, AlertTriangle
} from 'lucide-react';

// ─── Animation variants ───────────────────────────────────
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const fadeUp = {
  hidden: { y: 18, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function sessionDraftKey(userId: string) {
  return `session_draft_${userId}`;
}

// ─── Component ────────────────────────────────────────────
export default function LibraryView({ onProgramDeleted }: { onProgramDeleted: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<MovementCategory | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [detailExercise, setDetailExercise] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProgram, setDeletingProgram] = useState(false);

  const fetchExercises = async () => {
    if (!user) return;
    const { data } = await supabase.from('exercises').select('*').eq('user_id', user.id).order('category').order('name');
    if (data) setExercises(data);
    setLoading(false);
  };

  useEffect(() => { fetchExercises(); }, [user]);

  const seedLibrary = async () => {
    if (!user) return;
    setSeeding(true);
    const rows = DEFAULT_EXERCISES.map((e) => ({
      user_id: user.id,
      name: e.name,
      category: e.category,
      status: 'YES' as ExerciseStatus,
    }));
    await supabase.from('exercises').upsert(rows, { onConflict: 'user_id,name' });
    await fetchExercises();
    setSeeding(false);
  };

  const toggleStatus = async (ex: Exercise) => {
    const next: ExerciseStatus = ex.status === 'YES' ? 'SUB' : ex.status === 'SUB' ? 'NO' : 'YES';
    await supabase.from('exercises').update({ status: next }).eq('id', ex.id);
    setExercises(exercises.map((e) => e.id === ex.id ? { ...e, status: next } : e));
  };

  const regenerateProgram = async () => {
    if (!user) return;
    setRegenerating(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('bodyweight, height, training_experience, goal, schedule_days, session_minutes, gender, equipment_access')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data: yesExercises } = await supabase
        .from('exercises')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'YES');

      if (!yesExercises || yesExercises.length === 0) throw new Error('No exercises with YES status');

      const { data: wwData } = await supabase
        .from('working_weights')
        .select('exercise_id, weight, exercise:exercises(name)')
        .eq('user_id', user.id);

      const keyLifts = { squat: 0, bench: 0, deadlift: 0, ohp: 0 };
      const workingWeightMap = new Map<string, number>();
      if (wwData) {
        for (const ww of wwData) {
          const name = (ww.exercise as { name?: string })?.name;
          workingWeightMap.set(ww.exercise_id, Number(ww.weight));
          if (name === 'Barra Back Squat') keyLifts.squat = Number(ww.weight);
          if (name === 'Barra Press de Banca') keyLifts.bench = Number(ww.weight);
          if (name === 'Peso Muerto Convencional') keyLifts.deadlift = Number(ww.weight);
          if (name === 'Barra Press Militar') keyLifts.ohp = Number(ww.weight);
        }
      }

      const { data: oldProgram } = await supabase
        .from('programs')
        .select('id, total_days, total_weeks')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: totalSessions } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: programCount } = await supabase
        .from('programs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const sessCount = totalSessions ?? 0;
      const hasHistory = sessCount > 0;

      const prevCompleted = oldProgram
        ? sessCount >= (oldProgram.total_days * (oldProgram.total_weeks ?? 12)) ? 1 : 0
        : 0;
      const cycleNumber = Math.max(1, (programCount ?? 1) - 1 + prevCompleted);

      const bw = Number(profile.bodyweight) || 75;
      const ht = Number(profile.height) || 170;
      const bmi = bw / ((ht / 100) ** 2);

      const isNoEq = profile.equipment_access === 'no_equipment';
      const program = isNoEq
        ? generateNoEquipmentProgram(
            deriveEngineProfile({
              experience: profile.training_experience,
              scheduleDays: profile.schedule_days,
              sessionMinutes: profile.session_minutes ?? 60,
              goal: profile.goal,
            }),
            yesExercises,
            1
          )
        : generateProgram(
            yesExercises,
            profile.schedule_days,
            bw,
            profile.training_experience,
            keyLifts.squat > 0 ? keyLifts : undefined,
            profile.goal,
            bmi,
            profile.session_minutes ?? 60,
            profile.gender ?? 'male',
            cycleNumber
          );

      if (hasHistory && !isNoEq) {
        for (const day of program.days) {
          for (const ex of day.exercises) {
            const actualWeight = workingWeightMap.get(ex.exercise_id);
            if (actualWeight !== undefined) {
              ex.weight = actualWeight;
            }
            ex.is_calibration = false;
            ex.notes = '';
          }
        }
      }

      if (oldProgram) {
        await supabase.from('program_days').delete().eq('program_id', oldProgram.id);
        await supabase.from('programs').delete().eq('id', oldProgram.id);
      }

      const { data: savedProgram, error: pErr } = await supabase
        .from('programs')
        .insert({
          user_id: user.id,
          name: program.name,
          split_type: program.split_type,
          total_days: program.total_days,
        })
        .select()
        .single();

      if (pErr || !savedProgram) throw pErr;

      const dayRows = program.days.map((d) => ({
        program_id: savedProgram.id,
        day_number: d.day_number,
        day_name: d.day_name,
        exercises: d.exercises,
      }));
      await supabase.from('program_days').insert(dayRows);

      localStorage.removeItem(sessionDraftKey(user.id));

      toast.success('Programa actualizado correctamente');
    } catch (err) {
      console.error('Program regeneration failed:', err);
      toast.error('No se pudo regenerar el programa. Intenta de nuevo.');
    }

    setRegenerating(false);
  };

  const deleteProgram = async (keepWeights: boolean) => {
    if (!user) return;
    setDeletingProgram(true);
    try {
      const { data: prog } = await supabase
        .from('programs')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prog) {
        await supabase.from('program_days').delete().eq('program_id', prog.id);
        await supabase.from('programs').delete().eq('id', prog.id);
      }

      if (!keepWeights) {
        await supabase.from('working_weights').delete().eq('user_id', user.id);
      }

      localStorage.removeItem(sessionDraftKey(user.id));
      setShowDeleteModal(false);
      toast.success('Programa eliminado.');
      onProgramDeleted();
    } catch (err) {
      console.error('Error eliminando programa:', err);
      toast.error('Error al eliminar el programa.');
    }
    setDeletingProgram(false);
  };

  const grouped = Object.entries(CATEGORY_LABELS).map(([cat, label]) => ({
    category: cat as MovementCategory,
    label,
    items: exercises.filter((e) => e.category === cat),
  }));

  const statusColor: Record<ExerciseStatus, string> = {
    YES: 'bg-primary-container/30 text-primary border-primary-container/50',
    SUB: 'bg-secondary-container/40 text-secondary border-secondary-container/60',
    NO: 'bg-error-container/30 text-error border-error-container/50',
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6 max-w-2xl">
      <motion.div variants={fadeUp} className="flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight mb-1 text-on-surface">Ajusta tu Programa</h2>
          <p className="text-on-surface-variant font-body text-sm mb-1">Elige qué ejercicios incluir en tu programa. Toca el estado para cambiarlo:</p>
          <ul className="text-on-surface-variant font-body text-sm space-y-0.5 mb-1">
            <li><span className="text-primary font-bold">YES</span> — incluido en tu programa</li>
            <li><span className="text-on-surface font-bold">SUB</span> — usado como sustituto si falta equipo</li>
            <li><span className="text-on-surface-variant font-bold">NO</span> — excluido del programa</li>
          </ul>
          <p className="text-on-surface-variant font-body text-xs">Una vez que hagas tus cambios, toca <span className="font-bold text-primary">Actualizar Programa</span> al final de la lista para regenerar tu plan.</p>
        </div>
        {exercises.length === 0 && !loading && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={seedLibrary}
            disabled={seeding}
            className="bg-primary-container text-on-primary-container font-headline font-bold px-5 py-2.5 rounded-xl text-sm tracking-tight transition-all disabled:opacity-50"
          >
            {seeding ? 'Cargando...' : 'Cargar Biblioteca'}
          </motion.button>
        )}
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="card-elevated rounded-xl h-16 animate-pulse" />)}
        </div>
      ) : exercises.length === 0 ? (
        <NoExercisesEmpty />
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
          {grouped.filter(g => g.items.length > 0).map((group) => (
            <motion.div key={group.category} variants={itemVariants} className="card-elevated rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === group.category ? null : group.category)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-container-high/50 transition-colors"
              >
                <span className="font-headline font-bold text-lg tracking-tight text-on-surface">{group.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-on-surface-variant text-sm font-body">{group.items.length}</span>
                  <motion.div animate={{ rotate: expanded === group.category ? 90 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronRight size={16} className="text-on-surface-variant/40" />
                  </motion.div>
                </div>
              </button>

              <AnimatePresence>
                {expanded === group.category && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 space-y-1">
                      {group.items.map((ex) => (
                        <div key={ex.id} className="flex items-center justify-between py-2.5 px-3 -mx-1 rounded-lg hover:bg-surface-container-high/40 transition-colors">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-on-surface font-body text-sm truncate">{ex.name}</span>
                            {getCatalogEntry(ex.name) && (
                              <button
                                onClick={() => setDetailExercise(ex.name)}
                                aria-label={`Ver instrucciones de ${ex.name}`}
                                className="shrink-0 p-0.5 rounded-full text-primary/40 hover:text-primary transition-colors"
                              >
                                <Info size={14} />
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => toggleStatus(ex)}
                            aria-label={`Estado de ${ex.name}: ${ex.status}. Toca para cambiar`}
                            className={`shrink-0 text-xs font-headline font-bold px-3 py-1 rounded-full border ${statusColor[ex.status]} transition-all hover:scale-105 active:scale-95`}
                          >
                            {ex.status}
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Regenerate Program Button */}
      {!loading && exercises.length > 0 && (
        <motion.div variants={fadeUp} className="pt-4 pb-8">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={regenerateProgram}
            disabled={regenerating}
            className="w-full bg-primary-container text-on-primary-container font-headline font-bold py-4 rounded-full text-lg tracking-tight flex items-center justify-center gap-3 shadow-lg shadow-primary-container/20 disabled:opacity-40"
          >
            {regenerating ? (
              <><Loader2 size={18} className="animate-spin" /> Regenerando Programa...</>
            ) : (
              <><RefreshCw size={18} /> Actualizar Programa</>
            )}
          </motion.button>
          <p className="text-on-surface-variant text-xs font-body text-center mt-2">
            Regenera tu programa de 12 semanas con los ejercicios activos actuales.
          </p>

          {/* Delete Program Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowDeleteModal(true)}
            disabled={deletingProgram}
            className="w-full mt-3 font-headline font-bold py-3.5 rounded-full text-base tracking-tight flex items-center justify-center gap-2 transition-all border border-error/30 text-error hover:bg-error/8 active:scale-95 disabled:opacity-40"
          >
            <Trash2 size={16} />
            Eliminar Programa Actual
          </motion.button>
        </motion.div>
      )}

      {/* Delete Program Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar Programa"
        description="¿Qué deseas hacer con tu historial de pesos registrados?"
        icon={<AlertTriangle size={20} className="text-error" />}
        size="sm"
        actions={
          <button
            onClick={() => setShowDeleteModal(false)}
            className="w-full py-2.5 rounded-full text-on-surface-variant font-body text-sm hover:bg-surface-container-high/50 transition-colors"
          >
            Cancelar
          </button>
        }
      >
        <div className="space-y-3">
          <button
            onClick={() => deleteProgram(true)}
            disabled={deletingProgram}
            className="w-full text-left p-4 rounded-xl border border-primary/20 bg-primary-container/10 hover:bg-primary-container/20 transition-colors group disabled:opacity-50"
          >
            <p className="font-headline font-bold text-on-surface text-sm mb-0.5 group-hover:text-primary transition-colors">
              Conservar pesos históricos
            </p>
            <p className="text-on-surface-variant text-xs font-body">
              El nuevo programa arrancará con tus cargas actuales. Recomendado si continúas entrenando.
            </p>
          </button>

          <button
            onClick={() => deleteProgram(false)}
            disabled={deletingProgram}
            className="w-full text-left p-4 rounded-xl border border-error/20 bg-error-container/10 hover:bg-error-container/20 transition-colors group disabled:opacity-50"
          >
            <p className="font-headline font-bold text-error text-sm mb-0.5">
              Eliminar todo (incluyendo pesos)
            </p>
            <p className="text-on-surface-variant text-xs font-body">
              Reinicio completo. El siguiente programa estimará pesos desde cero.
            </p>
          </button>

          {deletingProgram && (
            <div className="flex items-center justify-center gap-2 mt-3 text-on-surface-variant/60 text-xs">
              <Loader2 size={14} className="animate-spin" />
              Eliminando...
            </div>
          )}
        </div>
      </Modal>

      {/* Exercise Detail Modal */}
      {detailExercise && (
        <ExerciseDetailModal
          exerciseName={detailExercise}
          onClose={() => setDetailExercise(null)}
        />
      )}

    </motion.div>
  );
}
