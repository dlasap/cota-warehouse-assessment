import { useState } from 'react';
import { searchInventory } from '../logic.js';

export default function SearchTab({ state }) {
  const [query, setQuery] = useState('');
  const results = searchInventory(state, query);

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

      {results.length === 0 && <div className="notice">No products match “{query.trim()}”.</div>}

      <div className="stack">
        {results.map((p) => (
          <details key={p.sku} className="card expandable">
            <summary>
              <div className="card-head">
                <div className="product-id">
                  {p.imageUrl && <img className="thumb" src={p.imageUrl} alt="" loading="lazy" width="56" height="56" />}
                  <div>
                    <div className="sku">{p.sku}</div>
                    <h2>{p.name}</h2>
                  </div>
                </div>
                <span className="chevron" aria-hidden="true" />
              </div>
              <div className="summary-stats">
                <div>
                  <span className="muted small">Total cases</span>
                  <strong>{p.totalCases}</strong>
                </div>
                <div>
                  <span className="muted small">Total units</span>
                  <strong>{p.totalUnits}</strong>
                </div>
                <div>
                  <span className="muted small">Units / case</span>
                  <strong>{p.unitsPerCase}</strong>
                </div>
              </div>
              <div className="muted small">
                {p.locations.length === 0
                  ? 'No cases in storage'
                  : `${p.locations.length} location${p.locations.length === 1 ? '' : 's'}: ${p.locations.map((l) => l.location).join(', ')}`}
              </div>
            </summary>

            {p.locations.length > 0 && (
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
