# Documentation refresh

Rewrite `README.md` and `docs/architecture.md` so they match the app as it stands today. No images in the README.

## README.md

Remove:
- Hero screenshot and the entire Screenshots section (per request — no images).
- References to `docs/screenshots/`.

Update:
- **Features** to include the additions since the last rewrite:
  - System Prompt selector chip (search, sort, preview, user filter, "PROD RAG" default with Show all, default user "Goh"/osgoh88@gmail.com); prompt id/name + model forwarded to the run webhook.
  - Toolbar cell-format icons (highlight / mark error / clear) shown only when a cell is selected, with tooltips.
  - Row hover copy arrow between Text Chat and Expected Answer.
  - Excel export includes highlight/error formatting and a `Generated At` (KL time) column; JSON export includes `generated_at`.
  - Unified **Export** dialog with two paths: **Export RAW** (JSON / Excel) and **Export Final RAG** (v2.0.0 schema via webhook), including per-row 3-attempt retry, configurable concurrency (1–20, default 5), and a Retry-failed-rows UI.
  - RAG filename convention: `<tableName>_DDMMYY.json` (user-owned prefix, no forced `_faq`).
  - Excel import auto-detection with manual column-picker fallback (SheetJS added as third parser).
  - "Unselect all" alongside Delete in the selection toolbar.
  - Redesigned SaaS-style `/auth` page titled "RAG Builder".
  - Underscore-friendly sheet naming (e.g. `audit_faq`).
- **Tech Stack** table: keep React 18 / Vite 5 / TanStack Router / Tailwind v3 / shadcn / TanStack Query / Lovable Cloud + Edge Functions / Lovable AI Gateway / n8n / exceljs / react-hook-form + zod / optional Express in `server/`.
- **Project Structure** to list all current edge functions: `admin-users`, `n8n-tables`, `n8n-qa`, `n8n-vector-list`, `n8n-create-table`, `n8n-rename-table`, `n8n-delete-table`, `n8n-run`, `n8n-process`, `n8n-dev-process`, `n8n-flag`, `n8n-delete`, `n8n-email`, `n8n-export`, `n8n-rag-build`, `n8n-system-prompt-list`, `n8n-prompt-users`.
- **Usage** section shortened to bullet points that point to `docs/usage.md`; mention Export dialog + concurrency and System Prompt selection step.
- Keep Installation, Env, Build (`build` vs `build:prod`), Documentation table, License.

## docs/architecture.md

Update:
- Keep the two data-flow diagrams (Lovable-hosted + self-hosted); no images.
- Extend the **n8n agent contract** table with the newer endpoints in use:
  - System prompt list (`2f85ad5a-09d6-4ae8-ad66-12772550946b`, JWT-signed).
  - Prompt users list (backing `n8n-prompt-users`).
  - Production RAG build (`cde72af9-9674-4054-9f8f-d4de3d1beac6`, backing `n8n-rag-build`).
- Add a short **Export pipeline** subsection describing:
  - RAW JSON/Excel generation happens client-side; both embed `generated_at` (KL tz); Excel carries highlight/error styling.
  - Final RAG runs client-side worker-pool with configurable concurrency, 3 auto-retries with backoff per row, then a Retry-failed UI; each row hits `n8n-rag-build` and is validated against the v2.0.0 schema in `src/lib/rag-schema.ts`.
- Add a **System Prompt integration** subsection: selector chip loads via `n8n-system-prompt-list`, filters via `n8n-prompt-users`, defaults to user "Goh" and "PROD RAG" naming filter, forwards `system_prompt_id`, `system_prompt`, `system_prompt_name`, `model` into `n8n-process`.
- Refresh the edge-functions bullet list to include `n8n-rag-build`, `n8n-system-prompt-list`, `n8n-prompt-users`.
- Keep Auth & roles section as-is.

No other docs touched; `README.md` will still link to `docs/usage.md`, `docs/environment.md`, `docs/deployment.md`, and `server/README.md` unchanged.
