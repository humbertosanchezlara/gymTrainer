import { CalendarClock } from 'lucide-react';

interface DashboardSwitchDayCardProps {
  selectedDayName: string | null;
  pendingCount: number;
  onClick: () => void;
}

export function DashboardSwitchDayCard({ selectedDayName, pendingCount, onClick }: DashboardSwitchDayCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pendingCount <= 1}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '14px 18px',
        background: 'var(--paper-2)',
        border: '1px solid var(--rule)',
        borderRadius: 18,
        cursor: pendingCount > 1 ? 'pointer' : 'not-allowed',
        fontFamily: 'var(--sans)',
        color: 'var(--ink)',
        opacity: pendingCount > 1 ? 1 : 0.62,
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Cambiar sesión de hoy</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {pendingCount > 1
            ? `${pendingCount} sesiones pendientes esta semana${selectedDayName ? ` · elegida: ${selectedDayName}` : ''}`
            : 'No hay otra sesión pendiente para intercambiar.'}
        </span>
      </span>
      <CalendarClock size={16} />
    </button>
  );
}
