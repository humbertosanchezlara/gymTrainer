import { NumStepper, OnboardingSectionHeader } from './OnboardingControls';

interface KeyLifts {
  squat: number;
  bench: number;
  deadlift: number;
  ohp: number;
}

interface OnboardingKeyLiftsStepProps {
  totalSteps: number;
  keyLifts: KeyLifts;
  onKeyLiftsChange: (value: KeyLifts) => void;
}

export function OnboardingKeyLiftsStep({ totalSteps, keyLifts, onKeyLiftsChange }: OnboardingKeyLiftsStepProps) {
  return (
    <div>
      <OnboardingSectionHeader n="04" totalSteps={totalSteps} question="¿Cuánto estás levantando?" hint="Pesos de trabajo actuales — no 1RMs. Los estimamos de tu perfil; ajústalos si hace falta." />
      <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '16px 24px', background: 'var(--paper-2)', borderBottom: '1px solid var(--rule)' }}>
          <p className="body-s" style={{ color: 'var(--muted)', margin: 0 }}>
            <strong style={{ color: 'var(--ink)' }}>¿Qué es 1RM?</strong> El peso máximo que puedes levantar en una sola repetición con técnica perfecta. No es el peso con el que entrenas a diario.
          </p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {([
          { key: 'squat', label: 'Sentadilla' },
          { key: 'bench', label: 'Press de Pecho (Barra)' },
          { key: 'deadlift', label: 'Peso Muerto' },
          { key: 'ohp', label: 'Press de Hombro' },
        ] as const).map((lift) => (
          <div key={lift.key} style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 24px' }}>
            <div className="uc" style={{ color: 'var(--muted)', fontSize: 10, marginBottom: 16 }}>{lift.label}</div>
            <NumStepper
              value={keyLifts[lift.key]}
              onChange={(value) => onKeyLiftsChange({ ...keyLifts, [lift.key]: value })}
              step={2.5}
              min={0}
            />
          </div>
        ))}
      </div>
      <p className="caption" style={{ color: 'var(--muted)', marginTop: 24 }}>
        La semana 1 es de calibración — estos pesos se validarán durante tus primeras sesiones.
      </p>
    </div>
  );
}
