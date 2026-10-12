import { useEffect, useRef, useState } from 'react';
import Thumb from './Thumb.jsx';

const REASONS = ['Wrong quantity picked', 'Wrong product picked', 'Damaged stock', 'Other'];

/**
 * Mock correction form for a confirmed pick. Nothing is sent and stock is not changed:
 * submitting just hands the draft back so the History tab can show a "sent to manager" message.
 */
export default function EditPickDialog({ movement, productBySku, onClose, onSubmit }) {
  const ref = useRef(null);
  const deltas = movement.stockDeltas ?? [];
  const [actual, setActual] = useState(() => deltas.map((d) => String(Math.abs(d.cases))));
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');

  useEffect(() => {
    const el = ref.current;
    el.showModal();
    return () => el.close();
  }, []);

  const changed = deltas.filter((d, i) => Number(actual[i]) !== Math.abs(d.cases)).length;

  const submit = (e) => {
    e.preventDefault();
    onSubmit({ reason, note, changed });
  };

  return (
    <dialog ref={ref} className="edit-dialog" onCancel={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <form onSubmit={submit} className="stack">
        <div>
          <h2 className="section-title">Report a correction</h2>
          <p className="muted small">
            Tell your manager what was actually picked. They will review it before stock is changed.
          </p>
        </div>

        <ul className="entry-lines">
          {deltas.map((d, i) => {
            const p = productBySku.get(d.sku);
            return (
              <li key={`${d.sku}-${d.location}-${i}`}>
                <Thumb product={p} size={36} className="sm" />
                <div className="grow">
                  <div className="line-name truncate">{p?.name ?? d.sku}</div>
                  <div className="muted small truncate">
                    <span className="sku">{d.sku}</span> · <span className="mono">{d.location}</span> · recorded{' '}
                    {Math.abs(d.cases)}
                  </div>
                </div>
                <input
                  className="actual-input"
                  aria-label={`Cases actually picked of ${d.sku} from ${d.location}`}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={actual[i]}
                  onChange={(e) => setActual((a) => a.map((v, j) => (j === i ? e.target.value : v)))}
                />
              </li>
            );
          })}
        </ul>

        <label className="field">
          Reason
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Note for manager (optional)
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Box at A1-R2-S1 was crushed" />
        </label>

        <div className="dialog-buttons">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            Send to manager
          </button>
        </div>
      </form>
    </dialog>
  );
}
