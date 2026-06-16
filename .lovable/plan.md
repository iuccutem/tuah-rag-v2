## Goal

Replace the AI-based "Export JSON" flow (Lovable AI Gateway) with an n8n webhook call. The webhook returns the formatted RAG rows; the browser saves them as a JSON file. UX, filename, and selection logic stay identical.

## Webhook

- URL (test): `https://tuah.utem.edu.my/agent/webhook-test/22f796c0-d27f-4e92-a914-a6dcde8a0c5f` (user will swap to production URL later)
- Method: `POST`
- Auth: Basic auth via existing `N8N_BASIC_AUTH_*` envs (same as other n8n proxies in this project)
- Request body:
  ```json
  {
    "table": "<active table or 'all'>",
    "rows": [
      { "id": "...", "question": "...", "web": "...", "telegram_whatsapp": "...", "url": "..." }
    ]
  }
  ```
- Expected response:
  ```json
  {
    "rows": [
      { "lang": "en", "intent": "...", "question": "...", "answer": "...", "metadata": "...", "url": "..." | null }
    ]
  }
  ```

## Changes

1. **New server route `src/routes/api/n8n-export.ts`**
   - Accepts `POST { table, rows }` from the client.
   - Reads webhook URL from env (`N8N_EXPORT_WEBHOOK_URL`) with a hardcoded fallback to the test URL above so it works immediately.
   - Forwards the body to the webhook with Basic auth headers, 120s timeout.
   - Returns `{ rows }` from the webhook verbatim (validated minimally — must be an object with an array `rows`). On failure returns `{ error }` with non-200 status.

2. **New secret `N8N_EXPORT_WEBHOOK_URL`** (optional)
   - Not required for the initial test — the test URL is the route's default.
   - User can later add the production URL via the secrets tool to override.

3. **`src/routes/_authenticated/index.tsx` — `exportJson`**
   - Stop calling `exportRowsAsRag` server fn.
   - `fetch('/api/n8n-export', { method: 'POST', body: JSON.stringify({ table: activeTable || 'all', rows: inputRows }) })`.
   - Read `{ rows }` from the JSON response, then run the existing Blob/download code unchanged.
   - Toast text changes from "Formatting … with AI" to "Sending to n8n…".

4. **Leave `src/lib/rag-export.functions.ts` in place** (unused but kept) — out of scope to delete. Can remove in a follow-up if desired.

## Out of scope

- No change to Excel export, editing, table CRUD, or any other column.
- No schema changes.
- No deletion of the old AI export function (kept dormant for easy rollback).