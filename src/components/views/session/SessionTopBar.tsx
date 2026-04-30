import { ArrowLeft } from 'lucide-react';

interface SessionTopBarProps {
  travelDraft: boolean;
  onBack: () => void;
}

export function SessionTopBar({ travelDraft, onBack }: SessionTopBarProps) {
  return (
    <header className="forge-topnav">
      <div
        style={{
          position: 'relative',
          maxWidth: 720,
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
        }}
      >
        <button onClick={onBack} className="btn btn-ghost" style={{ gap: 6, padding: '8px 12px', flexShrink: 0 }}>
          <ArrowLeft size={14} /> Hoy
        </button>

        {travelDraft && (
          <div
            className="uc"
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'var(--accent)',
              fontSize: 10,
              whiteSpace: 'nowrap',
            }}
          >
            Fuera del Gym
          </div>
        )}

        <div style={{ width: 80, flexShrink: 0 }} />
      </div>
    </header>
  );
}
