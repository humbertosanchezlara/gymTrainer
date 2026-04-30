import { ArrowRight } from 'lucide-react';

interface DashboardProgramLinkCardProps {
  onClick: () => void;
}

export function DashboardProgramLinkCard({ onClick }: DashboardProgramLinkCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '16px 20px',
        background: 'transparent',
        border: '1px dashed var(--rule)',
        borderRadius: 20,
        cursor: 'pointer',
        fontFamily: 'var(--sans)',
        fontWeight: 600,
        fontSize: 14,
        color: 'var(--ink)',
        transition: 'border-color .15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--muted)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--rule)';
      }}
    >
      <span>Ver programa completo</span>
      <ArrowRight size={16} />
    </button>
  );
}
