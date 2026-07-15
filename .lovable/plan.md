## Add an "Unselect all" control next to the Delete button

### Current state
The selection strip in `src/routes/_authenticated/index.tsx` already shows a small **Clear** text link next to the selected-row count, but the user wants a more accessible unselect action right beside the **Delete** button.

### Proposed change
1. In the selection strip (around line 1947-1957), add an **Unselect all** button immediately before the **Delete** button.
2. The new button will:
   - Reset `selectedRowIds` to an empty `Set`.
   - Use a neutral/outline style (e.g. `X` or `Square` icon + "Unselect all" label) so it does not compete visually with the destructive Delete action.
   - Be separated from Delete by the existing vertical divider or a small gap.
3. Keep the existing **Clear** link as-is so the count-side shortcut remains available.
4. No state logic changes beyond reusing `setSelectedRowIds(new Set())`.

### Files to modify
- `src/routes/_authenticated/index.tsx` — add the new button in the selection strip.

### Out of scope
- No changes to delete logic, export logic, table data, or backend.
- No changes to the existing Clear link behavior.