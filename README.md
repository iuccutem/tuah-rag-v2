<div align="center">

# 🧠 RAG Evaluation Builder

### A spreadsheet-style workspace for curating Q&A knowledge across faculties and messaging channels — powered by AI.

[![TanStack Start](https://img.shields.io/badge/TanStack_Start-1.x-FF4154?logo=react&logoColor=white)](https://tanstack.com/start)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Lovable_Cloud-Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
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
- Pipeline orchestrated through self-hosted **n8n** webhooks (Basic-auth proxied via TanStack server routes)
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
| **Framework** | [TanStack Start](https://tanstack.com/start) v1 (SSR + server functions) |
| **Build tool** | [Vite 7](https://vitejs.dev) |
| **UI** | [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com), [Radix UI](https://www.radix-ui.com), [lucide-react](https://lucide.dev) |
| **Data layer** | [TanStack Query 5](https://tanstack.com/query), [TanStack Router](https://tanstack.com/router) |
| **Backend** | [Lovable Cloud](https://lovable.dev) (Supabase) — Postgres, Auth, RLS |
| **AI** | [Lovable AI Gateway](https://lovable.dev) (Gemini 3 Flash) via Vercel [AI SDK](https://sdk.vercel.ai) |
| **Workflow engine** | [n8n](https://n8n.io) — agent webhooks for Q&A processing |
| **Spreadsheet I/O** | [exceljs](https://github.com/exceljs/exceljs) |
| **Forms & validation** | [react-hook-form](https://react-hook-form.com), [zod](https://zod.dev) |
| **Runtime** | Cloudflare Workers (via Nitro) |

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
- Access to the n8n agent instance (Basic-auth credentials)

### 1. Clone & install

```bash
git clone <repo-url> rag-builder
cd rag-builder
bun install
```

### 2. Environment variables

Create a `.env` file at the project root:

```env
# Lovable Cloud / Supabase (browser)
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-anon-key>

# Server runtime mirror
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-anon-key>

# AI Gateway (server-only)
LOVABLE_API_KEY=<gateway-key>

# n8n agent webhooks (server-only)
N8N_WEBHOOK_USER=<user>
N8N_WEBHOOK_PASSWORD=<password>
```

> See [`docs/environment.md`](./docs/environment.md) for the full variable matrix.

### 3. Run the dev server

```bash
bun run dev
```

App is served at **http://localhost:5173**.

### 4. Build for production

```bash
bun run build
```

Output targets Cloudflare Workers via Nitro. See [`docs/deployment.md`](./docs/deployment.md).

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
├── routes/
│   ├── __root.tsx                  # App shell
│   ├── auth.tsx                    # Sign-in
│   ├── _authenticated/
│   │   ├── route.tsx               # Auth gate
│   │   └── index.tsx               # Main dashboard
│   └── api/                        # Server routes (n8n proxies)
│       ├── n8n-qa.ts               # List rows
│       ├── n8n-tables.ts           # List sheets
│       ├── n8n-create-table.ts
│       ├── n8n-rename-table.ts
│       ├── n8n-delete-table.ts
│       ├── n8n-run.ts              # Insert / run question
│       ├── n8n-process.ts          # Trigger Web / WA-TG pipeline
│       ├── n8n-flag.ts
│       ├── n8n-delete.ts
│       └── n8n-email.ts
├── components/
│   ├── qa-dashboard/               # QATable, columns, paste & import boxes
│   └── ui/                         # shadcn/ui primitives
├── lib/
│   ├── rag-export.functions.ts     # AI translation + intent/metadata
│   ├── ai-gateway.server.ts        # Lovable AI Gateway provider
│   └── admin-users.functions.ts    # Admin-only user registration
├── integrations/supabase/          # Auto-generated client
└── styles.css                      # Tailwind v4 theme tokens
docs/                               # Long-form documentation
```

---

## 📚 Documentation

| Doc | What's inside |
|---|---|
| [`docs/architecture.md`](./docs/architecture.md) | System diagram, data flow, n8n agent contract |
| [`docs/environment.md`](./docs/environment.md) | All env vars (browser vs server) |
| [`docs/usage.md`](./docs/usage.md) | End-user workflows in depth |
| [`docs/deployment.md`](./docs/deployment.md) | Publishing, custom domains, Cloudflare runtime notes |

---

## 📄 License

MIT © UTeM RAG Team
