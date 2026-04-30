import type { TravelDayContext } from '../../../lib/openaiTravelGenerator';

interface SessionHeaderCardProps {
  sessionName: string;
  onSessionNameChange: (value: string) => void;
  isMobile: boolean;
  travelContext: TravelDayContext | null;
  hasProgram: boolean;
  weekNum: number;
  dayNum: number;
  blockName: string;
}

export function SessionHeaderCard({
  sessionName,
  onSessionNameChange,
  isMobile,
  travelContext,
  hasProgram,
  weekNum,
  dayNum,
  blockName,
}: SessionHeaderCardProps) {
  return (
    <div style={{ borderBottom: '1px solid var(--rule)', paddingBottom: 16 }}>
      <input
        type="text"
        value={sessionName}
        onChange={(e) => onSessionNameChange(e.target.value)}
        placeholder="Nombre de la sesión"
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontFamily: 'var(--sans)',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          fontSize: isMobile ? 26 : 32,
          color: 'var(--ink)',
          width: '100%',
          padding: 0,
        }}
      />
      <div className="mono caption" style={{ marginTop: 8, color: 'var(--muted)' }}>
        {travelContext
          ? `Fuera del gym · ~${travelContext.estimated_minutes} min · Dificultad ${travelContext.session_difficulty}/10`
          : hasProgram && weekNum > 0
            ? `Día ${dayNum} · Semana ${weekNum} · ${blockName}`
            : hasProgram
              ? blockName
              : 'Registra tu trabajo. Los pesos se actualizan automáticamente.'}
      </div>
    </div>
  );
}
