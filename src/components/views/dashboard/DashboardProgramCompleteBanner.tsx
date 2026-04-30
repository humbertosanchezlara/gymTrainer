import { RefreshCw } from 'lucide-react';

interface DashboardProgramCompleteBannerProps {
  completedWeeks: number;
  onNewCycle: () => void;
}

export function DashboardProgramCompleteBanner({ completedWeeks, onNewCycle }: DashboardProgramCompleteBannerProps) {
  return (
    <div
      style={{
        border: '1px solid var(--accent)',
        borderRadius: 16,
        padding: '20px 24px',
        background: 'color-mix(in oklab, var(--accent), transparent 94%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div>
        <div style={{ color: 'var(--accent)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          ¡Programa completado!
        </div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          Completaste las <em style={{ color: 'var(--accent)' }}>{completedWeeks} semanas</em>. Hora de un nuevo ciclo.
        </div>
      </div>
      <button onClick={onNewCycle} className="btn btn-ghost" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
        <RefreshCw size={14} /> Nuevo ciclo
      </button>
    </div>
  );
}
