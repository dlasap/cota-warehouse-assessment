import { useEffect, useMemo, useRef, useState } from 'react';
import { buildPickList, parseLocation, pickMovement } from '../logic.js';
import Thumb from './Thumb.jsx';

const NEW_LINE = { sku: '', cases: '1' };
const EMPTY = [NEW_LINE];

// An example request built from what is actually in storage: the three best-stocked
// products, one case each, so it can always be picked.
function exampleFrom(stock) {
  const totals = new Map();
  for (const r of stock) if (r.cases > 0) totals.set(r.sku, (totals.get(r.sku) ?? 0) + r.cases);
  const lines = [...totals]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([sku]) => ({ sku, cases: '1' }));
  return lines.length > 0 ? lines : EMPTY;
}

export default function PickTab({ state, record, onShowInventory }) {
  const [lines, setLines] = useState(() => exampleFrom(state.stock));
  const [done, setDone] = useState(null);
  const [checked, setChecked] = useState({ sig: '', keys: [] });
  const [requestOpen, setRequestOpen] = useState(true);
  const [focusList, setFocusList] = useState(false);
  const pickListRef = useRef(null);

  // After "Done", wait for the request to fold, then bring the pick list into view.
  useEffect(() => {
    if (!focusList) return;
    setFocusList(false);
    const el = pickListRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  }, [focusList]);

  const list = useMemo(
    () => buildPickList(state, lines.map((l) => ({ sku: l.sku, cases: l.cases === '' ? NaN : Number(l.cases) }))),
    [state, lines]
  );
  const aisles = [...new Set(list.picks.map((p) => parseLocation(p.location).aisle))];
  const productBySku = new Map(state.products.map((p) => [p.sku, p]));
  const casesInStorage = useMemo(() => {
    const totals = new Map();
    for (const r of state.stock) totals.set(r.sku, (totals.get(r.sku) ?? 0) + Math.max(r.cases, 0));
    return totals;
  }, [state.stock]);
  const products = [...state.products].sort((a, b) => a.sku.localeCompare(b.sku));
  const totalCases = list.picks.reduce((sum, p) => sum + p.cases, 0);

  // Step check-offs belong to one exact pick list; any change to the list clears them.
  const pickKey = (p) => `${p.sku}@${p.location}`;
  const sig = list.picks.map((p) => `${pickKey(p)}x${p.cases}`).join('|');
  const picked = new Set(checked.sig === sig ? checked.keys : []);
  const pickedCount = list.picks.filter((p) => picked.has(pickKey(p))).length;
  const remaining = list.picks.length - pickedCount;
  const activeKey = list.picks.map(pickKey).find((k) => !picked.has(k));
  const toggle = (key) => {
    // Checking off the first step means picking has started: fold the request away.
    if (!picked.has(key)) setRequestOpen(false);
    setChecked((c) => {
      const keys = c.sig === sig ? c.keys : [];
      return { sig, keys: keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key] };
    });
  };

  // The request can only collapse once it has at least one product to summarise.
  const filledLines = lines.filter((l) => l.sku);
  const requestedCases = filledLines.reduce((sum, l) => sum + (Number(l.cases) || 0), 0);
  const showRequest = requestOpen || filledLines.length === 0;

  const loadExample = () => {
    setLines(exampleFrom(state.stock));
    setDone(null);
    setRequestOpen(true);
  };
  const clear = () => {
    setLines(EMPTY);
    setDone(null);
  };

  const update = (i, patch) => {
    setDone(null);
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  };

  const confirm = () => {
    record((meta) => pickMovement(list, meta));
    setDone(`Saved: ${list.picks.length} pick${list.picks.length === 1 ? '' : 's'} confirmed and deducted from storage.`);
    setLines(EMPTY);
    setChecked({ sig: '', keys: [] });
    setRequestOpen(true);
  };

  return (
    <section>
      {!showRequest ? (
        <button
          type="button"
          className="card request-summary"
          aria-expanded="false"
          onClick={() => setRequestOpen(true)}
        >
          <span className="row-between">
            <span>
              <span className="request-title">Pick request</span>
              <span className="muted small">
                {filledLines.length} product{filledLines.length === 1 ? '' : 's'} · {requestedCases} case
                {requestedCases === 1 ? '' : 's'} requested
              </span>
            </span>
            <span className="edit-hint">
              Edit <span className="chevron" aria-hidden="true" />
            </span>
          </span>
          <span className="request-chips">
            {filledLines.map((l, i) => (
              <span key={i} className="request-chip">
                <Thumb product={productBySku.get(l.sku)} size={28} />
                <span className="sku">{l.sku}</span>× {l.cases || '?'}
              </span>
            ))}
          </span>
        </button>
      ) : (
        <div className="card request-card">
          <div className="row-between">
            <h2 className="section-title">Pick request</h2>
            <span className="request-actions">
              {filledLines.length > 0 && (
                <>
                  <button className="btn link clear" onClick={clear}>
                    Clear
                  </button>
                  <button className="btn link" aria-expanded="true" onClick={() => setRequestOpen(false)}>
                    Hide <span className="chevron up" aria-hidden="true" />
                  </button>
                </>
              )}
            </span>
          </div>

          {filledLines.length === 0 && (
            <div className="notice empty request-empty">
              <strong>No products in this request</strong>
              <span className="muted">Choose products below, or start from an example based on current stock.</span>
              <button className="btn link" onClick={loadExample}>
                Load example
              </button>
            </div>
          )}

          <div className="stack tight">
            <div className="request-line request-head" aria-hidden="true">
              <span />
              <span className="field-label">Product</span>
              <span className="field-label">Cases</span>
              <span />
            </div>
            {lines.map((l, i) => (
              <div key={i} className="request-line">
                <Thumb product={productBySku.get(l.sku)} size={56} />
                <div>
                  <select
                    aria-label={`Product, line ${i + 1}`}
                    value={l.sku}
                    onChange={(e) => update(i, { sku: e.target.value })}
                  >
                    <option value="">Select a product…</option>
                    {products
                      .filter((p) => p.sku === l.sku || !lines.some((o, j) => j !== i && o.sku === p.sku))
                      .map((p) => {
                      const inStorage = casesInStorage.get(p.sku) ?? 0;
                      return (
                        <option key={p.sku} value={p.sku}>
                          {p.sku} — {p.name} ({inStorage} case{inStorage === 1 ? '' : 's'} in storage)
                        </option>
                      );
                    })}
                  </select>
                  {l.sku && productBySku.has(l.sku) && (
                    <div className="field-hint">
                      {productBySku.get(l.sku).unitsPerCase} units per case
                    </div>
                  )}
                </div>
                <input
                  aria-label={`Cases, line ${i + 1}`}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  placeholder="Cases"
                  value={l.cases}
                  onChange={(e) => update(i, { cases: e.target.value })}
                />
                <button
                  className="btn icon remove"
                  aria-label={`Remove line ${i + 1}`}
                  onClick={() => setLines((ls) => (ls.length === 1 ? EMPTY : ls.filter((_, j) => j !== i)))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="request-buttons">
            <button
              className="btn add-line"
              onClick={() => setLines((ls) => [...ls, NEW_LINE])}
              disabled={lines.length >= products.length}
            >
              + Add line
            </button>
            <button
              className="btn done"
              disabled={list.picks.length === 0}
              onClick={() => { setRequestOpen(false); setFocusList(true); }}
            >
              <span aria-hidden="true">✓</span> Done
            </button>
          </div>
        </div>
      )}

      {done && (
        <div className="notice success done-notice">
          <span>{done}</span>
          <button className="btn link" onClick={onShowInventory}>
            Show current inventory →
          </button>
        </div>
      )}

      {list.problems.length > 0 && (
        <div className="notice error">
          <strong>Cannot pick — {list.problems.length} line{list.problems.length === 1 ? ' needs' : 's need'} attention</strong>
          <ul>
            {list.problems.map((p) => (
              <li key={p.sku + p.reason}>
                <span className="mono">{p.sku}</span>
                {p.requested !== undefined && !Number.isNaN(p.requested) && ` (requested ${p.requested})`}: {p.message}
              </li>
            ))}
          </ul>
          These lines are not on the pick list below. Nothing is picked partially.
        </div>
      )}

      {list.picks.length > 0 && (
        <article className="card pick-list" ref={pickListRef} tabIndex={-1} aria-label="Pick list">
          <div className="card-head">
            <h2>Pick list</h2>
            <span className="pill neutral">Route: Aisle {aisles.join(' → ')}</span>
          </div>
          <div className="pick-summary muted small">
            {list.picks.length} stop{list.picks.length === 1 ? '' : 's'} · {totalCases} case{totalCases === 1 ? '' : 's'} total ·{' '}
            {aisles.length} aisle{aisles.length === 1 ? '' : 's'} ·{' '}
            <strong>{pickedCount} of {list.picks.length} picked</strong>
          </div>
          <div className="picks-head field-label" aria-hidden="true">
            <span>Step</span>
            <span className="grow">Location</span>
            <span>To pick</span>
            <span className="check-col">Done</span>
          </div>
          <ol className="picks">
            {list.picks.map((p) => {
              const key = pickKey(p);
              const isPicked = picked.has(key);
              const unit = `case${p.cases === 1 ? '' : 's'}`;
              return (
                <li key={key} className={isPicked ? 'picked' : key === activeKey ? 'active' : undefined}>
                  <span className="seq" aria-label={`Step ${p.sequence}`}>{p.sequence}</span>
                  <Thumb product={productBySku.get(p.sku)} />
                  <div className="grow">
                    <div className="loc-code">{p.location}</div>
                    <div className="pick-product">
                      <span className="sku">{p.sku}</span>
                      <span className="pick-name">{p.name}</span>
                    </div>
                  </div>
                  <div className="qty">
                    <strong>{p.cases}</strong>
                    <span className="unit">{unit}</span>
                  </div>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isPicked}
                    aria-label={`Step ${p.sequence}: picked ${p.cases} ${unit} of ${p.sku} from ${p.location}`}
                    className="step-check"
                    onClick={() => toggle(key)}
                  >
                    <span aria-hidden="true">{isPicked ? '✓' : ''}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <button className="btn primary block" onClick={confirm} disabled={remaining > 0}>
            {remaining > 0
              ? `Check off ${remaining} more step${remaining === 1 ? '' : 's'} to confirm`
              : `Confirm picked${list.problems.length > 0 ? ' (excluding blocked lines)' : ''}`}
          </button>
        </article>
      )}
    </section>
  );
}
