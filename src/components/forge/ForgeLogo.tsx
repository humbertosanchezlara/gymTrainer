export function ForgeLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 28, height: 28, background: 'var(--ink)', borderRadius: 6,
        display: 'grid', placeItems: 'center', color: 'var(--paper)', flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1, fontStyle: 'italic' }}>F</span>
      </div>
      <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', fontFamily: 'var(--sans)' }}>Forge</span>
    </div>
  );
}
