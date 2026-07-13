## Revert delete-sheet webhook URL

### Change
Swap the `WEBHOOK_URL` in the delete-sheet code back to `3f944ef2-7d47-42b8-8500-b03ab19a71a6`.

- `supabase/functions/n8n-delete-table/index.ts` — set `WEBHOOK_URL` to `https://tuah.utem.edu.my/agent/webhook/3f944ef2-7d47-42b8-8500-b03ab19a71a6`.
- `server/src/handlers/n8n-delete-table.ts` — same URL.

No other changes (payload, auth, regex, frontend all untouched).
