## Change: preview BEFORE sending to webhook

Currently `exportJson` calls `/api/n8n-export` first, then opens a preview of the AI-generated rows, then downloads. The user wants the preview to happen *before* the webhook runs, showing the raw question + expected answer (from the `telegram_whatsapp` column) so they can confirm what gets sent.

## Flow

1. **Click Export JSON** → if no rows selected, toast error. Otherwise open a preview dialog immediately (no webhook call yet).
2. **Preview dialog** lists each selected row:
   - `Question` (from `question`)
   - `Expected Answer` (from `telegram_whatsapp`)
   - Rows with empty question are flagged / excluded from send count.
   - Footer: Cancel, **Send & Download JSON** (primary).
3. **Send & Download JSON** click → close preview, call `/api/n8n-export` with the same selected rows, show loading toast / button spinner, then on success build the JSON blob and trigger the download with filename `q&a_<tableTag>_<DDMMYY>.json` (unchanged).

## Implementation (`src/routes/_authenticated/index.tsx`)

- Rename existing `exportPreview` state to hold the *input* rows (question + expected answer + url + id) instead of AI-generated rows. Shape: `{ open: boolean; rows: Array<{ id, question, expected_answer, url }> }`.
- Replace `exportJson` body: build `inputRows` from selected rows, guard empty, set preview state and open dialog. No fetch.
- Add `confirmExportJson`: takes `exportPreview.rows`, posts to `/api/n8n-export` (payload: `{ table, rows }` where each row has `id`, `question`, `web: ""`, `telegram_whatsapp: expected_answer`, `url`), receives `ragRows`, builds blob, downloads with the existing filename pattern, closes dialog.
- `exportingJson` loading state stays — now spans only the confirm step. Disable Send button while loading.
- Remove the existing post-fetch preview dialog body that renders `intent` / `metadata` / `answer`; replace with a list of `Question` + `Expected Answer` cards. Empty `expected_answer` shows a muted "(no expected answer)" warning so the user knows that row will likely come back blank.

## Out of scope

- No webhook schema changes.
- No changes to the AI prompt in `src/lib/rag-export.functions.ts`.
- Desktop / mobile toolbars unchanged.
