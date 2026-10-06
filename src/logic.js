// Pure warehouse rules. No React, no fetch, no storage — so the same code runs
// in the browser and in the unit tests.

const LOCATION_RE = /^A(\d+)-R(\d+)-S(\d+)$/i;

/** "A4-R1-S2" -> { aisle: 4, rack: 1, shelf: 2 } */
export function parseLocation(code) {
  const m = LOCATION_RE.exec(String(code).trim());
  if (!m) throw new Error(`Invalid location code: ${code}`);
  return { aisle: Number(m[1]), rack: Number(m[2]), shelf: Number(m[3]) };
}

/** Walk order: aisle, then rack, then shelf (aisles = physical progression). */
export function compareLocations(a, b) {
  const pa = parseLocation(a);
  const pb = parseLocation(b);
  return pa.aisle - pb.aisle || pa.rack - pb.rack || pa.shelf - pb.shelf;
}

const isWholeNumber = (n) => Number.isInteger(n) && n >= 0;
const isPositiveWhole = (n) => Number.isInteger(n) && n > 0;

// ---------------------------------------------------------------------------
// State = server snapshot + this device's confirmed movements
// ---------------------------------------------------------------------------

/**
 * Applies the movement log to the server snapshot.
 * - Movements are applied in order; a duplicate id is applied only once.
 * - A movement that would drive any stock below zero is rejected as a whole
 *   (never half-applied) and reported in `rejected`.
 */
export function applyMovements(snapshot, movements = []) {
  const stock = snapshot.stock.map((row) => ({ ...row }));
  const shelves = snapshot.shelves.map((row) => ({ ...row }));
  const seen = new Set();
  const applied = [];
  const rejected = [];

  for (const mv of movements) {
    if (seen.has(mv.id)) continue;
    seen.add(mv.id);

    const ok = (mv.stockDeltas ?? []).every((d) => {
      const row = stock.find((r) => r.sku === d.sku && r.location === d.location);
      return row && row.cases + d.cases >= 0;
    });
    if (!ok) {
      rejected.push(mv);
      continue;
    }

    for (const d of mv.stockDeltas ?? []) {
      stock.find((r) => r.sku === d.sku && r.location === d.location).cases += d.cases;
    }
    if (mv.shelf) {
      const i = shelves.findIndex((s) => s.sku === mv.shelf.sku);
      if (i >= 0) shelves[i] = { ...mv.shelf };
      else shelves.push({ ...mv.shelf });
    }
    applied.push(mv);
  }

  return { products: snapshot.products, stock, shelves, applied, rejected };
}

// ---------------------------------------------------------------------------
// Part 1 — search
// ---------------------------------------------------------------------------

export function searchInventory(state, query) {
  const q = String(query ?? '').trim().toLowerCase();
  return state.products
    .filter((p) => !q || p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
    .map((p) => {
      const locations = state.stock
        .filter((r) => r.sku === p.sku && r.cases > 0)
        .sort((a, b) => compareLocations(a.location, b.location))
        .map((r) => ({ location: r.location, cases: r.cases }));
      const totalCases = locations.reduce((sum, l) => sum + l.cases, 0);
      return { ...p, locations, totalCases, totalUnits: totalCases * p.unitsPerCase };
    });
}

// ---------------------------------------------------------------------------
// Part 2 — open-shelf replenishment
// ---------------------------------------------------------------------------

/**
 * Works out how many full cases to pull to fill an open shelf.
 * Leftover units from an already-opened case ("overflow") are used first.
 */
export function planReplenishment({ capacity, current, overflow = 0, unitsPerCase, storageCases }) {
  const errors = [];
  if (!isPositiveWhole(capacity)) errors.push('Shelf capacity must be a whole number above 0.');
  if (!isWholeNumber(current)) errors.push('Current shelf units must be a whole number (0 or more).');
  if (!isWholeNumber(overflow)) errors.push('Overflow units must be a whole number (0 or more).');
  if (!isPositiveWhole(unitsPerCase)) errors.push('Units per case must be a whole number above 0.');
  if (errors.length === 0 && current > capacity) {
    errors.push(`Current units (${current}) exceed the shelf capacity (${capacity}). Recount the shelf.`);
  }
  if (errors.length) return { status: 'invalid', errors };

  const unitsNeeded = capacity - current;
  if (unitsNeeded === 0) return { status: 'full', unitsNeeded: 0, casesToPull: 0 };

  const fromOverflow = Math.min(overflow, unitsNeeded);
  const unitsFromCases = unitsNeeded - fromOverflow;
  const casesRequired = Math.ceil(unitsFromCases / unitsPerCase);
  const casesToPull = Math.min(casesRequired, storageCases);
  const unitsPulled = casesToPull * unitsPerCase;
  const unitsOnShelf = Math.min(unitsFromCases, unitsPulled);
  const leftoverUnits = unitsPulled - unitsOnShelf;
  const shelfAfter = current + fromOverflow + unitsOnShelf;

  // Option that never opens a case it cannot fully shelve.
  const casesNoLeftover = Math.min(Math.floor(unitsFromCases / unitsPerCase), storageCases);

  return {
    status: casesToPull < casesRequired ? 'short' : 'ok',
    unitsNeeded,
    fromOverflow,
    unitsFromCases,
    casesRequired,
    casesToPull,
    unitsPulled,
    unitsOnShelf,
    leftoverUnits,
    shelfAfter,
    overflowAfter: overflow - fromOverflow + leftoverUnits,
    storageCases,
    noLeftoverOption: {
      cases: casesNoLeftover,
      shelfAfter: current + fromOverflow + casesNoLeftover * unitsPerCase,
    },
  };
}

/** Takes `cases` from a SKU's locations in walk order (lowest aisle first). */
export function allocateFromStorage(stockRows, cases) {
  const takes = [];
  let remaining = cases;
  for (const row of [...stockRows].filter((r) => r.cases > 0).sort((a, b) => compareLocations(a.location, b.location))) {
    if (remaining === 0) break;
    const take = Math.min(row.cases, remaining);
    takes.push({ location: row.location, cases: take });
    remaining -= take;
  }
  return takes;
}

// ---------------------------------------------------------------------------
// Part 3 — pick list
// ---------------------------------------------------------------------------

/**
 * Builds a pick list for request lines [{ sku, cases }].
 * Lines that cannot be fully picked are NOT picked partially — they are
 * returned in `problems` with the reason and what is available.
 */
export function buildPickList(state, requestLines) {
  const problems = [];
  const merged = new Map();

  for (const line of requestLines) {
    const sku = String(line.sku ?? '').trim().toUpperCase();
    if (!sku) continue;
    const cases = Number(line.cases);
    if (!isPositiveWhole(cases)) {
      problems.push({ sku, requested: line.cases, reason: 'invalid-quantity', message: 'Quantity must be a whole number of cases above 0.' });
      continue;
    }
    merged.set(sku, (merged.get(sku) ?? 0) + cases);
  }

  const picks = [];
  for (const [sku, requested] of merged) {
    const product = state.products.find((p) => p.sku === sku);
    if (!product) {
      problems.push({ sku, requested, reason: 'unknown-sku', message: 'SKU not found.' });
      continue;
    }
    const rows = state.stock
      .filter((r) => r.sku === sku && r.cases > 0)
      .sort((a, b) => compareLocations(a.location, b.location));
    const available = rows.reduce((sum, r) => sum + r.cases, 0);
    if (available < requested) {
      problems.push({
        sku,
        name: product.name,
        requested,
        available,
        reason: 'insufficient',
        message: `Only ${available} case${available === 1 ? '' : 's'} in storage — ${requested - available} short.`,
      });
      continue;
    }
    // Fewer stops: prefer one location that holds the whole quantity.
    const single = rows.find((r) => r.cases >= requested);
    const takes = single ? [{ location: single.location, cases: requested }] : allocateFromStorage(rows, requested);
    for (const t of takes) picks.push({ sku, name: product.name, ...t });
  }

  picks.sort((a, b) => compareLocations(a.location, b.location) || a.sku.localeCompare(b.sku));
  picks.forEach((p, i) => (p.sequence = i + 1));

  return { picks, problems, ok: problems.length === 0 && picks.length > 0 };
}

// ---------------------------------------------------------------------------
// Movements (what "Confirm" records)
// ---------------------------------------------------------------------------

export function pickMovement(pickList, { id, at }) {
  return {
    id,
    at,
    type: 'pick',
    summary: pickList.picks.map((p) => `${p.sku} ×${p.cases} @ ${p.location}`).join(', '),
    stockDeltas: pickList.picks.map((p) => ({ sku: p.sku, location: p.location, cases: -p.cases })),
  };
}

export function replenishMovement({ sku, capacity, plan, takes }, { id, at }) {
  return {
    id,
    at,
    type: 'replenish',
    summary: `${sku}: ${plan.casesToPull} case${plan.casesToPull === 1 ? '' : 's'} to open shelf (${plan.shelfAfter}/${capacity} units` +
      (plan.overflowAfter ? `, ${plan.overflowAfter} in overflow)` : ')'),
    stockDeltas: takes.map((t) => ({ sku, location: t.location, cases: -t.cases })),
    shelf: { sku, capacityUnits: capacity, currentUnits: plan.shelfAfter, overflowUnits: plan.overflowAfter },
  };
}
