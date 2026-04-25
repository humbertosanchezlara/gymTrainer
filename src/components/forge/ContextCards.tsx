interface ContextCardsProps {
  weeklyCompleted: number;
  weekIndex: number;
  totalWeeks: number;
  blockLabel: string;
  lastSessionName?: string;
  lastSessionDate?: string;
  lastSessionBlock?: string;
}

const cardStyle: React.CSSProperties = {
  flex: 1, border: '1px solid var(--rule)', borderRadius: 20, padding: 20,
  display: 'flex', flexDirection: 'column', gap: 6,
};

export function ContextCards({
  weeklyCompleted,
  weekIndex,
  totalWeeks,
  blockLabel,
  lastSessionName,
  lastSessionDate,
  lastSessionBlock,
}: ContextCardsProps) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {/* Weekly progress */}
      <div style={cardStyle}>
        <div style={{
          fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: 4,
        }}>
          Esta semana
        </div>
        <div style={{ fontWeight: 700, fontSize: 28, letterSpacing: '-0.03em', fontFamily: 'var(--sans)' }}>
          {weeklyCompleted}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
          sesiones completadas
        </div>
        <div style={{ marginTop: 8, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
          Sem {weekIndex}/{totalWeeks} · {blockLabel}
        </div>
      </div>

      {/* Last session */}
      {lastSessionName ? (
        <div style={cardStyle}>
          <div style={{
            fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: 4,
          }}>
            Última sesión
          </div>
          <div style={{
            fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em',
            fontFamily: 'var(--sans)', lineHeight: 1.3, flex: 1,
          }}>
            {lastSessionName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--sans)', marginTop: 4 }}>
            {lastSessionDate}
            {lastSessionBlock ? ` · ${lastSessionBlock}` : ''}
          </div>
        </div>
      ) : (
        <div style={{ ...cardStyle, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--sans)', textAlign: 'center' }}>
            Sin sesiones aún
          </div>
        </div>
      )}
    </div>
  );
}
