import Thumb from './Thumb.jsx';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const dayKey = (iso) => new Date(iso).toDateString();

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

const timeLabel = (iso) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** Newest first, bucketed by calendar day. */
function groupByDay(movements) {
  const groups = [];
  for (const m of [...movements].reverse()) {
    const key = dayKey(m.at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(m);
    else groups.push({ key, label: dayLabel(m.at), items: [m] });
  }
  return groups;
}

export default function HistoryTab({ movements, rejected, products, onReset }) {
  const rejectedIds = new Set(rejected.map((m) => m.id));
  const productBySku = new Map(products.map((p) => [p.sku, p]));

  return (
    <section>
      <div className="row-between">
        <h2 className="section-title">History</h2>
        <span className="pill" title="Confirmed changes are stored in this browser">
          {plural(movements.length, 'change')} saved
        </span>
      </div>
      <p className="muted small">
        Confirmed picks and replenishments are saved on this device and survive a reload. The server's seed inventory is never
        changed.
      </p>

      {movements.length === 0 ? (
        <div className="notice empty">
          <strong>No changes yet</strong>
          <span className="muted">Confirm a pick or a replenishment and it will show up here.</span>
        </div>
      ) : (
        groupByDay(movements).map((g) => (
          <div key={g.key} className="history-day">
            <h3 className="day-label">{g.label}</h3>
            <ol className="history">
              {g.items.map((m) => (
                <HistoryEntry key={m.id} movement={m} productBySku={productBySku} rejected={rejectedIds.has(m.id)} />
              ))}
            </ol>
          </div>
        ))
      )}

      {movements.length > 0 && (
        <div className="history-footer">
          <span className="muted small">Start over with the original inventory.</span>
          <button
            className="btn danger"
            onClick={() => window.confirm('Clear all saved changes and return to the original inventory?') && onReset()}
          >
            Reset demo data
          </button>
        </div>
      )}
    </section>
  );
}

function HistoryEntry({ movement: m, productBySku, rejected }) {
  const deltas = m.stockDeltas ?? [];
  const totalCases = deltas.reduce((sum, d) => sum + Math.abs(d.cases), 0);
  const isPick = m.type === 'pick';
  const title = `${isPick ? 'Picked' : 'Replenished'} ${plural(totalCases, 'case')}`;
  const meta = isPick ? plural(deltas.length, 'stop') : productBySku.get(m.shelf?.sku)?.name ?? m.shelf?.sku;

  const skus = [...new Set(deltas.map((d) => d.sku))];
  const shown = skus.slice(0, 3);

  return (
    <li>
      <details className={`card expandable history-entry ${m.type}${rejected ? ' rejected' : ''}`}>
        <summary>
          <span className="thumb-stack" aria-hidden="true">
            {shown.map((sku) => (
              <Thumb key={sku} product={productBySku.get(sku)} size={36} className="sm" />
            ))}
            {skus.length > shown.length && <span className="thumb sm more">+{skus.length - shown.length}</span>}
          </span>
          <div className="grow">
            <div className="item-name truncate">{title}</div>
            <div className="entry-meta small">
              <span className={`badge ${m.type}`}>{isPick ? 'Pick' : 'Replenish'}</span>
              <span className="muted truncate">{meta}</span>
              {rejected && <span className="rejected-flag">Not applied</span>}
            </div>
          </div>
          <time className="muted small entry-time" dateTime={m.at} title={new Date(m.at).toLocaleString()}>
            {timeLabel(m.at)}
          </time>
          <span className="chevron" aria-hidden="true" />
        </summary>

        <div className="entry-body">
          {deltas.length > 0 ? (
            <ul className="entry-lines">
              {deltas.map((d, i) => {
                const p = productBySku.get(d.sku);
                return (
                  <li key={`${d.sku}-${d.location}-${i}`}>
                    <Thumb product={p} size={36} className="sm" />
                    <div className="grow">
                      <div className="line-name truncate">{p?.name ?? d.sku}</div>
                      <div className="muted small truncate">
                        <span className="sku">{d.sku}</span> · <span className="mono">{d.location}</span>
                      </div>
                    </div>
                    <span className="line-qty">
                      −{Math.abs(d.cases)} <span className="muted small">{Math.abs(d.cases) === 1 ? 'case' : 'cases'}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="muted small">{m.summary}</div>
          )}

          {m.shelf && (
            <div className="shelf-result small">
              <span className="muted">Open shelf now</span>
              <strong>
                {m.shelf.currentUnits}/{m.shelf.capacityUnits} units
              </strong>
              {m.shelf.overflowUnits > 0 && <span className="muted">· {m.shelf.overflowUnits} in overflow</span>}
            </div>
          )}

          {rejected && <div className="notice error small">Not applied: it would make stock negative.</div>}
        </div>
      </details>
    </li>
  );
}
