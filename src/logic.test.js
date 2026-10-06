import { describe, it, expect } from 'vitest';
import { getInventorySnapshot } from '../server/db.js';
import {
  parseLocation,
  applyMovements,
  searchInventory,
  planReplenishment,
  allocateFromStorage,
  buildPickList,
  pickMovement,
  replenishMovement,
} from './logic.js';

// Tests run against the real seeded SQLite snapshot.
const snapshot = getInventorySnapshot();
const fresh = () => applyMovements(snapshot, []);

describe('parseLocation', () => {
  it('parses aisle, rack and shelf', () => {
    expect(parseLocation('A4-R1-S2')).toEqual({ aisle: 4, rack: 1, shelf: 2 });
  });
  it('rejects malformed codes', () => {
    expect(() => parseLocation('X1')).toThrow();
  });
});

describe('Part 1 — search', () => {
  it('finds TURTLE-01 by SKU with every location and totals', () => {
    const [r] = searchInventory(fresh(), 'turtle-01');
    expect(r.sku).toBe('TURTLE-01');
    expect(r.name).toBe('Sea Turtle Plush');
    expect(r.unitsPerCase).toBe(12);
    expect(r.locations).toEqual([
      { location: 'A1-R2-S1', cases: 18 },
      { location: 'A4-R1-S2', cases: 7 },
    ]);
    expect(r.totalCases).toBe(25);
    expect(r.totalUnits).toBe(300);
  });

  it('finds by partial, case-insensitive product name', () => {
    const results = searchInventory(fresh(), 'shark');
    expect(results.map((r) => r.sku)).toEqual(['SHARK-02']);
    expect(results[0].totalUnits).toBe(112);
  });

  it('matches several products on a shared word and returns nothing for no match', () => {
    expect(searchInventory(fresh(), 'plush')).toHaveLength(4);
    expect(searchInventory(fresh(), 'giraffe')).toEqual([]);
  });
});

describe('Part 2 — replenishment', () => {
  it('TURTLE-01 example: 43 units needed, 4 cases, 5 left over', () => {
    const plan = planReplenishment({ capacity: 60, current: 17, unitsPerCase: 12, storageCases: 25 });
    expect(plan.status).toBe('ok');
    expect(plan.unitsNeeded).toBe(43);
    expect(plan.casesToPull).toBe(4);
    expect(plan.unitsPulled).toBe(48);
    expect(plan.leftoverUnits).toBe(5);
    expect(plan.shelfAfter).toBe(60);
    expect(plan.noLeftoverOption).toEqual({ cases: 3, shelfAfter: 53 });
  });

  it('uses overflow units before opening new cases', () => {
    const plan = planReplenishment({ capacity: 60, current: 17, overflow: 5, unitsPerCase: 12, storageCases: 25 });
    expect(plan.fromOverflow).toBe(5);
    expect(plan.casesToPull).toBe(4); // 38 units from cases -> 4 cases
    expect(plan.leftoverUnits).toBe(10);
  });

  it('reports a full shelf', () => {
    expect(planReplenishment({ capacity: 60, current: 60, unitsPerCase: 12, storageCases: 25 }).status).toBe('full');
  });

  it('flags insufficient storage instead of pretending', () => {
    const plan = planReplenishment({ capacity: 60, current: 0, unitsPerCase: 12, storageCases: 2 });
    expect(plan.status).toBe('short');
    expect(plan.casesRequired).toBe(5);
    expect(plan.casesToPull).toBe(2);
    expect(plan.shelfAfter).toBe(24);
  });

  it('rejects invalid input', () => {
    expect(planReplenishment({ capacity: 60, current: 70, unitsPerCase: 12, storageCases: 25 }).status).toBe('invalid');
    expect(planReplenishment({ capacity: 60, current: -1, unitsPerCase: 12, storageCases: 25 }).status).toBe('invalid');
    expect(planReplenishment({ capacity: 0, current: 0, unitsPerCase: 12, storageCases: 25 }).status).toBe('invalid');
  });

  it('allocates from the lowest aisle first', () => {
    const rows = fresh().stock.filter((r) => r.sku === 'TURTLE-01');
    expect(allocateFromStorage(rows, 20)).toEqual([
      { location: 'A1-R2-S1', cases: 18 },
      { location: 'A4-R1-S2', cases: 2 },
    ]);
  });
});

describe('Part 3 — pick list', () => {
  const request = [
    { sku: 'TURTLE-01', cases: 3 },
    { sku: 'SHARK-02', cases: 2 },
    { sku: 'ALIEN-04', cases: 1 },
  ];

  it('builds the assessment pick list in aisle order', () => {
    const list = buildPickList(fresh(), request);
    expect(list.ok).toBe(true);
    expect(list.problems).toEqual([]);
    expect(list.picks.map(({ sequence, sku, location, cases }) => ({ sequence, sku, location, cases }))).toEqual([
      { sequence: 1, sku: 'TURTLE-01', location: 'A1-R2-S1', cases: 3 },
      { sequence: 2, sku: 'SHARK-02', location: 'A2-R3-S1', cases: 2 },
      { sequence: 3, sku: 'ALIEN-04', location: 'A3-R4-S2', cases: 1 },
    ]);
  });

  it('does not silently pick when inventory is insufficient', () => {
    const list = buildPickList(fresh(), [{ sku: 'ALIEN-04', cases: 5 }, { sku: 'SHARK-02', cases: 1 }]);
    expect(list.ok).toBe(false);
    expect(list.problems).toMatchObject([{ sku: 'ALIEN-04', requested: 5, available: 4, reason: 'insufficient' }]);
    expect(list.picks.map((p) => p.sku)).toEqual(['SHARK-02']);
  });

  it('flags unknown SKUs and invalid quantities', () => {
    const list = buildPickList(fresh(), [{ sku: 'NOPE-99', cases: 1 }, { sku: 'SHARK-02', cases: 1.5 }]);
    expect(list.problems.map((p) => p.reason).sort()).toEqual(['invalid-quantity', 'unknown-sku']);
    expect(list.picks).toEqual([]);
  });

  it('merges duplicate lines for the same SKU', () => {
    const list = buildPickList(fresh(), [{ sku: 'shark-02', cases: 1 }, { sku: 'SHARK-02', cases: 2 }]);
    expect(list.picks).toMatchObject([{ sku: 'SHARK-02', cases: 3 }]);
  });

  it('prefers a single location that can fill the line, else splits in walk order', () => {
    expect(buildPickList(fresh(), [{ sku: 'TURTLE-01', cases: 18 }]).picks).toHaveLength(1);
    const split = buildPickList(fresh(), [{ sku: 'TURTLE-01', cases: 20 }]).picks;
    expect(split.map((p) => [p.location, p.cases])).toEqual([['A1-R2-S1', 18], ['A4-R1-S2', 2]]);
  });
});

describe('movements (local persistence)', () => {
  it('a confirmed pick reduces stock, and is applied only once by id', () => {
    const list = buildPickList(fresh(), [{ sku: 'ALIEN-04', cases: 1 }]);
    const mv = pickMovement(list, { id: 'm1', at: '2026-10-06T00:00:00Z' });
    const state = applyMovements(snapshot, [mv, mv]);
    expect(searchInventory(state, 'ALIEN-04')[0].totalCases).toBe(3);
    expect(state.applied).toHaveLength(1);
  });

  it('rejects a movement that would make stock negative', () => {
    const mv = { id: 'bad', type: 'pick', stockDeltas: [{ sku: 'ALIEN-04', location: 'A3-R4-S2', cases: -10 }] };
    const state = applyMovements(snapshot, [mv]);
    expect(state.rejected).toHaveLength(1);
    expect(searchInventory(state, 'ALIEN-04')[0].totalCases).toBe(4);
  });

  it('a confirmed replenishment moves cases to the shelf and records overflow', () => {
    const plan = planReplenishment({ capacity: 60, current: 17, unitsPerCase: 12, storageCases: 25 });
    const takes = allocateFromStorage(fresh().stock.filter((r) => r.sku === 'TURTLE-01'), plan.casesToPull);
    const mv = replenishMovement({ sku: 'TURTLE-01', capacity: 60, plan, takes }, { id: 'r1', at: 'now' });
    const state = applyMovements(snapshot, [mv]);
    expect(searchInventory(state, 'TURTLE-01')[0].totalCases).toBe(21);
    expect(state.shelves.find((s) => s.sku === 'TURTLE-01')).toEqual({
      sku: 'TURTLE-01', capacityUnits: 60, currentUnits: 60, overflowUnits: 5,
    });
  });

  it('never mutates the server snapshot', () => {
    applyMovements(snapshot, [{ id: 'x', stockDeltas: [{ sku: 'MOOSE-03', location: 'A5-R1-S1', cases: -1 }] }]);
    expect(snapshot.stock.find((r) => r.sku === 'MOOSE-03').cases).toBe(9);
  });
});
