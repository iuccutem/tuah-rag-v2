Make row selection easier by allowing clicks on any data cell (or row number) to toggle the row checkbox, instead of forcing users to aim for the small checkbox input.

## Changes

### 1. `src/components/qa-dashboard/QATable.tsx`
- Add a small click-timeout guard so a single click on a data cell toggles the row selection, but a double-click (which enters edit mode) cancels the pending toggle.
- Keep the existing checkbox column for visual feedback and as an explicit control.
- Make the row-number cell also toggle the row selection when clicked.
- Ensure internal controls (`CopyToAnswerButton`, checkbox inputs) still call `stopPropagation()` so they don't double-toggle.

### 2. Verification
- Run a typecheck/build to confirm no regressions.
- Optionally verify with a quick Playwright screenshot that clicking a cell ticks the row.

## Notes
- No changes to business logic, exports, webhooks, or backend.
- This only changes how the row checkbox is toggled in the spreadsheet UI.