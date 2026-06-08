## Goal

Add `question_highlight` + `question_error` support so the Question column behaves identically to the Web and Telegram/WhatsApp columns, and make every webhook POST include all 6 booleans for the row.

## Changes

### 1. `src/routes/_authenticated/index.tsx`
- Extend the column allow-list in `applyFormat` from `["web", "telegram_whatsapp"]` to `["web", "telegram_whatsapp", "question"]`. Remove / update the "Only Web and Telegram/WhatsApp" toast accordingly.
- Update `sendRowFlags` (the helper that builds the webhook payload) to compute and include all 6 fields, merging current state with the in-flight override:
  - `question_error`
  - `question_highlight`
  - `telegram_whatsapp_error`
  - `web_error`
  - `telegram_whatsapp_highlight`
  - `web_highlight`
- Ensure local optimistic UI state (the `formats` map keyed by `${rowId}::${colKey}`) is also updated for the `question` column so the cell color changes instantly. Existing `QATable` already renders `formats[formatKey(...)]` for every column, so no table changes needed once `applyFormat` writes to the `question` key.

### 2. `src/routes/api/n8n-flag.ts`
- Add `question_error?: boolean` and `question_highlight?: boolean` to the request body type.
- Include both new fields in the `payload` forwarded to the n8n webhook (defaulting missing values to `false`, same pattern as the existing 4 flags).

### 3. No DB / schema work
The booleans are stored in n8n / the source the webhook writes to. No Supabase migration needed.

## Behavior after change

- Selecting a **Question** cell and clicking Highlight → sets `question_highlight=true` for that row, sends all 6 booleans.
- Mark Error on Question → sets `question_error=true`, sends all 6.
- Clear on Question → sets both `question_*` to false, sends all 6.
- Same for Web and Telegram/WhatsApp (unchanged behavior, just payload now carries the 2 extra question fields).
- Any other column (id, createdAt, updatedAt) still shows the "not flaggable" toast.

## Webhook payload example
```json
{
  "id": 56,
  "question_error": false,
  "question_highlight": true,
  "telegram_whatsapp_error": false,
  "telegram_whatsapp_highlight": false,
  "web_error": true,
  "web_highlight": false
}
```
