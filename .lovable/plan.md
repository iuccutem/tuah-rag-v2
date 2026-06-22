## Goal
Remove the horizontal scrollbar inside the Excel import dialog and make the whole flow (file picker, column mappers, preview, summary, insert button) visible without horizontal scrolling. Keep all current functionality (file parse, Q/A/URL mapping, header skip, duplicate detection, per-row insert progress).

## Changes — `src/components/qa-dashboard/ExcelImportBox.tsx`

### 1. Column-picker row — stack into a responsive grid
Currently three `w-[220px]` selects + a checkbox in a `flex flex-wrap`, which wraps awkwardly at dialog width.

Replace with a 1-column → 3-column responsive grid; selects become full-width inside their cell; header-skip checkbox moves onto its own row below.

```tsx
<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
  {fields.map(...) => (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-medium text-muted-foreground">{field.label}</label>
      <Select ...>
        <SelectTrigger className="h-8 w-full"> ... </SelectTrigger>
        ...
      </Select>
    </div>
  ))}
</div>
<label className="flex items-center gap-1.5 text-[13px]">
  <input type="checkbox" ... /> First row is a header (skip it)
</label>
```

### 2. Preview table — fit-to-width, no horizontal scroll
Today the `<table className="w-max min-w-full">` plus `max-w-[260px]` cells forces overflow. Switch to a fixed-layout table sized to the container, with proportional column widths and truncation already in place.

- Container: drop `overflow-auto`; keep border + rounded.
- Table: `w-full table-fixed text-[12px]`.
- Row-number `<th>/<td>`: `w-10`.
- Data columns: set `style={{ width: \`\${100 / columnCount}%\` }}` (or use `w-auto` with `table-fixed` so they share remaining space equally).
- Cells: keep `truncate` + `title={cell}` so long values are readable on hover; drop `max-w-[260px]`.
- Reduce preview rows from 6 to 4 to keep vertical height comfortable inside the dialog.

If `columnCount` is large (>6), render only the columns currently mapped (Q / Expected / URL) plus the first 2 unmapped, with a small "+N more columns" hint — guarantees the preview never needs to scroll sideways regardless of file width. Mapping dropdowns still list every column from `colOptions`, so functionality is preserved.

### 3. Summary row stays as-is
Already wraps cleanly; no change.

## Out of scope
- No changes to `runImport`, payload shape, or `/api/n8n-run`.
- No changes to parsing logic, `entries`/`questions`/duplicate computation, or the per-row status list.
- No changes to the dialog wrapper in `src/routes/_authenticated/index.tsx` (its `max-w-3xl` + `max-h-[90vh] overflow-y-auto` already handle vertical scroll on very small screens).
