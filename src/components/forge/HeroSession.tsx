import { ArrowRight } from 'lucide-react';

interface HeroSessionProps {
  sessionName: string;
  exerciseCount: number;
  duration?: string;
  onStart: () => void;
}

export function HeroSession({ sessionName, exerciseCount, duration, onStart }: HeroSessionProps) {
  return (
    <div style={{
      background: 'var(--ink)', color: 'var(--paper)',
      borderRadius: 20, padding: 24,
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      <div>
        <div style={{
          opacity: 0.45, fontSize: 11, textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: 10, fontFamily: 'var(--sans)',
        }}>
          Hoy entrenas
        </div>
        <div style={{
          fontWeight: 700, fontSize: 22, letterSpacing: '-0.025em',
          lineHeight: 1.2, marginBottom: 12, fontFamily: 'var(--sans)',
        }}>
          {sessionName}
        </div>
        <div style={{ display: 'flex', gap: 16, opacity: 0.5, fontSize: 12, fontFamily: 'var(--mono)' }}>
          <span>{exerciseCount} ejercicios</span>
          {duration && <span>{duration}</span>}
        </div>
      </div>

      <button
        onClick={onStart}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '16px 20px',
          background: 'var(--accent)', color: 'var(--accent-ink)',
          border: 'none', borderRadius: 14, cursor: 'pointer',
          fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 16,
          letterSpacing: '-0.01em', transition: 'opacity .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <span>Empezar entrenamiento</span>
        <ArrowRight size={20} />
      </button>
    </div>
  );
}
