# Responsive Toolbar Rearrangement

Rework only the layout/visibility of the dashboard toolbar in `src/routes/_authenticated/index.tsx` (WorkspaceBar, ~lines 1558–2163) so it adapts cleanly to phone, tablet, and desktop. No handlers, state, or functionality change — every existing action stays reachable.

## Breakpoints

- Mobile: `<640px` (default)
- Tablet: `sm` 640–1023px
- Desktop: `lg` ≥1024px

## Row structure

Split the current single wrap-row into two visually grouped rows that collapse on small screens:

```text
Row 1 (context):   [Sheet chip] [Vector chip] [Prompt chip + Eye/Info]
Row 2 (actions):   [Search] [Dates] [Refresh]   ......   [Cell-format group] [Run] [Import] [Export] [More]
```

On desktop (`lg`) both rows can merge back into a single flex row (as today) via `lg:flex-row lg:flex-wrap`. On tablet/mobile they stack.

## Per-element responsive rules

- **Sheet / Vector / Prompt chips**: keep as-is; tighten `max-w` on mobile (`max-w-[7rem] sm:max-w-[12rem] lg:max-w-[14rem]`) so all three fit one row on tablet.
- **Search**: full width on mobile (`w-full sm:w-auto`), fixed width on tablet+ (unchanged).
- **Date filter / Refresh**: icon-only on mobile (hide the "Dates" label already gated by `sm:inline` — keep).
- **Run Questions (primary)**: always visible; label already collapses to "Run" under `sm`.
- **Import / Export**: currently `hidden sm:flex` with duplicate entries inside More menu for mobile. Keep that pattern — no change needed, they already adapt.
- **Cell-format group** (Highlight / Mark error / Clear formatting, only when a cell is selected):
  - Mobile (`<sm`): render as a compact floating group that wraps to its own line above the primary actions (`w-full order-first sm:order-none sm:w-auto`), so the primary Run button stays reachable.
  - Tablet (`sm`–`lg`): inline before the More button, icon-only (current behaviour).
  - Desktop (`lg+`): inline with a subtle divider (`border-l pl-1.5 ml-1`) to visually separate from Run/Import/Export.
  - Tooltip labels unchanged.
- **More menu (⋮)**: always visible; already contains mobile duplicates of Import/Export and sheet actions — keep.
- **Selection strip** (row 2166+): already uses `flex-wrap`; add `justify-between` on `sm+` and stack action buttons full-width on mobile (`w-full sm:w-auto`).

## Technical notes

- All changes are Tailwind class edits inside `src/routes/_authenticated/index.tsx`. No new components, no logic edits, no import changes.
- Reuse existing tokens (no hardcoded colors).
- Preserve every `onClick`, `disabled`, `title`, and `aria-label`.
- No changes to `QuestionPasteBox`, dialogs, edge functions, or server handlers.

## Verification

- Toggle preview device: mobile (394px), tablet (768px), desktop (1280px) — confirm no button is clipped or hidden without a fallback entry in the More menu.
- Select a cell → format group appears in the correct slot for each breakpoint.
- Select rows → selection strip lays out cleanly on all sizes.
