import { useState } from 'react';
import { LOW_STOCK_CASES, allocateFromStorage, planReplenishment, replenishMovement } from '../logic.js';
import Thumb from './Thumb.jsx';

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

      {done && <div className="notice success">{done.text}</div>}
      {done?.lowStock && (
        <div className="notice warn">
          <strong>Storage is running low</strong>
          <span>
            Only {plural(done.storageAfter, 'case')} of {done.sku} left in storage. Let your supervisor know so it can be reordered.
          </span>
        </div>
      )}

      {/* Remount when saved shelf values change so the inputs show the new state. */}
      <ReplenishForm
        key={`${sku}|${shelf?.capacityUnits}|${shelf?.currentUnits}|${shelf?.overflowUnits}`}
        state={state}
        sku={sku}
        shelf={shelf}
        onConfirm={(build, result) => {
          record(build);
          setDone(result);
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

  const [noLeftover, setNoLeftover] = useState(false);

  const input = { capacity: toInt(capacity), current: toInt(current), overflow, unitsPerCase: product.unitsPerCase, storageCases };
  const fillPlan = planReplenishment(input);
  // Offer a choice only when filling the shelf would leave an opened case and a whole-case option exists.
  const canChoose = fillPlan.status === 'ok' && fillPlan.leftoverUnits > 0 && fillPlan.noLeftoverOption.cases > 0;
  const plan = canChoose && noLeftover ? planReplenishment({ ...input, noLeftover: true }) : fillPlan;
  const takes = plan.casesToPull ? allocateFromStorage(rows, plan.casesToPull) : [];

  const lowStock = plan.storageAfter <= LOW_STOCK_CASES;
  const confirm = () =>
    onConfirm((meta) => replenishMovement({ sku, capacity: toInt(capacity), plan, takes }, meta), {
      text: `Saved: ${plural(plan.casesToPull, 'case')} of ${sku} moved to the open shelf (now ${plan.shelfAfter}/${capacity} units).`,
      lowStock,
      storageAfter: plan.storageAfter,
      sku,
    });

  return (
    <>
      <div className="card product-preview">
        <Thumb product={product} size={64} />
        <div className="grow">
          <div className="item-name">{product.name}</div>
          <div className="muted small">
            <span className="sku">{product.sku}</span> · {product.unitsPerCase} units per case
          </div>
          <div className="muted small">
            {plural(storageCases, 'case')} in storage
            {overflow > 0 && ` · ${overflow} loose units in overflow`}
          </div>
        </div>
      </div>

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
          {canChoose && (
            <div className="segmented replenish-choice" role="radiogroup" aria-label="How many cases to pull">
              <button
                type="button"
                role="radio"
                aria-checked={!noLeftover}
                className={`seg${!noLeftover ? ' active' : ''}`}
                onClick={() => setNoLeftover(false)}
              >
                <strong>Fill the shelf</strong>
                <span className="small">
                  {plural(fillPlan.casesToPull, 'case')} · {fillPlan.leftoverUnits} to overflow
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={noLeftover}
                className={`seg${noLeftover ? ' active' : ''}`}
                onClick={() => setNoLeftover(true)}
              >
                <strong>Whole cases only</strong>
                <span className="small">
                  {plural(fillPlan.noLeftoverOption.cases, 'case')} · shelf {fillPlan.noLeftoverOption.shelfAfter}/{capacity}
                </span>
              </button>
            </div>
          )}

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

          <div className={`storage-after small${lowStock ? ' low' : ''}`}>
            <span className="muted">Storage after this pull</span>
            <strong>
              {plural(plan.storageAfter, 'case')}
              {lowStock && ' · low stock'}
            </strong>
          </div>

          <Explanation plan={plan} sku={sku} capacity={toInt(capacity)} current={toInt(current)} unitsPerCase={product.unitsPerCase} />

          <button className="btn primary block" onClick={confirm} disabled={plan.casesToPull === 0 && plan.fromOverflow === 0}>
            Confirm — I pulled {plural(plan.casesToPull, 'case')}
          </button>
        </article>
      )}
    </>
  );
}

/** The calculation as numbered steps: what is being worked out on the left, the maths on the right. */
function Steps({ steps }) {
  return (
    <ol className="calc-steps">
      {steps.map(([label, math, result]) => (
        <li key={label}>
          <span className="calc-label">{label}</span>
          <span className="calc-math">
            {math && <span className="muted">{math} = </span>}
            <strong>{result}</strong>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Explanation({ plan, sku, capacity, current, unitsPerCase }) {
  const steps = [['Space on the shelf', `${capacity} − ${current}`, `${plan.unitsNeeded} units`]];
  if (plan.fromOverflow > 0) {
    steps.push(['Use loose units in overflow first', `${plan.unitsNeeded} − ${plan.fromOverflow}`, `${plan.unitsFromCases} units still needed`]);
  }
  const exact = plan.unitsFromCases / unitsPerCase;
  const exactText = Number.isInteger(exact) ? String(exact) : exact.toFixed(1);

  if (plan.status === 'short') {
    steps.push(['Cases needed', `${plan.unitsFromCases} ÷ ${unitsPerCase}, rounded up`, plural(plan.casesRequired, 'case')]);
    steps.push(['Cases in storage', null, plural(plan.storageCases, 'case')]);
    steps.push(['Shelf after pulling all of them', null, `${plan.shelfAfter}/${capacity} (${capacity - plan.shelfAfter} short)`]);
    return (
      <div className="notice error explain-body">
        <strong>Not enough stock in storage</strong>
        <Steps steps={steps} />
        <div className="calc-todo">
          <strong>What to do</strong>
          <span>Pull all {plural(plan.casesToPull, 'case')} and report the shortage to your supervisor.</span>
        </div>
      </div>
    );
  }

  if (plan.mode === 'no-leftover') {
    steps.push(['Whole cases that fit', `${plan.unitsFromCases} ÷ ${unitsPerCase} = ${exactText}${Number.isInteger(exact) ? '' : ', rounded down'}`, plural(plan.casesToPull, 'case')]);
    steps.push(['Shelf after', `${current + plan.fromOverflow} + ${plan.unitsPulled}`, `${plan.shelfAfter}/${capacity}`]);
  } else if (plan.casesToPull > 0) {
    steps.push([
      'Cases to pull',
      `${plan.unitsFromCases} ÷ ${unitsPerCase} = ${exactText}${Number.isInteger(exact) ? '' : ', rounded up'}`,
      `${plural(plan.casesToPull, 'case')} (${plan.unitsPulled} units)`,
    ]);
    steps.push(['Left over', `${plan.unitsPulled} − ${plan.unitsFromCases}`, `${plan.leftoverUnits} units`]);
  }

  let todo;
  if (plan.mode === 'no-leftover') {
    todo = `The shelf stays ${capacity - plan.shelfAfter} units below full, but no case is opened, so nothing goes to overflow.`;
  } else if (plan.leftoverUnits > 0) {
    todo = `Fill the shelf, then keep the opened case with ${plan.leftoverUnits} units in the ${sku} overflow spot next to it. The app uses those units first next time. Don't put it back in storage: storage only holds full cases.`;
  } else {
    todo = 'The cases fill the shelf exactly. Nothing is left over.';
  }

  return (
    <details className={`notice explain ${plan.leftoverUnits > 0 ? 'warn' : 'success'}`}>
      <summary>
        <span className="grow">
          {plan.fromOverflow > 0 && <>Use <strong>{plan.fromOverflow} overflow units</strong>, then pull </>}
          {plan.fromOverflow > 0 ? <strong>{plural(plan.casesToPull, 'case')}</strong> : <>Pull <strong>{plural(plan.casesToPull, 'case')}</strong></>}
          {' → '}shelf {plan.shelfAfter}/{capacity}
          {plan.leftoverUnits > 0 ? (
            <> · <strong>{plan.leftoverUnits} units to overflow</strong></>
          ) : (
            ' · nothing left over'
          )}
        </span>
        <span className="explain-toggle">Why?</span>
        <span className="chevron" aria-hidden="true" />
      </summary>
      <Steps steps={steps} />
      <div className="calc-todo">
        <strong>What to do</strong>
        <span>{todo}</span>
      </div>
      {plan.mode === 'fill' && plan.leftoverUnits > 0 && plan.noLeftoverOption.cases > 0 && (
        <p className="calc-alt">No room for loose units? Choose “Whole cases only” above.</p>
      )}
    </details>
  );
}
