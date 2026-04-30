import { useEffect, useRef, useState } from 'react';
import { Clock, Eye, Trash2, X, AlertTriangle } from 'lucide-react';
import type { Exercise } from '../../../types';
import { getCatalogEntry } from '../../../data/exerciseCatalog';

const KG_TO_LBS = 2.20462;

function kgToLbs(kg: number): number { return Math.round(kg * KG_TO_LBS); }
function lbsToKg(lbs: number): number { return Math.round((lbs / KG_TO_LBS) * 10) / 10; }

interface SessionLogEntry {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps_per_set: number;
  weight: number;
  rpe: number;
  notes: string;
}

interface WeightCellProps {
  kg: number;
  isMobile: boolean;
  isBW: boolean;
  onChange: (kg: number) => void;
  onAddWeight: () => void;
}

function WeightCell({ kg, isMobile, isBW, onChange, onAddWeight }: WeightCellProps) {
  const [lbsVal, setLbsVal] = useState(() => kgToLbs(kg));
  const prevKgRef = useRef(kg);

  useEffect(() => {
    if (prevKgRef.current !== kg) {
      prevKgRef.current = kg;
      setLbsVal(kgToLbs(kg));
    }
  }, [kg]);

  const baseStyle: React.CSSProperties = {
    width: '100%',
    border: 'none',
    background: 'transparent',
    textAlign: 'center',
    fontFamily: 'var(--mono)',
    fontSize: isMobile ? 17 : 20,
    fontWeight: 600,
    outline: 'none',
    lineHeight: 1.2,
  };

  const unitLabel: React.CSSProperties = {
    fontSize: 8,
    color: 'var(--muted)',
    fontFamily: 'var(--sans)',
    flexShrink: 0,
  };

  if (isBW) {
    return (
      <>
        <span style={{ ...baseStyle, color: 'var(--muted)', display: 'block' }}>BW</span>
        <button
          onClick={onAddWeight}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--sans)',
            fontSize: 9,
            color: 'var(--muted)',
            padding: 0,
            textDecoration: 'underline',
          }}
        >
          + peso
        </button>
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, width: '100%', justifyContent: 'center' }}>
        <input
          type="number"
          className="session-num-input"
          value={kg}
          onChange={(e) => onChange(+e.target.value)}
          inputMode="decimal"
          step={2.5}
          min={0}
          style={{ ...baseStyle, color: 'var(--ink)' }}
        />
        <span style={unitLabel}>kg</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, width: '100%', justifyContent: 'center' }}>
        <input
          type="number"
          className="session-num-input"
          value={lbsVal}
          onChange={(e) => setLbsVal(+e.target.value)}
          onBlur={(e) => onChange(lbsToKg(+e.target.value))}
          inputMode="decimal"
          step={5}
          min={0}
          style={{ ...baseStyle, color: 'var(--muted)' }}
        />
        <span style={unitLabel}>lb</span>
      </div>
    </>
  );
}

function getRestLabel(rpe: number): string {
  if (rpe >= 8) return '3–5 min';
  if (rpe >= 6) return '2–3 min';
  return '60–90 seg';
}

function getRpeHint(rpe: number) {
  if (rpe >= 10) return 'fallo muscular';
  if (rpe === 9) return 'queda 1 rep';
  if (rpe === 8) return 'quedan 2 reps';
  if (rpe === 7) return 'quedan 3 reps';
  return 'quedan 4+ reps';
}

interface SessionExerciseCardProps {
  log: SessionLogEntry;
  index: number;
  exercises: Exercise[];
  isMobile: boolean;
  isTravelDraft: boolean;
  confirmDelete: boolean;
  onShowTechnique: (name: string) => void;
  onAskDelete: (index: number) => void;
  onCancelDelete: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: string, value: string | number) => void;
}

export function SessionExerciseCard({
  log,
  index,
  exercises,
  isMobile,
  isTravelDraft,
  confirmDelete,
  onShowTechnique,
  onAskDelete,
  onCancelDelete,
  onRemove,
  onUpdate,
}: SessionExerciseCardProps) {
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
      <div
        style={{
          padding: isMobile ? '14px 16px' : '18px 24px',
          borderBottom: '1px solid var(--rule)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {log.exercise_name ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>{log.exercise_name}</div>
              {getCatalogEntry(log.exercise_name) && (
                <button
                  onClick={() => onShowTechnique(log.exercise_name)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: 'var(--accent)',
                    fontFamily: 'var(--sans)',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  <Eye size={11} /> Ver técnica
                </button>
              )}
            </>
          ) : (
            <select
              value={log.exercise_id}
              onChange={(e) => onUpdate(index, 'exercise_id', e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'var(--sans)',
                fontWeight: 700,
                fontSize: 15,
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              <option value="">Seleccionar ejercicio…</option>
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid var(--rule)', borderRadius: 999, padding: '4px 10px' }}>
            <Clock size={10} style={{ color: 'var(--muted)' }} />
            <span className="mono caption" style={{ whiteSpace: 'nowrap' }}>{getRestLabel(log.rpe)}</span>
          </div>

          {confirmDelete ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => onRemove(index)} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12, color: '#ba1a1a', borderColor: '#ba1a1a', gap: 4 }}>
                <Trash2 size={11} /> Borrar
              </button>
              <button onClick={onCancelDelete} className="btn btn-ghost" style={{ padding: 6 }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <button onClick={() => onAskDelete(index)} className="btn btn-ghost" style={{ padding: 6, color: 'var(--muted)' }}>
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div
          style={{
            padding: '10px 16px',
            background: 'color-mix(in oklab, #ba1a1a, transparent 92%)',
            borderBottom: '1px solid var(--rule)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertTriangle size={12} style={{ color: '#ba1a1a', flexShrink: 0 }} />
          <span className="caption" style={{ color: '#ba1a1a' }}>
            ¿Eliminar <strong>{log.exercise_name || 'este ejercicio'}</strong>?
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--rule)' }}>
        <div style={{ background: 'var(--paper)', padding: isMobile ? '12px 6px' : '14px 16px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <span className="uc" style={{ color: 'var(--muted)', fontSize: 9 }}>SERIES</span>
          <input
            type="number"
            className="session-num-input"
            value={log.sets}
            onChange={(e) => onUpdate(index, 'sets', +e.target.value)}
            inputMode="numeric"
            step={1}
            min={1}
            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: isMobile ? 20 : 24, fontWeight: 600, color: 'var(--ink)', outline: 'none' }}
          />
        </div>
        <div style={{ background: 'var(--paper)', padding: isMobile ? '12px 6px' : '14px 16px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <span className="uc" style={{ color: 'var(--muted)', fontSize: 9 }}>REPS</span>
          <input
            type="number"
            className="session-num-input"
            value={log.reps_per_set}
            onChange={(e) => onUpdate(index, 'reps_per_set', +e.target.value)}
            inputMode="numeric"
            step={1}
            min={1}
            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: isMobile ? 20 : 24, fontWeight: 600, color: 'var(--ink)', outline: 'none' }}
          />
        </div>
        <div style={{ background: 'var(--paper)', padding: isMobile ? '10px 4px' : '12px 16px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <span className="uc" style={{ color: 'var(--muted)', fontSize: 9 }}>PESO</span>
          <WeightCell
            kg={log.weight}
            isMobile={isMobile}
            isBW={!!(isTravelDraft && log.weight === 0)}
            onChange={(kg) => onUpdate(index, 'weight', kg)}
            onAddWeight={() => onUpdate(index, 'weight', 2.5)}
          />
        </div>
        <div style={{ background: 'var(--paper)', padding: isMobile ? '12px 6px' : '14px 16px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <span className="uc" style={{ color: 'var(--muted)', fontSize: 9 }}>RPE</span>
          <input
            type="number"
            className="session-num-input"
            value={log.rpe}
            onChange={(e) => onUpdate(index, 'rpe', +e.target.value)}
            inputMode="numeric"
            step={1}
            min={5}
            max={10}
            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: isMobile ? 20 : 24, fontWeight: 600, color: 'var(--accent)', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ padding: '8px 16px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end' }}>
        <span className="mono caption" style={{ color: 'var(--muted)', fontSize: 11 }}>
          RPE {log.rpe} — {getRpeHint(log.rpe)}
        </span>
      </div>
    </div>
  );
}
