## Goal

Speed up **Export Final RAG** by firing all row webhook calls in parallel instead of sequentially. Retry each failed row up to 3 times automatically. If any rows still fail, keep the successful ones, show the user what failed, and offer a **Retry failed rows** button.

## Changes (single file: `src/routes/_authenticated/index.tsx`, `confirmExportRag`)

### 1. Fire all row calls in parallel
- Keep the current per-row payload shape (`batch_index`, `batch_total`, single-row `rows` array) so the n8n side stays unchanged. `batch_total = inputRows.length`, `batch_index = i`.
- Replace the sequential `for` loop with `Promise.allSettled(inputRows.map(runOneWithRetry))`.
- No client-side concurrency cap. The user explicitly wants all N posted at once.

### 2. Per-row retry (up to 3 total attempts)
- New helper `runOneWithRetry(row, index)`:
  - Try up to 3 times, with a short backoff (e.g. 1s, then 2s) between attempts.
  - Returns `{ ok: true, rows }` on success or `{ ok: false, row, index, error }` after 3 failures.
- Any error thrown by `runBatch` (network, non-2xx incl. 520, empty rows, validation) counts as one failed attempt.

### 3. Progress toast
- Single loading toast, updated as each row settles:
  `Building production RAG… (done / total, failing X)`.
- Uses a shared counter incremented in each promise's `.then/.catch`.

### 4. Handling final results
- Collect successes in the original row order (use the `index` to sort before assembling).
- **All succeeded** → assemble dataset, download JSON, success toast (unchanged behavior).
- **Some failed** →
  - Still assemble + download JSON for the successful rows (so partial work isn't lost).
  - Show an error toast (persistent, `duration: Infinity`) listing the count of failed rows and a short reason for the first one, with two actions:
    - **Retry failed rows** — re-runs only the failed rows through the same parallel + 3-retry pipeline, then merges into a fresh download.
    - **Dismiss**.
- **All failed** → no download; same error toast with **Retry failed rows** action.

### 5. State for retries
- Track the current failed set in a `useRef<{ rows: InputRow[]; datasetHints; tableTag; tableName } | null>` so the retry button can re-invoke without recomputing from stale selection.
- Cleared on a fully successful run or when the user dismisses.

### 6. Keep existing pieces intact
- `validateOutgoing`, `assembleDataset`, `legacyDetected` warning, filename, and success toast copy stay the same.
- `RAG_BATCH_SIZE` constant is removed (no longer meaningful).
- The 520-specific toast from the earlier change is folded into the generic "some failed" toast — the failure reason string already contains the upstream status from `n8n-rag-build`.

## Out of scope
- No backend / edge function changes.
- No changes to JSON (raw) export path — it stays sequential.
- No changes to selection UI, prompt selector, or table logic.
