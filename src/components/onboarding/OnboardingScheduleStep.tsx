import { OnboardingSectionHeader } from './OnboardingControls';
import type { InjuryDraft } from '../../lib/injuryProfile';

interface OnboardingScheduleStepProps {
  totalSteps: number;
  isNoEquipment: boolean;
  scheduleDays: number;
  onScheduleDaysChange: (value: number) => void;
  sessionMinutes: number;
  onSessionMinutesChange: (value: number) => void;
  limitations: string;
  onLimitationsChange: (value: string) => void;
  injuryDraft: InjuryDraft;
  onInjuryDraftChange: (value: InjuryDraft) => void;
}

export function OnboardingScheduleStep({
  totalSteps,
  isNoEquipment,
  scheduleDays,
  onScheduleDaysChange,
  sessionMinutes,
  onSessionMinutesChange,
  limitations,
  onLimitationsChange,
  injuryDraft,
  onInjuryDraftChange,
}: OnboardingScheduleStepProps) {
  const updateInjury = <K extends keyof InjuryDraft>(key: K, value: InjuryDraft[K]) => {
    onInjuryDraftChange({ ...injuryDraft, [key]: value });
  };

  const fieldControlStyle = {
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
    border: '1px solid var(--rule)',
    borderRadius: 6,
    padding: '10px 12px',
    background: 'transparent',
    color: 'var(--ink)',
    fontFamily: 'var(--sans)',
    fontSize: 16,
    lineHeight: 1.35,
  };

  const fieldLabelStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    minWidth: 0,
  };

  return (
    <div>
      <style>{`
        .injury-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 0.78fr);
          gap: 12px;
        }

        @media (max-width: 430px) {
          .injury-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
      <OnboardingSectionHeader n="03" totalSteps={totalSteps} question="¿Cuántos días?" hint="Sé honesto. Vale más cumplir 3 que prometer 6." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
            <div className="uc" style={{ color: 'var(--muted)', fontSize: 11 }}>Días por semana</div>
            <span className="mono" style={{ fontSize: 64, fontWeight: 700, lineHeight: 1 }}>{scheduleDays}</span>
          </div>
          <input type="range" min={2} max={isNoEquipment ? 5 : 6} value={scheduleDays} onChange={(e) => onScheduleDaysChange(+e.target.value)} style={{ width: '100%', accentColor: 'var(--ink)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }} className="mono caption">
            <span style={{ color: 'var(--muted)' }}>2</span><span style={{ color: 'var(--muted)' }}>3</span>
            <span style={{ color: 'var(--muted)' }}>4</span><span style={{ color: 'var(--muted)' }}>5</span>
            {!isNoEquipment && <span style={{ color: 'var(--muted)' }}>6</span>}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
            <div className="uc" style={{ color: 'var(--muted)', fontSize: 11 }}>Tiempo por sesión</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span className="mono" style={{ fontSize: 64, fontWeight: 700, lineHeight: 1 }}>{sessionMinutes}</span>
              <span className="mono" style={{ color: 'var(--muted)', fontSize: 18 }}>min</span>
            </div>
          </div>
          <input type="range" min={20} max={90} step={5} value={sessionMinutes} onChange={(e) => onSessionMinutesChange(+e.target.value)} style={{ width: '100%', accentColor: 'var(--ink)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }} className="mono caption">
            {['20', '35', '50', '65', '80', '90'].map((value) => <span key={value} style={{ color: 'var(--muted)' }}>{value}</span>)}
          </div>
        </div>

        <div>
          <div className="uc" style={{ color: 'var(--muted)', marginBottom: 12, fontSize: 11 }}>
            Lesiones / Limitaciones <span style={{ opacity: .5 }}>(opcional)</span>
          </div>
          <textarea
            value={limitations}
            onChange={(e) => onLimitationsChange(e.target.value)}
            placeholder="Ej. Dolor en hombro izquierdo, problemas de espalda baja..."
            rows={2}
            style={{ width: '100%', boxSizing: 'border-box', padding: '16px 0', border: 'none', borderBottom: '2px solid var(--rule)', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 16, outline: 'none', resize: 'none' }}
          />
        </div>

        <div style={{ border: '1px solid var(--rule)', borderRadius: 8, padding: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={injuryDraft.enabled}
              onChange={(e) => updateInjury('enabled', e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--ink)' }}
            />
            <span className="uc" style={{ color: 'var(--muted)', fontSize: 11 }}>Usar progresión por lesión</span>
          </label>

          {injuryDraft.enabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
              <div className="injury-grid">
                <label style={fieldLabelStyle}>
                  <span className="caption" style={{ color: 'var(--muted)' }}>Zona</span>
                  <input
                    value={injuryDraft.body_part}
                    onChange={(e) => updateInjury('body_part', e.target.value)}
                    style={fieldControlStyle}
                  />
                </label>
                <label style={fieldLabelStyle}>
                  <span className="caption" style={{ color: 'var(--muted)' }}>Lado</span>
                  <select
                    value={injuryDraft.side}
                    onChange={(e) => updateInjury('side', e.target.value as InjuryDraft['side'])}
                    style={{ ...fieldControlStyle, minWidth: 0 }}
                  >
                    <option value="left">Izquierdo</option>
                    <option value="right">Derecho</option>
                    <option value="bilateral">Bilateral</option>
                    <option value="unspecified">Sin especificar</option>
                  </select>
                </label>
              </div>

              <label style={fieldLabelStyle}>
                <span className="caption" style={{ color: 'var(--muted)' }}>Patrón de síntoma</span>
                <select
                  value={injuryDraft.pain_pattern}
                  onChange={(e) => updateInjury('pain_pattern', e.target.value as InjuryDraft['pain_pattern'])}
                  style={fieldControlStyle}
                >
                  <option value="delayed_next_day">Al día siguiente</option>
                  <option value="post_load_hours_later">Horas después</option>
                  <option value="during_exercise">Durante el ejercicio</option>
                  <option value="load_threshold_only">Solo arriba de cierta carga</option>
                </select>
              </label>

              <label style={fieldLabelStyle}>
                <span className="caption" style={{ color: 'var(--muted)' }}>Señal gatillo</span>
                <textarea
                  rows={2}
                  value={injuryDraft.trigger_sensation}
                  onChange={(e) => updateInjury('trigger_sensation', e.target.value)}
                  style={{ ...fieldControlStyle, minHeight: 76, resize: 'vertical' }}
                />
              </label>

              <label style={fieldLabelStyle}>
                <span className="caption" style={{ color: 'var(--muted)' }}>Evitar</span>
                <textarea
                  rows={3}
                  value={injuryDraft.avoided_exercise_names}
                  onChange={(e) => updateInjury('avoided_exercise_names', e.target.value)}
                  style={{ ...fieldControlStyle, minHeight: 96, resize: 'vertical' }}
                />
              </label>

              <label style={fieldLabelStyle}>
                <span className="caption" style={{ color: 'var(--muted)' }}>Tolerados</span>
                <textarea
                  rows={4}
                  value={injuryDraft.tolerated_exercise_names}
                  onChange={(e) => updateInjury('tolerated_exercise_names', e.target.value)}
                  style={{ ...fieldControlStyle, minHeight: 124, resize: 'vertical' }}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
