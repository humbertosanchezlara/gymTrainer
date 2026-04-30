export function LibraryToggle({ on, onChange }: { on: boolean; onChange: (e: React.MouseEvent) => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 44, height: 26, borderRadius: 999,
        background: on ? 'var(--ink)' : '#C8C2B6',
        position: 'relative', flexShrink: 0, cursor: 'pointer',
        transition: 'background .15s',
      }}
    >
      <div style={{
        position: 'absolute',
        top: 2,
        left: on ? 18 : 2,
        width: 22, height: 22,
        borderRadius: '50%',
        background: 'var(--paper)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
        transition: 'left .18s cubic-bezier(.2,.8,.2,1)',
      }} />
    </div>
  );
}
