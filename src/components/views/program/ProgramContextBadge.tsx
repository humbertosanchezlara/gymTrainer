import type { BlockParams } from '../../../engine/programGenerator';

interface ProgramContextBadgeProps {
  selectedWeek: number;
  totalWeeks: number;
  block: BlockParams;
}

export function ProgramContextBadge({ selectedWeek, totalWeeks, block }: ProgramContextBadgeProps) {
  return (
    <div style={{
      background: 'var(--ink)',
      color: 'var(--paper)',
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      marginBottom: 20,
    }}>
      <div style={{
        fontFamily: 'var(--sans)',
        fontSize: 38,
        fontWeight: 700,
        lineHeight: 1,
        minWidth: 38,
        textAlign: 'center',
        letterSpacing: '-0.03em',
      }}>{selectedWeek}</div>

      <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(241,237,228,0.15)' }} />

      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 9.5,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          opacity: 0.55,
        }}>SEMANA {selectedWeek} / {totalWeeks}</div>
        <div style={{
          fontFamily: 'var(--sans)',
          fontSize: 20,
          fontWeight: 600,
          marginTop: 2,
          letterSpacing: '-0.02em',
        }}>Bloque {block.name}</div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 9,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          opacity: 0.55,
          marginBottom: 2,
        }}>OBJETIVO</div>
        <div style={{
          fontFamily: 'var(--sans)',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '-0.01em',
        }}>{block.repsMin}–{block.repsMax} reps · RPE {block.rpeMin}–{block.rpeMax}</div>
      </div>
    </div>
  );
}
