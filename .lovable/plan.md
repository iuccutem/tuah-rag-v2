## Goal
Fix the cramped, overlapping layout on the dashboard (`/`) when viewed on mobile (~390px) and tablet widths. Desktop layout stays exactly as it is today.

## Problem
`src/routes/_authenticated/index.tsx` renders three dense horizontal bars — top bar, toolbar, formula bar — all using `flex flex-wrap`. On mobile every chip wraps onto its own line and the whole header eats most of the viewport before the grid is visible. The grid then has almost no room.

## Plan (pure presentational changes in `src/routes/_authenticated/index.tsx`)

### 1. Top bar (file title + account actions)
- Keep logo + title + "Last edit at …" visible.
- On `<sm`: collapse Export, Export JSON, Register, Sign out into a single overflow menu (shadcn `DropdownMenu` triggered by a `MoreVertical` icon button). Each item keeps its current handler.
- On `≥sm`: render exactly as today.
- Shrink the title block with `min-w-0` + `truncate` and hide the "Last edit was at …" subline below `sm` (already shown in the bottom strip).

### 2. Toolbar
- Wrap the toolbar in a two-row mobile layout:
  - Row A (always visible): Refresh, Insert, Delete, and a new "Filters" button (opens shadcn `Sheet`/`Popover`) + a "More" overflow for Highlight / Mark error / Clear and the Run-channel actions when rows are selected.
  - Row B (mobile only): full-width Search input.
- On `≥md`: keep the current single-row toolbar exactly as today (no overflow menu, search inline).
- Date-range inputs move into the "Filters" popover on mobile; stay inline on desktop.
- Right-side "Syncing… / Synced …" status hidden on mobile (already echoed in the bottom strip).

### 3. Formula bar
- Hidden below `md` (`hidden md:flex`). It's a desktop spreadsheet affordance and unusable on a phone.

### 4. Row-count strip + sheet tabs + grid
- Row-count strip kept; already compact.
- Sheet tabs row already uses `overflow-x-auto` — keep, just ensure the trailing "Synced …" text wraps to a second line on mobile via `flex-wrap` + `ml-auto` fallback.
- Grid container: add `min-w-0` so the QATable's internal horizontal scroll works inside the flex column instead of pushing the page wider than the viewport.

### 5. Dialogs (`Insert`, `New sheet`, `Run confirmation`, `Delete confirmation`, `Register`)
- Add `max-h-[90vh] overflow-y-auto` + `w-[calc(100vw-1.5rem)]` to each `DialogContent` so they fit on a 390px screen without clipping.

## Out of scope
- No changes to data fetching, server functions, table logic, business rules, or `QATable`/`QuestionPasteBox` internals.
- No redesign of colors, typography, or the desktop layout.
- No new dependencies (uses existing shadcn `DropdownMenu`, `Popover`/`Sheet`, `lucide-react` icons already imported elsewhere).

## Files touched
- `src/routes/_authenticated/index.tsx` (only)

After the change, the dashboard on 390–820px wide screens shows: compact top bar with overflow menu → one-line action toolbar + full-width search → sheet tabs → grid taking the remaining height, with all secondary controls reachable via the overflow menu and Filters popover.