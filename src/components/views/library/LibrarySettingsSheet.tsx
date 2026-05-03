import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Trash2 } from 'lucide-react';

interface LibrarySettingsSheetProps {
  settingsConfirming: boolean;
  deletingProgram: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
  onCancelConfirm: () => void;
  onDeleteProgram: () => void;
}

export function LibrarySettingsSheet({
  settingsConfirming,
  deletingProgram,
  onClose,
  onConfirmDelete,
  onCancelConfirm,
  onDeleteProgram,
}: LibrarySettingsSheetProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: 'var(--paper)', borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '10px 0 calc(32px + env(safe-area-inset-bottom, 0px))', boxShadow: '0 -16px 40px -12px rgba(0,0,0,0.25)',
          maxWidth: 800, margin: '0 auto',
          maxHeight: 'min(72dvh, 560px)',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: 42, height: 4, borderRadius: 2, background: 'var(--rule)', margin: '6px auto 18px' }} />
        <div style={{ padding: '0 24px 8px' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', fontWeight: 600, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' }}>
            Ajustes
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Programa</h2>
        </div>

        <div style={{ padding: '14px 20px 0' }}>
          <div style={{ background: 'var(--paper-2)', borderRadius: 16, border: '1px solid rgba(192,57,43,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px 8px', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: '#C0392B', textTransform: 'uppercase' }}>
              Zona de peligro
            </div>
            {!settingsConfirming ? (
              <button
                onClick={onConfirmDelete}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderTop: '1px solid var(--rule)', cursor: 'pointer',
                  background: 'none', border: 'none', borderTopColor: 'var(--rule)', borderTopWidth: 1, borderTopStyle: 'solid',
                  fontFamily: 'var(--sans)', textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 500, color: '#C0392B', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Trash2 size={14} /> Eliminar programa actual
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                    Borra todas las sesiones y el historial reciente.
                  </div>
                </div>
                <ChevronDown size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              </button>
            ) : (
              <div style={{ borderTop: '1px solid var(--rule)', padding: '14px 16px' }}>
                <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.4 }}>
                  ¿Eliminar tu programa?
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.45 }}>
                  Se borrarán las sesiones programadas. Tu biblioteca de ejercicios permanece intacta.
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button onClick={onCancelConfirm} style={{ flex: 1, padding: '12px 0', borderRadius: 999, textAlign: 'center', border: '1px solid var(--rule)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', background: 'none', fontFamily: 'var(--sans)', color: 'var(--ink)' }}>
                    Cancelar
                  </button>
                  <button onClick={onDeleteProgram} disabled={deletingProgram} style={{ flex: 1, padding: '12px 0', borderRadius: 999, textAlign: 'center', background: '#C0392B', color: 'white', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'var(--sans)', opacity: deletingProgram ? 0.7 : 1 }}>
                    {deletingProgram ? 'Eliminando…' : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
