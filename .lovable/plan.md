# Plan

## 1. Export JSON — add Malay→English translation
Extend the existing AI prompt in `src/lib/rag-export.functions.ts` so the model also translates the `question` and chosen `answer` to English when the source text is Malay (or mixed). `intent` and `metadata` generation stay; URLs preserved inline.

- Answer source unchanged from current behavior: AI picks/merges the best answer (web is the primary source for the final answer).
- Prompt updated to add: "If the question or chosen answer is in Malay (or mixed Malay/English), translate to natural English. Keep proper nouns, acronyms (UTeM, FTKEK, etc.), and URLs as-is."
- Output schema gains `question` (translated). Becomes `{ intent, question, answer, metadata }`.
- Client `exportJson` in `_authenticated/index.tsx` uses the AI-returned `question` instead of the raw row question.
- (Send me the Rag Gap prompt later and I'll swap it in verbatim.)

## 2. Excel-upload Insert + un-hide button
Replace the hidden "Sync Q&A sheet" external-form link with a visible **Import Excel** button that opens a dialog:

1. User picks `.xlsx`/`.xls`/`.csv` file.
2. Parse client-side with `exceljs` (already a dep) → show preview of first sheet's headers/first row with a **column picker**.
3. User selects which column holds questions → preview shows N detected questions, with "skip first row (header)" toggle and dedupe against existing rows.
4. **Insert** posts to the same n8n insert webhook `QuestionPasteBox` uses (one question per row).
5. Show progress, then refresh table.

New: `src/components/qa-dashboard/ExcelImportBox.tsx`. Trigger added back into the desktop toolbar (and mobile overflow menu) where the hidden Sync button was.

## 3. Rename + Delete sheet tabs
Add a chevron/more menu on each sheet tab (the `tables.map` row at the bottom):

- **Rename** → opens dialog, posts to new server route `/api/n8n-rename-table` → `https://tuah.utem.edu.my/agent/webhook/24d1ce41-0116-47ef-802f-40a3d7da7cb9` with body `{ name: "qatest-old", newName: "qatest-new" }`.
- **Delete** → confirm dialog, posts to new server route `/api/n8n-delete-table` → `https://tuah.utem.edu.my/agent/webhook/3f944ef2-7d47-42b8-8500-b03ab19a71a6` with body `{ name: "qatest-x" }`.

Both server routes use the existing `N8N_WEBHOOK_USER` / `N8N_WEBHOOK_PASSWORD` Basic-auth env vars (same pattern as `n8n-create-table.ts`). Full-screen loading overlay during the call; refetch tables list on success; if the deleted/renamed table was active, switch to the first remaining table (or the new name on rename).

## 4. Telegram/WhatsApp — NO CHANGES
Leaving WA/TG column and buttons as-is per your correction.

## Files
**Edit**
- `src/lib/rag-export.functions.ts` — new prompt, schema adds `question`, output uses translated question
- `src/routes/_authenticated/index.tsx` — un-hide & swap Sync button → Import Excel; sheet-tab context menu (rename/delete); use translated question on export

**New**
- `src/components/qa-dashboard/ExcelImportBox.tsx` — file picker, column preview, insert
- `src/routes/api/n8n-rename-table.ts` — Basic-auth proxy
- `src/routes/api/n8n-delete-table.ts` — Basic-auth proxy

## Out of scope
- No DB/schema changes
- No new secrets (reuses `N8N_WEBHOOK_USER`/`N8N_WEBHOOK_PASSWORD`)
- Legacy "Sync Q&A sheet" external-form link is removed (replaced by Excel import)
