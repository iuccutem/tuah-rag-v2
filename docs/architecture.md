# Architecture

## High-level data flow

```text
┌─────────────┐   serverFn / fetch    ┌──────────────────────┐
│  React App  │ ────────────────────▶ │  TanStack Start SSR  │
│  (browser)  │ ◀──────────────────── │  (Cloudflare Worker) │
└─────────────┘                        └──────────┬───────────┘
       ▲                                          │
       │ auth session                             │ Basic-auth
       ▼                                          ▼
┌─────────────┐                        ┌──────────────────────┐
│  Lovable    │                        │   n8n Agent (UTeM)   │
│  Cloud      │                        │  Webhook endpoints   │
│  (Supabase) │                        └──────────┬───────────┘
└─────────────┘                                   │
                                                  ▼
                                       ┌──────────────────────┐
                                       │ Lovable AI Gateway   │
                                       │ (Gemini 3 Flash)     │
                                       └──────────────────────┘
```

## Components

### Frontend
- **TanStack Router** file-based routes under `src/routes/`.
- **`_authenticated/route.tsx`** gates all dashboard routes; unauthenticated users are redirected to `/auth`.
- **`_authenticated/index.tsx`** is the single-page dashboard hosting `QATable`, sheet tabs, toolbars, and dialogs.

### Server-side
- **Server routes** (`src/routes/api/*.ts`) act as thin Basic-auth proxies in front of n8n webhooks. They never expose credentials to the browser.
- **Server functions** (`*.functions.ts`) handle privileged logic such as RAG export translation and admin user registration. They use `requireSupabaseAuth` middleware.

### n8n agent contract

| Action | Endpoint (under `https://tuah.utem.edu.my/agent/webhook/...`) | Body |
|---|---|---|
| List tables | `4340097e-...` (GET) | — |
| List rows | `911d5dbc-...` (GET) | `?table=qatest-x` |
| Create table | (see `n8n-create-table.ts`) | `{ name }` |
| Rename table | `24d1ce41-0116-47ef-802f-40a3d7da7cb9` | `{ name, newName }` |
| Delete table | `3f944ef2-7d47-42b8-8500-b03ab19a71a6` | `{ name }` |
| Run Web | `dfa18ba2-...` | `{ question, table }` |
| Run WA/TG | `ad7bc9b8-...` | `{ question, table }` |

All requests use HTTP Basic auth with `N8N_WEBHOOK_USER` / `N8N_WEBHOOK_PASSWORD`.

### AI export pipeline

`src/lib/rag-export.functions.ts` batches rows (4 at a time) and calls the Lovable AI Gateway with a structured-output Zod schema. The model:

1. Translates the question and chosen answer into natural English when the source is Malay.
2. Generates a dotted-slug `intent`.
3. Generates 2–4 topical `metadata` tags.
4. The client then extracts the first URL from the answer into a top-level `url` field.

### Auth & roles
- Roles live in a dedicated `user_roles` table (never on profiles).
- `has_role(user_id, role)` is a `SECURITY DEFINER` function used inside RLS policies.
- Admin-only server functions verify the caller's role before invoking privileged operations.
