## Plan

1. **Replace the fragile XLSX read path**
   - Keep the current CSV handling.
   - For `.xlsx` / `.xls`, stop relying only on `wb.worksheets[0]`, because this file is crashing inside ExcelJS with missing `sheets` metadata.
   - Add a safer workbook-loader helper that can recover when ExcelJS returns incomplete workbook metadata.

2. **Add a compatibility fallback for problematic Excel files**
   - If `workbook.xlsx.load()` throws errors like `reading 'sheets'` or `evaluating 'e4.sheets'`, retry with a browser-safe parser fallback.
   - Extract the first worksheet rows into the same `string[][]` shape the UI already expects, so the existing mapping/preview/import logic remains unchanged.

3. **Improve the user-facing import error**
   - If the file truly has no readable worksheet, show a clear message such as: `No readable worksheet found. Please save the file again as .xlsx or .csv and retry.`
   - Avoid showing raw technical errors like `undefined is not an object`.

4. **Verify with the current import flow**
   - Confirm the dialog proceeds from upload to the column-mapping preview instead of stopping at the toast.
   - Confirm Question, Expected Answer, and URL mapping still work after the parser change.