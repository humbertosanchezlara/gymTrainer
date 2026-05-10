export function SessionProgressionGuide() {
  return (
    <div
      style={{
        border: '1px solid var(--rule)',
        borderRadius: 12,
        padding: '12px 16px',
        background: 'color-mix(in oklab, var(--paper), var(--ink) 3%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div className="uc" style={{ color: 'var(--muted)' }}>Progresión</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink)' }}>
        Primero sube reps dentro del rango. Cuando llegues al tope con buen RPE, la app sube el peso para la próxima sesión.
      </div>
    </div>
  );
}
