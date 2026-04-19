import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import type { Exercise } from '../../types';
import { DEFAULT_EXERCISES, type MovementCategory, type ExerciseStatus, CATEGORY_LABELS } from '../../types';
import { generateProgram } from '../../engine/programGenerator';
import { deriveEngineProfile, generateNoEquipmentProgram } from '../../engine/noEquipmentAdapter';
import Modal from '../Modal';
import ExerciseDetailModal from '../ExerciseDetailModal';
import { getCatalogEntry } from '../../data/exerciseCatalog';
import { Loader2, RefreshCw, Trash2, ChevronDown, Info, Plus } from 'lucide-react';

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
        .eq('id', user.id).single();
      if (!profile) throw new Error('Profile not found');

      const { data: yesExercises } = await supabase.from('exercises').select('*').eq('user_id', user.id).eq('status', 'YES');
      if (!yesExercises || yesExercises.length === 0) throw new Error('No exercises with YES status');

      const { data: wwData } = await supabase.from('working_weights').select('exercise_id, weight, exercise:exercises(name)').eq('user_id', user.id);
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

      const { data: oldProgram } = await supabase.from('programs').select('id, total_days, total_weeks').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const { count: totalSessions } = await supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      const { count: programCount } = await supabase.from('programs').select('id', { count: 'exact', head: true }).eq('user_id', user.id);

      const sessCount = totalSessions ?? 0;
      const hasHistory = sessCount > 0;
      const prevCompleted = oldProgram ? sessCount >= (oldProgram.total_days * (oldProgram.total_weeks ?? 12)) ? 1 : 0 : 0;
      const cycleNumber = Math.max(1, (programCount ?? 1) - 1 + prevCompleted);

      const bw = Number(profile.bodyweight) || 75;
      const ht = Number(profile.height) || 170;
      const bmi = bw / ((ht / 100) ** 2);

      const isNoEq = profile.equipment_access === 'no_equipment';
      const program = isNoEq
        ? generateNoEquipmentProgram(deriveEngineProfile({ experience: profile.training_experience, scheduleDays: profile.schedule_days, sessionMinutes: profile.session_minutes ?? 60, goal: profile.goal }), yesExercises, 1)
        : generateProgram(yesExercises, profile.schedule_days, bw, profile.training_experience, keyLifts.squat > 0 ? keyLifts : undefined, profile.goal, bmi, profile.session_minutes ?? 60, profile.gender ?? 'male', cycleNumber);

      if (hasHistory && !isNoEq) {
        for (const day of program.days) {
          for (const ex of day.exercises) {
            const actualWeight = workingWeightMap.get(ex.exercise_id);
            if (actualWeight !== undefined) { ex.weight = actualWeight; }
            ex.is_calibration = false;
            ex.notes = '';
          }
        }
      }

      if (oldProgram) {
        await supabase.from('program_days').delete().eq('program_id', oldProgram.id);
        await supabase.from('programs').delete().eq('id', oldProgram.id);
      }

      const { data: savedProgram, error: pErr } = await supabase.from('programs').insert({ user_id: user.id, name: program.name, split_type: program.split_type, total_days: program.total_days }).select().single();
      if (pErr || !savedProgram) throw pErr;

      await supabase.from('program_days').insert(program.days.map((d) => ({ program_id: savedProgram.id, day_number: d.day_number, day_name: d.day_name, exercises: d.exercises })));
      localStorage.removeItem(sessionDraftKey(user.id));
      toast.success('Programa actualizado correctamente');
    } catch {
      toast.error('No se pudo regenerar el programa. Intenta de nuevo.');
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
    </div>
  );
}
