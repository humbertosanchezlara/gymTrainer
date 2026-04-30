import { Loader2 } from 'lucide-react';
import Modal from '../../Modal';

interface ProgramDayExerciseCard {
  exercise_id?: string;
  exercise_name?: string;
  sets?: number;
  reps_min?: number;
  reps_max?: number;
  category?: string;
}

interface ReplacementCandidate {
  id: string;
  name: string;
  category: string;
}

interface DashboardReplaceExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  todayExercises: ProgramDayExerciseCard[];
  selectedExercise: ProgramDayExerciseCard | null;
  replacementCandidates: ReplacementCandidate[];
  replaceLoading: boolean;
  replaceError: string | null;
  onSelectExercise: (exercise: ProgramDayExerciseCard) => void;
  onBack: () => void;
  onApplyReplacement: (candidateId: string) => void;
}

export function DashboardReplaceExerciseModal({
  isOpen,
  onClose,
  todayExercises,
  selectedExercise,
  replacementCandidates,
  replaceLoading,
  replaceError,
  onSelectExercise,
  onBack,
  onApplyReplacement,
}: DashboardReplaceExerciseModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedExercise ? `Reemplazar ${selectedExercise.exercise_name}` : 'Cambiar ejercicio'}
      description={selectedExercise ? 'Elige un ejercicio activo de la misma categoría.' : 'Primero selecciona qué ejercicio quieres cambiar.'}
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!selectedExercise && todayExercises.map((exercise) => (
          <button
            key={exercise.exercise_id}
            type="button"
            onClick={() => onSelectExercise(exercise)}
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--rule)',
              borderRadius: 12,
              padding: '14px 16px',
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: 'var(--sans)',
              color: 'var(--ink)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600 }}>{exercise.exercise_name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              {exercise.category} · {exercise.sets}×{exercise.reps_min}{exercise.reps_max !== exercise.reps_min ? `–${exercise.reps_max}` : ''}
            </div>
          </button>
        ))}

        {selectedExercise && (
          <>
            <button type="button" onClick={onBack} className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}>
              Elegir otro ejercicio
            </button>

            {replaceLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 13 }}>
                <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                Cargando reemplazos…
              </div>
            )}

            {!replaceLoading && replacementCandidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => onApplyReplacement(candidate.id)}
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--rule)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'var(--sans)',
                  color: 'var(--ink)',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600 }}>{candidate.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  Se activará en tu biblioteca y reemplazará a {selectedExercise.exercise_name}.
                </div>
              </button>
            ))}

            {!replaceLoading && replacementCandidates.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                No hay reemplazos activos disponibles para esta categoría.
              </div>
            )}
          </>
        )}

        {replaceError && (
          <div
            style={{
              border: '1px solid color-mix(in oklab, var(--accent), transparent 70%)',
              background: 'color-mix(in oklab, var(--accent), transparent 94%)',
              color: 'var(--ink)',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 13,
            }}
          >
            {replaceError}
          </div>
        )}
      </div>
    </Modal>
  );
}
