import { useState } from 'react';
import { parseLocation, searchInventory } from '../logic.js';
import Thumb from './Thumb.jsx';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function SearchTab({ state }) {
  const [query, setQuery] = useState('');
  const [aisle, setAisle] = useState(null); // null = all aisles

  const aisles = [...new Set(state.stock.filter((r) => r.cases > 0).map((r) => parseLocation(r.location).aisle))].sort(
    (a, b) => a - b
  );
  const matches = searchInventory(state, query);
  const results =
    aisle === null ? matches : matches.filter((p) => p.locations.some((l) => parseLocation(l.location).aisle === aisle));
  const filtered = query.trim() !== '' || aisle !== null;

  return (
    <section>
      <label className="field">
        <span>Search by SKU or product name</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. TURTLE-01 or turtle"
          autoComplete="off"
          enterKeyHint="search"
        />
      </label>

      <div className="filter-bar">
        <div className="chips" role="group" aria-label="Filter by aisle">
          <button className={aisle === null ? 'chip active' : 'chip'} onClick={() => setAisle(null)}>
            All aisles
          </button>
          {aisles.map((a) => (
            <button key={a} className={aisle === a ? 'chip active' : 'chip'} onClick={() => setAisle(a)}>
              A{a}
            </button>
          ))}
        </div>
        <div className="row-between">
          <span className="muted small" aria-live="polite">
            Showing {results.length} of {plural(state.products.length, 'product')}
          </span>
          {filtered && (
            <button className="btn link small" onClick={() => { setQuery(''); setAisle(null); }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {results.length === 0 && <div className="notice">No products match these filters.</div>}

      <div className="stack tight">
        {results.map((p) => (
          <details key={p.sku} className="card expandable">
            <summary>
              <Thumb product={p} />
              <div className="grow">
                <div className="item-name">{p.name}</div>
                <div className="muted small truncate">
                  <span className="sku">{p.sku}</span> · {p.unitsPerCase}/case
                </div>
              </div>
              <div className="item-total">
                <strong>{plural(p.totalCases, 'case')}</strong>
                <span className="muted small">{p.totalUnits} units</span>
              </div>
              <span className="chevron" aria-hidden="true" />
            </summary>

            {p.locations.length === 0 ? (
              <p className="notice warn">No cases in storage.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th className="num">Cases</th>
                    <th className="num">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {p.locations.map((l) => (
                    <tr key={l.location}>
                      <td className="mono">{l.location}</td>
                      <td className="num">{l.cases}</td>
                      <td className="num muted">{l.cases * p.unitsPerCase}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="strong">Total</td>
                    <td className="num strong">{p.totalCases}</td>
                    <td className="num strong">
                      {p.totalUnits} <span className="muted small">({p.totalCases} × {p.unitsPerCase})</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </details>
        ))}
      </div>
    </section>
  );
}
