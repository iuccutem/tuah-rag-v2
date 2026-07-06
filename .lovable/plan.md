## Goal

Replace TanStack Start / Nitro / Vinxi with a plain **Vite + React SPA** that builds to `dist/` with a root `index.html`, keeps every UI component, dashboard, feature, and route path identical, and moves all server-only logic to a small **separate Node/Express service** you run alongside Nginx.

Kept: TanStack Router (client-only, file-based), TanStack Query, Supabase JS, ExcelJS, all components under `src/components/**`, hooks, styles, dashboard code in `src/routes/_authenticated/index.tsx`, and `src/routes/auth.tsx`.

## Result layout

```text
tuah.utem.edu.my
  /rag-builder/           → Nginx → static files from  dist/
  /rag-builder/api/*      → Nginx → proxy_pass http://127.0.0.1:6699/api/
```

```text
project/
├── index.html                # NEW — Vite SPA entry at project root
├── vite.config.ts            # REWRITTEN — plain Vite, no TanStack Start
├── package.json              # UPDATED scripts + deps
├── src/                      # Client SPA (unchanged component tree)
│   ├── main.tsx              # NEW — createRouter + <RouterProvider/>
│   ├── routes/…              # kept, but SSR-only shell code removed
│   ├── components/…          # UNCHANGED
│   └── lib/api.ts            # NEW — fetch wrapper w/ Supabase bearer
└── server/                   # NEW standalone Node/Express service
    ├── package.json
    ├── src/index.ts          # express app, listens on PORT (default 6699)
    ├── src/middleware/auth.ts# verifies Supabase JWT (replaces requireSupabaseAuth)
    ├── src/routes/n8n/*.ts   # ported from src/routes/api/n8n-*.ts
    ├── src/routes/admin-users.ts
    ├── src/routes/rag-export.ts
    └── src/lib/{n8n-jwt,config,ai-gateway}.ts  # moved verbatim
```

## Client changes

1. **New `vite.config.ts**` — remove `@lovable.dev/vite-tanstack-config`, `@tanstack/react-start`, `nitro`. Use:
  - `@vitejs/plugin-react`
  - `@tailwindcss/vite`
  - `@tanstack/router-plugin/vite` (file-based routing + auto code-split) — this still works standalone without Start
  - `base: process.env.VITE_BASE_PATH ?? '/'`
  - dev proxy: `/api` → `http://127.0.0.1:6699` for local dev
2. `**index.html**` at project root — title, meta, `<div id="root">`, `<script type="module" src="/src/main.tsx">`.
3. `**src/main.tsx**` — creates `QueryClient`, `createRouter({ routeTree, basepath: import.meta.env.BASE_URL })`, renders `<RouterProvider>` inside `<QueryClientProvider>`. Wires the Supabase `onAuthStateChange` listener that today lives in `__root.tsx`.
4. `**src/routes/__root.tsx**` — simplified: just `<Outlet />` + shared providers (Toaster, error boundary). Remove `HeadContent`, `Scripts`, `<html>/<body>` wrappers, `Meta`, and anything from `@tanstack/react-start`.
5. `**src/routes/_authenticated/route.tsx**` — keep the client `beforeLoad` gate that calls `supabase.auth.getUser()`; drop the `ssr:false` note (SPA already has no SSR).
6. `**src/lib/api.ts` (NEW)** — `apiFetch(path, init)` that:
  - prefixes `import.meta.env.VITE_API_BASE_URL ?? '/api'`
  - reads `supabase.auth.getSession()` and attaches `Authorization: Bearer <token>`
  - throws typed errors on non-2xx.
7. **Replace `createServerFn` / `useServerFn` call sites** — everywhere the dashboard, auth screens, or import/export flows call a `*.functions.ts` server function, swap for `apiFetch('/n8n-qa', …)`, `apiFetch('/n8n-run', …)`, `apiFetch('/admin-users', …)`, `apiFetch('/rag-export', …)`, etc. Payload shapes stay identical so downstream code (React Query keys, ExcelJS export, table rendering) is untouched.
8. **Delete SSR-only files:** `src/server.ts`, `src/start.ts`, `src/lib/error-capture.ts`, `src/lib/error-page.ts`, `src/integrations/supabase/{client.server,auth-middleware,auth-attacher}.ts`, `src/lib/*.server.ts`, `src/lib/*.functions.ts`, `src/routes/api/*` (all 13), auto-generated `src/routeTree.gen.ts` (router-plugin regenerates it on build).

## Server (`server/`) changes

1. **Express app** with `cors`, `express.json({ limit: '5mb' })`, health `GET /healthz`.
2. `**middleware/auth.ts**` — `requireAuth(req,res,next)` reads `Authorization` bearer, calls `supabase.auth.getUser(token)` using publishable key, attaches `req.user`. Mirrors today's `requireSupabaseAuth`.
3. **Port each `src/routes/api/n8n-*.ts` to `server/src/routes/n8n/*.ts**` — the handlers already use standard Fetch `Request/Response`; adapt to Express `req/res` (`req.body`, `res.status().json()`) and keep the exact URL paths (`/api/n8n-qa`, `/api/n8n-run`, …). Signing helpers in `n8n-jwt.ts` move over verbatim.
4. **Port `admin-users.functions.ts` → `POST /api/admin-users**` and `**rag-export.functions.ts` → `POST /api/rag-export**`, still using `supabaseAdmin` (service role) and `LOVABLE_API_KEY` server-side.
5. **Env** — `server/.env`: `PORT=6699`, `N8N_JWT_SECRET`, `N8N_WEBHOOK_USER`, `N8N_WEBHOOK_PASSWORD`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`. (All already exist as Supabase secrets — you export them into the server host.)
6. **Scripts** — `server/package.json`: `"dev": "tsx watch src/index.ts"`, `"start": "node dist/index.js"`, `"build": "tsup src/index.ts --format esm --out-dir dist"`.

## New `package.json` scripts (client)

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "preview": "vite preview"
}
```

`npm run build` → `dist/index.html` + hashed assets under `dist/assets/` (correctly prefixed with `/rag-builder/`).

## Nginx (reference only — not code)

```text
location /rag-builder/ {
  alias /var/www/rag-builder/dist/;
  try_files $uri $uri/ /rag-builder/index.html;
}
location /rag-builder/api/ {
  proxy_pass http://127.0.0.1:6699/api/;
  proxy_set_header Host $host;
  proxy_set_header Authorization $http_authorization;
}
```

## Verification

1. `npm run build` produces `dist/index.html` at project root; open `dist/index.html` paths and confirm asset URLs start with `/rag-builder/`.
2. `npm run dev` + `cd server && npm run dev` → visit `http://localhost:5173/`, sign in, load the dashboard, run "Run Web" / "Run WA-TG", import Excel, export XLSX (with highlight + error styling), export RAG JSON, create a user as admin. Each of these hits an Express endpoint through the Vite dev proxy.
3. Confirm no imports remain from `@tanstack/react-start`, `@lovable.dev/vite-tanstack-config`, `nitro`, or `src/routes/api/*` via `rg`.
4. Confirm `src/routeTree.gen.ts` regenerates and the router uses `basepath: import.meta.env.BASE_URL`.

## Out of scope

- Any UI/design changes.
- Database schema, RLS policies, or n8n workflows.
- Deployment automation for the Nginx / Express box (I'll leave that to your ops setup).

## Trade-offs you're accepting

- **No SSR**: initial paint is a blank shell until JS hydrates; SEO/social previews are limited to what's in `index.html`. Fine for an internal admin tool.
- **Second process to run**: the Express server must stay up (systemd/pm2) for any n8n / admin / RAG-export action to work.
- **Leaving the Lovable stack conventions**: future Lovable-side improvements to the TanStack Start template won't apply automatically.