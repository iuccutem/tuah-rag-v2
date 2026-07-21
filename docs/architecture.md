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
│  (Auth, DB,  │                                     │
│  RLS, Edge)  │                          ┌──────────▼───────────┐
└──────────────┘                          │ Lovable AI Gateway   │
                                          │ (Gemini 3 Flash)     │
                                          └──────────────────────┘
```

### Optional self-hosted path (university deploy)

```text
Browser ─▶ Nginx (/rag-builder/) ─┬─▶ dist/    (Vite static build)
                                  └─▶ 127.0.0.1:6699  (Express, server/)
                                          │
                                          ▼  same n8n webhooks
```

Both environments share the same code paths because the browser always calls
`/api/*`; only the transport differs (`apiFetch` targets the edge function URL
in the Lovable-hosted app; Nginx proxies to Express in the self-host).

## Components

### Frontend
- **@tanstack/react-router** with file-based routes under `src/routes/`.
- **`_authenticated/route.tsx`** gates all dashboard routes; unauthenticated users are redirected to `/auth`.
- **`_authenticated/index.tsx`** is the single-page dashboard hosting `QATable`, sheet tabs, the toolbar (Prompt chip, format icons, selection actions), and the unified Export dialog.
- **`src/lib/api.ts`** exports `apiFetch(path, init?)`. It strips the leading `/api/`, resolves to `${VITE_SUPABASE_URL}/functions/v1/<name>`, and attaches `Authorization: Bearer <session access_token>` plus the `apikey` header. Call sites keep the fetch-style API (`res.ok`, `res.json()`, `res.status`).

### Backend — Supabase Edge Functions
- One Deno function per API route under `supabase/functions/<name>/index.ts`.
- Shared utilities in `supabase/functions/_shared/`:
  - `cors.ts` — standard CORS headers and `OPTIONS` preflight helper.
  - `n8n-jwt.ts` — signs short-lived HS256 JWTs for n8n using `N8N_JWT_SECRET` (Web Crypto).
- Each function reads secrets via `Deno.env.get(...)`, validates the caller's Supabase JWT with `supabase.auth.getClaims(token)`, and returns the JSON shape the client expects.
- `admin-users` uses `SUPABASE_SERVICE_ROLE_KEY` to create accounts via the Supabase Admin SDK; the caller is checked against `has_role(admin)` first.
- Current function set: `admin-users`, `n8n-tables`, `n8n-qa`, `n8n-vector-list`, `n8n-create-table`, `n8n-rename-table`, `n8n-delete-table`, `n8n-run`, `n8n-process`, `n8n-dev-process`, `n8n-flag`, `n8n-delete`, `n8n-email`, `n8n-export`, `n8n-rag-build`, `n8n-system-prompt-list`, `n8n-prompt-users`.

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
| Run Web | `dfa18ba2-...` | `{ question, table, system_prompt_id?, system_prompt?, system_prompt_name?, model? }` |
| Run WA/TG | `ad7bc9b8-...` | `{ question, table, system_prompt_id?, system_prompt?, system_prompt_name?, model? }` |
| System prompt list | `config/chat/system-prompt` and `2f85ad5a-09d6-4ae8-ad66-12772550946b` (JWT-signed) | — |
| Prompt users | (backing `n8n-prompt-users`) | — |
| Production RAG build | `cde72af9-9674-4054-9f8f-d4de3d1beac6` | v2.0.0 row payload |

Requests use HTTP Basic auth (`N8N_WEBHOOK_USER` / `N8N_WEBHOOK_PASSWORD`) and,
where the workflow requires it, a signed JWT built from `N8N_JWT_SECRET`.

### System Prompt integration

- The toolbar's **Prompt** chip loads prompts from `n8n-system-prompt-list` and owners from `n8n-prompt-users`.
- Default owner is **Goh** (`osgoh88@gmail.com`); default naming filter is **PROD RAG**. Users can toggle **Show all** (persisted in `localStorage`) to inspect every prompt.
- The **filter by user** control is embedded inside the Prompt chip popover; the popover is fixed to 22rem for consistent layout.
- The eye icon opens a full-text preview ("View the full prompt").
- When **Run Web** or **Run WA/TG** is invoked, the client posts the selected `system_prompt_id`, `system_prompt`, `system_prompt_name`, and `model` alongside the question. `n8n-process` forwards them into the agent webhook body.

### Export pipeline

The unified **Export** dialog offers two paths:

- **Export RAW** — generated entirely client-side.
  - JSON: every row is augmented with `generated_at` (Asia/Kuala_Lumpur, ISO-like).
  - Excel: uses ExcelJS to preserve cell **highlight** and **mark error** formatting, and adds a `Generated At` column.
  - Filenames follow `<tableName>_DDMMYY.{json,xlsx}` — the sheet name is used verbatim so users own the prefix (`audit_faq_210726.json`, `hotline_210726.xlsx`).
- **Export Final RAG** — v2.0.0 dataset via `n8n-rag-build`.
  - Runs as a **client-side worker pool** with configurable concurrency (1–20, default 5, persisted in `localStorage`).
  - Each row gets up to **3 automatic retries** with progressive backoff on transient errors (including Cloudflare 520/524).
  - Any rows that remain failed after retries surface in a **Retry failed rows** UI so the user can re-drive just those rows.
  - Successful payloads are validated against the v2.0.0 schema in `src/lib/rag-schema.ts` (hashing + metadata enrichment). Malay/mixed content is translated to natural English; proper nouns, acronyms, and URLs are preserved.

### Auth & roles
- Roles live in a dedicated `user_roles` table (never on profiles).
- `has_role(user_id, role)` is a `SECURITY DEFINER` function used inside RLS policies.
- Admin-only edge functions verify the caller's role before invoking privileged operations.
