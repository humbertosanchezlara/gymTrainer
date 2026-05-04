import { Check, Loader2, Save, Plus } from 'lucide-react';

type ProgressionAction = 'up' | 'keep' | 'warn';

interface ProgressionResult {
  exercise_name: string;
  prev_weight: number;
  next_weight: number;
  action: ProgressionAction;
  note?: string;
}

const KG_TO_LBS = 2.20462;
function kgToLbs(kg: number): number { return Math.round(kg * KG_TO_LBS); }

interface SessionSavePanelProps {
  canSave: boolean;
  saving: boolean;
  saved: boolean;
  progressionResults: ProgressionResult[];
  showSaveActions: boolean;
  onAddExercise: () => void;
  onSave: () => void;
}

export function SessionSavePanel({
  canSave,
  saving,
  saved,
  progressionResults,
  showSaveActions,
  onAddExercise,
  onSave,
}: SessionSavePanelProps) {
  return (
    <>
      <button
        onClick={onAddExercise}
        style={{
          background: 'transparent',
          border: '1px dashed var(--rule)',
          borderRadius: 12,
          padding: '16px 24px',
          cursor: 'pointer',
          fontFamily: 'var(--sans)',
          fontWeight: 600,
          fontSize: 14,
          color: 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'color .15s, border-color .15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--ink)';
          e.currentTarget.style.borderColor = 'var(--ink)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--muted)';
          e.currentTarget.style.borderColor = 'var(--rule)';
        }}
      >
        <Plus size={16} /> Agregar ejercicio
      </button>

      {showSaveActions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={onSave}
            disabled={!canSave || saving}
            className="btn btn-ink btn-xl"
            style={{ justifyContent: 'center', opacity: (!canSave || saving) ? 0.4 : 1 }}
          >
            {saved
              ? <><Check size={18} /> ¡Guardado!</>
              : saving
                ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Guardando…</>
                : <><Save size={16} /> Guardar sesión</>}
          </button>

          {saved && progressionResults.length > 0 && (
            <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--rule)' }}>
                <div className="uc" style={{ color: 'var(--muted)' }}>Progresión automática</div>
              </div>
              {progressionResults.map((result, index) => (
                <div
                  key={`${result.exercise_name}-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 20px',
                    borderTop: '1px solid var(--rule)',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 500 }}>
                    {result.exercise_name}
                    {result.note && <span className="caption" style={{ display: 'block', color: 'var(--muted)', marginTop: 3 }}>{result.note}</span>}
                  </span>
                  {result.action === 'up'
                    ? <span className="mono caption" style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>↑ {result.prev_weight} kg ({kgToLbs(result.prev_weight)} lb) → {result.next_weight} kg ({kgToLbs(result.next_weight)} lb)</span>
                    : <span className="mono caption" style={{ color: 'var(--muted)', flexShrink: 0 }}>⚠ Revisa el peso</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
