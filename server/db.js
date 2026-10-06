import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_AND_SEED } from './seed.js';

let db;

// In-memory SQLite, created and seeded once per server process.
function getDb() {
  if (!db) {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec(SCHEMA_AND_SEED);
  }
  return db;
}

/** Everything the app needs, in one read. */
export function getInventorySnapshot() {
  const conn = getDb();
  const products = conn
    .prepare('SELECT sku, name, units_per_case AS unitsPerCase FROM products ORDER BY sku')
    .all();
  const stock = conn
    .prepare(
      `SELECT i.sku, i.location_code AS location, l.aisle, l.rack, l.shelf, i.cases
         FROM inventory i JOIN locations l ON l.code = i.location_code
        ORDER BY l.aisle, l.rack, l.shelf`
    )
    .all();
  const shelves = conn
    .prepare(
      `SELECT sku, capacity_units AS capacityUnits, current_units AS currentUnits,
              overflow_units AS overflowUnits
         FROM open_shelf ORDER BY sku`
    )
    .all();
  // node:sqlite rows have a null prototype; spread into plain objects.
  return {
    products: products.map((r) => ({ ...r })),
    stock: stock.map((r) => ({ ...r })),
    shelves: shelves.map((r) => ({ ...r })),
  };
}
