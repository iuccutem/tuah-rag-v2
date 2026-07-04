## Hide Bottom Sheet Tabs

The WorkspaceBar header already has a fully-functional sheet selector dropdown (switch sheets, rename, delete, create new). The bottom sheet tab strip is redundant.

### Changes

1. **`src/routes/_authenticated/index.tsx`**
   - Remove the entire `{/* Sheet tabs */}` JSX block (lines ~1877-1964).
   - Remove `tabsScrollRef` and `tabRefs` declarations and the two `useEffect` hooks that only scrolled the tab strip (lines ~241-256).

### Keep unchanged
- Header sheet selector dropdown and its rename/delete/new-sheet actions.
- All table data loading, CRUD, run/flag, import/export, formatting, and selection logic.
