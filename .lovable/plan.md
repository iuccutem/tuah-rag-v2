
# Redesign: Production & Development Dashboards

Goal: cleaner, calmer, easier-to-scan layout for both pages. Zero functional changes — every existing action, dialog, webhook, and shortcut keeps working. Dev stays visually isolated from Prod so users always know which environment they're in.

## New page shell (shared)

Replace the current single-tall-header layout with a 3-zone shell:

```text
+-----------------------------------------------------------+
|  AppBar (56px)                                            |
|   [Logo] [Env switch: Prod | Dev]     [Theme] [User menu] |
+-----------------------------------------------------------+
|  Workspace bar (48px)                                     |
|   Sheet: [Faculty ▾]  ·  N rows  ·  Last edit 2m ago      |
|                          [Search] [Filter] [Run] [Export] |
+-----------------------------------------------------------+
|  Content                                                  |
|   QATable (unchanged component, more breathing room)      |
+-----------------------------------------------------------+
|  Sheet tab strip (bottom, unchanged behavior)             |
|   [Faculty A] [Faculty B] [+ Add sheet]                   |
+-----------------------------------------------------------+
```

Why this helps:
- Global controls (env, theme, account) separate from data controls (sheet, run, export). Today they're mixed in one crowded row.
- Sheet context (name, row count, last edit) becomes the visual anchor of the workspace bar, so users always know what they're editing.
- Action buttons collapse into a single "Actions" dropdown on <lg screens, keeping mobile identical in capability but calm in appearance.

## Production page specifics

- AppBar shows a subtle "Production" pill in muted foreground.
- Workspace bar primary actions: Run Questions, Import Excel, Export JSON. Secondary (Rename sheet, Delete sheet, Highlight, Flag, Clear formats) move into an overflow "More" menu with section headers (Sheet / Cells / Data).
- The "Add sheet" affordance stays as the trailing `+` in the bottom tab strip AND appears in the sheet dropdown for discoverability.
- Selected-cell status line (currently just above the table) becomes a slim footer strip under the table so it doesn't compete with the toolbar.

## Development page specifics (visually isolated)

Same shell, but with clear environment cues so users never confuse it with Prod:

- AppBar background tinted with a dev accent (amber/warning token, low opacity) and a solid "Development" pill.
- A persistent left-edge 3px accent stripe down the whole page.
- Workspace bar gains a dedicated Vector Store selector as the first control, styled as a prominent chip (`Vector: <name> ▾`). When empty, chip renders as a warning state ("Select a vector store") and Run is disabled with a tooltip — same disabledReason logic as today.
- Export JSON, Import Excel, and destructive sheet actions are still available (same sheets as Prod per your choice) but visually de-emphasized (ghost buttons) so Run + Vector remain the focal point.
- Page title in the AppBar reads "RAG Development Workspace"; Prod reads "RAG Evaluation Builder".

## Mobile / iPad

- AppBar collapses env switch + theme + user into a single leading menu; env pill stays visible.
- Workspace bar becomes two rows on <md: row 1 = sheet chip + row count, row 2 = horizontally scrollable action chips (Run, Export, Import, More).
- Bottom sheet-tab strip keeps current auto-scroll behavior.
- Follows the responsive-layout rules: `grid-cols-[minmax(0,1fr)_auto]`, `min-w-0`, `shrink-0`, `truncate` on the sheet name.

## Technical notes

- No changes to `QATable`, `QuestionPasteBox`, `ExcelImportBox`, dialogs, or any `/api/n8n-*` route. Only `src/routes/_authenticated/index.tsx` is restructured; `dev.tsx` continues to render `<DashboardPage mode="dev" />`.
- Extract three small presentational components inside the same file to keep the diff readable: `AppBar`, `WorkspaceBar`, `SheetTabStrip`. All state (queries, mutations, selection, formats, dialogs) stays in `DashboardPage` and is passed down as props — no new state, no new effects.
- Add two design tokens in `src/styles.css` under `@theme inline`: `--color-env-dev` (amber-tinted) and `--color-env-prod` (muted foreground) so the env cues are theme-aware in light and dark mode.
- Preserve all existing hotkeys, auto-scroll to active tab, cell-highlight utility, and the runtime `mode` prop contract.
- Runtime hydration error visible in the preview is unrelated (root-match invariant during dev HMR); the redesign edits will trigger a fresh module graph and it should clear. If it persists after the redesign, I'll address it separately.

## Out of scope

- No changes to webhooks, export format, AI prompts, or auth.
- No new features, no removed features.
- No renaming of columns or tabs.
