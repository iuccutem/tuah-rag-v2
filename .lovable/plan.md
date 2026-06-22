## Goal
Extend the **Import Excel** flow to import not only the `Question` column, but also `Expected Answer` (→ `telegram_whatsapp`) and `URL` (→ `url`) from the spreadsheet.

## UX changes — `src/components/qa-dashboard/ExcelImportBox.tsx`

Replace the single "Question column" selector with **three column pickers** stacked on one row:

| Field | Required | Maps to |
|---|---|---|
| Question column | yes | `question` |
| Expected Answer column | no (None option) | `telegram_whatsapp` |
| URL column | no (None option) | `url` |

- Each `<Select>` lists the same column letters/headers from the file; the Expected Answer and URL selects also include a `— None —` option so users can skip them.
- Auto-pick on first parse: column 0 = Question, column 1 = Expected Answer (if exists), column 2 = URL (if exists). User can change.
- Duplicate detection still uses the Question value only (unchanged behavior).
- The preview table highlights the currently-selected Question column (same primary tint as today); Expected Answer and URL columns get a lighter secondary tint so the mapping is visible.
- Per-row payload built in `runImport` becomes:
  ```ts
  { question, table, telegram_whatsapp?: string, url?: string }
  ```
  Empty/whitespace values for the optional fields are omitted.
- The status list under the progress area shows the question text (as today). No extra columns shown there — keeps it scannable.

## API change — `src/routes/api/n8n-run.ts`

Extend the request body type and the upstream payload to forward the two optional fields when present:

```ts
let body: { question?: string; table?: string; telegram_whatsapp?: string; url?: string } = {};
...
const upstream: Record<string, unknown> = { question };
if (table) upstream.table = table;
const expected = (body.telegram_whatsapp ?? "").trim();
const url = (body.url ?? "").trim();
if (expected) upstream.telegram_whatsapp = expected;
if (url) upstream.url = url;
```

No other changes (auth, error handling, response shape unchanged). The n8n webhook already accepts these field names (see `/api/n8n-flag` payload shape).

## Out of scope
- No change to `QuestionPasteBox`, manual single-question add, or the `/api/n8n-flag` / `/api/n8n-process` endpoints.
- No change to the QA table or export logic.
- No change to duplicate-detection rules.