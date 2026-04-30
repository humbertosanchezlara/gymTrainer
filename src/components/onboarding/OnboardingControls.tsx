import { ChevronDown, ChevronUp } from 'lucide-react';

export function Choice({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: selected ? 'var(--ink)' : 'transparent',
        color: selected ? 'var(--paper)' : 'var(--ink)',
        border: '1px solid',
        borderColor: selected ? 'var(--ink)' : 'var(--rule)',
        padding: '14px 22px',
        borderRadius: 999,
        fontSize: 16,
        fontFamily: 'var(--sans)',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background .15s, color .15s, border-color .15s',
      }}
    >
      {label}
    </button>
  );
}

export function NumStepper({ value, onChange, step = 2.5, min = 0 }: { value: number; onChange: (v: number) => void; step?: number; min?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ fontSize: 48, fontWeight: 700, fontFamily: 'var(--mono)', lineHeight: 1, minWidth: 80 }}>{value}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          type="button"
          onClick={() => onChange(Math.round((value + step) / step) * step)}
          style={{ width: 36, height: 36, border: '1px solid var(--rule)', borderRadius: 8, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink)' }}
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, Math.round((value - step) / step) * step))}
          style={{ width: 36, height: 36, border: '1px solid var(--rule)', borderRadius: 8, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink)' }}
        >
          <ChevronDown size={16} />
        </button>
      </div>
      <span className="mono" style={{ color: 'var(--muted)', fontSize: 14 }}>kg</span>
    </div>
  );
}

export function OnboardingSectionHeader({ n, totalSteps, question, hint }: { n: string; totalSteps: number; question: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div className="mono uc" style={{ color: 'var(--muted)', marginBottom: 24, fontSize: 13 }}>{n} / {String(totalSteps).padStart(2, '0')}</div>
      <h1 className="d-xl" style={{ margin: 0 }}>{question}</h1>
      {hint && <p className="body-l" style={{ color: 'var(--muted)', marginTop: 16, maxWidth: 560 }}>{hint}</p>}
    </div>
  );
}
