import { Choice, OnboardingSectionHeader } from './OnboardingControls';

interface OnboardingIdentityStepProps {
  totalSteps: number;
  name: string;
  onNameChange: (value: string) => void;
  gender: 'male' | 'female';
  onGenderChange: (value: 'male' | 'female') => void;
  bodyweight: number;
  onBodyweightChange: (value: number) => void;
  height: number;
  onHeightChange: (value: number) => void;
  bmi: number;
  bmiLabel: string;
  onInvalidateLifts: () => void;
}

export function OnboardingIdentityStep({
  totalSteps,
  name,
  onNameChange,
  gender,
  onGenderChange,
  bodyweight,
  onBodyweightChange,
  height,
  onHeightChange,
  bmi,
  bmiLabel,
  onInvalidateLifts,
}: OnboardingIdentityStepProps) {
  return (
    <div>
      <OnboardingSectionHeader n="01" totalSteps={totalSteps} question="¿Quién eres?" hint="Usaremos esto para calibrar tu programa." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div>
          <div className="uc" style={{ color: 'var(--muted)', marginBottom: 12, fontSize: 11 }}>Nombre</div>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Tu nombre"
            autoFocus
            style={{
              width: '100%',
              boxSizing: 'border-box',
              fontSize: 24,
              padding: '20px 0',
              border: 'none',
              borderBottom: '2px solid var(--rule)',
              background: 'transparent',
              color: 'var(--ink)',
              fontFamily: 'var(--sans)',
              outline: 'none',
              transition: 'border-color .2s',
            }}
            onFocus={(e) => { e.target.style.borderBottomColor = 'var(--ink)'; }}
            onBlur={(e) => { e.target.style.borderBottomColor = 'var(--rule)'; }}
          />
        </div>

        <div>
          <div className="uc" style={{ color: 'var(--muted)', marginBottom: 16, fontSize: 11 }}>Género</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Choice label="Masculino" selected={gender === 'male'} onClick={() => { onGenderChange('male'); onInvalidateLifts(); }} />
            <Choice label="Femenino" selected={gender === 'female'} onClick={() => { onGenderChange('female'); onInvalidateLifts(); }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div className="uc" style={{ color: 'var(--muted)', marginBottom: 12, fontSize: 11 }}>Peso corporal (kg)</div>
            <input
              type="number"
              value={bodyweight}
              onChange={(e) => { onBodyweightChange(+e.target.value); onInvalidateLifts(); }}
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 32, fontFamily: 'var(--mono)', fontWeight: 600, padding: '16px 0', border: 'none', borderBottom: '2px solid var(--rule)', background: 'transparent', color: 'var(--ink)', outline: 'none' }}
            />
          </div>
          <div>
            <div className="uc" style={{ color: 'var(--muted)', marginBottom: 12, fontSize: 11 }}>Altura (cm)</div>
            <input
              type="number"
              value={height}
              onChange={(e) => onHeightChange(+e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 32, fontFamily: 'var(--mono)', fontWeight: 600, padding: '16px 0', border: 'none', borderBottom: '2px solid var(--rule)', background: 'transparent', color: 'var(--ink)', outline: 'none' }}
            />
          </div>
        </div>

        {bodyweight > 0 && height > 0 && (
          <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="uc" style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 4 }}>IMC</div>
              <div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>{bmi.toFixed(1)}</div>
            </div>
            <span style={{ fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 14px', borderRadius: 999, border: '1px solid var(--rule)', color: 'var(--muted)' }}>
              {bmiLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
