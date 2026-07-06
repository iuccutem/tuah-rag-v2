
## Goal

The Sheets and Vector Store panels are empty because the SPA calls `/api/n8n-*` on the standalone Express server (port 6699), which does not run inside the Lovable-hosted preview. We will mirror those routes as Supabase Edge Functions so the same credentials (`N8N_WEBHOOK_USER`, `N8N_WEBHOOK_PASSWORD`, `N8N_JWT_SECRET`) power the app in both environments. No webhook URLs change.

## What gets built

### 1. Edge Functions (one per current handler)

Port every file in `server/src/handlers/` to `supabase/functions/<name>/index.ts` (Deno):

- `n8n-tables` (GET) — Sheets list
- `n8n-vector-list` (GET) — Vector Store list
- `n8n-qa` (GET, query params)
- `n8n-create-table`, `n8n-delete-table`, `n8n-rename-table` (POST)
- `n8n-delete`, `n8n-flag`, `n8n-run` (POST)
- `n8n-process`, `n8n-dev-process` (POST)
- `n8n-export`, `n8n-email` (POST)
- `admin-users` (POST, uses service role key)

Each function:
- Reads secrets via `Deno.env.get(...)` (already configured: `N8N_WEBHOOK_USER`, `N8N_WEBHOOK_PASSWORD`, `N8N_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`).
- Replaces Node-only APIs (`Buffer.from(...).toString("base64")` → `btoa(...)`, `jsonwebtoken` → `jose` via `npm:jose`).
- Uses standard CORS headers and handles `OPTIONS` preflight.
- Validates the caller's Supabase JWT via `supabase.auth.getClaims(token)` for every function except unauthenticated ones (all n8n routes require auth today; `admin-users` additionally requires admin role, matching current server behavior).
- Returns the same JSON shape the client already expects, so no UI changes are needed.

### 2. Client — thin `apiFetch` helper

Add `src/lib/api.ts` exporting `apiFetch(path, init?)`:

- Strips leading `/api/`, resolves to `${VITE_SUPABASE_URL}/functions/v1/<name>`.
- Attaches `Authorization: Bearer <session access_token>` and `apikey: <publishable key>`.
- Returns the raw `Response` so existing call-site code (`res.ok`, `res.json()`, `res.status`) keeps working unchanged.

Replace the 16 `fetch("/api/n8n-*")` and `/api/admin-users` calls in:

- `src/routes/_authenticated/index.tsx`
- `src/components/qa-dashboard/QuestionPasteBox.tsx`
- `src/components/qa-dashboard/ExcelImportBox.tsx`

with `apiFetch(...)`. Payloads, endpoints, and response handling stay identical.

### 3. Standalone Express server

Left in place for the university deploy but no longer required for the Lovable-hosted app. `apiFetch` targets Supabase Edge Functions in both environments, so a single code path serves both. The `server/` directory can be removed later if you decide you don't need it — not part of this change.

## Out of scope

- No changes to n8n webhook URLs, credentials, DB schema, RLS, or UI.
- No changes to Supabase auth, routing, or base-path handling.

## Verification

1. Deploy edge functions.
2. Load the app in preview, sign in — Sheets list and Vector Store repopulate.
3. Spot-check: rename a sheet, run a question, export — each round-trips through the corresponding edge function.
