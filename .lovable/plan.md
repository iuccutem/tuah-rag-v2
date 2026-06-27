## Problem

Importing a file produced by our own "Export Excel" throws `undefined is not an object (evaluating 'V.sheets')`. This is an ExcelJS reader bug: when the `.xlsx` has no workbook-level `<bookViews>` element, its `workbook-view-xform` reconcile step crashes dereferencing `view.sheets`.

Our `exportXlsx` in `src/routes/_authenticated/index.tsx` sets `ws.views` (worksheet view, frozen header) but never sets `wb.views` (workbook view). ExcelJS therefore writes no `<bookViews>`, and re-importing the same file blows up in `ExcelImportBox` at `wb.xlsx.load(buf)`.

## Fix

In `exportXlsx` (around line ~940, right after `wb.created = new Date();`), add a workbook view so the written file includes `<bookViews>`:

```ts
wb.views = [
  {
    x: 0,
    y: 0,
    width: 10000,
    height: 20000,
    firstSheet: 0,
    activeTab: 0,
    visibility: "visible",
  },
];
```

No other changes. Worksheet frozen-header view stays. JSON export and ExcelImportBox parsing untouched.

## Verification

- Export Excel from any sheet → re-upload via "Import Excel" → preview renders without the toast error and rows parse normally.
- Existing third-party `.xlsx`/`.csv` imports keep working (unchanged code path).