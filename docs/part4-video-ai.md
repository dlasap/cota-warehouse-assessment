# Part 4 — Shelf-video counting: process and AI design

**Goal:** an employee records a shelf video, the system *proposes* `SKU → location → visible case count`, and a person approves it before anything touches inventory.

## 1. Study and standardize the scan first
I would watch today's counts and record sample videos to learn where cases hide, what the lighting is like and how locations are labelled. The result is a one-page **scan procedure**:
- Walk from low to high aisle, the same as the pick sequence.
- Stand at a fixed distance and hold the phone landscape at label height.
- Make one slow pass per bay, starting at the location label.

A standard process is cheaper than a smarter model.

## 2. Capture and processing
- **Capture.** Record short clips **per location** in the existing web app, using the phone camera. Clips are saved on the device and uploaded when there is a connection (the same outbox as Part 5).
- **Processing.** A background job takes 2–3 sharp frames per second, runs detection, and tracks each case across frames so it is counted once.
- **Storage.** Video goes to file storage; only the structured result goes to the database.

## 3. Location context
- **Primary:** scan the location barcode or QR label at the start of each clip, or read the printed label with OCR. The employee confirms the location before recording.
- **Fallback:** the employee picks the location manually.

The AI never guesses the location: a wrong location is worse than a wrong count.

## 4. Structured AI output
The model returns JSON that is checked against a schema. Invalid output is rejected, not guessed:
```json
{ "scanId": "uuid", "location": "A1-R2-S1", "locationSource": "barcode",
  "detections": [{ "sku": "TURTLE-01", "visibleCases": 17, "confidence": 0.91,
                   "evidenceFrames": [12, 40], "notes": "2 cases partly hidden" }],
  "unrecognized": [{ "count": 1, "frame": 55, "reason": "label unreadable" }],
  "modelVersion": "v1" }
```
The model counts only **visible** cases. The app shows that count next to the expected count from inventory.

## 5. Evaluating accuracy
I would build a test set of 50–100 hand-counted clips covering every SKU, poor lighting and partly hidden cases, and measure:
- **SKU recognition:** how often each SKU is identified correctly, and which similar plush products get confused.
- **Counting:** the share of exact counts, and the average error.
- **Location:** accuracy.

Re-run it after every model change, and after launch track how often employees correct the AI.

## 6. Uncertain results
- **High confidence and matches expected:** marked "looks right", still approved with one tap.
- **Low confidence, unrecognized items, or a difference from expected:** flagged for review with the evidence frames.
- **Large difference** (more than 2 cases or 10%): needs a manual recount and supervisor approval.

"Unknown" is a valid answer. The system never fills in a count it isn't sure of.

## 7. Keeping unverified AI out of inventory
- AI output goes only to a `scan_proposals` table, **never** to `inventory`.
- Stock changes only through an **approved adjustment**, recorded as a normal change with the approver, the reason and the scan it came from.
- The adjustment is checked against the stock the reviewer saw. If stock changed in the meantime, it goes back for review.
- Large adjustments need two people.

## 8. What I would save
- **`scans`:** who, when, device, location and how it was set, video and frame links, model version.
- **`scan_detections`:** each proposed SKU, count and confidence, plus the expected count at scan time.
- **`scan_reviews`:** approved, corrected or rejected, with the corrected value, the reviewer and the reason.
- **`inventory_adjustments`:** each resulting stock change, linked to its review.

This history becomes evaluation and training data.

## 9. Employee review
One card per location shows a frame with boxes around detected cases and `TURTLE-01 · expected 18 · AI saw 17 · 91%`. The actions are **Approve**, **Edit count**, **Change SKU** and **Recount later**. Flagged items come first.

## 10. Prototype first
1. Pick one aisle with 2–3 SKUs and use phones the staff already have. Record about 30 clips following the draft procedure and hand-count them.
2. Run an off-the-shelf vision model with structured output on the frames and measure its accuracy against the hand counts. There is no app integration yet.
3. If the accuracy is acceptable, add the propose → review → approve screen to the existing app, still writing only to proposals.

Scale-up comes only after that.
