
## Goal

The documentation still describes the old TanStack Start / Cloudflare Workers / `.functions.ts` server-function architecture. The app is now a Vite SPA on **@tanstack/react-router** (no Start), with all `/api/n8n-*` and `admin-users` logic ported to **Supabase Edge Functions**, plus an optional standalone Express server (`server/`) kept only for the university host. Rewrite the markdown to match.

## Files to rewrite

### `README.md`
- Replace TanStack Start badge/mention with **@tanstack/react-router** + Vite SPA.
- Tech Stack table: drop "TanStack Start", "Cloudflare Workers/Nitro"; add **Supabase Edge Functions (Deno)** for the backend row; mark Express server as optional/self-host only.
- Installation: dev server URL is `http://localhost:8080` (Vite default in this project). Remove Cloudflare build note; add `VITE_BASE_PATH` note and link to `server/README.md` for the self-hosted API.
- Simplify env example to only what the browser needs (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`); move server/edge secrets to `docs/environment.md`.
- Project Structure section: replace `src/routes/api/*`, `*.functions.ts`, `client.server.ts` with the current tree — `supabase/functions/<name>/index.ts`, `src/lib/api.ts`, `server/src/handlers/`.

### `docs/architecture.md`
- New ASCII diagram: React SPA → `apiFetch` → Supabase Edge Function (Deno) → n8n webhook (JWT/Basic auth). Show optional secondary path: SPA → Nginx → Express `server/` for the university deploy.
- Components section: describe `src/lib/api.ts` (`apiFetch` helper that resolves `/api/*` to `${VITE_SUPABASE_URL}/functions/v1/*` and attaches the Supabase JWT + apikey).
- Server-side section: replace TanStack Start server routes / server functions with **Edge Functions** in `supabase/functions/`, using `_shared/cors.ts` and `_shared/n8n-jwt.ts`. Note `admin-users` uses `SUPABASE_SERVICE_ROLE_KEY` for user creation. Auth is verified per-function via `supabase.auth.getClaims`.
- Keep the n8n endpoint table and AI export pipeline section, but move `rag-export` description to reflect it's now an edge function (`n8n-export`) not a client-side server function.

### `docs/deployment.md`
- Drop the Cloudflare Workers / workerd / `nodejs_compat` section entirely.
- Two deployment targets:
  1. **Lovable hosting** — Vite static build, edge functions deploy automatically. Publish button flow unchanged.
  2. **University self-host** — `bun run build:prod` with `VITE_BASE_PATH=/rag-builder/`, Nginx serves `dist/`, Express server runs on `127.0.0.1:6699` under `/rag-builder/api/`.
- Required secrets section split into "Edge Function secrets (Lovable Cloud)" and "Express server env (self-host)".

### `docs/environment.md`
- Three groups: **Browser (build-time)**, **Edge Functions (Lovable Cloud secrets)**, **Standalone Express server (self-host only)**.
- Add `VITE_BASE_PATH` under browser.
- Add `N8N_JWT_SECRET`.
- Remove the "never import `client.server.ts`" and "read `process.env` inside `.handler()`" rules — those were TanStack Start–specific. Replace with: "Edge functions use `Deno.env.get(...)`; never read env at module scope in browser code."

### `docs/usage.md`
- Minor: change the `/api/n8n-*` references to say "routed through `apiFetch` → Supabase Edge Function"; otherwise the user-facing flow is unchanged.

### `server/README.md`
- Add a header banner: "**Optional** — only needed for the self-hosted university deploy. The Lovable-hosted app uses Supabase Edge Functions." Rest of the file stays.

### `src/routes/README.md`
- Rewrite for **@tanstack/react-router** (not Start): file-based routing still applies for pages, but the `src/routes/api/` folder no longer exists — API surface now lives in `supabase/functions/`. Keep the conventions table for pages.

### `.lovable/plan.md`
- Leave as-is (historical plan record).

## Out of scope

- No code changes. Documentation only.
- No changes to screenshots, license, or the n8n endpoint IDs table.
