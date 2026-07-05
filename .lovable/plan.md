## Problem

When a user uploads a workbook that both current parsers (ExcelJS + read-excel-file) can't read, `ExcelImportBox` throws a hard error toast ("This workbook format is missing readable sheet metadata…") and never renders the preview/column-picker. The user has no way to proceed even though the file clearly contains a usable table (as seen in the screenshot).

The import UI already supports manual column selection — it renders whenever rows are loaded and shows the "Please confirm the Question column" chip when auto-detection returns no matches. The gap is only in the parser layer.

## Change

Add a third, more permissive parser fallback so a workbook that current parsers reject still yields raw rows, then let the existing manual-selection UI handle mapping.

### 1. `src/components/qa-dashboard/ExcelImportBox.tsx`

- Add SheetJS (`xlsx`) as a third fallback inside `parseExcelFile`:
  1. Try ExcelJS (current).
  2. Try `read-excel-file` (current).
  3. Try `xlsx` (`XLSX.read(buf, { type: "array" })` → `sheet_to_json(ws, { header: 1, defval: "" })`) — SheetJS tolerates workbooks with missing `bookViews`/sheet metadata that break the other two.
- Only throw the "workbook format is missing readable sheet metadata" error if all three fail.
- When rows are parsed but headers don't match any keywords (`matched === false`), keep the current behavior: render the preview grid and column dropdowns with the yellow "Please confirm the Question column" chip so the user picks columns by hand.

### 2. `package.json`

- Add `xlsx` dependency (SheetJS community build). Install via `bun add xlsx`.

## Not changing

- No changes to auto-detect keywords, insert flow, `/api/n8n-run`, or any styling.
- No changes to CSV parsing path.
- Manual selection UI itself is already complete — no redesign.
