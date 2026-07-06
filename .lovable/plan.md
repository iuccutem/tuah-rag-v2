## Goal
Make the Excel export mirror the on-screen highlight (yellow) and error (red) cell rendering from the dashboard.

## Current state
`exportXlsx` in `src/routes/_authenticated/index.tsx` already reads `derivedFormats` and tries to apply:
- yellow solid fill for `highlight`
- red bold font for `error`

But two issues make styling unreliable / incomplete:
1. **Row-id fallback mismatch.** `derivedFormats` keys rows by `row.id ?? i` where `i` is the index in `filteredRows`. The export keys by `row.id ?? rIdx` where `rIdx` is the index in `rowsToExport` (which is a filtered subset when the user selects rows). For rows without an `id`, the lookup misses and no styling is applied.
2. **Error visual is easy to miss** in Excel (just red bold text). Screen also uses a subtle emphasis; add a light red fill so the error state is clearly visible in the exported file, matching what the user perceives on screen.

## Changes
Edit `src/routes/_authenticated/index.tsx` `exportXlsx`:

- Build a `filteredIndexById` map from `filteredRows` so each exported row can look up formats using the same key `derivedFormats` was built with (row.id when present, else the row's index in `filteredRows`).
- When `fmt.highlight` → keep yellow fill `FFFEF08A`.
- When `fmt.error` → apply red bold font **and** a light red fill `FFFECACA` (only if `highlight` isn't already set, so highlight+error still looks like highlight with red bold text, matching the screen precedence).
- Keep everything else (columns, header, freeze, filename) untouched.

## Verification
- Export a sheet containing at least one highlighted cell and one error cell (with and without a row selection), open the .xlsx, confirm yellow fill and red bold text appear on the same cells that show them in the UI.

## Out of scope
No changes to on-screen rendering, backend flag payloads, or JSON export.
