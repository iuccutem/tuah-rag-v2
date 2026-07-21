# RAG Evaluation Builder

A spreadsheet-style workspace for curating Q&A knowledge across faculties and messaging channels, backed by an n8n agent pipeline and the Lovable AI Gateway.

[Live preview](https://tuah-rag.lovable.app) · [Custom domain](https://rag.ainibot.com) · [Docs](./docs)

---

## Table of contents

- [About](#about)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Project structure](#project-structure)
- [Documentation](#documentation)
- [License](#license)

---

## About

**RAG Evaluation Builder** is the internal UTeM tool for building, reviewing, and exporting Retrieval-Augmented Generation (RAG) knowledge bases. It presents an Excel-like interface backed by an n8n agent pipeline, with one-click answer generation across **Web Chat** and **Telegram/WhatsApp** channels, and a single-click **Production RAG** export that produces a Schema v2.0.0 dataset ready to ingest into a retriever.

The app is a pure Vite + React SPA. All server-side work runs in **Supabase Edge Functions** on Lovable Cloud (with an optional Express mirror in `server/` for the university self-host).

---

## Features

### Spreadsheet workspace
- Excel-style multi-cell selection, copy/paste, fill, and inline editing.
- Per-cell **highlight** and **mark error** formatting persisted with the row.
- Format icons (highlight / mark error / clear formatting) appear in the toolbar only when a cell is selected, each with a tooltip.
- One-click **copy arrow** appears on row hover between *Text Chat* and *Expected Answer* to promote the generated chat answer into the expected answer through the save webhook.
- Resizable columns, mobile-friendly toolbar, dark theme throughout the dashboard.

### Multi-sheet management
- Create, **rename**, and **delete** Q&A sheets (`qatest-*` tables) via the tab bar.
- Sheet names accept letters, digits, and underscores (e.g. `audit_faq`).
- Each sheet is an isolated table in the backend; a full-screen overlay is shown while the n8n pipeline provisions or mutates a table.

### Import & paste
- **Import Excel** — `.xlsx`, `.xls`, `.csv` with three-parser fallback (ExcelJS → alternate parser → SheetJS). If auto-detection fails the UI drops into a manual column-picker with duplicate detection.
- **Paste questions** — multi-line paste box that inserts one question per line through the same insert webhook.

### AI answer pipeline
- One-click **Run Web** / **Run WA-TG** per row or in bulk.
- Pipeline orchestrated through self-hosted **n8n** webhooks, proxied by Supabase Edge Functions so credentials never reach the browser.
- Per-row **email**, **flag**, and **delete** actions.
- **Unselect all** button sits alongside Delete in the selection toolbar for fast navigation.

### System Prompt selector
- Chip in the toolbar lists prompts fetched from the n8n prompt registry with search, sort, and full-text preview (eye icon → "View the full prompt").
- Defaults to user **Goh** (`osgoh88@gmail.com`) and the **PROD RAG** naming filter; toggle **Show all** (persisted in `localStorage`) to see every prompt.
- The **filter by user** control lives inside the Prompt chip popover.
- When running a question, the selected prompt's `system_prompt_id`, `system_prompt`, `system_prompt_name`, and `model` are forwarded to the agent webhook.

### Unified Export dialog
Everything ships through one **Export** button that opens a preview dialog with two paths:

- **Export RAW**
  - **Export JSON** — every row includes a `generated_at` timestamp (Asia/Kuala_Lumpur).
  - **Export Excel** — carries highlight and mark-error styling, and adds a `Generated At` column.
  - Filenames follow `<tableName>_DDMMYY.{json,xlsx}` — the sheet name is used as-is, so users control the prefix (e.g. `audit_faq_210726.json`, `hotline_210726.xlsx`).
- **Export Final RAG**
  - Sends the selected rows through the `n8n-rag-build` proxy to the production RAG webhook.
  - Client-side **worker pool** with a configurable concurrency (1–20, default 5, persisted).
  - Each row gets up to **3 automatic retries** with progressive backoff; persistent failures surface a **Retry failed rows** button.
  - Output is validated against the v2.0.0 schema in [`src/lib/rag-schema.ts`](./src/lib/rag-schema.ts).

### Auth & roles
- Email/password auth via Lovable Cloud with a redesigned SaaS-style **RAG Builder** sign-in page at `/auth`.
- Admin role gating with a `SECURITY DEFINER` `has_role()` function; roles live in a dedicated `user_roles` table.
- Admin-only user registration from inside the dashboard, gated server-side in the `admin-users` edge function.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [React 18](https://react.dev) SPA on [Vite 5](https://vitejs.dev) |
| Routing | [@tanstack/react-router](https://tanstack.com/router) (file-based, no SSR) |
| UI | [Tailwind CSS v3](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com), [Radix UI](https://www.radix-ui.com), [lucide-react](https://lucide.dev) |
| Data layer | [TanStack Query 5](https://tanstack.com/query) |
| Backend | [Lovable Cloud](https://lovable.dev) — Postgres, Auth, RLS, **Edge Functions (Deno)** |
| AI | [Lovable AI Gateway](https://lovable.dev) (Gemini 3 Flash) via the Vercel [AI SDK](https://sdk.vercel.ai) |
| Workflow engine | [n8n](https://n8n.io) — agent webhooks for Q&A processing and RAG build |
| Spreadsheet I/O | [exceljs](https://github.com/exceljs/exceljs), [sheetjs](https://sheetjs.com) fallback |
| Forms & validation | [react-hook-form](https://react-hook-form.com), [zod](https://zod.dev) |
| Optional self-host API | Node/Express in [`server/`](./server) — only for the university deploy |

---

## Installation

### Prerequisites
- [Bun](https://bun.sh) ≥ 1.0 (or npm/pnpm)
- A Lovable Cloud project (Supabase URL + publishable key)
- Access to the n8n agent instance (Basic auth + JWT secret), configured as Edge Function secrets

### 1. Clone & install
```bash
git clone <repo-url> rag-builder
cd rag-builder
bun install
```

### 2. Environment variables

Only browser-visible values live in `.env`:

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-anon-key>

# Optional — base path when hosted under a sub-path (e.g. /rag-builder/)
VITE_BASE_PATH=/
```

Server-side secrets (`N8N_WEBHOOK_USER`, `N8N_WEBHOOK_PASSWORD`, `N8N_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) live as **Edge Function secrets** in Lovable Cloud — see [`docs/environment.md`](./docs/environment.md) for the full matrix.

The n8n agent behind **Export Final RAG** must emit Schema v2.0.0 records. See [`docs/rag-builder-agent-prompt.md`](./docs/rag-builder-agent-prompt.md) for the system and user prompts to paste into the Agent node.

### 3. Run the dev server
```bash
bun run dev
```
Served at **http://localhost:8080**.

### 4. Build for production
```bash
bun run build              # standard build (VITE_BASE_PATH=/)
bun run build:prod         # university self-host build (VITE_BASE_PATH=/rag-builder/)
```

Output is a static Vite bundle in `dist/`. See [`docs/deployment.md`](./docs/deployment.md) for Lovable hosting and the optional self-hosted Express API in [`server/`](./server/README.md).

---

## Usage

1. **Sign in** at `/auth` with an account provisioned by an admin.
2. **Pick or create a sheet** from the tab bar — each tab is an isolated `qatest-*` table.
3. **Pick a System Prompt** from the toolbar chip (defaults to Goh / PROD RAG). The chosen prompt is forwarded to every subsequent Run.
4. **Add questions** by pasting, importing an Excel/CSV file (with manual column-picker fallback), or typing directly.
5. **Generate answers** with **Run Web** or **Run WA/TG** on selected rows.
6. **Curate** — highlight cells, mark errors, copy chat answers into expected answers via the row-hover arrow, edit or delete rows.
7. **Export** — open the **Export** dialog, then pick **Export RAW** (JSON / Excel with `generated_at`) or **Export Final RAG** (parallel v2.0.0 build with configurable concurrency and per-row retries).

For deeper workflows, see [`docs/usage.md`](./docs/usage.md).

---

## Project structure

```
src/
├── main.tsx                        # SPA entry, router + auth wiring
├── routes/
│   ├── __root.tsx                  # App shell
│   ├── auth.tsx                    # Sign-in
│   └── _authenticated/
│       ├── route.tsx               # Auth gate
│       └── index.tsx               # Main dashboard (toolbar, Export dialog, Prompt chip)
├── components/
│   ├── qa-dashboard/               # QATable, columns, paste & import boxes, cell renderers
│   └── ui/                         # shadcn/ui primitives
├── lib/
│   ├── api.ts                      # apiFetch() → routes /api/* to edge functions
│   └── rag-schema.ts               # v2.0.0 RAG payload validation + hashing
├── integrations/supabase/          # Auto-generated client
└── styles.css                      # Tailwind theme tokens

supabase/functions/                 # Deno edge functions (backend)
├── _shared/{cors,n8n-jwt}.ts
├── admin-users/                    # Uses SUPABASE_SERVICE_ROLE_KEY
├── n8n-tables/                     # List sheets
├── n8n-qa/                         # List rows
├── n8n-vector-list/                # List vector store entries
├── n8n-create-table/               # Create sheet
├── n8n-rename-table/               # Rename sheet
├── n8n-delete-table/               # Delete sheet
├── n8n-run/                        # Run Web / Run WA-TG
├── n8n-process/                    # Row-level processing (system prompt aware)
├── n8n-dev-process/                # Dev-only processing variant
├── n8n-flag/                       # Flag row
├── n8n-delete/                     # Delete row
├── n8n-email/                      # Email row
├── n8n-export/                     # AI-assisted RAW export helper
├── n8n-rag-build/                  # Production RAG builder proxy
├── n8n-system-prompt-list/         # Prompt registry
└── n8n-prompt-users/               # Prompt owner filter

server/                             # Optional Express API for self-hosted deploy
└── src/handlers/                   # Mirrors the edge functions above

docs/                               # Long-form documentation
```

---

## Documentation

| Doc | What's inside |
|---|---|
| [`docs/architecture.md`](./docs/architecture.md) | System diagram, data flow, n8n agent contract, export pipeline |
| [`docs/environment.md`](./docs/environment.md) | All env vars (browser vs edge vs self-host) |
| [`docs/usage.md`](./docs/usage.md) | End-user workflows in depth |
| [`docs/deployment.md`](./docs/deployment.md) | Lovable publish + university self-host |
| [`docs/rag-builder-agent-prompt.md`](./docs/rag-builder-agent-prompt.md) | System / user prompts for the Production RAG agent (Schema v2.0.0) |
| [`server/README.md`](./server/README.md) | Optional Node/Express API for self-hosting |

---

## License

MIT © UTeM RAG Team
