<div align="center">

# 🧠 RAG Evaluation Builder

### A spreadsheet-style workspace for curating Q&A knowledge across faculties and messaging channels — powered by AI.

[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TanStack Router](https://img.shields.io/badge/TanStack_Router-1.x-FF4154?logo=react&logoColor=white)](https://tanstack.com/router)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v3-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Lovable_Cloud-Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)

[Live Preview](https://tuah-rag.lovable.app) · [Custom Domain](https://rag.ainibot.com) · [Docs](./docs)

![RAG Evaluation Builder hero screenshot](./docs/screenshots/hero.png)

</div>

---

## 📑 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Screenshots](#-screenshots)
- [Installation](#-installation)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Documentation](#-documentation)
- [License](#-license)

---

## 🚀 About

**RAG Evaluation Builder** is an internal tool for the UTeM team to build, review, and export
Retrieval-Augmented Generation (RAG) knowledge bases. It provides an Excel-like
interface backed by an n8n agent pipeline, with one-click answer generation across
**Web Chat** and **Telegram/WhatsApp** channels.

The system supports multiple Q&A sheets (faculties / departments), bulk Excel
import, per-row AI processing, flag/highlight tooling, and a single-click
**RAG JSON export** that translates Malay → English and auto-generates intent
and metadata for each entry.

---

## ✨ Features

### 📊 Spreadsheet workspace
- Excel-style multi-cell selection, copy/paste, fill, and inline editing
- Per-cell formatting (highlight, flag) persisted across the table
- Resizable columns, mobile-friendly layout, dark-mode ready

### 🗂️ Multi-sheet management
- Create, **rename**, and **delete** Q&A sheets (`qatest-*` tables) via tab UI
- Each sheet is an isolated table in the backend
- Full-screen loading overlay while the n8n pipeline provisions / mutates tables

### 🧩 Import & paste
- **Import Excel** — `.xlsx`, `.xls`, `.csv` with column-picker preview and duplicate detection
- **Paste questions** — multi-line paste box that inserts one question per line
- Both paths route through the same n8n insert webhook

### 🤖 AI answer pipeline
- One-click **Run Web** / **Run WA-TG** per row or in bulk
- Pipeline orchestrated through self-hosted **n8n** webhooks, proxied by **Supabase Edge Functions** so credentials never reach the browser
- Per-row email / flag / delete actions

### 🌐 RAG JSON export with translation
- Uses the **Lovable AI Gateway** (Gemini 3 Flash) to:
  - Translate Malay → natural English (preserving acronyms, URLs, proper nouns)
  - Generate dotted-slug **intent** (e.g. `staff.director`)
  - Generate topical **metadata** tags
  - Auto-extract the first URL from each answer
- Output schema: `{ lang, intent, question, answer, metadata, url }`

### 🔐 Auth & roles
- Email/password auth via Lovable Cloud
- Admin role gating with security-definer `has_role()` function
- Admin-only user registration from inside the dashboard

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [React 18](https://react.dev) SPA on [Vite 5](https://vitejs.dev) |
| **Routing** | [@tanstack/react-router](https://tanstack.com/router) (file-based, no SSR) |
| **UI** | [Tailwind CSS v3](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com), [Radix UI](https://www.radix-ui.com), [lucide-react](https://lucide.dev) |
| **Data layer** | [TanStack Query 5](https://tanstack.com/query) |
| **Backend** | [Lovable Cloud](https://lovable.dev) (Supabase) — Postgres, Auth, RLS, **Edge Functions (Deno)** |
| **AI** | [Lovable AI Gateway](https://lovable.dev) (Gemini 3 Flash) via Vercel [AI SDK](https://sdk.vercel.ai) |
| **Workflow engine** | [n8n](https://n8n.io) — agent webhooks for Q&A processing |
| **Spreadsheet I/O** | [exceljs](https://github.com/exceljs/exceljs) |
| **Forms & validation** | [react-hook-form](https://react-hook-form.com), [zod](https://zod.dev) |
| **Optional self-host API** | Node/Express in [`server/`](./server) — only for the university deploy |

---

## 📸 Screenshots

> Drop your screenshots into `docs/screenshots/` using the filenames below.

| | |
|---|---|
| ![Dashboard](./docs/screenshots/dashboard.png) | ![Multi-sheet tabs](./docs/screenshots/sheets.png) |
| **Spreadsheet dashboard** | **Multi-sheet tabs with rename/delete** |
| ![Excel import](./docs/screenshots/import.png) | ![RAG export](./docs/screenshots/export.png) |
| **Excel import with column picker** | **RAG JSON export (AI-translated)** |

---

## 📦 Installation

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0 (or npm/pnpm)
- A Lovable Cloud project (Supabase URL + publishable key)
- Access to the n8n agent instance (Basic-auth credentials + JWT secret) — configured as Edge Function secrets

### 1. Clone & install

```bash
git clone <repo-url> rag-builder
cd rag-builder
bun install
```

### 2. Environment variables

Only browser-visible values live in `.env` at the project root:

```env
# Lovable Cloud (browser — publishable/anon key is safe to ship)
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-anon-key>

# Optional: base path when hosted under a sub-path (e.g. /rag-builder/)
VITE_BASE_PATH=/
```

All server-side secrets (`N8N_WEBHOOK_USER`, `N8N_WEBHOOK_PASSWORD`, `N8N_JWT_SECRET`,
`SUPABASE_SERVICE_ROLE_KEY`) live as **Edge Function secrets** in
Lovable Cloud — see [`docs/environment.md`](./docs/environment.md) for the full matrix.

### 3. Run the dev server

```bash
bun run dev
```

App is served at **http://localhost:8080**.

### 4. Build for production

```bash
bun run build              # standard build (VITE_BASE_PATH=/)
bun run build:prod         # university self-host build (VITE_BASE_PATH=/rag-builder/)
```

Output is a static Vite bundle. See [`docs/deployment.md`](./docs/deployment.md) for
Lovable hosting and the optional self-hosted Express API in [`server/`](./server/README.md).

---

## 🧭 Usage

1. **Sign in** at `/auth` with an account provisioned by an admin.
2. **Pick or create a sheet** from the tab bar at the bottom — each tab is an isolated `qatest-*` table.
3. **Add questions** in any of three ways:
   - Paste multi-line questions into the **Paste box**
   - Click **Import Excel** and pick the column that contains questions
   - Type directly into the **Question** column
4. **Generate answers** by selecting rows and clicking **Run Web** or **Run WA/TG**. The n8n agent fills in the answer column.
5. **Curate** — highlight, flag, edit, or delete rows. All changes are persisted.
6. **Export** — click **Export RAG JSON** to download an AI-formatted, English-translated dataset ready to ingest into your retriever.

For deeper workflows, see [`docs/usage.md`](./docs/usage.md).

---

## 🗂️ Project Structure

```
src/
├── main.tsx                        # SPA entry, router + auth wiring
├── routes/
│   ├── __root.tsx                  # App shell
│   ├── auth.tsx                    # Sign-in
│   └── _authenticated/
│       ├── route.tsx               # Auth gate
│       └── index.tsx               # Main dashboard
├── components/
│   ├── qa-dashboard/               # QATable, columns, paste & import boxes
│   └── ui/                         # shadcn/ui primitives
├── lib/
│   └── api.ts                      # apiFetch() → routes /api/* to edge functions
├── integrations/supabase/          # Auto-generated client
└── styles.css                      # Tailwind theme tokens

supabase/functions/                 # Deno edge functions (backend)
├── _shared/{cors,n8n-jwt}.ts
├── n8n-tables/                     # List sheets
├── n8n-vector-list/                # List vector store entries
├── n8n-qa/                         # List rows
├── n8n-{create,rename,delete}-table/
├── n8n-{run,process,dev-process,flag,delete,email,export}/
└── admin-users/                    # Uses SUPABASE_SERVICE_ROLE_KEY

server/                             # Optional Express API for self-hosted deploy
└── src/handlers/                   # Mirrors the edge functions above

docs/                               # Long-form documentation
```

---

## 📚 Documentation

| Doc | What's inside |
|---|---|
| [`docs/architecture.md`](./docs/architecture.md) | System diagram, data flow, n8n agent contract |
| [`docs/environment.md`](./docs/environment.md) | All env vars (browser vs edge vs self-host) |
| [`docs/usage.md`](./docs/usage.md) | End-user workflows in depth |
| [`docs/deployment.md`](./docs/deployment.md) | Lovable publish + university self-host |
| [`server/README.md`](./server/README.md) | Optional Node/Express API for self-hosting |

---

## 📄 License

MIT © UTeM RAG Team
