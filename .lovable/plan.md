## Goal
Include a `generated_at` timestamp in the two **Export RAW** outputs — JSON and Excel — so every exported record carries the generation time.

## Changes
1. **Frontend (`src/routes/_authenticated/index.tsx`)**
   - Import `nowKLIso` from `@/lib/rag-schema`.
   - In `confirmExportJson` (JSON export):
     - Compute `generatedAt = nowKLIso()` once when export starts.
     - After merging returned rows, map each row to include `generated_at: generatedAt` before stringifying and downloading.
   - In `exportXlsx` (Excel export):
     - Compute `generatedAt = nowKLIso()` once when export starts.
     - Add a "Generated At" column to the worksheet and set its value to `generatedAt` for every exported row.

## Verification
- Run a typecheck/build to confirm the import and code changes compile.
- Optionally verify via the UI that exported JSON and Excel files contain the `generated_at` field/column.

## Notes
- Uses the existing Kuala-Lumpur timezone ISO helper already used by the Production RAG export, keeping timestamps consistent across export types.
- No backend/Edge Function changes are required; the timestamp is injected client-side after the webhook returns the rows.