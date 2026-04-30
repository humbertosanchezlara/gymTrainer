import { ArrowLeft } from 'lucide-react';
import type { Exercise, MovementCategory } from '../../../types';

interface GroupedExercises {
  category: MovementCategory;
  label: string;
  items: Exercise[];
}

interface LibraryExcludedScreenProps {
  groups: GroupedExercises[];
  total: number;
  onBack: () => void;
  onRestore: (exerciseId: string) => void;
}

export function LibraryExcludedScreen({ groups, total, onBack, onRestore }: LibraryExcludedScreenProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ paddingBottom: 20, borderBottom: '1px solid var(--rule)' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', color: 'var(--muted)', fontSize: 14, fontWeight: 500, padding: 0, marginBottom: 14 }}>
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
        {groups.map(group => (
          <div key={group.category} style={{ background: 'var(--paper-2)', borderRadius: 16, border: '1px solid var(--rule)', overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--muted)', textTransform: 'uppercase' }}>
              {group.label} · {group.items.length}
            </div>
            {group.items.map(exercise => (
              <div key={exercise.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderTop: '1px solid var(--rule)' }}>
                <span style={{ fontSize: 14, color: 'var(--muted)', textDecoration: 'line-through', textDecorationColor: 'var(--rule)' }}>
                  {exercise.name}
                </span>
                <button
                  onClick={() => onRestore(exercise.id)}
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
}
