## Export JSON filename

In `src/routes/_authenticated/index.tsx` `exportJson`:
- Replace stamp with `DDMMYY` only (e.g. `180626`).
- Replace filename `rag-builder-${tableTag}-${stamp}.json` with `${tableTag}_${stamp}.json`, where `tableTag = (activeTable || "all").replace(/-/g, "_").replace(/[^a-zA-Z0-9_]/g, "_")` so `staff-dir` → `staff_dir_180626.json`.

## Columns

In `src/components/qa-dashboard/qa-columns.tsx`:
- Remove the `id` and `createdAt` column entries from `QA_COLUMNS` (hides ID and Created).
- Add back a `telegram_whatsapp` column relabeled **"Expected Answer"**, made editable (double-click), `inputType: "textarea"`, width ~`w-[22rem]`, placed right after the `web` ("Text Chat") column.

In `src/routes/_authenticated/index.tsx` `handleEditCell`:
- Extend the allowed `field` map to include `telegram_whatsapp` so edits go through the same `/api/n8n-flag` update webhook (existing payload already carries the value via `buildRowPayload`).
- Update the success toast label to say "Expected Answer updated." for that field.

## Out of scope

No backend / webhook schema changes (DB still stores `telegram_whatsapp`; Export JSON still includes that field in the payload). Flagging logic (`applyFormat`) is untouched.