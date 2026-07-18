Add a minimal hover-only arrow button that copies **Text Chat** → **Expected Answer** for a row, saved via the same webhook path used by inline cell edits.

## Behavior
- Small arrow button overlays the right edge of the Text Chat cell (visually straddles the border into Expected Answer).
- Appears on row hover only; hidden otherwise (opacity transition).
- Hidden/disabled when `row.web` is empty.
- If Expected Answer already has content, first click arms a confirm state (icon changes, tooltip "Click again to overwrite"); second click within 2s performs the copy. Prevents accidental overwrite of manual answers.
- Save goes through the existing `handleEditCell` → `apiFetch("/n8n-flag", …)`, so it inserts new answers and updates existing ones with the same optimistic update, toast, and revert-on-error logic already in place.

## Design (minimalistic)
- 20px circular button, `bg-background`, `border border-border`, `ArrowRight` icon (14px), muted foreground.
- Absolutely positioned at the right edge of the Text Chat `<td>` (which is already `relative`), vertically centered, translated so it sits over the column boundary.
- Default: `opacity-0 group-hover:opacity-100 transition`.
- Hover: `bg-primary text-primary-foreground`, subtle scale.
- Confirm-armed: `Check` icon + amber ring.
- Saving: spinner icon, disabled.
- Tooltip: "Copy to Expected Answer" (or "Click again to overwrite" when armed).

## Changes

**`src/components/qa-dashboard/QATable.tsx`**
- Add `group` class to each data `<tr>`.
- Add optional prop `onCopyWebToAnswer?: (row: QARow) => Promise<void> | void` and `copyingRowIds?: Set<string|number>` and `confirmOverwriteRowId?: string|number|null`.
- When rendering the `web` column cell, render an absolutely-positioned overlay button on the right edge if `onCopyWebToAnswer` is provided and `row.web` has content. Button `onClick` calls `e.stopPropagation()` then the handler.

**`src/routes/_authenticated/index.tsx`**
- Add `copyingRowIds` state and `confirmOverwriteRowId` state (with a 2s timeout ref to auto-clear).
- Add `handleCopyWebToAnswer(row)`:
  - Return if `row.web` empty.
  - If `row.telegram_whatsapp` has content and this row isn't armed, set armed state + timer, return.
  - Otherwise mark row as copying, call `handleEditCell(row, telegramColumnDef, row.web)`, then clear copying state.
- Pass the handler and state sets into `<QATable ... onCopyWebToAnswer={handleCopyWebToAnswer} />`.

No backend/edge-function changes — reuses `n8n-flag`.
