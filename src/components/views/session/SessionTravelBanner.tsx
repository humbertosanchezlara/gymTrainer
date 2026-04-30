interface SessionTravelBannerProps {
  onReturnToGym: () => void;
}

export function SessionTravelBanner({ onReturnToGym }: SessionTravelBannerProps) {
  return (
    <div
      style={{
        border: '1px solid var(--rule)',
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        background: 'color-mix(in oklab, var(--ink), transparent 96%)',
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>¿Puedes ir al gym hoy?</div>
        <div className="caption" style={{ color: 'var(--muted)' }}>Sal sin guardar para retomar tu programa normal.</div>
      </div>
      <button onClick={onReturnToGym} className="btn btn-ink" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
        Ir al gym →
      </button>
    </div>
  );
}
