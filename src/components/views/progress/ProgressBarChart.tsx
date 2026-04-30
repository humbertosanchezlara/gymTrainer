import type { WeeklyMetric } from './useProgressMetrics';

interface ProgressBarChartProps {
  title: string;
  subtitle: string;
  data: WeeklyMetric[];
  field: 'volume' | 'sessions';
  formatValue: (value: number) => string;
}

export function ProgressBarChart({ title, subtitle, data, field, formatValue }: ProgressBarChartProps) {
  const maxValue = Math.max(...data.map((entry) => entry[field]), 1);

  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 16, padding: '20px 20px 18px', background: 'var(--paper-2)' }}>
      <div className="uc" style={{ color: 'var(--muted)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 18 }}>{subtitle}</div>

      {data.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aún no hay suficientes sesiones para graficar.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`, gap: 10, alignItems: 'end', minHeight: 180 }}>
          {data.map((entry) => {
            const value = entry[field];
            const height = Math.max(16, Math.round((value / maxValue) * 120));
            return (
              <div key={`${field}-${entry.week}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div className="mono caption" style={{ color: 'var(--muted)' }}>{formatValue(value)}</div>
                <div style={{ width: '100%', height: 132, display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{
                    width: '100%',
                    height,
                    borderRadius: 12,
                    background: field === 'volume' ? 'var(--ink)' : 'var(--accent)',
                    transition: 'height .2s ease',
                  }} />
                </div>
                <div className="mono caption" style={{ color: 'var(--muted)' }}>{entry.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
