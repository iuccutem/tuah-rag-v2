## Fix "Delete sheet" using the wrong n8n webhook

### Problem
When deleting a sheet (e.g. `qatest-hep_qna`), the flow fails. The current `n8n-delete-table` edge function posts to webhook `3f944ef2-7d47-42b8-8500-b03ab19a71a6`, which is not the correct n8n trigger for the delete-sheet workflow. The correct trigger is `498f1285-dd47-489f-bf00-17487742d2c6`.

The regex was already fixed to allow underscores in a prior turn, so `qatest-hep_qna` passes validation. The remaining issue is only the webhook URL.

### Fix (URL swap only)
Update the `WEBHOOK_URL` constant in the delete-sheet code paths to the correct n8n endpoint. No changes to payload shape (`{ name }`), auth, response handling, or validation regex.

- `supabase/functions/n8n-delete-table/index.ts` — change `WEBHOOK_URL` from
  `https://tuah.utem.edu.my/agent/webhook/3f944ef2-7d47-42b8-8500-b03ab19a71a6`
  to
  `https://tuah.utem.edu.my/agent/webhook/498f1285-dd47-489f-bf00-17487742d2c6`.
- `server/src/handlers/n8n-delete-table.ts` — same URL swap so the university (Bun) deploy matches.

### Notes
- This is the same URL used by `n8n-delete` (delete question rows). The n8n workflow at that endpoint branches on payload: `{ name }` → delete whole sheet; `{ id, question, table? }` → delete question row. No client-side changes needed.
- Frontend (`src/routes/_authenticated/index.tsx` `deleteSheet`) already sends the full prefixed name (`qatest-hep_qna`) and shows the error toast from `json.error`; no UI change required.

### Out of scope
- No changes to `n8n-delete` (question deletion), `n8n-rename-table`, `n8n-create-table`, or any other function.
- No changes to validation regex, payload, auth, or frontend.
