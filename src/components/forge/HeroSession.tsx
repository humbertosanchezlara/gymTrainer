import { ArrowRight } from 'lucide-react';

interface HeroSessionProps {
  sessionName: string;
  exerciseCount: number;
  duration?: string;
  onStart: () => void;
}

export function HeroSession({ sessionName, exerciseCount, duration, onStart }: HeroSessionProps) {
  const meta = [
    exerciseCount > 0 ? `${exerciseCount} ejercicios` : null,
    duration ?? null,
  ].filter(Boolean).join(' · ');

  return (
    <div style={{
      background: 'var(--ink)', color: 'var(--paper)',
      borderRadius: 24, padding: '22px 22px 20px',
      display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Label row — "HOY ENTRENAS" + meta on the same line */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.08em', opacity: 0.45,
            fontFamily: 'var(--sans)',
          }}>
            Hoy entrenas
          </span>
          {meta && (
            <span style={{
              fontSize: 11, opacity: 0.45,
              fontFamily: 'var(--mono)', letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}>
              {meta}
            </span>
          )}
        </div>

        {/* Session name */}
        <div style={{
          fontWeight: 700, fontSize: 24, letterSpacing: '-0.025em',
          lineHeight: 1.15, fontFamily: 'var(--sans)',
        }}>
          {sessionName}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onStart}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '15px 20px',
          background: 'var(--accent)', color: 'var(--accent-ink)',
          border: 'none', borderRadius: 14, cursor: 'pointer',
          fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 16,
          letterSpacing: '-0.01em', transition: 'opacity .15s',
          boxSizing: 'border-box',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <span>Empezar entrenamiento</span>
        <ArrowRight size={20} />
      </button>
    </div>
  );
}
