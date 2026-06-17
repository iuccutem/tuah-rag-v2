## Goal
Give every workflow-triggering button a visible loading state while its async work is in flight. The Export JSON button is the obvious miss today — `exportJson` runs (uploading rows to n8n, downloading the response file) without disabling the button or showing a spinner.

## Changes — `src/routes/_authenticated/index.tsx`

1. **Add `exportingJson` state** alongside the existing `exporting` flag (Excel). Keeping them separate so each button reflects only its own work and concurrent clicks of the other action stay possible.

2. **Wrap `exportJson` in try/finally** that sets `setExportingJson(true)` at entry and `setExportingJson(false)` in `finally`. No logic change otherwise.

3. **Desktop "Export JSON" button** (around line 985): add `disabled={exportingJson}`, swap icon to `Loader2` with `animate-spin` while loading, and change the label to "Exporting…".

4. **Mobile menu "Export JSON" item** (around line 1034): add `disabled={exportingJson}`, swap icon to `Loader2 animate-spin` while loading, label "Exporting…".

5. **Cross-disable during any export**: while either `exporting` or `exportingJson` is true, disable both export buttons (desktop + mobile, Excel + JSON) so the user can't fire a second export mid-flight.

## Audit of other workflow buttons (already covered, no change needed)
- Excel export (`exporting`) — already shows "Exporting…" + disabled.
- Run agent (`runningChannel`) — already shows spinner icon + disabled state, plus the full-screen processing overlay.
- Insert questions (`QuestionPasteBox`) — already shows Loader2 + "Inserting…/Processing…" on the Run Text Chat button.
- Delete rows (`deleting`), Create sheet (`creatingSheet`), Register user (`registering`), Refresh (`refreshing`) — already have loading states.

If you spot another action button you want covered, name it and I'll fold it in.

## Out of scope
- No changes to webhook payloads, server functions, or business logic.
- No restyling beyond the loading icon/text swap.
