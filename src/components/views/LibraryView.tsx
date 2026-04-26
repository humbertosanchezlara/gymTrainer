import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import type { Exercise } from '../../types';
import { DEFAULT_EXERCISES, type MovementCategory, type ExerciseStatus, CATEGORY_LABELS } from '../../types';
import { estimateWeight } from '../../engine/weightEstimator';
import Modal from '../Modal';
import ExerciseDetailModal from '../ExerciseDetailModal';
import { getCatalogEntry } from '../../data/exerciseCatalog';
import { Loader2, RefreshCw, Trash2, ChevronDown, Info, Plus, Sparkles } from 'lucide-react';
import AddExerciseModal from '../AddExerciseModal';

function sessionDraftKey(userId: string) {
  return `session_draft_${userId}`;
}

const STATUS_STYLES: Record<ExerciseStatus, { bg: string; color: string }> = {
  YES: { bg: 'var(--ink)', color: 'var(--paper)' },
  SUB: { bg: 'var(--paper-2)', color: 'var(--ink)' },
  NO:  { bg: 'transparent', color: 'var(--muted)' },
};

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
  const [showAddExercise, setShowAddExercise] = useState(false);

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
      const { data: program } = await supabase
        .from('programs').select('id')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!program) throw new Error('No program found');

      const { data: allDays } = await supabase
        .from('program_days').select('id, exercises')
        .eq('program_id', program.id);
      if (!allDays || allDays.length === 0) throw new Error('No program days found');

      const { data: profile } = await supabase
        .from('profiles').select('bodyweight, training_experience, gender')
        .eq('id', user.id).single();

      const { data: allExercises } = await supabase
        .from('exercises').select('id, name, category, status')
        .eq('user_id', user.id);

      const exerciseMap = new Map((allExercises ?? []).map(e => [e.id, e]));

      // Available substitutes per category (YES only — SUB is fallback for missing equipment, not for swap)
      const yesByCategory = new Map<string, Array<{ id: string; name: string }>>();
      for (const ex of (allExercises ?? [])) {
        if (ex.status === 'YES') {
          if (!yesByCategory.has(ex.category)) yesByCategory.set(ex.category, []);
          yesByCategory.get(ex.category)!.push({ id: ex.id, name: ex.name });
        }
      }

      let swapCount = 0;

      for (const day of allDays) {
        const exercises = day.exercises as Array<Record<string, unknown>>;
        const usedIds = new Set(exercises.map(e => e.exercise_id as string));
        let changed = false;

        const updated = exercises.map(ex => {
          const exId = ex.exercise_id as string;
          const exInfo = exerciseMap.get(exId);

          if (!exInfo || exInfo.status === 'NO') {
            const category = (ex.category as string) ?? exInfo?.category;
            const candidates = yesByCategory.get(category) ?? [];
            const substitute = candidates.find(s => !usedIds.has(s.id));
            if (substitute) {
              usedIds.delete(exId);
              usedIds.add(substitute.id);
              changed = true;
              swapCount++;
              const newWeight = Math.round(
                estimateWeight(substitute.name, Number(profile?.bodyweight) || 75, profile?.training_experience ?? 'intermediate', profile?.gender ?? 'male') / 2.5
              ) * 2.5;
              return { ...ex, exercise_id: substitute.id, exercise_name: substitute.name, name: substitute.name, weight: newWeight };
            }
          }
          return ex;
        });

        if (changed) {
          await supabase.from('program_days').update({ exercises: updated }).eq('id', day.id);
        }
      }

      localStorage.removeItem(sessionDraftKey(user.id));
      if (swapCount > 0) {
        toast.success(`${swapCount} ejercicio${swapCount > 1 ? 's sustituidos' : ' sustituido'} en tu programa`);
      } else {
        toast.success('Tu programa ya está al día con los cambios');
      }
    } catch {
      toast.error('No se pudo actualizar el programa. Intenta de nuevo.');
    }
    setRegenerating(false);
  };

  const deleteProgram = async (keepWeights: boolean) => {
    if (!user) return;
    setDeletingProgram(true);
    try {
      const { data: prog } = await supabase.from('programs').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (prog) {
        await supabase.from('program_days').delete().eq('program_id', prog.id);
        await supabase.from('programs').delete().eq('id', prog.id);
      }
      if (!keepWeights) await supabase.from('working_weights').delete().eq('user_id', user.id);
      localStorage.removeItem(sessionDraftKey(user.id));
      setShowDeleteModal(false);
      toast.success('Programa eliminado.');
      onProgramDeleted();
    } catch {
      toast.error('Error al eliminar el programa.');
    }
    setDeletingProgram(false);
  };

  const grouped = Object.entries(CATEGORY_LABELS).map(([cat, label]) => ({
    category: cat as MovementCategory,
    label,
    items: exercises.filter((e) => e.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="forge-fade" style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 800 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--rule)', paddingBottom: 16 }}>
        <div>
          <div className="uc" style={{ color: 'var(--muted)' }}>Ejercicios</div>
          <h1 className="d-l" style={{ margin: 0, marginTop: 8 }}>Tu biblioteca</h1>
        </div>
        {exercises.length === 0 && !loading && (
          <button onClick={seedLibrary} disabled={seeding} className="btn btn-ink" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {seeding ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Plus size={16}/>}
            Cargar biblioteca
          </button>
        )}
      </div>

      {/* Add exercise banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: 'var(--paper-2)', border: '1px solid var(--rule)', borderRadius: 16, padding: '24px 28px' }}>
        <div>
          <div className="d-s" style={{ fontWeight: 700, marginBottom: 4 }}>¿No encuentras un ejercicio?</div>
          <div className="caption" style={{ color: 'var(--muted)' }}>Añade cualquier máquina o movimiento nuevo a la biblioteca.</div>
        </div>
        <button
          onClick={() => setShowAddExercise(true)}
          className="btn btn-ink"
          style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <Sparkles size={15} />
          Añadir ejercicio
        </button>
      </div>

      {/* Status legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { s: 'YES', desc: 'Incluido en tu programa' },
          { s: 'SUB', desc: 'Sustituto (si falta equipo)' },
          { s: 'NO',  desc: 'Excluido del programa' },
        ].map(x => (
          <div key={x.s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: STATUS_STYLES[x.s as ExerciseStatus].bg, color: STATUS_STYLES[x.s as ExerciseStatus].color, padding: '3px 10px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, border: '1px solid var(--rule)' }}>{x.s}</span>
            <span className="caption" style={{ color: 'var(--muted)' }}>{x.desc}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--muted)' }} />
        </div>
      ) : exercises.length === 0 ? (
        <div style={{ border: '1px dashed var(--rule)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <div className="body" style={{ color: 'var(--muted)' }}>No hay ejercicios en tu biblioteca.</div>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
          {grouped.map((group, gi) => {
            const isOpen = expanded === group.category;
            return (
              <div key={group.category}>
                <button
                  onClick={() => setExpanded(isOpen ? null : group.category)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderTop: gi === 0 ? 'none' : '1px solid var(--rule)', background: 'transparent', border: 'none', borderTopColor: 'var(--rule)', borderTopWidth: gi === 0 ? 0 : 1, borderTopStyle: 'solid', cursor: 'pointer', fontFamily: 'var(--sans)', color: 'var(--ink)', textAlign: 'left' }}
                >
                  <span className="d-s" style={{ fontWeight: 600 }}>{group.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="mono caption" style={{ color: 'var(--muted)' }}>{group.items.length}</span>
                    <ChevronDown size={16} style={{ color: 'var(--muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                  </div>
                </button>
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
                    {group.items.map((ex, ei) => {
                      const st = STATUS_STYLES[ex.status];
                      return (
                        <div key={ex.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderTop: ei === 0 ? 'none' : '1px solid var(--rule)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="body" style={{ fontWeight: 500 }}>{ex.name}</span>
                            {getCatalogEntry(ex.name) && (
                              <button onClick={() => setDetailExercise(ex.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}>
                                <Info size={14}/>
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => toggleStatus(ex)}
                            style={{ background: st.bg, color: st.color, border: '1px solid var(--rule)', padding: '4px 12px', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'background .15s' }}
                          >
                            {ex.status}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && exercises.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 32 }}>
          <button onClick={regenerateProgram} disabled={regenerating} className="btn btn-ink btn-lg" style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 10 }}>
            {regenerating ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : <RefreshCw size={18}/>}
            {regenerating ? 'Regenerando...' : 'Actualizar programa'}
          </button>
          <button onClick={() => setShowDeleteModal(true)} disabled={deletingProgram} className="btn btn-ghost btn-lg" style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, color: '#ba1a1a', borderColor: 'rgba(186,26,26,0.3)' }}>
            <Trash2 size={16}/> Eliminar programa actual
          </button>
        </div>
      )}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar programa"
        description="¿Qué deseas hacer con tu historial de pesos?"
        size="sm"
        actions={
          <button onClick={() => setShowDeleteModal(false)} className="btn btn-ghost">Cancelar</button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => deleteProgram(true)} disabled={deletingProgram} className="btn btn-ink btn-sq" style={{ justifyContent: 'flex-start', borderRadius: 8, padding: '16px 20px', textAlign: 'left', display: 'block' }}>
            <div style={{ fontWeight: 700 }}>Conservar pesos históricos</div>
            <div style={{ fontSize: 13, opacity: .7, marginTop: 4, fontWeight: 400 }}>Recomendado si continúas entrenando.</div>
          </button>
          <button onClick={() => deleteProgram(false)} disabled={deletingProgram} style={{ background: 'transparent', border: '1px solid rgba(186,26,26,0.3)', color: '#ba1a1a', padding: '16px 20px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--sans)', textAlign: 'left' }}>
            <div style={{ fontWeight: 700 }}>Eliminar todo (incluyendo pesos)</div>
            <div style={{ fontSize: 13, opacity: .7, marginTop: 4, fontWeight: 400 }}>Reinicio completo desde cero.</div>
          </button>
          {deletingProgram && <div className="caption" style={{ textAlign: 'center', color: 'var(--muted)' }}>Eliminando...</div>}
        </div>
      </Modal>

      {detailExercise && <ExerciseDetailModal exerciseName={detailExercise} onClose={() => setDetailExercise(null)} />}

      <AddExerciseModal
        isOpen={showAddExercise}
        onClose={() => setShowAddExercise(false)}
        onExerciseAdded={() => fetchExercises()}
      />
    </div>
  );
}
