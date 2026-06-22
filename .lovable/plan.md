## Goal

Make `ExcelImportBox` self-explanatory so a first-time user knows exactly what to do without external help. Two changes: smart column auto-detection from headers, and inline numbered steps.

## Changes (single file: `src/components/qa-dashboard/ExcelImportBox.tsx`)

### 1. Header-based auto-detect mapping

Replace the current hard-coded `setSelectedCol(0); setExpectedCol(1); setUrlCol(2)` in `onFile` with a header-matching helper:

- Read `rows[0]` (the header row) after parsing.
- Match each header (lowercased, trimmed) against keyword sets:
  - Question: `question`, `q`, `prompt`, `query`, `pertanyaan`
  - Expected Answer: `expected`, `expected answer`, `answer`, `jawaban`, `telegram`, `whatsapp`
  - URL: `url`, `link`, `source`, `reference`
- Fall back to positional defaults (0/1/2) only when no header match found per field.
- Auto-enable `skipHeader` when at least one header matched.

### 2. Inline step-by-step guide

Add a small numbered banner at the top of the dialog (always visible) with 3 short steps:

```
1. Upload your .xlsx, .xls, or .csv file
2. Confirm the Question / Expected Answer / URL columns (auto-detected from headers)
3. Click "Insert N questions" to import
```

Styled as a compact `rounded-md border bg-muted/40 p-3 text-[12px]` block with primary-tinted step numbers in circles.

### 3. Contextual hints in the column-picker area

- Above the three column selects, add a one-line caption: "Confirm or adjust the column mapping below — preview updates live."
- When auto-detection succeeded, show a small green chip "Auto-detected from headers ✓"; otherwise show "Please select the Question column" in amber to draw attention to the required field.
- Add a tiny help line under the Question select: "Required — the prompt that will be sent."
- Add a help line under Expected Answer and URL: "Optional — sent alongside the question."

### 4. Empty-state nudge after file load but before run

Right above the Insert button, when `selectedCol < 0` or `questions.length === 0`, show a muted hint: "Pick the Question column to enable import."

## Out of scope

- No changes to `runImport`, payload shape, `/api/n8n-run`, or the dialog wrapper.
- No template file download.
- No new dependencies.
