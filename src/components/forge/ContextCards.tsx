interface ContextCardsProps {
  weeklyCompleted: number;
  weekIndex: number;
  totalWeeks: number;
  blockLabel: string;
  lastSessionName?: string;
  lastSessionDate?: string;
  lastSessionBlock?: string;
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
  color: 'var(--muted)', fontFamily: 'var(--sans)', marginBottom: 12,
};

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--rule)', borderRadius: 20, padding: '20px 24px',
  display: 'flex', flexDirection: 'column',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Weekly progress */}
      <div style={cardStyle}>
        <div style={labelStyle}>Esta semana</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
          <span style={{
            fontWeight: 700, fontSize: 40, letterSpacing: '-0.04em',
            fontFamily: 'var(--sans)', lineHeight: 1,
          }}>
            {weeklyCompleted}
          </span>
          <span style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
            sesiones completadas
          </span>
        </div>
        <div style={{
          fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          Semana {weekIndex} de {totalWeeks} · {blockLabel}
        </div>
      </div>

      {/* Last session */}
      <div style={cardStyle}>
        <div style={labelStyle}>Última sesión</div>
        {lastSessionName ? (
          <>
            <div style={{
              fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em',
              fontFamily: 'var(--sans)', lineHeight: 1.2, marginBottom: 8,
            }}>
              {lastSessionName}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
              {lastSessionDate}
              {lastSessionBlock ? ` · ${lastSessionBlock}` : ''}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
            Sin sesiones aún
          </div>
        )}
      </div>
    </div>
  );
}
