## 1. JSON answer source = Expected Answer

In `src/lib/rag-export.functions.ts` `formatOne`:
- Drop the "merge Web + Telegram/WhatsApp" logic.
- Use `telegram_whatsapp` (the Expected Answer column) as the sole source for the `answer` field. The prompt instructs the model to:
  - Translate the Expected Answer to natural English if it is Malay / mixed.
  - Preserve proper nouns, acronyms, URLs, emails.
  - Strip channel noise (greetings, signatures, emojis) but keep facts complete.
- `intent` and `metadata` are still derived from question + expected answer.
- Fallback (on AI error): use `telegram_whatsapp` (not `web`) as the raw answer.
- The `web` field is still accepted in the input schema (for context) but is no longer used to compose the answer.

## 2. Filename pattern

In `src/routes/_authenticated/index.tsx` `exportJson`:
- Change download name to `q&a_${tableTag}_${stamp}.json` (e.g. `q&a_faix_200626.json`).
- `tableTag` derivation unchanged (strip `qatest-` prefix if present so `qatest-faix` → `faix`; otherwise sanitize as today).
- `stamp` stays `DDMMYY`.

## 3. Require row selection + preview before export

In `src/routes/_authenticated/index.tsx`:
- `exportJson` no longer falls back to all `filteredRows`. If `selectedRowIds.size === 0`, show `toast.error("Select rows to export.")` and return.
- Split the flow into two steps:
  1. **Generate** — POST selected rows to `/api/n8n-export`, receive `ragRows`, store them in new state `previewRows` and open a new `<Dialog>` (`exportPreviewOpen`).
  2. **Confirm & download** — inside the dialog, a "Download JSON" button triggers the blob download using the filename from step 2; "Cancel" closes without downloading.
- Preview dialog content:
  - Title: "Preview export (N rows)".
  - Scrollable list of cards, each showing: `question`, `answer`, small muted line for `intent` • `metadata` • optional `url`.
  - Footer: Cancel, Download JSON (primary).
- Loading state on the Export JSON trigger button (`exportingJson`) covers only the generate step; downloading from the preview is synchronous.

## Out of scope

- No webhook / DB schema changes.
- No changes to flagging, Excel export, or other columns.
- Auth, RLS, and other routes untouched.
