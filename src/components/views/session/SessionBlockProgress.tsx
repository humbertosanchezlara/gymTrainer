interface BlockDefinition {
  name: string;
  num: number;
  desc: string;
}

interface SessionBlockProgressProps {
  blocks: readonly BlockDefinition[];
  blockNum: number;
  blockDesc: string;
}

export function SessionBlockProgress({ blocks, blockNum, blockDesc }: SessionBlockProgressProps) {
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 20px' }}>
      <div className="uc" style={{ color: 'var(--muted)', marginBottom: 12 }}>Bloque actual</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {blocks.map((block) => {
          const isActive = blockNum === block.num;
          const isPast = blockNum > block.num;
          return (
            <div key={block.num} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
              <div
                style={{
                  height: 3,
                  width: '100%',
                  borderRadius: 99,
                  background: isActive ? 'var(--accent)' : isPast ? 'var(--ink)' : 'var(--rule)',
                  transition: 'background .2s',
                }}
              />
              <span
                className="mono caption"
                style={{
                  fontSize: 9,
                  color: isActive ? 'var(--accent)' : isPast ? 'var(--ink)' : 'var(--muted)',
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                {block.name.slice(0, isActive ? 20 : 3).toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
      {blockDesc && (
        <div className="caption" style={{ marginTop: 10, color: 'var(--muted)', textAlign: 'center' }}>
          {blockDesc}
        </div>
      )}
    </div>
  );
}
