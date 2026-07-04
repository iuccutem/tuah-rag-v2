import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { QA_COLUMNS, colLetter, type QAColumn } from "./qa-columns";

export type QARow = {
  id?: number | string | null;
  question?: string | null;

  web?: string | null;
  telegram_whatsapp?: string | null;
  url?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type Selection =
  | { mode: "cell"; row: number; col: number }
  | { mode: "row"; row: number }
  | { mode: "col"; col: number };

export type CellFormat = { highlight?: boolean; error?: boolean };
export type FormatsMap = Record<string, CellFormat>;
export const formatKey = (rowId: string | number, colKey: string) =>
  `${rowId}::${colKey}`;

export function QATable({
  rows,
  isLoading,
  selection,
  onSelectionChange,
  formats,
  selectedRowIds,
  onToggleRow,
  onSelectAll,
  onEditCell,
}: {
  rows: QARow[];
  isLoading: boolean;
  selection: Selection | null;
  onSelectionChange: (s: Selection) => void;
  formats: FormatsMap;
  selectedRowIds: Set<string | number>;
  onToggleRow: (id: string | number) => void;
  onSelectAll: (select: boolean) => void;
  onEditCell?: (
    row: QARow,
    col: QAColumn,
    value: string,
  ) => Promise<boolean> | boolean;
}) {

  const skeletonRows = Array.from({ length: 8 });
  const displayRows = isLoading && rows.length === 0 ? [] : rows;
  const colCount = QA_COLUMNS.length;
  const rowCount = displayRows.length;
  const allSelected = rowCount > 0 && displayRows.every((r) => selectedRowIds.has(r.id ?? r.question ?? ""));
  const someSelected = !allSelected && displayRows.some((r) => selectedRowIds.has(r.id ?? r.question ?? ""));
  const [editing, setEditing] = useState<{ row: number; col: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());
  const cellKey = (r: number, c: number) => `${r}:${c}`;

  const isCellSelected = (r: number, c: number) =>
    selection?.mode === "cell" && selection.row === r && selection.col === c;
  const isRowActive = (r: number) =>
    (selection?.mode === "cell" && selection.row === r) ||
    (selection?.mode === "row" && selection.row === r);
  const isColActive = (c: number) =>
    (selection?.mode === "cell" && selection.col === c) ||
    (selection?.mode === "col" && selection.col === c);

  // Scroll selected cell into view
  useEffect(() => {
    if (selection?.mode !== "cell") return;
    const el = cellRefs.current.get(cellKey(selection.row, selection.col));
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selection]);

  // Auto-select A2 once data arrives
  useEffect(() => {
    if (!selection && rowCount > 0) {
      onSelectionChange({ mode: "cell", row: 0, col: 0 });
    }
  }, [rowCount, selection, onSelectionChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (rowCount === 0) return;
    const cur =
      selection?.mode === "cell"
        ? { row: selection.row, col: selection.col }
        : selection?.mode === "row"
          ? { row: selection.row, col: 0 }
          : selection?.mode === "col"
            ? { row: 0, col: selection.col }
            : { row: 0, col: 0 };

    let next: { row: number; col: number } | null = null;
    switch (e.key) {
      case "ArrowUp":
        next = { row: Math.max(0, cur.row - 1), col: cur.col };
        break;
      case "ArrowDown":
      case "Enter":
        next = { row: Math.min(rowCount - 1, cur.row + 1), col: cur.col };
        break;
      case "ArrowLeft":
        next = { row: cur.row, col: Math.max(0, cur.col - 1) };
        break;
      case "ArrowRight":
        next = { row: cur.row, col: Math.min(colCount - 1, cur.col + 1) };
        break;
      case "Tab": {
        const dir = e.shiftKey ? -1 : 1;
        let r = cur.row;
        let c = cur.col + dir;
        if (c >= colCount) {
          c = 0;
          r = Math.min(rowCount - 1, r + 1);
        } else if (c < 0) {
          c = colCount - 1;
          r = Math.max(0, r - 1);
        }
        next = { row: r, col: c };
        break;
      }
      case "Home":
        next = { row: cur.row, col: 0 };
        break;
      case "End":
        next = { row: cur.row, col: colCount - 1 };
        break;
      case "PageUp":
        next = { row: Math.max(0, cur.row - 10), col: cur.col };
        break;
      case "PageDown":
        next = { row: Math.min(rowCount - 1, cur.row + 10), col: cur.col };
        break;
      default:
        return;
    }
    e.preventDefault();
    if (next) onSelectionChange({ mode: "cell", ...next });
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="h-full overflow-auto bg-card focus:outline-none"
    >
      <table className="w-max min-w-full border-separate border-spacing-0 text-[13px]">
        <thead className="sticky top-0 z-20">
          {/* Column letters */}
          <tr>
            <th
              onClick={() => {
                if (rowCount > 0)
                  onSelectionChange({ mode: "cell", row: 0, col: 0 });
              }}
              className="sticky left-0 z-30 h-6 w-10 cursor-cell border-r border-b border-[var(--sheets-grid)] bg-[var(--sheets-header-bg)]"
            />
            <th className="sticky left-[40px] z-30 h-6 w-8 border-r border-b border-[var(--sheets-grid)] bg-[var(--sheets-header-bg)] text-center">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 cursor-pointer accent-primary"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={(e) => onSelectAll(e.target.checked)}
              />
            </th>
            {QA_COLUMNS.map((c, i) => {
              const active = isColActive(i);
              return (
                <th
                  key={`letter-${c.key}`}
                  onClick={() => onSelectionChange({ mode: "col", col: i })}
                  className={`${c.width} h-6 cursor-pointer border-r border-b border-[var(--sheets-grid)] text-center text-[11px] font-normal ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "bg-[var(--sheets-header-bg)] text-[var(--sheets-header-fg)] hover:bg-muted"
                  }`}
                >
                  {colLetter(i)}
                </th>
              );
            })}
          </tr>
          {/* Header labels (row 1) */}
          <tr>
            <th className="sticky left-0 z-30 h-8 w-10 border-r border-b border-[var(--sheets-grid)] bg-[var(--sheets-header-bg)] text-center text-[11px] font-normal text-[var(--sheets-header-fg)]">
              1
            </th>
            <th className="sticky left-[40px] z-30 h-8 w-8 border-r border-b border-[var(--sheets-grid)] bg-[var(--sheets-header-bg)]" />
            {QA_COLUMNS.map((c, i) => {
              const active = isColActive(i);
              return (
                <th
                  key={`label-${c.key}`}
                  onClick={() => onSelectionChange({ mode: "col", col: i })}
                  className={`${c.width} h-8 cursor-pointer border-r border-b border-[var(--sheets-grid)] px-3 text-left text-[12px] font-semibold ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "bg-[var(--sheets-header-bg)] text-foreground hover:bg-muted"
                  }`}
                >
                  {c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading && rows.length === 0 ? (
            skeletonRows.map((_, i) => (
              <tr key={`s-${i}`}>
                <RowNumberCell n={i + 2} active={false} />
                <td className="w-8 border-r border-b border-[var(--sheets-grid)] bg-card" />
                {QA_COLUMNS.map((c) => (
                  <td
                    key={c.key}
                    className={`${c.width} border-r border-b border-[var(--sheets-grid)] bg-card px-3 py-2 align-top`}
                  >
                    <Skeleton className="h-3 w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : displayRows.length === 0 ? (
            <>
              <tr>
                <RowNumberCell n={2} active={false} />
                <td className="w-8 border-r border-b border-[var(--sheets-grid)] bg-card" />
                <td
                  colSpan={colCount}
                  className="h-32 border-r border-b border-[var(--sheets-grid)] bg-card text-center text-muted-foreground"
                >
                  No evaluation records yet.
                </td>
              </tr>
              {Array.from({ length: 10 }).map((_, i) => (
                <EmptySheetRow key={`empty-${i}`} n={i + 3} />
              ))}
            </>
          ) : (
            <>
              {displayRows.map((row, rIdx) => {
                const rowActive = isRowActive(rIdx);
                const rowId = row.id ?? row.question ?? "";
                const checked = selectedRowIds.has(rowId);
                return (
                  <tr key={`${row.id ?? rIdx}-${rIdx}`}>
                    <RowNumberCell
                      n={rIdx + 2}
                      active={rowActive}
                      onClick={() =>
                        onSelectionChange({ mode: "row", row: rIdx })
                      }
                    />
                    <td className="sticky left-[40px] z-10 w-8 cursor-pointer border-r border-b border-[var(--sheets-grid)] bg-card text-center">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 cursor-pointer accent-primary"
                        checked={checked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => onToggleRow(rowId)}
                      />
                    </td>
                    {QA_COLUMNS.map((c, cIdx) => {
                      const selected = isCellSelected(rIdx, cIdx);
                      const inSelectedRowOrCol =
                        rowActive || isColActive(cIdx);
                      const fmt =
                        formats[formatKey(row.id ?? rIdx, c.key as string)] ?? {};
                      const fmtBg = fmt.highlight ? "cell-highlight" : "";
                      const fmtText = fmt.error ? "!text-red-600 font-medium" : "";
                      const canEdit = !!c.editable && !!onEditCell;
                      return (
                        <td
                          key={c.key}
                          ref={(el) => {
                            const k = cellKey(rIdx, cIdx);
                            if (el) cellRefs.current.set(k, el);
                            else cellRefs.current.delete(k);
                          }}
                          onClick={() =>
                            onSelectionChange({
                              mode: "cell",
                              row: rIdx,
                              col: cIdx,
                            })
                          }
                          onDoubleClick={() => {
                            if (canEdit)
                              setEditing({ row: rIdx, col: cIdx });
                          }}
                          className={`${c.width} relative ${canEdit ? "cursor-text" : "cursor-cell"} border-r border-b border-[var(--sheets-grid)] px-3 py-2 align-top ${
                            selected
                              ? "bg-card outline outline-2 -outline-offset-2 outline-primary"
                              : inSelectedRowOrCol
                                ? "bg-primary/[0.04]"
                                : "bg-card hover:bg-[var(--sheets-row-hover)]"
                          } ${fmtBg} ${fmtText}`}
                          title={canEdit ? "Double-click to edit" : undefined}
                        >
                          {canEdit &&
                          editing &&
                          editing.row === rIdx &&
                          editing.col === cIdx ? (
                            <EditableCell
                              column={c}
                              initial={c.raw(row)}
                              onCancel={() => setEditing(null)}
                              onCommit={async (value) => {
                                if (!onEditCell) return;
                                const ok = await onEditCell(row, c, value);
                                if (ok) setEditing(null);
                              }}
                            />
                          ) : (
                            c.render(row, rIdx)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {Array.from({ length: Math.max(0, 14 - displayRows.length) }).map(
                (_, i) => (
                  <EmptySheetRow
                    key={`pad-${i}`}
                    n={displayRows.length + 2 + i}
                  />
                ),
              )}
            </>
          )}
        </tbody>
      </table>
      <div className="h-[40vh] bg-[var(--sheets-header-bg)]" />
    </div>
  );
}

function RowNumberCell({
  n,
  active,
  onClick,
}: {
  n: number;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <td
      onClick={onClick}
      className={`sticky left-0 z-10 w-10 cursor-pointer border-r border-b border-[var(--sheets-grid)] text-center text-[11px] font-normal ${
        active
          ? "bg-primary/15 text-primary"
          : "bg-[var(--sheets-header-bg)] text-[var(--sheets-header-fg)] hover:bg-muted"
      }`}
    >
      {n}
    </td>
  );
}

function EmptySheetRow({ n }: { n: number }) {
  return (
    <tr>
      <RowNumberCell n={n} active={false} />
      <td className="w-8 border-r border-b border-[var(--sheets-grid)] bg-card" />
      {QA_COLUMNS.map((c) => (
        <td
          key={c.key}
          className={`${c.width} h-8 border-r border-b border-[var(--sheets-grid)] bg-card`}
        />
      ))}
    </tr>
  );
}

function EditableCell({
  column,
  initial,
  onCommit,
  onCancel,
}: {
  column: QAColumn;
  initial: string;
  onCommit: (value: string) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const isTextarea = column.inputType === "textarea";

  const commit = async () => {
    if (saving) return;
    if (value === initial) {
      onCancel();
      return;
    }
    setSaving(true);
    try {
      await onCommit(value);
    } finally {
      setSaving(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    } else if (e.key === "Enter") {
      if (isTextarea && !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      e.stopPropagation();
      void commit();
    }
  };

  const common = {
    autoFocus: true,
    disabled: saving,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValue(e.target.value),
    onBlur: () => void commit(),
    onKeyDown: onKey,
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      e.currentTarget.select(),
  };

  return (
    <div className="relative">
      {isTextarea ? (
        <textarea
          {...common}
          rows={4}
          className="w-full resize-y rounded-sm border border-primary bg-background px-2 py-1 text-[13px] leading-snug outline-none focus:ring-2 focus:ring-primary/30"
          placeholder={
            column.key === "telegram_whatsapp"
              ? "Enter expected answer…"
              : column.key === "question"
                ? "Enter question…"
                : "Enter value…"
          }
        />
      ) : (
        <input
          {...common}
          type="text"
          className="w-full rounded-sm border border-primary bg-background px-2 py-1 text-[13px] outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="https://…"
        />
      )}
      {saving && (
        <div className="pointer-events-none absolute right-1 top-1 flex items-center gap-1 rounded bg-background/90 px-1 py-0.5 text-[10px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving
        </div>
      )}
    </div>
  );
}
