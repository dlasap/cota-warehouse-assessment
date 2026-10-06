export default function HistoryTab({ movements, rejected, onReset }) {
  const rejectedIds = new Set(rejected.map((m) => m.id));

  return (
    <section>
      <div className="row-between">
        <h2 className="section-title">History</h2>
        <span className="pill" title="Confirmed changes are stored in this browser">
          {movements.length} change{movements.length === 1 ? '' : 's'} saved on device
        </span>
      </div>
      <p className="muted">
        Confirmed picks and replenishments are saved in this browser (localStorage) and survive a page reload. The server's seed
        inventory is never changed.
      </p>

      {movements.length === 0 ? (
        <div className="notice">No changes yet. Confirm a pick or replenishment to see it here.</div>
      ) : (
        <ol className="history">
          {[...movements].reverse().map((m) => (
            <li key={m.id} className="card">
              <div className="row-between">
                <span className={`badge ${m.type}`}>{m.type === 'pick' ? 'Pick' : 'Replenish'}</span>
                <time className="muted small">{new Date(m.at).toLocaleString()}</time>
              </div>
              <div>{m.summary}</div>
              {rejectedIds.has(m.id) && <div className="notice error small">Not applied: it would make stock negative.</div>}
            </li>
          ))}
        </ol>
      )}

      <button
        className="btn danger"
        disabled={movements.length === 0}
        onClick={() => window.confirm('Clear all saved changes and return to the original inventory?') && onReset()}
      >
        Reset demo data
      </button>
    </section>
  );
}
