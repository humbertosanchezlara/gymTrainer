import { ChevronDown, ChevronUp, Info, Loader2, Plus, RotateCcw, Search, Settings, X } from 'lucide-react';
import type { Exercise, MovementCategory } from '../../../types';
import { getCatalogEntry } from '../../../data/exerciseCatalog';
import { LibraryToggle } from './LibraryToggle';

interface GroupedExercises {
  category: MovementCategory;
  label: string;
  items: Exercise[];
}

interface LibraryMainScreenProps {
  totals: { total: number; on: number; off: number; byCat: Record<string, { total: number; on: number }> };
  pct: number;
  query: string;
  onQueryChange: (value: string) => void;
  filteredGroups: GroupedExercises[];
  effectiveExpanded: Set<string>;
  toggleCategory: (category: string) => void;
  isEnabled: (exercise: Exercise) => boolean;
  hasPendingChanges: boolean;
  toggleExercise: (exercise: Exercise) => void;
  loading: boolean;
  seeding: boolean;
  exercisesCount: number;
  pendingCount: number;
  onOpenExcluded: () => void;
  onOpenSettings: () => void;
  onOpenConfirm: () => void;
  onSeed: () => void;
  onShowAddExercise: () => void;
  onShowDetail: (exerciseName: string) => void;
}

export function LibraryMainScreen({
  totals,
  pct,
  query,
  onQueryChange,
  filteredGroups,
  effectiveExpanded,
  toggleCategory,
  isEnabled,
  hasPendingChanges,
  toggleExercise,
  loading,
  seeding,
  exercisesCount,
  pendingCount,
  onOpenExcluded,
  onOpenSettings,
  onOpenConfirm,
  onSeed,
  onShowAddExercise,
  onShowDetail,
}: LibraryMainScreenProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
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
          <button onClick={onOpenSettings} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 6, marginTop: 4, borderRadius: 8 }}>
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            <button onClick={onOpenExcluded} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right', fontFamily: 'var(--sans)', padding: 0 }}>
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

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--paper-2)', borderRadius: 12, border: '1px solid var(--rule)', padding: '10px 14px',
        }}>
          <Search size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="Buscar en tu biblioteca"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--sans)',
            }}
          />
          {query && (
            <button onClick={() => onQueryChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--muted)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--muted)', textTransform: 'uppercase' }}>
            Categorías
          </div>
          {exercisesCount === 0 && !loading ? (
            <button onClick={onSeed} disabled={seeding} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--ink)', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'var(--sans)', padding: '4px 8px', borderRadius: 8 }}>
              {seeding ? <Loader2 size={13} style={{ animation: 'lib-spin 0.8s linear infinite' }} /> : <Plus size={13} />}
              Cargar biblioteca
            </button>
          ) : (
            <button onClick={onShowAddExercise} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--ink)', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'var(--sans)', padding: '4px 8px', borderRadius: 8 }}>
              <Plus size={13} /> Añadir ejercicio
            </button>
          )}
        </div>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160 }}>
            <Loader2 size={24} style={{ animation: 'lib-spin 0.8s linear infinite', color: 'var(--muted)' }} />
          </div>
        )}

        {!loading && exercisesCount === 0 && (
          <div style={{ border: '1px dashed var(--rule)', borderRadius: 14, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>
              Tu biblioteca está vacía. Carga los ejercicios predeterminados para empezar.
            </div>
          </div>
        )}

        {!loading && exercisesCount > 0 && filteredGroups.length === 0 && (
          <div style={{ background: 'var(--paper-2)', border: '1px solid var(--rule)', borderRadius: 14, padding: '28px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Sin resultados para "{query}"
          </div>
        )}

        {filteredGroups.map(group => {
          const isOpen = effectiveExpanded.has(group.category);
          const catCounts = totals.byCat[group.category] ?? { total: group.items.length, on: group.items.length };
          const catPct = catCounts.total > 0 ? catCounts.on / catCounts.total : 1;

          return (
            <div key={group.category} style={{ background: 'var(--paper-2)', borderRadius: 16, border: '1px solid var(--rule)', overflow: 'hidden' }}>
              <button onClick={() => toggleCategory(group.category)} style={{ width: '100%', padding: '14px 16px 12px', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'var(--sans)', color: 'var(--ink)', textAlign: 'left' }}>
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
                  <div style={{ width: `${catPct * 100}%`, height: '100%', background: 'var(--ink)', transition: 'width .2s' }} />
                </div>
              </button>

              {isOpen && group.items.map(exercise => {
                const on = isEnabled(exercise);
                const hasCatalog = !!getCatalogEntry(exercise.name);
                return (
                  <div
                    key={exercise.id}
                    className="lib-toggle-row"
                    onClick={() => toggleExercise(exercise)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderTop: '1px solid var(--rule)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: 14, color: on ? 'var(--ink)' : 'var(--muted)',
                        textDecoration: on ? 'none' : 'line-through',
                        textDecorationColor: 'var(--rule)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {exercise.name}
                      </span>
                      {hasCatalog && (
                        <button
                          onClick={e => { e.stopPropagation(); onShowDetail(exercise.name); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2, flexShrink: 0 }}
                        >
                          <Info size={13} />
                        </button>
                      )}
                    </div>
                    <LibraryToggle on={on} onChange={e => { e.stopPropagation(); toggleExercise(exercise); }} />
                  </div>
                );
              })}
            </div>
          );
        })}

        {hasPendingChanges && <div style={{ height: 72 }} />}
      </div>

      {hasPendingChanges && (
        <div style={{
          position: 'fixed', bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
          left: 0, right: 0, zIndex: 99,
          padding: '12px 16px 4px',
          background: 'linear-gradient(to top, var(--paper) 60%, transparent)',
          pointerEvents: 'none',
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto', pointerEvents: 'auto' }}>
            <button
              onClick={onOpenConfirm}
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
                    {pendingCount} {pendingCount === 1 ? 'cambio pendiente' : 'cambios pendientes'}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.65, marginTop: 1 }}>
                    Toca para actualizar tu programa
                  </div>
                </div>
              </div>
              <div style={{ padding: '7px 14px', borderRadius: 999, background: 'var(--paper)', color: 'var(--ink)', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <RotateCcw size={12} /> Actualizar
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
