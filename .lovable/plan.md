## Summary

1. Fix cell-edit focus so the cursor lands naturally (no forced "select all") and placeholders stay visible on empty cells.
2. Apply an amber/yellow tint across the entire Development page background, grid chrome, and surfaces — not just the header strip — by scoping CSS variable overrides to a `.dev-mode` class on the page root.

---

## 1. Smarter cell-edit focus behavior

### Problem
`EditableCell` forces `e.currentTarget.select()` on focus. This:
- Highlights the entire cell contents the moment you enter edit mode, making it easy to accidentally overwrite long answers.
- Can suppress or flicker the placeholder when the cell is empty.

### Fix
In `src/components/qa-dashboard/QATable.tsx`:
- Remove the `onFocus: (e) => e.currentTarget.select()` line from the `common` props object inside `EditableCell`.
- Keep `autoFocus: true` so the input is focused immediately when edit mode opens.
- Result: the caret lands at the end of existing text (or at the start of an empty field), the placeholder is visible when the cell is empty, and typing starts cleanly without replacing existing content.

---

## 2. Full-page amber theme for Development mode

### Goal
Make the Development workspace immediately recognizable with a warm amber tint across all chrome — background, header, toolbar, formula bar, grid headers, row hover, tab strip, borders, and selection strip.

### Approach
Use a scoped CSS class (`dev-mode`) on the root page container that overrides the sheet-specific design tokens. This keeps the production palette untouched and avoids sprinkling one-off amber utility classes across dozens of elements.

### Files & changes

#### `src/styles.css`
Add a new `.dev-mode` block that re-tokens the surface colors toward amber. Examples of what will be overridden:
- `--background` → slightly warm off-white (light) / warm dark (dark)
- `--card` → amber-tinted surface
- `--sheets-header-bg`, `--sheets-toolbar-bg`, `--sheets-row-hover` → amber-tinted
- `--sheets-grid` → warm border color
- `--border` / `--input` → subtle amber border

A matching `.dark .dev-mode` block will keep the theme coherent in dark mode.

#### `src/routes/_authenticated/index.tsx`
- Add `dev-mode` class to the root `<div>` when `isDev === true`.
- Remove the inline conditional amber utility classes from the header, workspace bar, and selection strip. The `.dev-mode` CSS overrides will handle the tinting consistently.
- Keep the "Development" badge and the left amber accent border as-is (they are good UX signals).

#### `src/components/qa-dashboard/QATable.tsx`
- No changes required here for the theme. The table already reads `var(--sheets-*)` tokens, which `.dev-mode` will override.

---

## Result

- Double-clicking a cell opens the editor with the caret positioned at the end of text, placeholder visible on empty cells, and no accidental full-text selection.
- Switching to the Development workspace changes the entire page chrome to a cohesive amber tint, making the environment instantly distinguishable from Production.