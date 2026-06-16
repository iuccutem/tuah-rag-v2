## Goal

Send every cell edit and every flag toggle to one webhook with the full row payload:

`https://tuah.utem.edu.my/agent/webhook/adf82095-c24f-4a8f-9e10-fca39d0452ff`

## Unified payload (always all columns)

Every POST sends the same shape — id, table, all data columns (including `url` now present on every table), and all 6 flags. No partial/optional fields. The `field` key tells n8n which column the user just changed (`null` for flag-only toggles).

```json
{
  "id": "...",
  "table": "...",
  "field": "question" | "url" | "web" | "telegram_whatsapp" | null,
  "question": "...",
  "url": "...",
  "web": "...",
  "telegram_whatsapp": "...",
  "question_error": false,
  "question_highlight": false,
  "telegram_whatsapp_error": false,
  "telegram_whatsapp_highlight": false,
  "web_error": false,
  "web_highlight": false
}
```

All string columns default to `""` if null/undefined. All flags default to `false`.

## Changes

1. **`src/routes/api/n8n-flag.ts`** — repurpose as the single unified endpoint (URL unchanged). New input schema accepts `id`, `table`, optional `field`, and the full set of column values + flags. Build the payload above (coercing missing fields to `""` / `false`) and POST it Basic-auth'd to the webhook. Keep existing error handling.

2. **`src/routes/_authenticated/index.tsx`**
   - **`handleEditCell`**: stop calling `/api/n8n-update`. POST to `/api/n8n-flag` with the full row — `{ id, table, field, question, url, web, telegram_whatsapp, ...currentFlags }` — where `field`/value is the edited column (the row object is patched with the new value first via the existing optimistic update, then read for the payload). Optimistic UI + revert unchanged.
   - **`sendRowFlags`**: also send the full row — same payload shape, `field: null`, plus the existing flag overrides applied on top of `readFlag` values.

3. **Delete `src/routes/api/n8n-update.ts`** — no longer referenced; routetree regenerates.

## Out of scope

- No UI changes.
- No edits to other webhooks (export, delete, create-table, rename, email, qa, run, process, tables).
- Old `n8n-update` n8n workflows can be retired on the n8n side.
