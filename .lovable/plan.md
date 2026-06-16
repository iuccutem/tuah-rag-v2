## Goal

1. Make the **Question** column editable (inline edit) and persist via n8n.
2. Add a new **URL** column (editable) and persist via n8n; use it as the `url` field on RAG JSON export (always — even when the answer text contains a URL).

## Scope

- `src/components/qa-dashboard/QATable.tsx` — add `url` to `QARow`; let `Question`/`URL` cells become editable on double-click / Enter (textarea for question, input for URL). Blur or Enter commits; Esc cancels.
- `src/components/qa-dashboard/qa-columns.tsx` — add `url` column right after Telegram/WhatsApp (label "URL", monospace, link rendering, empty state). Question stays where it is.
- `src/routes/_authenticated/index.tsx`:
  - Wire `onEditCell(rowId, col, value)` from the table. Optimistic local patch + toast on success/error; refetch after success (debounced).
  - Build export payload: pass `url` per row to the export server fn and use it directly in the output.
  - Excel column for the auto-generated workbook download now includes URL.
- `src/lib/rag-export.functions.ts`:
  - Accept `url?: string | null` per input row.
  - Drop AI-extracted URL fallback. Output `url = (row.url ?? "").trim() || null` — always the user-typed value; empty stays `null`.
  - Keep translation + intent + metadata behavior unchanged.
- New server route `src/routes/api/n8n-update.ts` — proxies to either of:
  - `https://tuah.utem.edu.my/agent/webhook/9f887e4b-b49f-4f98-b4a3-b545206bffa4` (question)
  - `https://tuah.utem.edu.my/agent/webhook/18285d76-b8dd-42df-92d2-f3069f2e51db` (url)
  Body in: `{ table, id, field: "question" | "url", value }`. Sends Basic auth (existing `N8N_WEBHOOK_USER` / `_PASSWORD` envs) and posts `{ table, id, <field>: value }` to the matching webhook. Returns `{ ok, error? }`. One field per request keeps the contract simple and lets each cell save independently.

## UX details

- Double-click a Question or URL cell → editable. Visual: bordered input, sized to cell, autofocus, select-all.
- Save: blur or Cmd/Ctrl+Enter (textarea) / Enter (URL). Cancel: Esc.
- During save: subtle "Saving…" inline + disable input; on error toast and revert.
- URL cell renders as a clickable link when not editing (reuses existing `LinkOrText`).
- Export note next to the JSON export button updated: "Uses the URL column verbatim."

## Out of scope

- No DB / schema changes, no new secrets, no other column edits.
- Telegram/WhatsApp behavior unchanged.
- No bulk-edit; one cell at a time.
