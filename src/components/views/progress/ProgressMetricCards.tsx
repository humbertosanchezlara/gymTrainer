interface ProgressMetricCardsProps {
  metrics: Array<{ label: string; value: string; caption: string }>;
  isMobile: boolean;
}

export function ProgressMetricCards({ metrics, isMobile }: ProgressMetricCardsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 0, border: '1px solid var(--rule)', borderRadius: 16, overflow: 'hidden' }}>
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          style={{
            padding: isMobile ? 18 : 24,
            borderLeft: isMobile ? (index % 2 === 0 ? 'none' : '1px solid var(--rule)') : (index === 0 ? 'none' : '1px solid var(--rule)'),
            borderTop: isMobile && index >= 2 ? '1px solid var(--rule)' : 'none',
          }}
        >
          <div className="uc" style={{ color: 'var(--muted)' }}>{metric.label}</div>
          <div className="d-l" style={{ marginTop: 8, fontWeight: 600 }}>{metric.value}</div>
          <div className="caption" style={{ color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{metric.caption}</div>
        </div>
      ))}
    </div>
  );
}
