## Problem
When a cell is flagged as "highlighted" in the spreadsheet, the current styling applies `!bg-yellow-200` unconditionally. In dark mode the text is white, so white-on-light-yellow is completely unreadable.

## Solution
Switch to a **border-only highlight**: the primary visual cue is a colored inset border, with only a very subtle background tint. This preserves text contrast in both themes.

### Files to change

#### 1. `src/styles.css`
Add two new sheets-specific tokens to `:root` and `.dark`, plus a custom `@utility`:

```css
/* in :root (light) */
--sheets-highlight-border: oklch(0.70 0.12 80);
--sheets-highlight-bg: oklch(0.97 0.02 80);

/* in .dark */
--sheets-highlight-border: oklch(0.65 0.14 80);
--sheets-highlight-bg: oklch(0.20 0.03 80);

/* new utility */
@utility cell-highlight {
  box-shadow: inset 0 0 0 1.5px var(--sheets-highlight-border);
  background-color: var(--sheets-highlight-bg);
}
```

#### 2. `src/components/qa-dashboard/QATable.tsx`
Replace the hardcoded yellow background on line ~279:

```tsx
// Before
const fmtBg = fmt.highlight ? "!bg-yellow-200" : "";

// After
const fmtHighlight = fmt.highlight ? "cell-highlight" : "";
```

Update the `className` on the `<td>` to use `fmtHighlight` instead of `fmtBg`.

No other UI logic changes required — the highlight toggle, format persistence, and export behaviour remain untouched.