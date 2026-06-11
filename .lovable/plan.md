## RAG Builder — dynamic n8n tables, tab discovery, selective export

### 1. Remove faculty filter (cleanup from previous iteration)
- Drop the "Filter by Faculty/Office" dropdown UI, `activeFaculty` state, `facultyOptions` memo, and the faculty branch of `filteredRows` from `src/routes/_authenticated/index.tsx`.
- Drop the Faculty column from `src/components/qa-dashboard/qa-columns.tsx` and the `faculty` field from `QARow` in `QATable.tsx`. Remove now-unused `Select` imports.

### 2. Tab discovery
- New server route `src/routes/api/n8n-tables.ts` (GET) that proxies `https://tuah.utem.edu.my/agent/webhook/4340097e-3074-4ab4-b97c-feba47f87a55` with the existing basic-auth env vars (`N8N_WEBHOOK_USER` / `N8N_WEBHOOK_PASSWORD`). Normalizes the response to `{ tables: string[], error: string | null }` — accepts a raw array, `{ data: [...] }`, `{ tables: [...] }`, or array of `{ name }` objects.
- In `DashboardPage`, add a React Query for the tab list (`queryKey: ["qa-tables"]`). On first successful load, set `activeTable` to the first entry. Tab labels are derived from raw names by stripping the `test-` prefix and capitalizing the first letter — raw value is kept for the API calls.

### 3. Fetching rows per active table
- Extend `src/routes/api/n8n-qa.ts` GET: read `?table=` from the request URL and forward it to the upstream fetch webhook as the same `?table=` query param. If absent, behave as today.
- Client `fetchRows` becomes `fetchRows(table: string)`. React Query key becomes `["qa-rows", activeTable]`. Switching tabs clears `selection` + `selectedRowIds` and the query auto-refetches.

### 4. Tab bar (replaces the existing single bottom pill)
- Render one pill per discovered table at the existing bottom strip in `index.tsx`, using current pill styling for the active tab and a muted hover variant for the rest. Click switches `activeTable`.
- Trailing `+` button opens a `Dialog` with an `Input` ("Table name") + Create / Cancel. On submit:
  1. Format: `value.trim().toLowerCase().replace(/\s+/g, "-")` then prepend `test-`. Reject empty / duplicates (case-insensitive against current list).
  2. POST `{ name: "<formatted>" }` to new server route `src/routes/api/n8n-create-table.ts` which forwards to `https://tuah.utem.edu.my/agent/webhook/f87381b1-9fac-403e-b238-2c5420aa3af5` with basic auth and returns `{ ok, error? }`.
  3. On success: close dialog, `refetch()` the tab-discovery query, set `activeTable` to the formatted name, toast success.
  4. On failure: toast error, keep dialog open.

### 5. Forward `table` on every mutation
- Existing API routes accept and forward a `table` field in the body to their upstream webhooks (no behavior change when absent):
  - `src/routes/api/n8n-flag.ts`
  - `src/routes/api/n8n-delete.ts`
  - `src/routes/api/n8n-process.ts`
  - `src/routes/api/n8n-run.ts`
- All client call sites in `index.tsx` add `table: activeTable` to their JSON bodies (flag, delete, process/runChannel).
- `QuestionPasteBox` gains an optional `table?: string` prop and forwards it on its insert POST so newly-inserted questions land in the right table. The page passes `activeTable` down.
- The external "Sync Q&A sheet" anchor (hosted n8n form) is left untouched — it is not a webhook we control.

### 6. Selective JSON export
- Update `exportJson`:
  - Source rows = if `selectedRowIds.size > 0`, `filteredRows.filter(r => selectedRowIds.has(r.id ?? r.question ?? ""))`; otherwise all `filteredRows`.
  - Strip internal/optimistic fields: build each export row by picking only the columns present in `QA_COLUMNS` (id, question, web, telegram_whatsapp, createdAt, updatedAt) plus the 6 flag fields (`question_highlight`, `question_error`, `web_highlight`, `web_error`, `telegram_whatsapp_highlight`, `telegram_whatsapp_error`). No React/runtime keys.
  - Filename: `rag-builder-{activeTable}-{YYYYMMDD-HHmm}.json`. Toast shows `Exported N row(s)`.

### 7. Preserve everything else
- Colors, grid styling, formula bar, toolbar, text-wrapping, highlight (yellow) and error-mark (red) cell visuals, sync overlays, Insert/Delete/Run flows, auth/Register/Sign-out, n8n flag payload (all 6 booleans) — untouched.

### Files touched
- `src/routes/_authenticated/index.tsx` — remove faculty UI/state, add tab-list query, tab bar + new-sheet dialog, table-aware fetch + table body field on all mutation calls, selective export.
- `src/components/qa-dashboard/qa-columns.tsx` — drop Faculty column.
- `src/components/qa-dashboard/QATable.tsx` — drop `faculty` from `QARow`.
- `src/components/qa-dashboard/QuestionPasteBox.tsx` — accept and forward `table` prop.
- `src/routes/api/n8n-qa.ts` — read and forward `?table=`.
- `src/routes/api/n8n-flag.ts`, `n8n-delete.ts`, `n8n-process.ts`, `n8n-run.ts` — accept `table` in body, include in upstream payload.
- `src/routes/api/n8n-tables.ts` — new GET proxy for the discovery webhook.
- `src/routes/api/n8n-create-table.ts` — new POST proxy for the create-table webhook.

### Assumptions
- Discovery webhook returns a list of raw names with `test-` prefix; if the shape varies, the normalizer handles array / `{data}` / `{tables}` / `{name}`-object forms.
- The fetch webhook accepts `?table=<raw-name>`; legacy single-table behavior is preserved when the param is missing.
- Each n8n mutation workflow either uses or harmlessly ignores the new `table` body field until you wire it on the n8n side.
