import type { BlockParams } from '../../../engine/programGenerator';

interface ProgramWeekNoticeProps {
  generatedWeek: boolean;
  selectedWeek: number;
  sourceWeek: number | null;
  block: BlockParams;
}

export function ProgramWeekNotice({ generatedWeek, selectedWeek, sourceWeek, block }: ProgramWeekNoticeProps) {
  if (!generatedWeek) {
    return (
      <div style={{
        background: 'var(--paper-2)',
        border: '1px solid var(--rule)',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Semana aún no generada</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
          Forge todavía no ha generado el detalle de la semana {selectedWeek}. Esta fase seguirá el bloque {block.name}
          {' '}con objetivo de {block.repsMin}–{block.repsMax} reps y RPE {block.rpeMin}–{block.rpeMax}.
        </div>
      </div>
    );
  }

  if (sourceWeek !== null && sourceWeek !== selectedWeek) {
    return (
      <div style={{
        background: 'var(--paper-2)',
        border: '1px solid var(--rule)',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 16,
        fontSize: 12.5,
        color: 'var(--muted)',
      }}>
        Mostrando la plantilla base de la semana {sourceWeek} mientras se genera el detalle actualizado.
      </div>
    );
  }

  return null;
}
