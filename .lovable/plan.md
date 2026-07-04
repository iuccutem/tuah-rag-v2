## Goal

Collapse the Development and Production workspaces into a single unified page. The vector-store picker (currently Dev-only) becomes always available. The amber Dev design becomes the default theme. Remove the environment switcher entirely.

## Changes

### 1. `src/routes/_authenticated/index.tsx` — unify DashboardPage
- Remove the `mode` prop and `isDev` branching. The component always renders in "unified" mode.
- **Table scoping**: only show sheets starting with `qatest-` and NOT `qatest-dev-`. New sheets are always created with the production prefix `qatest-` (drop `DEV_PREFIX` logic in `createSheet`).
- **Vector selector**: always enabled. Keep the `Select` dropdown that reads `/api/n8n-vector-list`, persist in `localStorage` (`rag-vector-id`). Always append `{ vector_id }` to process/run calls when a vector is chosen.
- **Process endpoint**: always use `/api/n8n-process` (drop `/api/n8n-dev-process` branch). Vector id travels in the body.
- **Auto-seed**: remove the dev "test" auto-seed effect.
- **Header/UI**: remove the "Development" badge, the amber left-accent border conditional, and any `isDev` conditionals. Keep the vector-store dropdown visible in the toolbar.
- **Theme**: apply the `dev-mode` class unconditionally to the root container so the amber theme is the default look.
- Update the route's `head()` title/description to a single unified label (e.g. "RAG Evaluation Workspace").

### 2. `src/routes/_authenticated/dev.tsx` — remove
- Delete the file. The `/dev` route goes away; users land on `/` for everything.

### 3. `src/routes/_authenticated/route.tsx` — nav cleanup
- Remove any Dev/Prod switcher link/button (if present in the layout header). Verify no other component links to `/dev`.

### 4. `src/styles.css` — promote dev theme
- Option A (chosen): keep the `.dev-mode` class as-is (no CSS changes needed); the index page always applies it. This preserves the tokens exactly and lets us revert cleanly.

### 5. Existing dev-prefixed tables (`qatest-dev-*`)
- Hidden from the unified sheet tab strip (filter excludes them). No data is deleted; they simply no longer appear in the UI. If the user later wants them migrated/renamed, that's a follow-up.

### 6. Keep unchanged
- All CRUD, import/export, run/flag/delete API routes and their behaviour.
- QATable, cell editing, formatting, selection, search/date filters.
- Auth, theme toggle, user registration.

## Out of scope
- Deleting the `/api/n8n-dev-process` server route (leave it dormant to avoid touching backend contracts).
- Renaming or migrating existing `qatest-dev-*` tables in the backend.

## Result
One page at `/` with the amber design, a vector-store dropdown always visible, and no environment switcher. Sheet creation always uses the `qatest-` prefix. All existing production sheets and functionality continue to work.
