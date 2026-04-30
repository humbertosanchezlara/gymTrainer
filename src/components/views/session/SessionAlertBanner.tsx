import { AlertTriangle } from 'lucide-react';

interface SessionAlertBannerProps {
  title: string;
  description: string;
}

export function SessionAlertBanner({ title, description }: SessionAlertBannerProps) {
  return (
    <div
      style={{
        borderLeft: '3px solid var(--accent)',
        borderRadius: '0 8px 8px 0',
        background: 'color-mix(in oklab, var(--accent), transparent 92%)',
        padding: '12px 16px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <AlertTriangle size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{title}</div>
        <div className="caption" style={{ color: 'var(--muted)' }}>{description}</div>
      </div>
    </div>
  );
}
