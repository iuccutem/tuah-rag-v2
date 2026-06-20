## 1. Export JSON — drop the Text Chat column from the webhook payload

In the dashboard, **Text Chat = `web` column** and **Expected Answer = `telegram_whatsapp` column** (see `src/components/qa-dashboard/qa-columns.tsx`). Today `confirmExportJson` sends both fields for every row, with `web` set to an empty string. Remove `web` entirely so the n8n webhook only ever receives the Expected Answer.

**File:** `src/routes/_authenticated/index.tsx` — `confirmExportJson` (around line 292)

- Change the per-row payload from `{ id, question, web: "", telegram_whatsapp: r.expected_answer, url }` to `{ id, question, telegram_whatsapp: r.expected_answer, url }`.

**File:** `src/lib/rag-export.functions.ts`

- Remove `web` from `InputSchema` and from the `formatOne(row)` parameter type so the schema matches the new payload. The prompt already ignores `web`, so no prompt change is needed.

## 2. Dark mode for the dashboard

Add a light/dark theme toggle (sun ↔ moon) that flips the `.dark` class on `<html>` and persists the choice in `localStorage`. The token system in `src/styles.css` already defines a full `.dark` palette and shadcn semantic tokens, so nothing on the page hardcodes light-only colors except a few `--sheets-*` variables that we need dark equivalents for.

**New file:** `src/hooks/use-theme.ts`

- Small hook: reads `localStorage["theme"]` (fallback `"light"`), exposes `{ theme, setTheme, toggle }`, and applies/removes `dark` on `document.documentElement`. Runs an inline init effect on mount to avoid flash.

**File:** `src/routes/__root.tsx`

- Add a tiny blocking script in the shell `<head>` that reads `localStorage["theme"]` and adds `dark` to `<html>` before paint to avoid a light→dark flash.

**File:** `src/routes/_authenticated/index.tsx`

- L Import `Sun`, `Moon` from `lucide-react` and `useTheme`. Add an icon-only toggle button to the header next to the Sign-out button (desktop) and as a first entry in the mobile overflow `DropdownMenu`. `title`/`aria-label` switches between "Switch to dark mode" / "Switch to light mode".

**File:** `src/styles.css`

- Add dark-mode values for the dashboard-only tokens so the grid/headers/toolbar/selection stay legible:
  - `--sheets-grid`, `--sheets-header-bg`, `--sheets-header-fg`, `--sheets-toolbar-bg`, `--sheets-row-hover`, `--sheets-selected` get dark variants inside the existing `.dark { … }` block.
- Verify the existing dark-mode `--foreground` / `--card-foreground` cover Question / Expected Answer / Text Chat cell text — they already use `text-foreground` / default text color via shadcn tokens, so they will adapt automatically.

**Out of scope:** No change to the `/auth` page, no system-preference auto-detection (explicit toggle only — keeps it predictable).

## 3. Sheet tabs visible on iPad Mini 6 and similar mid-size screens

iPad Mini 6 is 744 × 1133 CSS px. That sits above the mobile breakpoint (640px `sm`), so the page renders the desktop toolbar. Today the sheet-tab strip lives at the bottom of a flex column and can be pushed off-screen when the toolbar wraps and the table area expands.

**File:** `src/routes/_authenticated/index.tsx`

- Make the sheet-tab strip (currently around line 1606) `sticky bottom-0 z-10` inside the table container so it is always visible regardless of viewport height, while keeping its existing `overflow-x-auto hide-scrollbar` horizontal scroll behaviour.
- Ensure the strip's parent column uses `min-h-0` so the tab strip is not collapsed by flex sizing on shorter screens.
- Add `min-w-0` to inner flex children if needed to prevent horizontal overflow from the toolbar from pushing the tab strip out of view.
- Verify in preview at 744 × 1133 (iPad Mini portrait) and 1133 × 744 (landscape) that:
  - Sheet tabs are visible without scrolling the page.
  - Tabs scroll horizontally when there are many sheets.
  - The active-tab indicator and the per-tab `▾` actions menu render correctly.

**Out of scope:** No redesign of the toolbar layout; if the desktop toolbar wraps onto two rows at iPad-Mini width that is acceptable, as long as the sheet tabs remain visible.