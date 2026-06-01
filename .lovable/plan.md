## Goal

Update the Q&A Evaluation Dashboard to match the real n8n schema, add a spreadsheet-like paste area for submitting questions to a second webhook, and add a Send Email button wired to a third webhook.

## 1. Sync table columns to new schema

The webhook now returns rows with these fields (53 items in the screenshot):
`id`, `question`, `web`, `telegram_whatsapp`, `createdAt`, `updatedAt`.

Update `QATable.tsx` and types:

| Field | Column header | Rendering |
|---|---|---|
| `id` | ID | right-aligned, mono, muted |
| `question` | Question | wrapped text |
| `web` | Web | wrapped text / URL detection |
| `telegram_whatsapp` | Telegram / WhatsApp | wrapped text / URL detection |
| `createdAt` | Created | `Intl.DateTimeFormat` en-GB |
| `updatedAt` | Updated | `Intl.DateTimeFormat` en-GB |

Drop the old `bil`, `soalan`, `tarikh_pengujian`, `web_browser`, `whatsapp_telegram` mappings. The proxy route `/api/n8n-qa` stays as-is (just forwards the JSON array).

## 2. Google Sheets-style paste box (run questions)

Add a card above the results table:

- A multi-line `Textarea` styled like a spreadsheet cell (mono font, grid lines, "Paste questions here — one per line").
- "Run Questions" button below it.
- On submit:
  - Split textarea by newlines, trim, drop empty lines.
  - For each non-empty question, POST to the second webhook (proxied server-side):
    `https://tuah.utem.edu.my/agent/webhook/dfa18ba2-f8f8-4257-a8fd-646b2c002d95`
    with basic auth (same `N8N_WEBHOOK_USER` / `N8N_WEBHOOK_PASSWORD`).
  - Show a per-row status (pending / ok / failed) next to each question while running.
  - After completion, auto-`refetch` the table so new rows appear.

New server route: `src/routes/api/n8n-run.ts` — POST `{ question: string }`, proxies to webhook 2 with basic auth, returns `{ ok, data?, error? }`.

Interpretation of requirement 3 ("if the questions column is not empty then call another webhook"): only non-empty lines are sent. Each line = one webhook call. If you meant something different (e.g. send the whole block as one payload, or only auto-trigger for existing rows where `question` is filled), say so and I'll adjust.

## 3. Send Email button

Top toolbar gets a second button "Send Email" next to "Refresh Data":

- On click, POST to a new server route `src/routes/api/n8n-email.ts` which proxies to
  `https://tuah.utem.edu.my/agent/webhook/8c131be7-21e7-4049-9dbb-4210b4ba5a79` with the same basic auth.
- No body for now (empty `{}`); webhook just triggers the email pipeline.
- Show a toast on success / error (use existing `sonner`).
- Button disabled + spinner while in-flight.

Open question: should the email send the currently visible rows as payload, or is the n8n flow self-contained? I'll default to self-contained (no payload) unless you say otherwise.

## 4. Files touched

- `src/components/qa-dashboard/QATable.tsx` — new columns, new `QARow` type
- `src/components/qa-dashboard/cell-renderers.tsx` — keep, reuse for `web` / `telegram_whatsapp`
- `src/components/qa-dashboard/QuestionPasteBox.tsx` — new
- `src/routes/index.tsx` — paste box + Send Email button + toast
- `src/routes/api/n8n-run.ts` — new proxy (POST)
- `src/routes/api/n8n-email.ts` — new proxy (POST)

No schema, no Supabase, no localStorage. Same basic-auth secrets reused.

## Questions before I build

1. Run-questions payload: send each line as a separate POST (`{ question }`), or one POST with `{ questions: string[] }`?
2. Send Email button: trigger only (empty body), or include the current table rows in the payload?
