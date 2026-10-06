# CoTa AI Automation & Applications Developer Assessment

> Original task brief, stored for reference. The requirement-by-requirement status is in [CHECKLIST.md](CHECKLIST.md).

## Purpose
This assessment evaluates whether you can transform a business requirement into a simple, working solution.

You may use ChatGPT, Codex, Cursor, Claude, GitHub Copilot, documentation, internet research, and other development resources. Using AI is encouraged. You remain responsible for understanding, testing, and explaining your submission.

## Time expectation
Approximately three hours. We value a complete, reliable, understandable result more than unnecessary features or decorative design.

## Scenario
CoTa operates a warehouse. Inventory is stored in full cases, and one SKU may exist in more than one storage location.

| SKU | Product | Units/case | Location | Cases |
|---|---|---|---|---|
| TURTLE-01 | Sea Turtle Plush | 12 | A1-R2-S1 | 18 |
| TURTLE-01 | Sea Turtle Plush | 12 | A4-R1-S2 | 7 |
| SHARK-02 | Shark Plush | 8 | A2-R3-S1 | 14 |
| MOOSE-03 | Moose Plush | 6 | A5-R1-S1 | 9 |
| ALIEN-04 | Alien Plush | 12 | A3-R4-S2 | 4 |

## Part 1 — Inventory search
Build a small mobile-friendly warehouse application that allows an employee to search by SKU or product name.

The result must display:
- SKU and product name.
- Units per case.
- Every storage location and cases at each location.
- Total cases across all locations.
- Total units contained in those cases.

## Part 2 — Open-shelf replenishment
Add open-shelf maximum capacity and current open-shelf units.

Use this example:
- SKU: TURTLE-01.
- Capacity: 60 units.
- Current quantity: 17 units.

Calculate:
- Units needed to fill the shelf.
- Complete cases that must be pulled from storage.

Explain the result clearly to the warehouse employee, including any operational consequence created by pulling only complete cases.

## Part 3 — Pick list
Allow the user to enter this request:
- TURTLE-01 — 3 cases.
- SHARK-02 — 2 cases.
- ALIEN-04 — 1 case.

Generate a picking list that shows SKU, location, cases to pick, and sequence. Assume aisle numbers represent physical progression through the warehouse. The sequence should attempt to avoid unnecessary backtracking.

Handle insufficient inventory clearly rather than silently generating an invalid pick.

## Part 4 — Process and AI design
Do not implement video processing. In no more than 750 words, explain how you would extend the application so that an employee can upload warehouse-shelf video and the system proposes:

`SKU → location → visible case count`

Explain:
- How you would first study and standardize the scanning process.
- How video would be captured and processed.
- How location context would be established.
- How AI output would be structured.
- How you would evaluate recognition and counting accuracy.
- How uncertain results would be handled.
- How you would prevent unverified AI output from corrupting inventory.
- What observations, approvals, and historical data you would save.
- How an employee would review and correct results.
- What you would prototype first before building the complete system.

## Part 5 — Reliability question
Assume the system works in testing but warehouse employees occasionally lose internet connectivity. In no more than 250 words, explain how you would prevent lost work, duplicate changes, or confusing inventory results.

## Deliverables
- Working application URL.
- Git repository.
- README with setup instructions.
- Database/schema description.
- Short architecture explanation.
- Your Part 4 and Part 5 written responses.
- A short list of assumptions and known limitations.

## Candidate instruction
We value simplicity. Do not over-engineer the assignment. Be prepared to demonstrate the application, explain important code and design decisions, and identify what you would improve next.
