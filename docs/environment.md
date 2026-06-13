# Environment Variables

Two sets of variables are required: **browser-bundled** (`VITE_*`, replaced at build time) and **server-only** (read at runtime via `process.env`).

## Browser (build-time)

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Lovable Cloud project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key — safe to ship to browser |

## Server (runtime — never bundled)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Same URL as above, used during SSR |
| `SUPABASE_PUBLISHABLE_KEY` | Same anon key, used during SSR |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client (bypasses RLS) — for privileged server functions only |
| `LOVABLE_API_KEY` | Lovable AI Gateway key (Gemini 3 Flash for RAG export) |
| `N8N_WEBHOOK_USER` | Basic-auth username for the n8n agent |
| `N8N_WEBHOOK_PASSWORD` | Basic-auth password for the n8n agent |

## Rules

- **Never** use `process.env.*` in client code or at module scope in shared files — it will be `undefined` in the browser.
- **Never** import `client.server.ts` at module top level outside another `.server.ts` file — load it inside the handler via `await import(...)`.
- Read `process.env.X` **inside `.handler()`** of server functions; module-level reads happen too early.
