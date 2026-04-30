export function SessionRpeGuide() {
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 20px' }}>
      <div className="uc" style={{ color: 'var(--muted)', marginBottom: 10 }}>RPE — Esfuerzo Percibido</div>
      <div className="caption" style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 10 }}>
        RPE mide cuántas repeticiones te quedaron antes del fallo al terminar cada serie. No es cuánto pesa, es cómo te sentiste.
      </div>
      <div className="mono caption" style={{ color: 'var(--muted)', lineHeight: 2 }}>
        <strong style={{ color: 'var(--ink)' }}>6</strong> = quedan 4+ ·{' '}
        <strong style={{ color: 'var(--ink)' }}>7</strong> = quedan 3 ·{' '}
        <strong style={{ color: 'var(--ink)' }}>8</strong> = quedan 2 ·{' '}
        <strong style={{ color: 'var(--ink)' }}>9</strong> = queda 1 ·{' '}
        <strong style={{ color: 'var(--ink)' }}>10</strong> = fallo
      </div>
      <div className="caption" style={{ color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>
        Ejemplo: si hiciste 8 reps con RPE 8, sentiste que podrías haber hecho 2 más antes de fallar. Ese es el objetivo — entrenar cerca del límite sin llegar a él.
      </div>
    </div>
  );
}
