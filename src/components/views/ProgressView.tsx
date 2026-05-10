import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '../../hooks/useBreakpoint';
import { ProgressMetricCards } from './progress/ProgressMetricCards';
import { ProgressBarChart } from './progress/ProgressBarChart';
import { ProgressWeightTable } from './progress/ProgressWeightTable';
import { ProgressSessionHistory } from './progress/ProgressSessionHistory';
import { useProgressMetrics } from './progress/useProgressMetrics';

export default function ProgressView() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { sessions, weights, weeklyMetrics, liftSnapshots, summary, loading } = useProgressMetrics(user?.id);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const latestRecommendation = sessions.find((session) => session.notes)?.notes ?? null;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--muted)' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="forge-fade" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--rule)', paddingBottom: 16 }}>
        <div>
          <div className="uc" style={{ color: 'var(--muted)' }}>Progreso</div>
          <h1 className="d-l" style={{ margin: 0, marginTop: 8 }}>
            {summary.gymSessions > 0 ? `${summary.gymSessions} sesiones de gym` : 'Tu progreso'}
          </h1>
        </div>
        {weights.length > 0 && (
          <div className="mono caption" style={{ textAlign: 'right' }}>
            {weights.length} pesos de trabajo actuales
          </div>
        )}
      </div>

      {/* Summary stats */}
      <ProgressMetricCards
        isMobile={isMobile}
        metrics={[
          { label: 'Sesiones gym', value: String(summary.gymSessions), caption: 'cuentan para el ciclo actual' },
          { label: 'Bloque actual', value: summary.currentBlockLabel, caption: summary.currentWeekLabel },
          { label: 'Volumen reciente', value: `${Math.round(summary.recentWeeklyVolume).toLocaleString('es-ES')} kg`, caption: 'tonelaje en la última semana con datos' },
          { label: 'Consistencia', value: `${summary.avgSessionsPerWeek}/sem`, caption: summary.avgRpe !== null ? `RPE promedio ${summary.avgRpe}` : 'sin RPE suficiente aún' },
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.1fr) minmax(0, 0.9fr)', gap: 20 }}>
        <ProgressBarChart
          title="Volumen semanal"
          subtitle="Suma de series × reps × peso por semana. Excluye sesiones fuera del gym."
          data={weeklyMetrics}
          field="volume"
          formatValue={(value) => `${Math.round(value / 1000)}k`}
        />
        <ProgressBarChart
          title="Sesiones por semana"
          subtitle="Frecuencia semanal completada dentro del ciclo."
          data={weeklyMetrics}
          field="sessions"
          formatValue={(value) => String(value)}
        />
      </div>

      {liftSnapshots.length > 0 && <ProgressWeightTable lifts={liftSnapshots} />}

      {latestRecommendation && (
        <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: isMobile ? 16 : 20, background: 'var(--paper-2)' }}>
          <div className="uc" style={{ color: 'var(--muted)', marginBottom: 8 }}>Última recomendación guardada</div>
          <div className="body-s" style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
            {latestRecommendation}
          </div>
        </div>
      )}

      {/* Session history */}
      <ProgressSessionHistory
        sessions={sessions}
        expandedSession={expandedSession}
        onToggle={(sessionId) => setExpandedSession((current: string | null) => current === sessionId ? null : sessionId)}
        isMobile={isMobile}
      />
    </div>
  );
}
