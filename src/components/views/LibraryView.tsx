import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import type { Exercise } from '../../types';
import { DEFAULT_EXERCISES, type MovementCategory, CATEGORY_LABELS } from '../../types';
import { estimateWeight } from '../../engine/weightEstimator';
import AddExerciseModal from '../AddExerciseModal';
import ExerciseDetailModal from '../ExerciseDetailModal';
import { getCatalogEntry } from '../../data/exerciseCatalog';
import { Loader2, Search, X, Plus, Trash2, ArrowLeft, Check, RotateCcw, Settings, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { isExerciseEnabled, normalizeProgramDayExercise } from '../../utils/programState';

type Screen = 'main' | 'excluded' | 'confirm';

function sessionDraftKey(userId: string) {
  return `session_draft_${userId}`;
}

// iOS-style toggle
function Toggle({ on, onChange }: { on: boolean; onChange: (e: React.MouseEvent) => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 44, height: 26, borderRadius: 999,
        background: on ? 'var(--ink)' : '#C8C2B6',
        position: 'relative', flexShrink: 0, cursor: 'pointer',
        transition: 'background .15s',
      }}
    >
      <div style={{
        position: 'absolute',
        top: 2,
        left: on ? 18 : 2,
        width: 22, height: 22,
        borderRadius: '50%',
        background: 'var(--paper)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
        transition: 'left .18s cubic-bezier(.2,.8,.2,1)',
      }} />
    </div>
  );
}

interface PendingEntry {
  exercise: Exercise;
  willBeEnabled: boolean;
}

export default function LibraryView({ onProgramDeleted }: { onProgramDeleted: () => void }) {
  const { user } = useAuth();
  const toast = useToast();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [deletingProgram, setDeletingProgram] = useState(false);
  const [confirmDone, setConfirmDone] = useState(false);

  // Sub-screen navigation
  const [screen, setScreen] = useState<Screen>('main');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsConfirming, setSettingsConfirming] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [detailExercise, setDetailExercise] = useState<string | null>(null);

  // UI state
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['QUAD_DOMINANT']));
  const [query, setQuery] = useState('');

  // Local toggle state: maps exercise.id → enabled (null = use DB state)
  const [localEnabled, setLocalEnabled] = useState<Record<string, boolean>>({});

  const fetchExercises = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('exercises').select('*')
      .eq('user_id', user.id).order('category').order('name');
    if (data) {
      setExercises(data);
      // Sync local state from DB (reset pending changes)
      const init: Record<string, boolean> = {};
      data.forEach((ex: Exercise) => { init[ex.id] = isExerciseEnabled(ex.status); });
      setLocalEnabled(init);
    }
    setLoading(false);
  };

  useEffect(() => { fetchExercises(); }, [user]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const grouped = useMemo(() =>
    Object.entries(CATEGORY_LABELS).map(([cat, label]) => ({
      category: cat as MovementCategory,
      label,
      items: exercises.filter((e) => e.category === cat),
    })).filter(g => g.items.length > 0),
    [exercises]
  );

  const isEnabled = (ex: Exercise) => localEnabled[ex.id] ?? isExerciseEnabled(ex.status);

  const totals = useMemo(() => {
    let total = 0, on = 0;
    const byCat: Record<string, { total: number; on: number }> = {};
    exercises.forEach(ex => {
      total++;
      const active = isEnabled(ex);
      if (active) on++;
      if (!byCat[ex.category]) byCat[ex.category] = { total: 0, on: 0 };
      byCat[ex.category].total++;
      if (active) byCat[ex.category].on++;
    });
    return { total, on, off: total - on, byCat };
  }, [exercises, localEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingChanges = useMemo((): PendingEntry[] => {
    return exercises
      .filter(ex => {
        const dbOn = isExerciseEnabled(ex.status);
        const localOn = localEnabled[ex.id] ?? dbOn;
        return localOn !== dbOn;
      })
      .map(ex => ({ exercise: ex, willBeEnabled: localEnabled[ex.id] }));
  }, [exercises, localEnabled]);

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return grouped;
    const q = query.toLowerCase();
    return grouped
      .map(g => ({ ...g, items: g.items.filter(e => e.name.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0);
  }, [grouped, query]);

  const effectiveExpanded = query.trim()
    ? new Set(filteredGroups.map(g => g.category))
    : expanded;

  // ── Actions ───────────────────────────────────────────────────────────────
  const toggleExercise = (ex: Exercise) => {
    setLocalEnabled(prev => {
      const current = prev[ex.id] ?? isExerciseEnabled(ex.status);
      return { ...prev, [ex.id]: !current };
    });
  };

  const toggleCat = (cat: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const seedLibrary = async () => {
    if (!user) return;
    setSeeding(true);
    const rows = DEFAULT_EXERCISES.map((e) => ({
      user_id: user.id, name: e.name, category: e.category, status: 'YES' as const,
    }));
    await supabase.from('exercises').upsert(rows, { onConflict: 'user_id,name' });
    await fetchExercises();
    setSeeding(false);
  };

  const commitChanges = async () => {
    if (!user || pendingChanges.length === 0) return;
    setRegenerating(true);
    try {
      // 1. Persist status changes to DB
      for (const { exercise, willBeEnabled } of pendingChanges) {
        await supabase.from('exercises').update({ status: willBeEnabled ? 'YES' : 'NO' }).eq('id', exercise.id);
      }

      // 2. Refresh exercises
      const { data: allExercises } = await supabase
        .from('exercises').select('*').eq('user_id', user.id);

      // 3. Swap out newly-excluded exercises in program days
      const { data: program } = await supabase
        .from('programs').select('id')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (program && allExercises) {
        const exerciseMap = new Map(allExercises.map((e: Exercise) => [e.id, e]));
        const yesByCategory = new Map<string, Array<{ id: string; name: string }>>();
        for (const ex of allExercises) {
          if (isExerciseEnabled(ex.status)) {
            if (!yesByCategory.has(ex.category)) yesByCategory.set(ex.category, []);
            yesByCategory.get(ex.category)!.push({ id: ex.id, name: ex.name });
          }
        }

        const { data: profile } = await supabase
          .from('profiles').select('bodyweight, training_experience, gender')
          .eq('id', user.id).single();

        const { data: allDays } = await supabase
          .from('program_days').select('id, exercises').eq('program_id', program.id);

        if (allDays) {
          for (const day of allDays) {
            const dayExercises = (Array.isArray(day.exercises) ? day.exercises : []).map((exercise) =>
              normalizeProgramDayExercise(exercise as Record<string, unknown>)
            );
            const usedIds = new Set(dayExercises.map((exercise) => exercise.exercise_id));
            let changed = false;

            const updated = dayExercises.flatMap(ex => {
              const exId = ex.exercise_id;
              const exInfo = exerciseMap.get(exId);
              if (!exInfo || !isExerciseEnabled(exInfo.status)) {
                const category = ex.category || exInfo?.category;
                const candidates = category ? (yesByCategory.get(category) ?? []) : [];
                const substitute = candidates.find(s => !usedIds.has(s.id));
                if (substitute) {
                  usedIds.delete(exId);
                  usedIds.add(substitute.id);
                  changed = true;
                  const newWeight = Math.round(
                    estimateWeight(substitute.name, Number(profile?.bodyweight) || 75, profile?.training_experience ?? 'intermediate', profile?.gender ?? 'male') / 2.5
                  ) * 2.5;
                  return [{ ...ex, exercise_id: substitute.id, exercise_name: substitute.name, weight: newWeight }];
                }
                changed = true;
                usedIds.delete(exId);
                return [];
              }
              return [ex];
            });

            if (changed) {
              await supabase.from('program_days').update({ exercises: updated }).eq('id', day.id);
            }
          }
          localStorage.removeItem(sessionDraftKey(user.id));
        }
      }

      // 4. Refresh local state
      if (allExercises) {
        setExercises(allExercises);
        const init: Record<string, boolean> = {};
        allExercises.forEach((ex: Exercise) => { init[ex.id] = isExerciseEnabled(ex.status); });
        setLocalEnabled(init);
      }

      setConfirmDone(true);
    } catch {
      toast.error('Error al aplicar los cambios. Intenta de nuevo.');
      setRegenerating(false);
    }
    setRegenerating(false);
  };

  const deleteProgram = async () => {
    if (!user) return;
    setDeletingProgram(true);
    try {
      const { data: prog } = await supabase.from('programs').select('id')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (prog) {
        await supabase.from('program_days').delete().eq('program_id', prog.id);
        await supabase.from('programs').delete().eq('id', prog.id);
      }
      localStorage.removeItem(sessionDraftKey(user.id));
      setShowSettings(false);
      setSettingsConfirming(false);
      toast.success('Programa eliminado.');
      onProgramDeleted();
    } catch {
      toast.error('Error al eliminar el programa.');
    }
    setDeletingProgram(false);
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const pct = totals.total > 0 ? Math.round((totals.on / totals.total) * 100) : 0;

  // ── Main screen ───────────────────────────────────────────────────────────
  const renderMain = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ paddingBottom: 20, borderBottom: '1px solid var(--rule)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              Ejercicios
            </div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              Tu biblioteca
            </h1>
          </div>
          <button
            onClick={() => { setSettingsConfirming(false); setShowSettings(true); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 6, marginTop: 4, borderRadius: 8 }}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Health summary card */}
        <div style={{
          background: 'var(--paper-2)', borderRadius: 18, padding: '18px 20px 16px',
          border: '1px solid var(--rule)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {totals.on}
                <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 24 }}>/{totals.total}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, fontWeight: 500 }}>
                ejercicios disponibles
              </div>
            </div>
            <button
              onClick={() => setScreen('excluded')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right', fontFamily: 'var(--sans)', padding: 0 }}
            >
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Excluidos</div>
              <div style={{ fontSize: 20, fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', color: 'var(--ink)' }}>
                {totals.off}
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 3l5 5-5 5"/></svg>
              </div>
            </button>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--rule)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--ink)', transition: 'width .25s' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
            {pct}% de tu biblioteca activa
          </div>
        </div>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--paper-2)', borderRadius: 12, border: '1px solid var(--rule)', padding: '10px 14px',
        }}>
          <Search size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar en tu biblioteca"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--muted)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Section header + Add button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--muted)', textTransform: 'uppercase' }}>
            Categorías
          </div>
          {exercises.length === 0 && !loading ? (
            <button onClick={seedLibrary} disabled={seeding} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 500, color: 'var(--ink)', cursor: 'pointer',
              background: 'none', border: 'none', fontFamily: 'var(--sans)', padding: '4px 8px', borderRadius: 8,
            }}>
              {seeding ? <Loader2 size={13} style={{ animation: 'lib-spin 0.8s linear infinite' }} /> : <Plus size={13} />}
              Cargar biblioteca
            </button>
          ) : (
            <button onClick={() => setShowAddExercise(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 500, color: 'var(--ink)', cursor: 'pointer',
              background: 'none', border: 'none', fontFamily: 'var(--sans)', padding: '4px 8px', borderRadius: 8,
            }}>
              <Plus size={13} /> Añadir ejercicio
            </button>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160 }}>
            <Loader2 size={24} style={{ animation: 'lib-spin 0.8s linear infinite', color: 'var(--muted)' }} />
          </div>
        )}

        {/* Empty state */}
        {!loading && exercises.length === 0 && (
          <div style={{ border: '1px dashed var(--rule)', borderRadius: 14, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>
              Tu biblioteca está vacía. Carga los ejercicios predeterminados para empezar.
            </div>
          </div>
        )}

        {/* No search results */}
        {!loading && exercises.length > 0 && filteredGroups.length === 0 && (
          <div style={{ background: 'var(--paper-2)', border: '1px solid var(--rule)', borderRadius: 14, padding: '28px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Sin resultados para "{query}"
          </div>
        )}

        {/* Category cards */}
        {filteredGroups.map(group => {
          const isOpen = effectiveExpanded.has(group.category);
          const catCounts = totals.byCat[group.category] ?? { total: group.items.length, on: group.items.length };
          const catPct = catCounts.total > 0 ? catCounts.on / catCounts.total : 1;

          return (
            <div key={group.category} style={{
              background: 'var(--paper-2)', borderRadius: 16,
              border: '1px solid var(--rule)', overflow: 'hidden',
            }}>
              {/* Category header */}
              <button
                onClick={() => toggleCat(group.category)}
                style={{
                  width: '100%', padding: '14px 16px 12px', cursor: 'pointer',
                  background: 'none', border: 'none', fontFamily: 'var(--sans)', color: 'var(--ink)', textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{group.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {catCounts.on}/{catCounts.total}
                    </span>
                    {isOpen ? <ChevronUp size={13} style={{ opacity: 0.5 }} /> : <ChevronDown size={13} style={{ opacity: 0.5 }} />}
                  </div>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: 'var(--rule)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${catPct * 100}%`, height: '100%',
                    background: 'var(--ink)', transition: 'width .2s',
                  }} />
                </div>
              </button>

              {/* Exercise rows */}
              {isOpen && group.items.map(ex => {
                const on = isEnabled(ex);
                const changed = isEnabled(ex) !== isExerciseEnabled(ex.status);
                const hasCatalog = !!getCatalogEntry(ex.name);
                return (
                  <div
                    key={ex.id}
                    className="lib-toggle-row"
                    onClick={() => toggleExercise(ex)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderTop: '1px solid var(--rule)',
                      cursor: 'pointer',
                      background: changed ? 'rgba(226,107,69,0.07)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: 14, color: on ? 'var(--ink)' : 'var(--muted)',
                        textDecoration: on ? 'none' : 'line-through',
                        textDecorationColor: 'var(--rule)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {ex.name}
                      </span>
                      {changed && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E26B45', flexShrink: 0 }} />
                      )}
                      {hasCatalog && (
                        <button
                          onClick={e => { e.stopPropagation(); setDetailExercise(ex.name); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2, flexShrink: 0 }}
                        >
                          <Info size={13} />
                        </button>
                      )}
                    </div>
                    <Toggle on={on} onChange={e => { e.stopPropagation(); toggleExercise(ex); }} />
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Bottom spacer for pending pill */}
        {pendingChanges.length > 0 && <div style={{ height: 72 }} />}
      </div>

      {/* Pending changes pill */}
      {pendingChanges.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
          left: 0, right: 0, zIndex: 99,
          padding: '12px 16px 4px',
          background: 'linear-gradient(to top, var(--paper) 60%, transparent)',
          pointerEvents: 'none',
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto', pointerEvents: 'auto' }}>
            <button
              onClick={() => { setConfirmDone(false); setScreen('confirm'); }}
              style={{
                width: '100%', background: 'var(--ink)', borderRadius: 999,
                padding: '10px 14px 10px 18px', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                color: 'var(--paper)', fontFamily: 'var(--sans)',
                boxShadow: '0 8px 24px -8px rgba(0,0,0,0.35)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E26B45', boxShadow: '0 0 0 4px rgba(226,107,69,0.25)', flexShrink: 0 }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
                    {pendingChanges.length} {pendingChanges.length === 1 ? 'cambio pendiente' : 'cambios pendientes'}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.65, marginTop: 1 }}>
                    Toca para actualizar tu programa
                  </div>
                </div>
              </div>
              <div style={{
                padding: '7px 14px', borderRadius: 999, background: 'var(--paper)', color: 'var(--ink)',
                fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
              }}>
                <RotateCcw size={12} /> Actualizar
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Excluded screen ────────────────────────────────────────────────────────
  const renderExcluded = () => {
    const groups = grouped.map(g => ({
      ...g,
      items: g.items.filter(ex => !isEnabled(ex)),
    })).filter(g => g.items.length > 0);
    const total = groups.reduce((s, g) => s + g.items.length, 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Header */}
        <div style={{ paddingBottom: 20, borderBottom: '1px solid var(--rule)' }}>
          <button
            onClick={() => setScreen('main')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'var(--sans)', color: 'var(--muted)', fontSize: 14,
              fontWeight: 500, padding: 0, marginBottom: 14,
            }}
          >
            <ArrowLeft size={16} /> Biblioteca
          </button>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Ejercicios · Excluidos
          </div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em' }}>
            {total} excluidos
          </h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
            Estos ejercicios no se incluyen al generar tu programa.
          </div>
        </div>

        <div style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {total === 0 && (
            <div style={{ background: 'var(--paper-2)', border: '1px solid var(--rule)', borderRadius: 16, padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
              No hay ejercicios excluidos.
            </div>
          )}
          {groups.map(g => (
            <div key={g.category} style={{ background: 'var(--paper-2)', borderRadius: 16, border: '1px solid var(--rule)', overflow: 'hidden' }}>
              <div style={{ padding: '13px 16px', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                {g.label} · {g.items.length}
              </div>
              {g.items.map(ex => (
                <div key={ex.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderTop: '1px solid var(--rule)' }}>
                  <span style={{ fontSize: 14, color: 'var(--muted)', textDecoration: 'line-through', textDecorationColor: 'var(--rule)' }}>
                    {ex.name}
                  </span>
                  <button
                    onClick={() => setLocalEnabled(p => ({ ...p, [ex.id]: true }))}
                    style={{
                      padding: '6px 14px', borderRadius: 999, border: '1px solid var(--rule)',
                      fontSize: 12, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer',
                      background: 'var(--paper)', fontFamily: 'var(--sans)',
                    }}
                  >
                    Restaurar
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Confirm screen ─────────────────────────────────────────────────────────
  const renderConfirm = () => {
    const turnedOff = pendingChanges.filter(p => !p.willBeEnabled);
    const turnedOn  = pendingChanges.filter(p => p.willBeEnabled);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: '60vh' }}>
        {/* Header */}
        <div style={{ paddingBottom: 20, borderBottom: '1px solid var(--rule)' }}>
          <button
            onClick={() => setScreen('main')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'var(--sans)', color: 'var(--muted)', fontSize: 14,
              fontWeight: 500, padding: 0, marginBottom: 14,
            }}
          >
            <ArrowLeft size={16} /> Atrás
          </button>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Actualizar programa
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em' }}>
            {confirmDone ? '¡Listo!' : `${pendingChanges.length} ${pendingChanges.length === 1 ? 'cambio' : 'cambios'}`}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.45 }}>
            {confirmDone
              ? 'Tu programa se regeneró con los ejercicios actualizados.'
              : 'Forge regenerará tu programa aplicando estos cambios.'}
          </div>
        </div>

        <div style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          {!confirmDone && turnedOff.length > 0 && (
            <div style={{ background: 'var(--paper-2)', borderRadius: 16, border: '1px solid var(--rule)', overflow: 'hidden' }}>
              <div style={{ padding: '13px 16px', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: '#C0392B', textTransform: 'uppercase' }}>
                Excluidos · {turnedOff.length}
              </div>
              {turnedOff.map((p) => (
                <div key={p.exercise.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--rule)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)', textDecoration: 'line-through', textDecorationColor: 'var(--rule)' }}>{p.exercise.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{CATEGORY_LABELS[p.exercise.category]}</div>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--paper)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={10} style={{ color: 'var(--muted)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!confirmDone && turnedOn.length > 0 && (
            <div style={{ background: 'var(--paper-2)', borderRadius: 16, border: '1px solid var(--rule)', overflow: 'hidden' }}>
              <div style={{ padding: '13px 16px', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                Activados · {turnedOn.length}
              </div>
              {turnedOn.map((p) => (
                <div key={p.exercise.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--rule)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{p.exercise.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{CATEGORY_LABELS[p.exercise.category]}</div>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={11} color="var(--paper)" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {confirmDone && (
            <div style={{ background: 'var(--paper-2)', borderRadius: 16, border: '1px solid var(--rule)', padding: 24, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Check size={22} color="var(--paper)" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Programa actualizado</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
                {totals.on} ejercicios disponibles en tu biblioteca.
              </div>
            </div>
          )}
        </div>

        {/* Bottom action */}
        <div style={{ paddingTop: 20, paddingBottom: 32 }}>
          {!confirmDone ? (
            <button
              onClick={commitChanges}
              disabled={regenerating}
              style={{
                width: '100%', height: 54, borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                fontSize: 15, fontWeight: 600, cursor: regenerating ? 'not-allowed' : 'pointer',
                border: 'none', fontFamily: 'var(--sans)', opacity: regenerating ? 0.7 : 1,
                transition: 'opacity .15s',
              }}
            >
              {regenerating ? (
                <>
                  <Loader2 size={16} style={{ animation: 'lib-spin 0.7s linear infinite' }} />
                  Generando…
                </>
              ) : (
                <><RotateCcw size={15} /> Confirmar y actualizar</>
              )}
            </button>
          ) : (
            <button
              onClick={() => { setScreen('main'); setConfirmDone(false); }}
              style={{
                width: '100%', height: 54, borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'var(--sans)',
              }}
            >
              Volver a la biblioteca
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Settings sheet ─────────────────────────────────────────────────────────
  const renderSettings = () => (
    <div
      onClick={() => setShowSettings(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: 'var(--paper)', borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '10px 0 32px', boxShadow: '0 -16px 40px -12px rgba(0,0,0,0.25)',
          maxWidth: 800, margin: '0 auto',
        }}
      >
        <div style={{ width: 42, height: 4, borderRadius: 2, background: 'var(--rule)', margin: '6px auto 18px' }} />
        <div style={{ padding: '0 24px 8px' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', fontWeight: 600, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>
            Ajustes
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Programa</h2>
        </div>

        <div style={{ padding: '14px 20px 0' }}>
          <div style={{ background: 'var(--paper-2)', borderRadius: 16, border: '1px solid rgba(192,57,43,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px 8px', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: '#C0392B', textTransform: 'uppercase' }}>
              Zona de peligro
            </div>
            {!settingsConfirming ? (
              <button
                onClick={() => setSettingsConfirming(true)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderTop: '1px solid var(--rule)', cursor: 'pointer',
                  background: 'none', border: 'none', borderTopColor: 'var(--rule)', borderTopWidth: 1, borderTopStyle: 'solid',
                  fontFamily: 'var(--sans)', textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 500, color: '#C0392B', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Trash2 size={14} /> Eliminar programa actual
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                    Borra todas las sesiones y el historial reciente.
                  </div>
                </div>
                <ChevronDown size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              </button>
            ) : (
              <div style={{ borderTop: '1px solid var(--rule)', padding: '14px 16px' }}>
                <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.4 }}>
                  ¿Eliminar tu programa?
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.45 }}>
                  Se borrarán las sesiones programadas. Tu biblioteca de ejercicios permanece intacta.
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button
                    onClick={() => setSettingsConfirming(false)}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 999, textAlign: 'center',
                      border: '1px solid var(--rule)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                      background: 'none', fontFamily: 'var(--sans)', color: 'var(--ink)',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={deleteProgram}
                    disabled={deletingProgram}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 999, textAlign: 'center',
                      background: '#C0392B', color: 'white', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                      border: 'none', fontFamily: 'var(--sans)', opacity: deletingProgram ? 0.7 : 1,
                    }}
                  >
                    {deletingProgram ? 'Eliminando…' : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Root render ────────────────────────────────────────────────────────────
  return (
    <div className="forge-fade" style={{ maxWidth: 800 }}>
      <style>{`@keyframes lib-spin { to { transform: rotate(360deg); } } .lib-toggle-row { transition: background .15s; } .lib-toggle-row:active { background: var(--paper-2) !important; }`}</style>
      {screen === 'main'     && renderMain()}
      {screen === 'excluded' && renderExcluded()}
      {screen === 'confirm'  && renderConfirm()}
      {showSettings && renderSettings()}

      <AddExerciseModal
        isOpen={showAddExercise}
        onClose={() => setShowAddExercise(false)}
        onExerciseAdded={() => fetchExercises()}
      />

      {detailExercise && (
        <ExerciseDetailModal exerciseName={detailExercise} onClose={() => setDetailExercise(null)} />
      )}
    </div>
  );
}
