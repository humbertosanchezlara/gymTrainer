import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function SessionRpeGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 12, overflow: 'hidden' }}>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          color: 'var(--ink)',
          cursor: 'pointer',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          textAlign: 'left',
          fontFamily: 'var(--sans)',
        }}
      >
        <div>
          <div className="uc" style={{ color: 'var(--muted)', marginBottom: 4 }}>Guía de RPE y rango</div>
          <div className="caption" style={{ color: 'var(--muted)', lineHeight: 1.4 }}>
            RPE 8 = quedan 2 reps · Rango registra si el movimiento fue normal, parcial u objetivo.
          </div>
        </div>
        <ChevronDown
          size={18}
          style={{
            color: 'var(--muted)',
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 180ms ease',
          }}
        />
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 220ms ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--rule)' }}>
            <div className="uc" style={{ color: 'var(--muted)', marginTop: 14, marginBottom: 10 }}>RPE — Esfuerzo Percibido</div>
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

            <div className="uc" style={{ color: 'var(--muted)', marginTop: 18, marginBottom: 10 }}>Rango — Movimiento</div>
            <div className="caption" style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
              El dropdown de rango indica cuánto recorrido lograste con buena técnica. Usa{' '}
              <strong style={{ color: 'var(--ink)' }}>Normal</strong> cuando no hay nada especial que marcar,{' '}
              <strong style={{ color: 'var(--ink)' }}>Parcial</strong> si acortaste el movimiento por control, molestia o readaptación, y{' '}
              <strong style={{ color: 'var(--ink)' }}>Objetivo</strong> cuando hiciste el rango completo esperado sin forzar.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
