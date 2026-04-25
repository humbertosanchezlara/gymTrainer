import { ArrowUp, Loader2, Sparkles } from 'lucide-react';

interface AdjustWithAIProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

const CHIPS = ['Me duele el hombro', 'Solo tengo 30 min', 'Estoy cansado'];

export function AdjustWithAI({ value, onChange, onSubmit, loading }: AdjustWithAIProps) {
  const canSubmit = value.trim() && !loading;

  return (
    <div style={{
      borderRadius: 20, padding: 20,
      display: 'flex', flexDirection: 'column', gap: 16,
      background: 'color-mix(in oklab, var(--accent), transparent 92%)',
      border: '1px solid color-mix(in oklab, var(--accent), transparent 80%)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 999,
            background: 'color-mix(in oklab, var(--accent), transparent 80%)',
            display: 'grid', placeItems: 'center', position: 'relative',
          }}>
            <Sparkles size={16} style={{ color: 'var(--accent)' }} />
            <span style={{
              position: 'absolute', top: 2, right: 2,
              width: 7, height: 7, borderRadius: 999,
              background: 'var(--accent)',
            }} />
          </div>
          <span style={{
            fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em',
            fontFamily: 'var(--sans)', color: 'var(--ink)',
          }}>
            Ajustar sesión de hoy
          </span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
          color: 'var(--accent)', fontFamily: 'var(--sans)',
        }}>
          IA
        </span>
      </div>

      {/* Input card */}
      <div style={{
        background: 'var(--paper)', borderRadius: 16, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ position: 'relative' }}>
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={'Contame cómo estás hoy. Ej: "me duele el hombro", "solo tengo 30 min"...'}
            rows={3}
            style={{
              resize: 'none', width: '100%', boxSizing: 'border-box',
              background: 'transparent', border: 'none',
              color: 'var(--ink)', padding: 0,
              fontSize: 14, lineHeight: 1.6, fontFamily: 'var(--sans)',
              outline: 'none',
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
                e.preventDefault();
                onSubmit();
              }
            }}
          />
          {/* Submit button */}
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 40, height: 40, borderRadius: 999,
              background: canSubmit ? 'var(--muted)' : 'color-mix(in oklab, var(--ink), transparent 85%)',
              border: 'none', cursor: canSubmit ? 'pointer' : 'default',
              display: 'grid', placeItems: 'center',
              transition: 'background .15s',
              color: 'var(--paper)',
            }}
          >
            {loading
              ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
              : <ArrowUp size={16} />}
          </button>
        </div>

        {/* Suggestion chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => onChange(chip)}
              style={{
                padding: '6px 14px', borderRadius: 999,
                border: '1px solid var(--rule)',
                background: 'transparent',
                color: 'var(--ink)', fontFamily: 'var(--sans)',
                fontSize: 13, cursor: 'pointer',
                transition: 'border-color .15s, background .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--muted)'; e.currentTarget.style.background = 'var(--paper-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--rule)'; e.currentTarget.style.background = 'transparent'; }}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Footer description */}
      <p style={{
        margin: 0, fontSize: 13, lineHeight: 1.5,
        color: 'color-mix(in oklab, var(--ink), transparent 40%)',
        fontFamily: 'var(--sans)',
      }}>
        Forge adapta series, cargas y ejercicios al instante según lo que escribas.
      </p>
    </div>
  );
}
