import { ArrowLeft, Check, Loader2, RotateCcw, X } from 'lucide-react';
import type { Exercise, MovementCategory } from '../../../types';
import { CATEGORY_LABELS } from '../../../types';

interface PendingEntry {
  exercise: Exercise;
  willBeEnabled: boolean;
}

interface LibraryConfirmScreenProps {
  pendingChanges: PendingEntry[];
  confirmDone: boolean;
  totalsOn: number;
  regenerating: boolean;
  onBack: () => void;
  onCommit: () => void;
  onCloseDone: () => void;
}

export function LibraryConfirmScreen({
  pendingChanges,
  confirmDone,
  totalsOn,
  regenerating,
  onBack,
  onCommit,
  onCloseDone,
}: LibraryConfirmScreenProps) {
  const turnedOff = pendingChanges.filter((entry) => !entry.willBeEnabled);
  const turnedOn = pendingChanges.filter((entry) => entry.willBeEnabled);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: '60vh' }}>
      <div style={{ paddingBottom: 20, borderBottom: '1px solid var(--rule)' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', color: 'var(--muted)', fontSize: 14, fontWeight: 500, padding: 0, marginBottom: 14 }}>
          <ArrowLeft size={16} /> Atrás
        </button>
        <div style={{ fontSize: 11, letterSpacing: '0.14em', fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
          Actualizar programa
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em' }}>
          {confirmDone ? '¡Listo!' : `${pendingChanges.length} ${pendingChanges.length === 1 ? 'cambio' : 'cambios'}`}
        </h1>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.45 }}>
          {confirmDone ? 'Tu programa se regeneró con los ejercicios actualizados.' : 'Forge regenerará tu programa aplicando estos cambios.'}
        </div>
      </div>

      <div style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {!confirmDone && turnedOff.length > 0 && (
          <div style={{ background: 'var(--paper-2)', borderRadius: 16, border: '1px solid var(--rule)', overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: '#C0392B', textTransform: 'uppercase' }}>
              Excluidos · {turnedOff.length}
            </div>
            {turnedOff.map((entry) => (
              <div key={entry.exercise.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--rule)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)', textDecoration: 'line-through', textDecorationColor: 'var(--rule)' }}>{entry.exercise.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{CATEGORY_LABELS[entry.exercise.category as MovementCategory]}</div>
                </div>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--paper)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={10} style={{ color: 'var(--muted)' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!confirmDone && turnedOn.length > 0 && (
          <div style={{ background: 'var(--paper-2)', borderRadius: 16, border: '1px solid var(--rule)', overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Activados · {turnedOn.length}
            </div>
            {turnedOn.map((entry) => (
              <div key={entry.exercise.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--rule)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{entry.exercise.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{CATEGORY_LABELS[entry.exercise.category as MovementCategory]}</div>
                </div>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={11} color="var(--paper)" />
                </div>
              </div>
            ))}
          </div>
        )}

        {confirmDone && (
          <div style={{ background: 'var(--paper-2)', borderRadius: 16, border: '1px solid var(--rule)', padding: 24, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Check size={22} color="var(--paper)" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Programa actualizado</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
              {totalsOn} ejercicios disponibles en tu biblioteca.
            </div>
          </div>
        )}
      </div>

      <div style={{ paddingTop: 20, paddingBottom: 32 }}>
        {!confirmDone ? (
          <button
            onClick={onCommit}
            disabled={regenerating}
            style={{
              width: '100%', height: 54, borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: 15, fontWeight: 600, cursor: regenerating ? 'not-allowed' : 'pointer',
              border: 'none', fontFamily: 'var(--sans)', opacity: regenerating ? 0.7 : 1,
              transition: 'opacity .15s',
            }}
          >
            {regenerating ? (
              <>
                <Loader2 size={16} style={{ animation: 'lib-spin 0.7s linear infinite' }} />
                Generando…
              </>
            ) : (
              <><RotateCcw size={15} /> Confirmar y actualizar</>
            )}
          </button>
        ) : (
          <button onClick={onCloseDone} style={{ width: '100%', height: 54, borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'var(--sans)' }}>
            Volver a la biblioteca
          </button>
        )}
      </div>
    </div>
  );
}
