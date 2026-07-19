Restrict row selection toggling to the checkbox cell only.

Current behavior: clicking any data cell or row number schedules a row selection toggle. User wants only the tickbox (checkbox) cell to toggle selection.

Changes in `src/components/qa-dashboard/QATable.tsx`:
1. Remove `pendingToggleRef`, `scheduleRowToggle`, and `cancelPendingToggle` logic.
2. Remove the `onClick` handler from data cells that calls `scheduleRowToggle`.
3. Keep the checkbox cell's `onChange` as the only toggle path.
4. Keep row-number cell `onClick` for selecting the row mode only, but remove `onToggleRow` from it.
5. Ensure double-click to edit still works without the toggle cancellation logic.

No changes to toolbar, export, prompts, or other functionality.