import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import type { ExerciseSearchResult } from '../../lib/claudeExercise';
import type { MovementCategory, ProgramDayExercise } from '../../types';
import { CATEGORY_LABELS } from '../../types';

interface DuplicateInfo {
  name: string;
  category: MovementCategory;
  source: 'user' | 'community';
}

interface SavedExercise {
  id: string;
  name: string;
  category: MovementCategory;
}

export function AddExerciseSearchStep({
  query,
  onQueryChange,
  onSubmit,
  error,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  error: string | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label className="caption" style={{ color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Nombre del ejercicio o máquina</label>
        <input
          className="body"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          placeholder="ej. Leg Press, Cable Fly, Hip Abductor..."
          autoFocus
          style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--paper-2)', color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      {error && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(186,26,26,0.08)', border: '1px solid rgba(186,26,26,0.2)', borderRadius: 8, padding: '10px 14px' }}>
          <AlertTriangle size={16} style={{ color: '#ba1a1a', flexShrink: 0, marginTop: 1 }} />
          <span className="caption" style={{ color: '#ba1a1a' }}>{error}</span>
        </div>
      )}
      <p className="caption" style={{ color: 'var(--muted)', margin: 0 }}>
        Claude buscará información del ejercicio y sugerirá la categoría correcta automáticamente.
      </p>
    </div>
  );
}

export function AddExerciseLoadingStep({ message }: { message: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
      <Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--muted)' }} />
      <span className="body" style={{ color: 'var(--muted)' }}>{message}</span>
    </div>
  );
}

export function AddExerciseConfirmStep({
  searchResult,
  duplicates,
  error,
}: {
  searchResult: ExerciseSearchResult;
  duplicates: DuplicateInfo[];
  error: string | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--paper-2)', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <span className="d-s" style={{ fontWeight: 700, lineHeight: 1.2 }}>{searchResult.standardized_name}</span>
          <span className="mono caption" style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {CATEGORY_LABELS[searchResult.category]}
          </span>
        </div>
        <p className="caption" style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>{searchResult.instructions}</p>
      </div>

      {duplicates.length > 0 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(255,160,0,0.08)', border: '1px solid rgba(255,160,0,0.3)', borderRadius: 8, padding: '12px 14px' }}>
          <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="caption" style={{ fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Posible duplicado encontrado</div>
            {duplicates.map((duplicate, index) => (
              <div key={`${duplicate.name}-${index}`} className="caption" style={{ color: '#92400e' }}>
                "{duplicate.name}" ya existe en tu biblioteca bajo <strong>{CATEGORY_LABELS[duplicate.category]}</strong>
                {duplicate.source === 'community' ? ' (biblioteca comunitaria)' : ''}.
              </div>
            ))}
            <div className="caption" style={{ color: '#92400e', marginTop: 6 }}>Puedes continuar si es un ejercicio distinto.</div>
          </div>
        </div>
      )}

      {error && <div className="caption" style={{ color: '#ba1a1a' }}>{error}</div>}
    </div>
  );
}

export function AddExerciseProgramPromptStep({
  savedExercise,
  dayName,
  categoryMatchesDay,
}: {
  savedExercise: SavedExercise;
  dayName: string | null;
  categoryMatchesDay: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(0,120,80,0.08)', border: '1px solid rgba(0,120,80,0.2)', borderRadius: 8, padding: '12px 14px' }}>
        <CheckCircle2 size={16} style={{ color: '#00834e', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div className="caption" style={{ fontWeight: 600, color: '#00834e' }}>Ejercicio guardado</div>
          <div className="caption" style={{ color: '#00834e', marginTop: 2 }}>
            {savedExercise.name} se añadió a <strong>{CATEGORY_LABELS[savedExercise.category]}</strong> en tu biblioteca.
          </div>
        </div>
      </div>
      {dayName && (
        <div style={{ background: 'var(--paper-2)', borderRadius: 10, padding: '14px 16px' }}>
          <div className="body" style={{ fontWeight: 600 }}>¿Incorporarlo a tu programa ahora?</div>
          <div className="caption" style={{ color: 'var(--muted)', marginTop: 4 }}>
            Tu siguiente sesión es: <strong>{dayName}</strong>.
            {!categoryMatchesDay && <span> Este ejercicio ({CATEGORY_LABELS[savedExercise.category]}) no corresponde a esa sesión.</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export function AddExerciseProgramOptionsStep({ dayName, onAdd, onReplace }: { dayName: string; onAdd: () => void; onReplace: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="caption" style={{ color: 'var(--muted)' }}>
        Sesión: <strong style={{ color: 'var(--ink)' }}>{dayName}</strong>
      </div>
      <button onClick={onAdd} className="btn btn-ink btn-sq" style={{ justifyContent: 'flex-start', borderRadius: 8, padding: '14px 18px', textAlign: 'left', display: 'block' }}>
        <div style={{ fontWeight: 700 }}>Añadir al final</div>
        <div style={{ fontSize: 13, opacity: .7, marginTop: 4, fontWeight: 400 }}>Se agrega como ejercicio extra a la sesión de hoy en adelante.</div>
      </button>
      <button onClick={onReplace} style={{ background: 'transparent', border: '1px solid var(--rule)', color: 'var(--ink)', padding: '14px 18px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--sans)', textAlign: 'left' }}>
        <div style={{ fontWeight: 700 }}>Reemplazar un ejercicio</div>
        <div style={{ fontSize: 13, opacity: .7, marginTop: 4, fontWeight: 400 }}>Sustituye a otro ejercicio de hoy en adelante.</div>
      </button>
    </div>
  );
}

export function AddExerciseReplaceStep({
  exercises,
  category,
  suggestedReplaceId,
  onSelect,
}: {
  exercises: ProgramDayExercise[];
  category: MovementCategory;
  suggestedReplaceId: string | null;
  onSelect: (exerciseId: string) => void;
}) {
  const compatible = exercises.filter((exercise) => exercise.category === category);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="caption" style={{ color: 'var(--muted)', marginBottom: 4 }}>Selecciona el ejercicio a reemplazar:</div>
      {compatible.map((exercise) => {
        const isSuggested = exercise.exercise_id === suggestedReplaceId;
        return (
          <button
            key={exercise.exercise_id}
            onClick={() => onSelect(exercise.exercise_id)}
            style={{
              background: isSuggested ? 'var(--paper-2)' : 'transparent',
              border: isSuggested ? '1.5px solid var(--ink)' : '1px solid var(--rule)',
              color: 'var(--ink)',
              padding: '12px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'var(--sans)',
              textAlign: 'left',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div>
              <div style={{ fontWeight: isSuggested ? 700 : 500, fontSize: 14 }}>{exercise.exercise_name}</div>
              <div style={{ fontSize: 12, opacity: .6, marginTop: 2 }}>{CATEGORY_LABELS[exercise.category as MovementCategory] ?? exercise.category} — {exercise.sets}×{exercise.reps_min}</div>
            </div>
            {isSuggested && (
              <span style={{ background: 'var(--ink)', color: 'var(--paper)', fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                SUGERIDO
              </span>
            )}
          </button>
        );
      })}
      {compatible.length === 0 && (
        <div className="caption" style={{ color: 'var(--muted)' }}>
          No hay ejercicios compatibles de esa categoría para reemplazar en esta sesión.
        </div>
      )}
    </div>
  );
}

export function AddExerciseDoneStep({ doneMessage }: { doneMessage: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
      <CheckCircle2 size={36} style={{ color: '#00834e' }} />
      <p className="body" style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>{doneMessage}</p>
    </div>
  );
}
