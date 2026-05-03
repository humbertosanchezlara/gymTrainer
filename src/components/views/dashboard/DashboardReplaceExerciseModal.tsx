import { BadgeCheck, CircleDot, Loader2, Star } from 'lucide-react';
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
  rank: 1 | 2 | 3;
  reason: string;
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
  const rankVisuals: Record<ReplacementCandidate['rank'], { icon: React.ReactNode; label: string; accent: string }> = {
    1: { icon: <Star size={15} fill="currentColor" />, label: 'Mejor match', accent: 'var(--accent)' },
    2: { icon: <BadgeCheck size={15} />, label: 'Muy buena opción', accent: 'var(--ok)' },
    3: { icon: <CircleDot size={15} />, label: 'Alternativa sólida', accent: 'var(--muted)' },
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedExercise ? `Reemplazar ${selectedExercise.exercise_name}` : 'Cambiar ejercicio'}
      description={selectedExercise ? 'Elige el reemplazo que mejor conserva la intención de la sesión.' : 'Primero selecciona qué ejercicio quieres cambiar.'}
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
              (() => {
                const visual = rankVisuals[candidate.rank];

                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => onApplyReplacement(candidate.id)}
                    style={{
                      background: candidate.rank === 1
                        ? 'color-mix(in oklab, var(--accent), var(--paper-2) 90%)'
                        : 'var(--paper-2)',
                      border: `1px solid ${candidate.rank === 1 ? 'color-mix(in oklab, var(--accent), transparent 55%)' : 'var(--rule)'}`,
                      borderRadius: 12,
                      padding: '14px 16px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: 'var(--sans)',
                      color: 'var(--ink)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{candidate.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                          {candidate.reason}
                        </div>
                      </div>

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          flexShrink: 0,
                          color: visual.accent,
                          fontSize: 11,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {visual.icon}
                        {visual.label}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
                      Reemplazará a {selectedExercise.exercise_name}.
                    </div>
                  </button>
                );
              })()
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
