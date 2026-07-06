# Environment Variables

Three separate groups depending on where they run.

## 1. Browser (build-time, `.env`)

Baked into the Vite bundle at build time. Safe to ship.

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Lovable Cloud project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key — safe to ship to browser |
| `VITE_BASE_PATH` | Optional. Base path when hosted under a sub-path (e.g. `/rag-builder/`). Defaults to `/`. |

The first two are auto-written by the Lovable Cloud connection — don't hardcode
or clear them.

## 2. Edge Function secrets (Lovable Cloud)

Read inside edge functions via `Deno.env.get(...)`. Configured once in the
Lovable Cloud dashboard.

| Variable | Purpose |
|---|---|
| `N8N_WEBHOOK_USER` | Basic-auth username for the n8n agent |
| `N8N_WEBHOOK_PASSWORD` | Basic-auth password for the n8n agent |
| `N8N_JWT_SECRET` | HS256 secret used to sign short-lived JWTs to n8n |
| `LOVABLE_API_KEY` | Lovable AI Gateway key (used by `n8n-export`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client (bypasses RLS) — used by `admin-users` |
| `SUPABASE_URL` | Auto-provided to every edge function |

## 3. Standalone Express server (self-host only)

Read at runtime by `server/src/index.ts` from `server/.env`. Only needed for the
university deploy — the Lovable-hosted app does not use these.

| Variable | Purpose |
|---|---|
| `PORT` | Listen port (default `6699`) |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Auth + admin operations |
| `N8N_WEBHOOK_USER`, `N8N_WEBHOOK_PASSWORD`, `N8N_JWT_SECRET` | Mirror the edge-function values |
| `LOVABLE_API_KEY` | AI Gateway key |

## Rules

- **Never** read `import.meta.env.*` outside client code, and **never** rely on `process.env.*` in the browser — it is `undefined`.
- **Never** read env at module scope in browser bundles; keep it inside functions/handlers.
- Edge functions use `Deno.env.get(...)` — do not import Node's `process`.
- The publishable (anon) key is public by design; the `service_role` key is server-only and must never appear in a client bundle.
