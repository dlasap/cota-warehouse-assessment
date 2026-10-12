# Interview walkthrough: Parts 4 and 5

A plain-language version of the written answers, for talking through in the interview. The full answers are in [part4-video-ai.md](part4-video-ai.md) and [part5-offline.md](part5-offline.md).

---

## Part 4: Shelf-video counting

**One-line pitch:** the AI *suggests* a count, a person *decides*.

```mermaid
flowchart LR
    A[Standard scan<br/>procedure] --> B[Record clip<br/>per location]
    B --> C[Scan location<br/>barcode]
    C --> D[AI detects and<br/>counts cases]
    D --> E[(scan_proposals<br/>NOT inventory)]
    E --> F{Person<br/>reviews}
    F -->|Approve / Edit| G[Approved adjustment]
    F -->|Reject| H[Recount later]
    G --> I[(inventory)]
```

### The ten points in simple words

| # | Point | Simple version |
|---|-------|----------------|
| 1 | Study and standardize | Write simple scan rules first. A good process beats a smarter model. |
| 2 | Capture and processing | Short clips per location. Pick sharp frames, detect cases, count each case once. |
| 3 | Location context | Scan the shelf label. The AI never guesses the location. |
| 4 | Structured output | AI answers in a fixed JSON form. Invalid form is rejected. |
| 5 | Evaluating accuracy | 50-100 hand-counted clips. Compare SKU, count and location accuracy. |
| 6 | Uncertain results | "I don't know" is allowed. Small doubt means review, big gap means recount plus supervisor. |
| 7 | Keep AI out of inventory | AI writes only to proposals. Stock changes only through an approved adjustment. |
| 8 | What to save | Scans, detections, reviews, adjustments. This becomes training and evaluation data. |
| 9 | Employee review | One card per location: frame with boxes, expected vs seen, 4 buttons. |
| 10 | Prototype first | One aisle, 2-3 SKUs, about 30 clips. Measure first, integrate later. |

### Guardrail for inventory

```mermaid
flowchart TD
    AI[AI result] --> P[(scan_proposals)]
    P --> R{Reviewer}
    R -->|approve| CHK{Stock changed<br/>since review?}
    CHK -->|no| ADJ[Approved adjustment<br/>who, why, which scan]
    CHK -->|yes| R
    ADJ -->|large change| TWO[Second person<br/>must approve]
    ADJ --> INV[(inventory)]
    TWO --> INV
```

---

## Part 5: Losing internet connectivity

**One-line pitch:** save first, give every change an ID, send changes not totals, and be honest on screen.

### 1. Save on the device first

```mermaid
flowchart LR
    A[Employee confirms<br/>pick] --> B[(Phone outbox<br/>saved first)]
    B --> C{Internet?}
    C -->|no| D[Wait<br/>'3 changes waiting to sync']
    D --> C
    C -->|yes| E[Send in order<br/>to server]
```

### 2. No duplicate changes

A retry reuses the same ID, so the server never deducts twice.

```mermaid
sequenceDiagram
    participant P as Phone
    participant S as Server
    P->>S: pick 3 cases, ID 42
    Note over S: stock 18 to 15
    S--xP: reply lost
    P->>S: retry, same ID 42
    Note over S: ID 42 already seen, ignore
    S->>P: OK, already done
```

### 3. Send changes, not totals

```mermaid
flowchart TD
    subgraph Totals [Totals: bad]
        A1[Phone A says 15] --> S1[Server: 16]
        B1[Phone B says 16] --> S1
        S1 --- N1[One pick lost]
    end
    subgraph Changes [Changes: good]
        A2[Phone A: pick 3] --> S2[Server: 18 - 3 - 2 = 13]
        B2[Phone B: pick 2] --> S2
        S2 --> N2{Below zero or<br/>stock changed?}
        N2 -->|yes| REJ[Rejected, shown for review]
    end
```

### 4. No confusing results

- The screen says **Live** or **Offline, data from 10:42**.
- Unsynced changes are marked **pending**.
- Pick lists made offline warn that stock may have changed.
- After reconnecting: send the outbox in order, reload inventory, list any rejected change with its reason.

### What the prototype already does

- Confirmed changes are kept in localStorage, and the last snapshot is cached.
- `applyMovements` already skips duplicate IDs.
- The movement log is the seed of the outbox described above.
