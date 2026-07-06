# Architecture

## High-level data flow

```text
┌──────────────┐   apiFetch("/api/…")   ┌──────────────────────────┐
│  React SPA   │ ─────────────────────▶ │  Supabase Edge Function  │
│  (Vite +     │ ◀───────────────────── │  (Deno, per handler)     │
│  TanStack    │  Supabase JWT + apikey └────────────┬─────────────┘
│  Router)     │                                     │ Basic auth +
└──────┬───────┘                                     │ HS256 JWT
       │ auth session                                ▼
       ▼                                  ┌──────────────────────┐
┌──────────────┐                          │   n8n Agent (UTeM)   │
│  Lovable     │                          │  Webhook endpoints   │
│  Cloud       │                          └──────────┬───────────┘
│  (Supabase:  │                                     │
│  Auth, DB,   │                          ┌──────────▼───────────┐
│  RLS, Edge)  │                          │ Lovable AI Gateway   │
└──────────────┘                          │ (Gemini 3 Flash)     │
                                          └──────────────────────┘
```

### Optional self-hosted path (university deploy)

```text
Browser ─▶ Nginx (/rag-builder/) ─┬─▶ dist/    (Vite static build)
                                  └─▶ 127.0.0.1:6699  (Express, server/)
                                          │
                                          ▼  same n8n webhooks
```

The same code paths work in both environments because the browser always calls
`/api/*`, and only the transport differs (`apiFetch` targets the edge function
URL in the Lovable-hosted app; Nginx proxies to Express in the self-host).

## Components

### Frontend
- **@tanstack/react-router** with file-based routes under `src/routes/`.
- **`_authenticated/route.tsx`** gates all dashboard routes; unauthenticated users are redirected to `/auth`.
- **`_authenticated/index.tsx`** is the single-page dashboard hosting `QATable`, sheet tabs, toolbars, and dialogs.
- **`src/lib/api.ts`** exports `apiFetch(path, init?)`. It strips the leading `/api/`, resolves to `${VITE_SUPABASE_URL}/functions/v1/<name>`, and attaches `Authorization: Bearer <session access_token>` plus the `apikey` header. Call sites keep the fetch-style API (`res.ok`, `res.json()`, `res.status`).

### Backend — Supabase Edge Functions
- One Deno function per API route under `supabase/functions/<name>/index.ts`.
- Shared utilities in `supabase/functions/_shared/`:
  - `cors.ts` — standard CORS headers and `OPTIONS` preflight helper.
  - `n8n-jwt.ts` — signs short-lived HS256 JWTs for n8n using `N8N_JWT_SECRET` (Web Crypto).
- Each function reads secrets via `Deno.env.get(...)`, validates the caller's Supabase JWT with `supabase.auth.getClaims(token)`, and returns the JSON shape the client expects.
- `admin-users` uses `SUPABASE_SERVICE_ROLE_KEY` to create accounts via the Supabase Admin SDK; the caller is checked against the `has_role(admin)` policy first.

### Optional Express server (`server/`)
Mirrors the same handler set for the self-hosted deploy. Each file in
`server/src/handlers/*.ts` exports `method` + `handler({ request })`, and
`src/index.ts` bridges Express ↔ web `Request`/`Response`. Not required for the
Lovable-hosted app.

### n8n agent contract

| Action | Endpoint (under `https://tuah.utem.edu.my/agent/webhook/...`) | Body |
|---|---|---|
| List tables | `4340097e-...` (GET) | — |
| List rows | `911d5dbc-...` (GET) | `?table=qatest-x` |
| Create table | (see `n8n-create-table`) | `{ name }` |
| Rename table | `24d1ce41-0116-47ef-802f-40a3d7da7cb9` | `{ name, newName }` |
| Delete table | `3f944ef2-7d47-42b8-8500-b03ab19a71a6` | `{ name }` |
| Run Web | `dfa18ba2-...` | `{ question, table }` |
| Run WA/TG | `ad7bc9b8-...` | `{ question, table }` |

Requests use HTTP Basic auth (`N8N_WEBHOOK_USER` / `N8N_WEBHOOK_PASSWORD`) and,
where the workflow requires it, a signed JWT built from `N8N_JWT_SECRET`.

### AI export pipeline

The `n8n-export` edge function batches rows (4 at a time) and calls the Lovable
AI Gateway with a structured-output Zod schema. The model:

1. Translates the question and chosen answer into natural English when the source is Malay.
2. Generates a dotted-slug `intent`.
3. Generates 2–4 topical `metadata` tags.
4. The client then extracts the first URL from the answer into a top-level `url` field.

### Auth & roles
- Roles live in a dedicated `user_roles` table (never on profiles).
- `has_role(user_id, role)` is a `SECURITY DEFINER` function used inside RLS policies.
- Admin-only edge functions verify the caller's role before invoking privileged operations.
