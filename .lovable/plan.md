Update the table interaction so clicking anywhere inside the checkbox/tickbox cell selects or unselects that row.

Steps:
1. In `src/components/qa-dashboard/QATable.tsx`, update the checkbox column `<td>` for real data rows to call `onToggleRow(rowId)` when the cell itself is clicked.
2. Prevent double toggling by keeping the checkbox input click from bubbling to the cell, while its `onChange` continues to toggle when the checkbox itself is clicked.
3. Leave normal data cells unchanged: they only select the active cell and do not toggle the row.
4. Leave row number cells unchanged: they only select row mode and do not toggle the checkbox.
5. Verify that clicking the checkbox cell background and the checkbox itself both toggle the row exactly once.