# Requirements checklist

Each requirement from [ASSESSMENT.md](ASSESSMENT.md) mapped to where it is met and how it was verified.
Last verified **2026-10-06** against the production build (`npm start`), at 375px and 320px phone widths.

Legend: ✅ done

## Part 1 — Inventory search

| Requirement | Status | Where / evidence |
|---|---|---|
| Mobile-friendly app | ✅ | Single-column layout, 44–48px touch targets; no horizontal scroll on any tab at 375px or 320px |
| Search by SKU | ✅ | `TURTLE-01` → Sea Turtle Plush (`searchInventory`, [src/logic.js](../src/logic.js)) |
| Search by product name | ✅ | `shark` → SHARK-02 (partial, case-insensitive) |
| SKU and product name | ✅ | Collapsed row: name + SKU |
| Units per case | ✅ | Collapsed row: `12/case` |
| Every location + cases at each | ✅ | Expanded row: A1-R2-S1 = 18, A4-R1-S2 = 7 |
| Total cases | ✅ | Collapsed row + table total: 25 cases |
| Total units | ✅ | Collapsed row + table total: 300 units (25 × 12) |

## Part 2 — Open-shelf replenishment

| Requirement | Status | Where / evidence |
|---|---|---|
| Open-shelf capacity + current units | ✅ | `open_shelf` table; editable fields on the Replenish tab |
| Example TURTLE-01, 60 / 17 | ✅ | Seeded and pre-filled |
| Units needed | ✅ | **43** |
| Complete cases to pull | ✅ | **4 cases (48 units)** from A1-R2-S1 |
| Clear explanation + consequence of full cases | ✅ | "5 units will not fit"; keep the opened case in overflow, don't return it to storage; alternative of 3 cases → 53/60 with no opened case |
| Edge cases | ✅ | Shelf full, not enough storage, invalid input (unit tests) |

## Part 3 — Pick list

| Requirement | Status | Where / evidence |
|---|---|---|
| User enters the request | ✅ | SKU + cases lines, example pre-loaded |
| Shows SKU, location, cases, sequence | ✅ | 1 · A1-R2-S1 · TURTLE-01 × 3 → 2 · A2-R3-S1 · SHARK-02 × 2 → 3 · A3-R4-S2 · ALIEN-04 × 1 |
| Aisle order, avoids backtracking | ✅ | Sorted by aisle → rack → shelf; one location per SKU where possible; route shown as "Aisle 1 → 2 → 3" |
| Insufficient inventory handled clearly | ✅ | ALIEN-04 × 9 → red **Cannot pick**: "Only 4 cases in storage — 5 short." The line is excluded and never partly picked |
| Bad input | ✅ | Unknown SKU ("SKU not found"), invalid quantity, duplicate lines merged |

## Parts 4 and 5 — Written responses

| Requirement | Status | Where / evidence |
|---|---|---|
| Part 4 ≤ 750 words, covers all 10 points | ✅ | [part4-video-ai.md](part4-video-ai.md) — 742 words including headings and JSON, one section per point |
| Part 5 ≤ 250 words | ✅ | [part5-offline.md](part5-offline.md) — 232 words |

## Deliverables

| Deliverable | Status | Where / evidence |
|---|---|---|
| Working application URL | ✅ | https://cota-warehouse-assessment-smoky.vercel.app/ — page, `/api/inventory` and images return 200 |
| Git repository | ✅ | https://github.com/dlasap/cota-warehouse-assessment (public) |
| README with setup instructions | ✅ | [README.md](../README.md) → Setup |
| Database/schema description | ✅ | README → Database schema; DDL in [server/seed.js](../server/seed.js) |
| Short architecture explanation | ✅ | README → Architecture, Why this shape |
| Part 4 and Part 5 responses | ✅ | `docs/` |
| Assumptions and known limitations | ✅ | README → Assumptions, Known limitations, What I'd do next |

## Quality checks

| Check | Result |
|---|---|
| `npm test` | 20 / 20 passing (search, replenishment, pick list, movements) |
| `npm run build` | Builds cleanly |
| Production server | `GET /` 200 · `GET /api/inventory` 200 (4 products, 5 stock rows, 1 open shelf) · images 200 |
| Persistence | Confirmed pick + replenishment reduce stock and survive reload; History lists them; Reset clears them |
