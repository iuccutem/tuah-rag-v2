## Goal

Add a new **Development** workspace that mirrors the existing dashboard (tabs, table, paste-questions, imports, export) but is bound to a user-selected **vector store**. Every question the agent processes from that page is sent to the dev webhook with the chosen `vector_id` included.

## Scope

### 1. Vector store fetch proxy
- New server route `src/routes/api/n8n-vector-list.ts` (GET) that Basic-auth-proxies `https://tuah.utem.edu.my/agent/webhook/config/vector/list`.
- Returns `{ vectors: Array<{ id: string; name: string }>, error }`. Since the exact upstream shape is unknown, normalize defensively (support arrays of strings, `{id,name}`, `{vector_id,label}`, or nested `data/results`) — same pattern as `n8n-tables.ts`.

### 2. Dev processing proxy
- New server route `src/routes/api/n8n-dev-process.ts` (POST) that forwards `{ question, table, vector_id }` to `https://tuah.utem.edu.my/agent/webhook/ad7bc9b8-0b89-4e4a-bdb5-89b83ecddc59` with Basic auth.
- Same envelope contract as `n8n-process.ts` (`{ ok, data, error }`).

### 3. New authenticated route
- File: `src/routes/_authenticated/dev.tsx` → URL `/dev`.
- Renders the same dashboard UI as `/`, but with:
  - A **Vector store** dropdown in the header (loaded from `/api/n8n-vector-list`, persisted per user in `localStorage`).
  - When no vector is selected, the "Run Text Chat" button in the paste-questions flow is disabled with a hint.
  - Question processing calls `/api/n8n-dev-process` (with `vector_id`) instead of `/api/n8n-process`.
  - Sheet/tab CRUD (`Add`, `Rename`, `Delete`, `Switch`) reuses the existing `/api/n8n-create-table`, `n8n-rename-table`, `n8n-delete-table` webhooks — no changes needed.
  - Same table listing (`/api/n8n-tables`) and row loading (`/api/n8n-qa`) — dev shares the qatest-* tables so structure stays identical.

### 4. Shared dashboard refactor (small)
- Extract the current `DashboardPage` body in `src/routes/_authenticated/index.tsx` into a reusable `<QADashboard mode="prod" | "dev" />` component (kept in the same folder or `src/components/qa-dashboard/QADashboard.tsx`).
- Add two internal knobs:
  - `processEndpoint: "/api/n8n-process" | "/api/n8n-dev-process"`.
  - `extraProcessBody?: { vector_id?: string }` — merged into every process request.
- Pass these into `QuestionPasteBox` via new optional props (`processEndpoint`, `extraBody`). Prod page passes nothing (backwards compatible).

### 5. Navigation
- Add a top-nav segmented control ("Production" / "Development") in the dashboard header. On mobile it lives inside the existing "More" overflow menu.
- Uses `<Link to="/">` and `<Link to="/dev">` with `activeProps` for the active style.

### 6. Vector store selector UX
- Dropdown shows the human name; the id is stored in state.
- If the list is empty or the webhook errors, show a red hint under the dropdown and disable question processing.
- Selection persists in `localStorage` (`rag-dev-vector-id`) so refreshes keep the choice.

## Out of scope
- No schema/database changes.
- No changes to export JSON, Excel import, row flags, or auth flow.
- No changes to production processing behavior.

## Technical notes
- New proxy routes follow the exact shape of `n8n-tables.ts` / `n8n-process.ts` (Basic auth via `N8N_WEBHOOK_USER` / `N8N_WEBHOOK_PASSWORD`, `Response.json` with `{ ok, error }`).
- The vector list webhook's response shape isn't documented, so the proxy will log the first response server-side and normalize common shapes. If the real shape differs, only the normalizer needs a one-line tweak.
- `QuestionPasteBox` currently posts to `/api/n8n-run` (insert) and `/api/n8n-process` (agent run). Only the second call gets the endpoint + `vector_id` override; inserts are unchanged.
