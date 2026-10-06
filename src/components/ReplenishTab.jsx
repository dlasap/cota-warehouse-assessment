import { useState } from 'react';
import { allocateFromStorage, planReplenishment, replenishMovement } from '../logic.js';

const toInt = (s) => (String(s).trim() === '' ? NaN : Number(s));
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function ReplenishTab({ state, record }) {
  const [sku, setSku] = useState('TURTLE-01');
  const [done, setDone] = useState(null);
  const shelf = state.shelves.find((s) => s.sku === sku);

  return (
    <section>
      <label className="field">
        <span>Product</span>
        <select
          value={sku}
          onChange={(e) => {
            setSku(e.target.value);
            setDone(null);
          }}
        >
          {state.products.map((p) => (
            <option key={p.sku} value={p.sku}>
              {p.sku} — {p.name}
            </option>
          ))}
        </select>
      </label>

      {done && <div className="notice success">{done}</div>}

      {/* Remount when saved shelf values change so the inputs show the new state. */}
      <ReplenishForm
        key={`${sku}|${shelf?.capacityUnits}|${shelf?.currentUnits}|${shelf?.overflowUnits}`}
        state={state}
        sku={sku}
        shelf={shelf}
        onConfirm={(build, message) => {
          record(build);
          setDone(message);
        }}
      />
    </section>
  );
}

function ReplenishForm({ state, sku, shelf, onConfirm }) {
  const product = state.products.find((p) => p.sku === sku);
  const rows = state.stock.filter((r) => r.sku === sku);
  const storageCases = rows.reduce((sum, r) => sum + r.cases, 0);
  const overflow = shelf?.overflowUnits ?? 0;

  const [capacity, setCapacity] = useState(shelf ? String(shelf.capacityUnits) : '');
  const [current, setCurrent] = useState(shelf ? String(shelf.currentUnits) : '');

  const plan = planReplenishment({
    capacity: toInt(capacity),
    current: toInt(current),
    overflow,
    unitsPerCase: product.unitsPerCase,
    storageCases,
  });
  const takes = plan.casesToPull ? allocateFromStorage(rows, plan.casesToPull) : [];

  const confirm = () =>
    onConfirm(
      (meta) => replenishMovement({ sku, capacity: toInt(capacity), plan, takes }, meta),
      `Saved: ${plural(plan.casesToPull, 'case')} of ${sku} moved to the open shelf (now ${plan.shelfAfter}/${capacity} units).`
    );

  return (
    <>
      <div className="grid-2">
        <label className="field">
          <span>Shelf capacity (units)</span>
          <input type="number" inputMode="numeric" min="1" step="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </label>
        <label className="field">
          <span>Currently on shelf (units)</span>
          <input type="number" inputMode="numeric" min="0" step="1" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
      </div>
      <p className="muted small">
        {product.unitsPerCase} units per case · {plural(storageCases, 'case')} in storage
        {overflow > 0 && ` · ${overflow} loose units in overflow`}
      </p>

      {plan.status === 'invalid' && (
        <div className="notice error">
          {plan.errors.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}

      {plan.status === 'full' && <div className="notice success">The shelf is full. Nothing to pull.</div>}

      {(plan.status === 'ok' || plan.status === 'short') && (
        <article className="card">
          <div className="stats">
            <div className="stat">
              <span className="muted small">Units needed</span>
              <strong>{plan.unitsNeeded}</strong>
            </div>
            <div className="stat accent">
              <span className="muted small">Cases to pull</span>
              <strong>{plan.casesToPull}</strong>
              <span className="muted small">= {plan.unitsPulled} units</span>
            </div>
            <div className="stat">
              <span className="muted small">Left over</span>
              <strong>{plan.leftoverUnits}</strong>
              <span className="muted small">units</span>
            </div>
          </div>

          {takes.length > 0 && (
            <div className="pull-from">
              <span className="muted small">Pull from</span>
              {takes.map((t) => (
                <div key={t.location} className="row-between">
                  <span className="mono">{t.location}</span>
                  <strong>{plural(t.cases, 'case')}</strong>
                </div>
              ))}
            </div>
          )}

          <Explanation plan={plan} sku={sku} capacity={toInt(capacity)} current={toInt(current)} unitsPerCase={product.unitsPerCase} />

          <button className="btn primary block" onClick={confirm} disabled={plan.casesToPull === 0 && plan.fromOverflow === 0}>
            Confirm — I pulled {plural(plan.casesToPull, 'case')}
          </button>
        </article>
      )}
    </>
  );
}

function Explanation({ plan, sku, capacity, current, unitsPerCase }) {
  const overflowStep = plan.fromOverflow > 0 && (
    <p>
      First use the <strong>{plan.fromOverflow} loose units</strong> already in overflow.
    </p>
  );

  if (plan.status === 'short') {
    return (
      <div className="notice error">
        {overflowStep}
        <p>
          <strong>Not enough stock in storage.</strong> The shelf needs {plural(plan.casesRequired, 'case')}, but storage only has{' '}
          {plural(plan.storageCases, 'case')}. Pulling everything brings the shelf to {plan.shelfAfter}/{capacity} units —{' '}
          {capacity - plan.shelfAfter} short. Report the shortage to your supervisor.
        </p>
      </div>
    );
  }

  return (
    <div className={plan.leftoverUnits > 0 ? 'notice warn' : 'notice success'}>
      <p>
        The shelf holds {capacity} and has {current}, so it needs <strong>{plan.unitsNeeded} units</strong>.
      </p>
      {overflowStep}
      {plan.leftoverUnits === 0 ? (
        <p>
          {plural(plan.casesToPull, 'full case')} fill the shelf exactly. Nothing is left over.
        </p>
      ) : (
        <>
          <p>
            Storage only holds full cases of {unitsPerCase}, so pull <strong>{plural(plan.casesToPull, 'case')}</strong> ({plan.unitsPulled} units).
            After filling the shelf to {plan.shelfAfter}/{capacity}, <strong>{plan.leftoverUnits} units will not fit</strong>.
          </p>
          <p>
            Keep that opened case in the {sku} overflow spot next to the shelf — the app records it and uses those units first next time.
            Do not put an opened case back into storage: storage is counted in full cases.
          </p>
          {plan.noLeftoverOption.cases > 0 && (
            <p className="muted">
              No room for loose units? Pull {plural(plan.noLeftoverOption.cases, 'case')} instead — the shelf reaches{' '}
              {plan.noLeftoverOption.shelfAfter}/{capacity} ({capacity - plan.noLeftoverOption.shelfAfter} below full) with no opened case left over.
            </p>
          )}
        </>
      )}
    </div>
  );
}
