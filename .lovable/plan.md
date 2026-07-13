## Allow underscores in table rename/delete edge functions

### Problem
The frontend already accepts `[a-z0-9_-]+` for sheet slugs (create + rename), and `n8n-create-table` accepts `[A-Za-z0-9_-]+`. But `n8n-rename-table` and `n8n-delete-table` validate with `/^qatest-[a-z0-9-]+$/`, which rejects any existing table containing `_` (e.g. `qatest-hep_qna`). Attempting to rename `qatest-hep_qna` triggers `Invalid current table name.`, and renaming to `qatest-pusatislam_qna` would also trip `Invalid new table name.`.

### Fix (edge functions only)
Add `_` to the character class in both regexes so the pattern matches what the frontend and create endpoint already allow.

- `supabase/functions/n8n-rename-table/index.ts` — change both regexes from `/^qatest-[a-z0-9-]+$/` to `/^qatest-[a-z0-9_-]+$/` (used for `name` and `newName`).
- `supabase/functions/n8n-delete-table/index.ts` — change `/^qatest-[a-z0-9-]+$/` to `/^qatest-[a-z0-9_-]+$/`.

No other logic, webhook, or frontend changes. Dev-prefixed tables (`qatest-dev-...`) continue to match since `-` is still allowed.

### Out of scope
Frontend validation (already allows `_`), create endpoint (already allows `_`), other n8n endpoints.
