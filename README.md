# CoTa Warehouse

A small mobile-friendly warehouse app for the CoTa AI Automation & Applications Developer assessment.

- **Live app:** _add Vercel URL after deploy_
- **Part 4 (video + AI design):** [docs/part4-video-ai.md](docs/part4-video-ai.md)
- **Part 5 (offline reliability):** [docs/part5-offline.md](docs/part5-offline.md)

| Tab | Assessment part | What it does |
|---|---|---|
| **Search** | Part 1 | Search by SKU or product name, filter by aisle, result count. Compact rows show units/case and total cases/units; tap to see every location with its cases. |
| **Replenish** | Part 2 | Open-shelf capacity and current units → units needed, full cases to pull, where to pull them from, and what happens to leftover units. |
| **Pick list** | Part 3 | Enter SKU + cases lines → sequenced pick list in aisle order. Lines that cannot be filled appear in a red **Cannot pick** panel. |
| **History** | Persistence | Confirmed picks and replenishments, saved in the browser. **Reset demo data** clears them. |

## Setup

Requires **Node.js 22.13 or newer**, which includes the built-in `node:sqlite`.

```bash
npm install
npm run dev      # API on :3001 + Vite on http://localhost:5173
npm test         # unit tests for all business rules
npm start        # production build served by Express on http://localhost:3001
```

Deploy (Vercel CLI, logged in):

```bash
vercel --prod
```

Vercel detects Vite and builds the frontend. `api/index.js` runs as a serverless function, and `vercel.json` routes `/api/*` to it.

## Architecture

```
React (Vite) single page ──GET /api/inventory──▶ Express (api/index.js)
   │                                                   │
   │ shared pure rules: src/logic.js                   ▼
   │                                          SQLite in memory (node:sqlite)
   ▼                                          created + seeded on startup
localStorage: confirmed movements + last inventory snapshot
```

- **`src/logic.js`** holds every business rule as pure functions: search, replenishment planning, storage allocation, pick-list building, and applying movements. It doesn't use React, network calls or storage, so the browser and the tests run the same code.
- **`server/db.js`** creates an in-memory SQLite database from `server/seed.js` (schema + seed) and returns one snapshot of products, stock by location and open shelves.
- **`api/index.js`** is the Express app. It has two read-only endpoints: `GET /api/inventory` and `GET /api/health`.
- **React components** (`src/components/*`) only handle input and display. Results are recalculated on every keystroke.
- **Persistence (demo):** confirming a pick or a replenishment adds a *movement* to a log in localStorage. Displayed stock = server snapshot + movements applied in order. The server data never changes. This was chosen to keep deployment to one command; Part 5 describes how the same log becomes a sync outbox.

### Why this shape
- One small module holds every calculation, so it can be tested and explained on its own.
- The in-memory SQLite database is rebuilt from seed data on every start. It needs no hosted database, and every deploy starts from known data.
- Movements are only ever added, never edited, and duplicate IDs are ignored. That gives a history to inspect and safe retries, which is the same design proposed for offline sync.

## Database schema

```sql
products   (sku TEXT PK, name TEXT, units_per_case INT > 0,
            image_url TEXT)          -- preview image in public/products/
locations  (code TEXT PK,            -- 'A1-R2-S1'
            aisle INT, rack INT, shelf INT)   -- parsed for sorting/sequence
inventory  (sku FK → products, location_code FK → locations,
            cases INT >= 0,          -- full cases only
            PK (sku, location_code)) -- one SKU can live in many locations
open_shelf (sku PK FK → products, capacity_units INT > 0,
            current_units INT >= 0 AND <= capacity_units,
            overflow_units INT >= 0) -- loose units from an opened case
```

Full DDL and seed data: [server/seed.js](server/seed.js).

The movement log (browser-side) has this shape:
```js
{ id, at, type: 'pick' | 'replenish', summary,
  stockDeltas: [{ sku, location, cases }],          // negative = removed
  shelf?: { sku, capacityUnits, currentUnits, overflowUnits } }
```

## Business rules

**Part 2 — replenishment (TURTLE-01: capacity 60, current 17, 12 units/case)**
- Units needed = 60 − 17 = **43**.
- Cases to pull = ⌈43 ÷ 12⌉ = **4 cases (48 units)**, taken from the lowest aisle first (A1-R2-S1).
- **The catch:** 48 − 43 = **5 units won't fit**. The app tells the employee to keep the opened case in the SKU's overflow spot rather than put it back in storage, which is counted in full cases. Those 5 units are recorded and used first at the next replenishment.
- **Alternative shown:** if loose units can't be held, pull 3 cases instead. The shelf reaches 53/60 and no case is opened.
- **Also handled:** shelf already full, not enough stock in storage, and invalid input (for example, current > capacity).

**Part 3 — pick list**
- **Input checks:** duplicate lines for the same SKU are merged. Unknown SKUs and quantities that aren't whole numbers above 0 are flagged.
- **Where to pick from:** if one location holds the whole quantity, that location is used (fewer stops). Otherwise cases are taken from each location in walk order.
- **Sequence:** stops are sorted by aisle, then rack, then shelf, giving a one-way walk with no backtracking. Example result:
  1. A1-R2-S1 — TURTLE-01 × 3
  2. A2-R3-S1 — SHARK-02 × 2
  3. A3-R4-S2 — ALIEN-04 × 1
- **Insufficient stock:** a line that can't be fully filled is **not picked at all**. It's listed as "Only 4 cases in storage — 5 short", and the other lines can still be confirmed.

## Assumptions

- Aisle numbers follow the physical walking order, and a lower rack or shelf number comes earlier within an aisle.
- Location codes always follow the `A{aisle}-R{rack}-S{shelf}` pattern.
- Storage holds full cases only. Loose units exist only on the open shelf or in its overflow spot.
- Replenishment pulls from the lowest aisle first, because the location of the open shelf isn't given.
- When a pick request can't be fully filled, picking the other lines is acceptable. The short line goes to a supervisor rather than being partly picked.
- Only TURTLE-01 has open-shelf data. For other SKUs the employee types in capacity and current units.

## Known limitations

- **Changes are only saved in one browser.** Confirmed changes live in localStorage, so other devices don't see them and clearing site data loses them. The server inventory never changes.
- **No login and no roles.** There is no record of who confirmed each change.
- **No inventory management screens.** Products, locations and stock can't be added, edited or removed in the app.
- **Simplified pick routing.** It sorts by aisle and doesn't model aisle sides, a snake-shaped route, or several pickers.
- **Same-browser race.** Two tabs open in the same browser could each confirm before seeing the other's change. A movement that would make stock negative is rejected when it's applied, but nothing locks stock in the meantime.
- **SQLite is experimental in Node 22.** Node shows an `ExperimentalWarning` for `node:sqlite`.

## What I'd do next

1. A persistent database such as Postgres or Turso, with a `movements` table and a `POST /api/movements` endpoint that ignores duplicate IDs (see Part 5).
2. Employee login, with each movement recording who made it.
3. Barcode scanning for SKUs and locations through the phone camera.
4. An offline mode that syncs saved changes when the connection returns (see Part 5).
5. The video-count prototype from Part 4.
