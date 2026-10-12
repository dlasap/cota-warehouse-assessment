import { useState } from 'react';
import { parseLocation, searchInventory, stockLevel } from '../logic.js';
import SearchFilters from './SearchFilters.jsx';
import Thumb from './Thumb.jsx';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const STOCK_BADGE = { ok: null, low: { cls: 'warn', text: 'Low stock' }, out: { cls: 'error', text: 'Out of stock' } };

const SORTS = {
  name: { label: 'Name (A–Z)', fn: (a, b) => a.name.localeCompare(b.name) },
  sku: { label: 'SKU', fn: (a, b) => a.sku.localeCompare(b.sku) },
  most: { label: 'Most stock', fn: (a, b) => b.totalCases - a.totalCases || a.name.localeCompare(b.name) },
  least: { label: 'Least stock', fn: (a, b) => a.totalCases - b.totalCases || a.name.localeCompare(b.name) },
};

const aislesOf = (p) => new Set(p.locations.map((l) => parseLocation(l.location).aisle));

export default function SearchTab({ state }) {
  const [query, setQuery] = useState('');
  const [aisle, setAisle] = useState(null); // null = all aisles
  const [stock, setStock] = useState('all');
  const [sort, setSort] = useState('name');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const aisles = [...new Set(state.stock.filter((r) => r.cases > 0).map((r) => parseLocation(r.location).aisle))].sort(
    (a, b) => a - b
  );
  const matches = searchInventory(state, query);
  const inAisle = (p) => aisle === null || aislesOf(p).has(aisle);
  const inStock = (p) => stock === 'all' || stockLevel(p.totalCases) === stock;

  // Each filter's counts reflect the other active filters.
  const stockCounts = { all: 0, ok: 0, low: 0, out: 0 };
  for (const p of matches.filter(inAisle)) {
    stockCounts.all += 1;
    stockCounts[stockLevel(p.totalCases)] += 1;
  }
  const aisleCounts = new Map();
  const forAisles = matches.filter(inStock);
  for (const p of forAisles) for (const a of aislesOf(p)) aisleCounts.set(a, (aisleCounts.get(a) ?? 0) + 1);

  const results = matches.filter((p) => inAisle(p) && inStock(p)).sort(SORTS[sort].fn);

  const active = [
    query.trim() && { key: 'q', label: `“${query.trim()}”`, clear: () => setQuery('') },
    aisle !== null && { key: 'aisle', label: `Aisle ${aisle}`, clear: () => setAisle(null) },
    stock !== 'all' && { key: 'stock', label: STOCK_BADGE[stock]?.text ?? 'In stock', clear: () => setStock('all') },
  ].filter(Boolean);
  const filterCount = (aisle !== null) + (stock !== 'all') + (sort !== 'name');
  const resetFilters = () => {
    setAisle(null);
    setStock('all');
    setSort('name');
  };
  const clearAll = () => {
    setQuery('');
    setAisle(null);
    setStock('all');
  };

  return (
    <section>
      <label className="field" htmlFor="search-input">
        <span>Search by SKU, product name or location</span>
      </label>
      <div className="search-row">
        <input
          id="search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. TURTLE-01, turtle or A4"
          autoComplete="off"
          enterKeyHint="search"
        />
        <button
          className={filtersOpen || filterCount > 0 ? 'btn filter-btn on' : 'btn filter-btn'}
          aria-expanded={filtersOpen}
          aria-controls="search-filters"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 4h12M4 8h8M6.5 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </svg>
          Filters
          {filterCount > 0 && <span className="count">{filterCount}</span>}
        </button>
      </div>

      <SearchFilters
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        stock={stock}
        setStock={setStock}
        stockCounts={stockCounts}
        aisle={aisle}
        setAisle={setAisle}
        aisles={aisles}
        aisleCounts={aisleCounts}
        aisleAll={forAisles.length}
        sort={sort}
        setSort={setSort}
        sorts={SORTS}
        onReset={resetFilters}
      />

      <div className="results-bar">
        <span className="muted small" aria-live="polite">
          <strong>{results.length}</strong> of {plural(state.products.length, 'product')} · {SORTS[sort].label}
        </span>
        {active.length > 0 && (
          <div className="active-filters">
            {active.map((f) => (
              <button key={f.key} className="active-chip" onClick={f.clear} aria-label={`Remove filter ${f.label}`}>
                {f.label} <span aria-hidden="true">×</span>
              </button>
            ))}
            {active.length > 1 && (
              <button className="btn link small" onClick={clearAll}>Clear all</button>
            )}
          </div>
        )}
      </div>

      {results.length === 0 && (
        <div className="notice">
          No products match these filters.{' '}
          <button className="btn link small" onClick={clearAll}>Clear filters</button>
        </div>
      )}

      <div className="stack tight">
        {results.map((p) => {
          const badge = STOCK_BADGE[stockLevel(p.totalCases)];
          return (
          <details key={p.sku} className="card expandable">
            <summary>
              <Thumb product={p} />
              <div className="grow">
                <div className="item-name">
                  {p.name}
                  {badge && <span className={`stock-badge ${badge.cls}`}>{badge.text}</span>}
                </div>
                <div className="muted small truncate">
                  <span className="sku">{p.sku}</span> · {p.unitsPerCase}/case ·{' '}
                  {p.locations.map((l) => l.location.split('-')[0]).filter((a, i, arr) => arr.indexOf(a) === i).join(', ') || 'no location'}
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
          );
        })}
      </div>
    </section>
  );
}
