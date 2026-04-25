import { Loader2, Sparkles } from 'lucide-react';

interface AdjustWithAIProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function AdjustWithAI({ value, onChange, onSubmit, loading }: AdjustWithAIProps) {
  return (
    <div style={{
      border: '1px solid var(--rule)', borderRadius: 20, padding: 20,
      display: 'flex', flexDirection: 'column', gap: 14,
      background: 'color-mix(in oklab, var(--ink), transparent 96%)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={15} style={{ color: 'var(--accent)' }} />
        <span style={{
          fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', fontFamily: 'var(--sans)',
        }}>
          Ajustar sesión con IA
        </span>
      </div>

      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder='"me duele el hombro" · "solo tengo 30 min" · "estoy muy cansado"'
        rows={3}
        style={{
          resize: 'none', width: '100%', boxSizing: 'border-box',
          background: 'var(--paper-2)', border: '1px solid var(--rule)',
          color: 'var(--ink)', borderRadius: 12, padding: '12px 14px',
          fontSize: 14, lineHeight: 1.5, fontFamily: 'var(--sans)',
          outline: 'none',
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />

      <button
        onClick={onSubmit}
        disabled={!value.trim() || loading}
        style={{
          alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 18px', borderRadius: 999,
          background: value.trim() && !loading ? 'var(--ink)' : 'transparent',
          color: value.trim() && !loading ? 'var(--paper)' : 'var(--muted)',
          border: `1px solid ${value.trim() && !loading ? 'var(--ink)' : 'var(--rule)'}`,
          cursor: value.trim() && !loading ? 'pointer' : 'not-allowed',
          fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13,
          transition: 'all .15s',
        }}
      >
        {loading
          ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Ajustando…</>
          : 'Ajustar'}
      </button>
    </div>
  );
}
