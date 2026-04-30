import type { BlockParams } from '../../../engine/programGenerator';

interface ProgramRpeInfoProps {
  block: BlockParams;
  showRPE: boolean;
  onToggle: () => void;
}

export function ProgramRpeInfo({ block, showRPE, onToggle }: ProgramRpeInfoProps) {
  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 10.5,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}>ESTA SEMANA</div>

        <button
          onClick={onToggle}
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: 0,
          }}
        >
          <span style={{
            width: 13,
            height: 13,
            borderRadius: '50%',
            border: '1px solid rgba(0,0,0,0.15)',
            fontSize: 9,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}>?</span>
          QUÉ ES RPE
        </button>
      </div>

      <div className={`program-rpe-collapse${showRPE ? ' open' : ''}`}>
        <div>
          <div style={{ marginBottom: 14 }}>
            <div style={{
              background: 'var(--ink)',
              color: 'var(--paper)',
              borderRadius: 10,
              padding: '14px 16px',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}>
              <button
                onClick={onToggle}
                style={{
                  width: 22,
                  height: 22,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  background: 'rgba(241,237,228,0.12)',
                  border: 'none',
                  flexShrink: 0,
                  fontSize: 14,
                  color: 'var(--paper)',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}>×</button>
              <div>
                <div style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  opacity: 0.55,
                  marginBottom: 6,
                }}>QUÉ ES RPE</div>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                  Reps que te quedaron en el tanque al terminar la serie.
                  En este bloque (RPE {block.rpeMin}–{block.rpeMax}) deberías sentir que podrías
                  haber hecho{' '}
                  {block.rpeMax <= 7 ? '3 o más repeticiones más.' :
                   block.rpeMax <= 8 ? '2–3 repeticiones más.' :
                   block.rpeMax <= 9 ? '1–2 repeticiones más.' :
                   '0–1 repeticiones más (al límite).'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
