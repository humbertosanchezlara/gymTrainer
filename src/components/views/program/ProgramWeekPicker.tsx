import { BLOCKS } from '../../../engine/programGenerator';

interface ProgramWeekPickerProps {
  totalWeeks: number;
  currentWeek: number;
  selectedWeek: number;
  onSelect: (week: number) => void;
}

export function ProgramWeekPicker({ totalWeeks, currentWeek, selectedWeek, onSelect }: ProgramWeekPickerProps) {
  const weekNumbers = Array.from({ length: totalWeeks }, (_, index) => index + 1);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
      gap: 8,
      marginBottom: 18,
    }}>
      {weekNumbers.map((week) => {
        const isCurrent = week === currentWeek;
        const isSelected = week === selectedWeek;
        const weekBlock = BLOCKS.find((entry) => entry.weeks.includes(week)) ?? BLOCKS[0];
        return (
          <button
            key={week}
            type="button"
            onClick={() => onSelect(week)}
            style={{
              borderRadius: 12,
              border: isSelected ? '1.5px solid var(--ink)' : '1px solid var(--rule)',
              background: isSelected ? 'var(--paper-2)' : 'transparent',
              padding: '10px 8px',
              cursor: 'pointer',
              fontFamily: 'var(--sans)',
              color: 'var(--ink)',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>{week}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
              {isCurrent ? 'Actual' : weekBlock.name}
            </div>
          </button>
        );
      })}
    </div>
  );
}
