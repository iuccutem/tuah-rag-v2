## Goal

Move the three cell-format actions (Highlight cell, Mark error, Clear formatting) out of the ⋯ (MoreVertical) dropdown menu and surface them as icon-only buttons in the top toolbar (the header row that already holds Run Questions / Import / Export / ⋯). They should appear only when a cell is selected, and show their name on hover via a tooltip.

## Changes

### `src/routes/_authenticated/index.tsx`

1. Add a new icon-button group in the toolbar, rendered just before the existing `<DropdownMenu>` (around line 1630), gated on `selection?.mode === "cell"` so the buttons come out only when a cell is selected.
2. Each button is icon-only (h-9 w-9, same visual language as the existing ⋯ button), wrapped in a shadcn `Tooltip` so hovering shows just the label:
   - `Highlighter` (yellow) → tooltip "Highlight cell" → `applyFormat({ highlight: true })`
   - `AlertTriangle` (red) → tooltip "Mark error" → `applyFormat({ error: true })`
   - `Eraser` → tooltip "Clear formatting" → `applyFormat(null)`
3. Wrap the group (or reuse an existing `TooltipProvider` if one already wraps the page; otherwise add a local `TooltipProvider` around just these buttons with `delayDuration={100}`).
4. Remove the three matching `DropdownMenuItem`s and the "Cell" section label + following `DropdownMenuSeparator` from the `<DropdownMenuContent>` (lines ~1641–1656). The ⋯ menu keeps the "Data" section (Export Excel, Export JSON on mobile, etc.) unchanged.
5. Imports: `Highlighter`, `AlertTriangle`, `Eraser` already imported. Add `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` from `@/components/ui/tooltip` if not already imported.

### Behavior notes

- Buttons render only while `selection?.mode === "cell"`; when the user clicks a row header, column header, or clears selection they disappear.
- No changes to `applyFormat`, formatting state, styles, or the QATable itself.
- No backend or data-model changes.

### Out of scope

- Table-tab strip, other toolbar buttons, keyboard shortcuts, and dropdown "Data" section stay as-is.
