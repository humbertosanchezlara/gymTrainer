import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import type { Exercise } from '../../types';
import { DEFAULT_EXERCISES, type MovementCategory, CATEGORY_LABELS } from '../../types';
import { estimateWeight } from '../../engine/weightEstimator';
import { exerciseSuitabilityScore, isExerciseSuitableForProfile } from '../../engine/exerciseSuitability';
import AddExerciseModal from '../AddExerciseModal';
import ExerciseDetailModal from '../ExerciseDetailModal';
import { isExerciseEnabled, normalizeProgramDayExercise } from '../../utils/programState';
import { LibraryMainScreen } from './library/LibraryMainScreen';
import { LibraryExcludedScreen } from './library/LibraryExcludedScreen';
import { LibraryConfirmScreen } from './library/LibraryConfirmScreen';
import { LibrarySettingsSheet } from './library/LibrarySettingsSheet';

type Screen = 'main' | 'excluded' | 'confirm';

function sessionDraftKey(userId: string) {
  return `session_draft_${userId}`;
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
                const substitute = candidates
                  .filter(s => !usedIds.has(s.id) && isExerciseSuitableForProfile(s, profile))
                  .sort((a, b) => exerciseSuitabilityScore(b, profile) - exerciseSuitabilityScore(a, profile))[0];
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

  // ── Root render ────────────────────────────────────────────────────────────
  return (
    <div className="forge-fade" style={{ maxWidth: 800 }}>
      <style>{`@keyframes lib-spin { to { transform: rotate(360deg); } } .lib-toggle-row { transition: background .15s; } .lib-toggle-row:active { background: var(--paper-2) !important; }`}</style>
      {screen === 'main' && (
        <LibraryMainScreen
          totals={totals}
          pct={pct}
          query={query}
          onQueryChange={setQuery}
          filteredGroups={filteredGroups}
          effectiveExpanded={effectiveExpanded}
          toggleCategory={toggleCat}
          isEnabled={isEnabled}
          hasPendingChanges={pendingChanges.length > 0}
          toggleExercise={toggleExercise}
          loading={loading}
          seeding={seeding}
          exercisesCount={exercises.length}
          pendingCount={pendingChanges.length}
          onOpenExcluded={() => setScreen('excluded')}
          onOpenSettings={() => { setSettingsConfirming(false); setShowSettings(true); }}
          onOpenConfirm={() => { setConfirmDone(false); setScreen('confirm'); }}
          onSeed={seedLibrary}
          onShowAddExercise={() => setShowAddExercise(true)}
          onShowDetail={setDetailExercise}
        />
      )}
      {screen === 'excluded' && (
        <LibraryExcludedScreen
          groups={grouped.map(g => ({ ...g, items: g.items.filter(ex => !isEnabled(ex)) })).filter(g => g.items.length > 0)}
          total={grouped.reduce((sum, group) => sum + group.items.filter(ex => !isEnabled(ex)).length, 0)}
          onBack={() => setScreen('main')}
          onRestore={(exerciseId) => setLocalEnabled(prev => ({ ...prev, [exerciseId]: true }))}
        />
      )}
      {screen === 'confirm' && (
        <LibraryConfirmScreen
          pendingChanges={pendingChanges}
          confirmDone={confirmDone}
          totalsOn={totals.on}
          regenerating={regenerating}
          onBack={() => setScreen('main')}
          onCommit={commitChanges}
          onCloseDone={() => { setScreen('main'); setConfirmDone(false); }}
        />
      )}
      {showSettings && (
        <LibrarySettingsSheet
          settingsConfirming={settingsConfirming}
          deletingProgram={deletingProgram}
          onClose={() => setShowSettings(false)}
          onConfirmDelete={() => setSettingsConfirming(true)}
          onCancelConfirm={() => setSettingsConfirming(false)}
          onDeleteProgram={deleteProgram}
        />
      )}

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
