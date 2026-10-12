import { LOW_STOCK_CASES } from '../logic.js';

export const STOCK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'ok', label: 'In stock', title: `More than ${LOW_STOCK_CASES} cases` },
  { id: 'low', label: 'Low', title: `1–${LOW_STOCK_CASES} cases` },
  { id: 'out', label: 'Out', title: 'No cases in storage' },
];

/**
 * One "Filters" panel for stock level, aisle and sort.
 * Counts are passed in so each option shows how many results it would give.
 */
export default function SearchFilters({
  open,
  onClose,
  stock,
  setStock,
  stockCounts,
  aisle,
  setAisle,
  aisles,
  aisleCounts,
  aisleAll,
  sort,
  setSort,
  sorts,
  onReset,
}) {
  if (!open) return null;

  return (
    <div
      id="search-filters"
      className="card filter-panel"
      role="region"
      aria-label="Filters"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="filter-group">
        <span className="filter-label" title={`Low = ${LOW_STOCK_CASES} cases or fewer`}>Stock</span>
        <div className="segmented" role="group" aria-label="Filter by stock level">
          {STOCK_FILTERS.map((f) => (
            <button
              key={f.id}
              className={stock === f.id ? 'seg active' : 'seg'}
              aria-pressed={stock === f.id}
              title={f.title}
              disabled={f.id !== 'all' && stockCounts[f.id] === 0 && stock !== f.id}
              onClick={() => setStock(f.id)}
            >
              {f.label} <span className="count">{stockCounts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">Aisle</span>
        <div className="chips wrap" role="group" aria-label="Filter by aisle">
          <button className={aisle === null ? 'chip active' : 'chip'} aria-pressed={aisle === null} onClick={() => setAisle(null)}>
            All <span className="count">{aisleAll}</span>
          </button>
          {aisles.map((a) => {
            const n = aisleCounts.get(a) ?? 0;
            return (
              <button
                key={a}
                className={aisle === a ? 'chip active' : 'chip'}
                aria-pressed={aisle === a}
                disabled={n === 0 && aisle !== a}
                onClick={() => setAisle(aisle === a ? null : a)}
              >
                A{a} <span className="count">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-label" htmlFor="search-sort">Sort</label>
        <select id="search-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
          {Object.entries(sorts).map(([id, s]) => (
            <option key={id} value={id}>{s.label}</option>
          ))}
        </select>
        <button className="btn link small reset" onClick={onReset}>Reset</button>
      </div>
    </div>
  );
}
