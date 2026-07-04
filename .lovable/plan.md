# Dev/Prod scoping + import + selection redesign

## 1. Dev-only tables via `dev-` name prefix

Filter and label tables by prefix so Dev and Prod never see each other's sheets, without changing any webhook.

- **Client filter in `src/routes/_authenticated/index.tsx`**: after `tablesQuery` resolves, filter the list before it feeds the sheet selector / rename / delete UI:
  - Dev mode: `tables.filter(t => t.toLowerCase().startsWith("dev-"))`
  - Prod mode: `tables.filter(t => !t.toLowerCase().startsWith("dev-"))`
  - Apply the same filter when choosing a default `activeTable` and when resolving the "current sheet exists" guard, so switching modes never leaves Dev pointing at a prod table (or vice versa).
- **Create flow**: in the Dev "New table" dialog, force the `dev-` prefix. If the user types `foo`, we send `dev-foo` to `/api/n8n-create-table`. Show the effective name in the dialog preview. Prod create flow unchanged (but reject names starting with `dev-`).
- **Rename / delete**: reuse existing endpoints; in Dev, keep the `dev-` prefix enforced on rename.
- **Label**: extend `formatTableLabel` so `dev-test` displays as `Test` in the chip (prefix hidden in UI, kept in the underlying value).

No backend/webhook change. No shared table can appear in the wrong environment.

## 2. Cross-environment "Import questions" button

New button in the WorkspaceBar of both Prod and Dev: **Import → Dev** (on Prod) and **Import → Prod** (on Dev).

- **Gate**: disabled unless `selectedRowIds.size > 0`. Tooltip when disabled: "Select at least one row to import."
- **Preview dialog** (`Dialog` + `DialogContent`):
  - Header: "Import N questions to {Dev|Prod}".
  - Target sheet selector: dropdown of tables in the *destination* environment (filtered by prefix rule above). Defaults to first table; required.
  - Scrollable list of the selected rows showing only column A (`question`), truncated to two lines each, with a per-row remove (×) so the user can drop items before confirming.
  - Footer: `Cancel` and `Import N question(s)` (disabled while submitting).
- **Submission**: POST to a new server route `src/routes/api/n8n-import.ts` that accepts `{ targetTable: string, questions: string[] }`. Internally it calls the same `/api/n8n-process`-style webhook the app already uses to insert questions, one per row (or batched if that webhook supports it — we mirror what `QuestionPasteBox` already does client-side).
  - After success: toast, close dialog, invalidate the destination table's query so the count updates if the user switches over.
- **Scope**: questions only (column A). Answers/URLs stay empty in the destination and can be re-run there.

## 3. Auto-seed the `dev-test` table on first Dev load

In `DashboardPage` when `mode === "dev"`:

- Once `tablesQuery.data` resolves and the filtered dev list is empty, fire a one-shot POST to `/api/n8n-create-table` with `{ name: "dev-test" }`, guarded by a `useRef` so it never runs twice per session and by a `sessionStorage` flag `rag-dev-test-seeded` so a failed webhook doesn't loop.
- On success: refetch tables, set `activeTable = "dev-test"`, toast "Created starter table 'test'."
- On failure: silent (no toast spam); user can create manually.

No changes to `n8n-create-table` route — it already exists and validates the name.

## 4. Selection strip redesign

Replace the current dense strip with a calmer, more legible bar that only appears when `selectedRowIds.size > 0`:

- Sticky under the WorkspaceBar, full-width, `h-11`, `bg-primary/[0.06]` (Dev: `bg-amber-500/[0.08]`), soft bottom border, subtle slide-in.
- Left cluster: circular count chip (`N`), text "row(s) selected", and a `Clear` link-button that empties the selection.
- Divider, then grouped action buttons with icons + labels (not icon-only), spaced with `gap-2`:
  1. **Run** (`MessageSquare` – Text chat) / **Run web** (`Globe`)
  2. **Import → {opposite env}** (`Upload`) — opens the preview dialog from §2
  3. **Format**: single dropdown ("Highlight", "Mark error", "Clear formatting") instead of three side-by-side buttons — collapses today's `Highlighter` / `AlertTriangle` / `Eraser` trio.
  4. **Delete** (`Trash2`, destructive variant, confirm dialog kept as-is)
- Right cluster: "Select all on page" / "Deselect all" toggle text-button for quick bulk toggles.
- Below `md`: collapse cluster 3 and 4 into a `MoreVertical` menu; keep Run + Import visible.

Purely presentational — same handlers, same server calls.

## Technical section

Files touched:

- `src/routes/_authenticated/index.tsx`
  - New helpers: `isDevTable(name)`, `visibleTables(all, isDev)`, `withDevPrefix(name)`.
  - Filter `tablesQuery.data` before rendering; adjust default `activeTable` effect.
  - New state: `importDialogOpen`, `importTarget` (string), memoized `selectedQuestions` from `selectedRowIds` + `rows`.
  - New effect: dev auto-seed guarded by `useRef` + `sessionStorage`.
  - Extract `SelectionStrip` sub-component in-file for the redesigned bar; extract `ImportDialog` sub-component in-file.
- `src/routes/api/n8n-import.ts` (new): thin proxy that fans out to the existing question-insert webhook per question, mirroring `QuestionPasteBox`'s current server call (reuses same auth / JWT setup — no new secret).
- No changes to: `n8n-tables.ts`, `n8n-qa.ts`, `n8n-create-table.ts`, `n8n-vector-list.ts`, JWT helper, DB schema, or auth.

Edge cases handled:

- Switching env while a row selection exists → clear selection on mode change.
- Import target list empty (destination env has no tables) → dialog shows "Create a table in {env} first" and disables submit.
- Auto-seed race with a manually created table → guarded by session flag; runs only when filtered list is empty.

No functional changes to existing workflows — Run, Delete, Export, Rename, Vector selection, JWT auth all stay as-is.
