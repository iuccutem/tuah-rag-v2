## Allow underscores in sheet names

Currently the sheet create/rename flow only accepts `[a-z0-9-]`, so a name like `audit_faq` is rejected with "Use letters, numbers, spaces or dashes only." The download filename builder already preserves underscores, so once sheets can be named with `_` the RAG export will naturally save as `audit_faq_rag_<DDMMYY>.json`.

### Change (single file: `src/routes/_authenticated/index.tsx`)

In both `createSheet` (~line 532) and `renameSheet` (~line 577):
- Slug pipeline: keep lowercase + strip `qatest-`/`dev-` prefix, but change whitespace collapse to underscore-friendly. Replace runs of whitespace with `_` (instead of `-`) so users typing "audit faq" get `audit_faq`. Existing dashes still allowed.
- Validation regex: change `/^[a-z0-9-]+$/` → `/^[a-z0-9_-]+$/`.
- Error toast text: "Use letters, numbers, spaces, underscores or dashes only."

Update the two live-preview spans (lines 2006 and 2103) to mirror the same whitespace → `_` transform so the "Will create / Will rename to" hint matches what actually gets sent.

No backend change needed — `n8n-create-table` / `n8n-rename-table` just forward the name string. Postgres table identifiers allow `_`, and the existing `qatest-<slug>` pattern already tolerates it (the code uses quoted identifiers server-side via n8n).

### Out of scope
- No change to export filename logic (already supports `_`).
- No change to edge functions, prompts, or the RAG dialog.

### Result
User can create/rename a sheet as `audit_faq` (or type "audit faq"), and the Production RAG download will save as `audit_faq_rag_<DDMMYY>.json`.