import { useEffect, useMemo, useState } from 'react';
import { applyMovements } from './logic.js';
import { cacheSnapshot, loadCachedSnapshot, loadMovements, newId, saveMovements } from './store.js';
import SearchTab from './components/SearchTab.jsx';
import ReplenishTab from './components/ReplenishTab.jsx';
import PickTab from './components/PickTab.jsx';
import HistoryTab from './components/HistoryTab.jsx';

const TABS = [
  { id: 'search', label: 'Search' },
  { id: 'replenish', label: 'Replenish' },
  { id: 'pick', label: 'Pick list' },
  { id: 'history', label: 'History' },
];

export default function App() {
  const [tab, setTab] = useState('search');
  const [snapshot, setSnapshot] = useState(null);
  const [offlineSince, setOfflineSince] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [movements, setMovements] = useState(loadMovements);

  useEffect(() => {
    fetch('/api/inventory')
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setSnapshot(data);
        cacheSnapshot(data);
      })
      .catch((err) => {
        const cached = loadCachedSnapshot();
        if (cached) {
          setSnapshot(cached);
          setOfflineSince(cached.cachedAt);
        } else {
          setLoadError(err.message);
        }
      });
  }, []);

  useEffect(() => {
    saveMovements(movements);
  }, [movements]);

  const state = useMemo(() => (snapshot ? applyMovements(snapshot, movements) : null), [snapshot, movements]);

  const record = (build) => setMovements((m) => [...m, build({ id: newId(), at: new Date().toISOString() })]);
  const reset = () => setMovements([]);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="logo" aria-hidden="true">CT</span>
            <div>
              <h1>CoTa Warehouse</h1>
              <p className="muted small">Inventory · Replenishment · Picking</p>
            </div>
          </div>
          <span className="pill" title="Confirmed changes are stored in this browser">
            {movements.length} change{movements.length === 1 ? '' : 's'} saved on device
          </span>
        </div>
      </header>

      <div className="app">
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'tab active' : 'tab'}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <main>
          {offlineSince && (
            <div className="notice warn">
              Offline — showing inventory last loaded {new Date(offlineSince).toLocaleString()}. Confirmed changes are still saved on this device.
            </div>
          )}
          {loadError && <div className="notice error">Could not load inventory: {loadError}</div>}
          {!state && !loadError && <p className="muted">Loading inventory…</p>}
          {state && tab === 'search' && <SearchTab state={state} />}
          {state && tab === 'replenish' && <ReplenishTab state={state} record={record} />}
          {state && tab === 'pick' && <PickTab state={state} record={record} />}
          {state && tab === 'history' && <HistoryTab movements={movements} rejected={state.rejected} onReset={reset} />}
        </main>
      </div>
    </>
  );
}
