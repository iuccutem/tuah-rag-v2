## Goal
Collapse the "Web" and "Telegram / WhatsApp" columns into a single user-facing **Text Chat** column. Under the hood we continue to use only the `web` field. The `telegram_whatsapp` field stays in the DB / API payloads untouched, but every button and UI surface that references it is hidden.

## Changes (UI only — no schema, no webhook payload changes)

### 1. `src/components/qa-dashboard/qa-columns.tsx`
- Rename the `web` column label from "Web Chat" → **"Text Chat"**.
- Remove (or skip rendering) the `telegram_whatsapp` column entry so it no longer appears in the table, exports list, or column selector.

### 2. `src/components/qa-dashboard/QATable.tsx`
- Keep the `telegram_whatsapp` type field (data may still flow), but drop any column/cell rendering tied to it. Header cells, body cells, and column-count math updated accordingly.

### 3. `src/components/qa-dashboard/QuestionPasteBox.tsx`
- Remove the **"Telegram / WhatsApp"** run button and the **"Run Both"** option — only a single button remains, labeled **"Run Text Chat"** (calls `runAll("web")`).
- Remove the `"telegram_whatsapp"` and `"both"` branches from `activeChannel`, `runAll`, channel badges, and status text. Channel state becomes `"web" | null`.
- Rename remaining "Web Chat" copy → "Text Chat".
- Drop the MessageSquare/Telegram badge row.

### 4. `src/routes/_authenticated/index.tsx`
- Hide any toolbar/menu items, filter chips, status legend entries, or flag-toggle buttons (error/highlight) that target the `telegram_whatsapp` column.
- Rename visible "Web" / "Web Chat" labels → **"Text Chat"** where they correspond to the merged column.
- Keep all `telegram_whatsapp_*` flag fields in the webhook payload (`buildRowPayload`, `sendRowFlags`) as-is so the n8n contract is unchanged; they just become unreachable from the UI.

### Out of scope
- No DB migration, no column drop. `telegram_whatsapp` remains in the `qa_rows` schema and in the unified `/api/n8n-flag` payload.
- No changes to `n8n-qa.ts`, `n8n-process.ts`, `n8n-flag.ts`, or `rag-export.functions.ts` — the field is preserved for export and incoming webhook updates.
- If `telegram_whatsapp` data already exists in rows, it stays in the DB but is no longer displayed.
