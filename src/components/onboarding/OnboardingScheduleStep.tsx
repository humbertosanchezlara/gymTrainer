import { OnboardingSectionHeader } from './OnboardingControls';

interface OnboardingScheduleStepProps {
  totalSteps: number;
  isNoEquipment: boolean;
  scheduleDays: number;
  onScheduleDaysChange: (value: number) => void;
  sessionMinutes: number;
  onSessionMinutesChange: (value: number) => void;
  limitations: string;
  onLimitationsChange: (value: string) => void;
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
}: OnboardingScheduleStepProps) {
  return (
    <div>
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
      </div>
    </div>
  );
}
