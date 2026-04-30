import { ArrowRight, MapPin } from 'lucide-react';

interface DashboardTravelModeCardProps {
  onClick: () => void;
}

export function DashboardTravelModeCard({ onClick }: DashboardTravelModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        width: '100%',
        padding: '16px 20px',
        textAlign: 'left',
        background: 'color-mix(in oklab, var(--ink), transparent 97%)',
        border: '1px solid var(--rule)',
        borderRadius: 20,
        cursor: 'pointer',
        fontFamily: 'var(--sans)',
        transition: 'border-color .15s, background .15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--muted)';
        e.currentTarget.style.background = 'color-mix(in oklab, var(--ink), transparent 94%)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--rule)';
        e.currentTarget.style.background = 'color-mix(in oklab, var(--ink), transparent 97%)';
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: 'var(--ink)',
            color: 'var(--paper)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <MapPin size={16} />
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Sesión fuera del gym</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Entrena en casa o viajando</span>
        </span>
      </span>
      <ArrowRight size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
    </button>
  );
}
