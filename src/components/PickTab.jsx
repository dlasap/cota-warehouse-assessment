import { useMemo, useState } from 'react';
import { buildPickList, parseLocation, pickMovement } from '../logic.js';
import Thumb from './Thumb.jsx';

const EXAMPLE = [
  { sku: 'TURTLE-01', cases: '1' },
  { sku: 'SHARK-02', cases: '1' },
  { sku: 'ALIEN-04', cases: '1' },
];
const NEW_LINE = { sku: '', cases: '1' };
const EMPTY = [NEW_LINE];

export default function PickTab({ state, record }) {
  const [lines, setLines] = useState(EXAMPLE);
  const [done, setDone] = useState(null);

  const list = useMemo(
    () => buildPickList(state, lines.map((l) => ({ sku: l.sku, cases: l.cases === '' ? NaN : Number(l.cases) }))),
    [state, lines]
  );
  const aisles = [...new Set(list.picks.map((p) => parseLocation(p.location).aisle))];
  const productBySku = new Map(state.products.map((p) => [p.sku, p]));

  const update = (i, patch) => {
    setDone(null);
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  };

  const confirm = () => {
    record((meta) => pickMovement(list, meta));
    setDone(`Saved: ${list.picks.length} pick${list.picks.length === 1 ? '' : 's'} confirmed and deducted from storage.`);
    setLines(EMPTY);
  };

  return (
    <section>
      <div className="row-between">
        <h2 className="section-title">Pick request</h2>
        <button className="btn link" onClick={() => { setLines(EXAMPLE); setDone(null); }}>
          Load example
        </button>
      </div>

      <datalist id="skus">
        {state.products.map((p) => (
          <option key={p.sku} value={p.sku}>{p.name}</option>
        ))}
      </datalist>

      <div className="stack tight">
        {lines.map((l, i) => (
          <div key={i} className="request-line">
            <input
              aria-label="SKU"
              list="skus"
              placeholder="SKU"
              value={l.sku}
              onChange={(e) => update(i, { sku: e.target.value.toUpperCase() })}
              autoCapitalize="characters"
            />
            <input
              aria-label="Cases"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              placeholder="Cases"
              value={l.cases}
              onChange={(e) => update(i, { cases: e.target.value })}
            />
            <button
              className="btn icon"
              aria-label="Remove line"
              onClick={() => setLines((ls) => (ls.length === 1 ? EMPTY : ls.filter((_, j) => j !== i)))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button className="btn ghost" onClick={() => setLines((ls) => [...ls, NEW_LINE])}>
        + Add line
      </button>

      {done && <div className="notice success">{done}</div>}

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
        <article className="card">
          <div className="card-head">
            <h2>Pick list</h2>
            <span className="pill neutral">Route: Aisle {aisles.join(' → ')}</span>
          </div>
          <ol className="picks">
            {list.picks.map((p) => (
              <li key={`${p.sku}@${p.location}`}>
                <span className="seq">{p.sequence}</span>
                <Thumb product={productBySku.get(p.sku)} />
                <div className="grow">
                  <div className="mono strong">{p.location}</div>
                  <div className="muted small truncate">
                    <span className="sku">{p.sku}</span> · {p.name}
                  </div>
                </div>
                <div className="qty">
                  <strong>{p.cases}</strong>
                  <span className="muted small">case{p.cases === 1 ? '' : 's'}</span>
                </div>
              </li>
            ))}
          </ol>
          <button className="btn primary block" onClick={confirm}>
            Confirm picked{list.problems.length > 0 ? ' (excluding blocked lines)' : ''}
          </button>
        </article>
      )}
    </section>
  );
}
