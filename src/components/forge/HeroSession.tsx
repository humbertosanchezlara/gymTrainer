import { ArrowRight, Loader2, RotateCcw, Sparkles } from 'lucide-react';

interface HeroSessionProps {
  sessionName: string;
  exerciseCount: number;
  duration?: string;
  onStart: () => void;
  isAdjusting?: boolean;
  adjustedSummary?: string | null;
  onRevert?: () => void;
}

export function HeroSession({
  sessionName,
  exerciseCount,
  duration,
  onStart,
  isAdjusting,
  adjustedSummary,
  onRevert,
}: HeroSessionProps) {
  const meta = [
    exerciseCount > 0 ? `${exerciseCount} ejercicios` : null,
    duration ?? null,
  ].filter(Boolean).join(' · ');

  return (
    <div style={{
      background: 'var(--ink)', color: 'var(--paper)',
      borderRadius: 24, padding: '22px 22px 20px',
      display: 'flex', flexDirection: 'column', gap: 18,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Content — blurred while adjusting */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 18,
        transition: 'filter .3s, opacity .3s',
        filter: isAdjusting ? 'blur(3px)' : 'none',
        opacity: isAdjusting ? 0.5 : 1,
        pointerEvents: isAdjusting ? 'none' : undefined,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Label row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.08em', opacity: 0.45, fontFamily: 'var(--sans)',
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

        {/* Adjusted banner */}
        {adjustedSummary && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14, padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
              <Sparkles size={15} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, lineHeight: 1.5, fontFamily: 'var(--sans)' }}>
                <strong style={{ color: 'var(--accent)' }}>Ajustado: </strong>
                {adjustedSummary}
              </span>
            </div>
            {onRevert && (
              <button
                onClick={onRevert}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--sans)',
                  fontSize: 13, fontWeight: 500, padding: '2px 0',
                  transition: 'color .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
              >
                <RotateCcw size={13} />
                Revertir
              </button>
            )}
          </div>
        )}

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

      {/* Loading overlay */}
      {isAdjusting && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--paper)', color: 'var(--ink)',
            borderRadius: 999, padding: '10px 18px',
            fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 14,
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          }}>
            <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
            Ajustando con IA…
          </div>
        </div>
      )}
    </div>
  );
}
