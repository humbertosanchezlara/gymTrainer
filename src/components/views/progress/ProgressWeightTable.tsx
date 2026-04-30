import type { LiftSnapshot } from './useProgressMetrics';

interface ProgressWeightTableProps {
  lifts: LiftSnapshot[];
}

export function ProgressWeightTable({ lifts }: ProgressWeightTableProps) {
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
        <div className="uc" style={{ color: 'var(--muted)' }}>Pesos de trabajo</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
          Tus ejercicios más pesados con referencia del último peso registrado en sesión.
        </div>
      </div>
      {lifts.map((lift, index) => (
        <div
          key={lift.exerciseName}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 16,
            alignItems: 'center',
            padding: '16px 20px',
            borderTop: index === 0 ? 'none' : '1px solid var(--rule)',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{lift.exerciseName}</div>
            <div className="caption" style={{ color: 'var(--muted)', marginTop: 4 }}>
              {lift.latestLoggedWeight !== null
                ? `Última sesión: ${lift.latestLoggedWeight} kg`
                : 'Aún no hay registro guardado para este ejercicio'}
            </div>
          </div>
          <div className="mono" style={{ textAlign: 'right', fontSize: 22, fontWeight: 600 }}>
            <div>{lift.currentWeight}<span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>kg</span></div>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}>{lift.unitWeightLbs} lb</div>
          </div>
        </div>
      ))}
    </div>
  );
}
