import { Skeleton } from "@/components/ui/skeleton";
import { DateCell, EmptyCell, LinkOrText } from "./cell-renderers";

export type QARow = {
  id?: number | string | null;
  question?: string | null;
  web?: string | null;
  telegram_whatsapp?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type Column = {
  key: keyof QARow;
  label: string;
  width: string;
  render: (row: QARow, idx: number) => React.ReactNode;
};

const COLUMNS: Column[] = [
  {
    key: "id",
    label: "ID",
    width: "w-20",
    render: (row, idx) => (
      <span className="font-mono text-[13px] text-muted-foreground">
        {row.id ?? idx + 1}
      </span>
    ),
  },
  {
    key: "question",
    label: "Question",
    width: "w-[22rem]",
    render: (row) =>
      row.question ? (
        <span className="whitespace-pre-wrap break-words leading-snug">
          {row.question}
        </span>
      ) : (
        <EmptyCell />
      ),
  },
  {
    key: "web",
    label: "Web",
    width: "w-[26rem]",
    render: (row) => (
      <div className="max-h-56 overflow-y-auto pr-1">
        <LinkOrText value={row.web} />
      </div>
    ),
  },
  {
    key: "telegram_whatsapp",
    label: "Telegram / WhatsApp",
    width: "w-[26rem]",
    render: (row) => (
      <div className="max-h-56 overflow-y-auto pr-1">
        <LinkOrText value={row.telegram_whatsapp} />
      </div>
    ),
  },
  {
    key: "createdAt",
    label: "Created",
    width: "w-44",
    render: (row) => <DateCell value={row.createdAt} />,
  },
  {
    key: "updatedAt",
    label: "Updated",
    width: "w-44",
    render: (row) => <DateCell value={row.updatedAt} />,
  },
];

// A, B, C, ... Z, AA, AB, ...
function colLetter(i: number) {
  let s = "";
  let n = i;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

export function QATable({
  rows,
  isLoading,
}: {
  rows: QARow[];
  isLoading: boolean;
}) {
  const skeletonRows = Array.from({ length: 8 });
  const displayRows = isLoading && rows.length === 0 ? [] : rows;
  const totalRows = displayRows.length || (isLoading ? skeletonRows.length : 12);

  return (
    <div className="overflow-auto bg-card">
      <table className="w-max min-w-full border-separate border-spacing-0 text-[13px]">
        {/* Column letters row (A, B, C...) */}
        <thead className="sticky top-0 z-20">
          <tr>
            <th className="sticky left-0 z-30 h-6 w-10 border-r border-b border-[var(--sheets-grid)] bg-[var(--sheets-header-bg)]" />
            {COLUMNS.map((c, i) => (
              <th
                key={`letter-${c.key}`}
                className={`${c.width} h-6 border-r border-b border-[var(--sheets-grid)] bg-[var(--sheets-header-bg)] text-center text-[11px] font-normal text-[var(--sheets-header-fg)]`}
              >
                {colLetter(i)}
              </th>
            ))}
          </tr>
          {/* Real header labels (row 1) */}
          <tr>
            <th className="sticky left-0 z-30 h-8 w-10 border-r border-b border-[var(--sheets-grid)] bg-[var(--sheets-header-bg)] text-center text-[11px] font-normal text-[var(--sheets-header-fg)]">
              1
            </th>
            {COLUMNS.map((c) => (
              <th
                key={`label-${c.key}`}
                className={`${c.width} h-8 border-r border-b border-[var(--sheets-grid)] bg-[var(--sheets-header-bg)] px-3 text-left text-[12px] font-semibold text-foreground`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading && rows.length === 0 ? (
            skeletonRows.map((_, i) => (
              <tr key={`s-${i}`} className="group">
                <RowNumberCell n={i + 2} />
                {COLUMNS.map((c) => (
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
                <RowNumberCell n={2} />
                <td
                  colSpan={COLUMNS.length}
                  className="h-32 border-r border-b border-[var(--sheets-grid)] bg-card text-center text-muted-foreground"
                >
                  No evaluation records yet.
                </td>
              </tr>
              {Array.from({ length: 10 }).map((_, i) => (
                <EmptySheetRow key={`empty-${i}`} n={i + 3} cols={COLUMNS} />
              ))}
            </>
          ) : (
            <>
              {displayRows.map((row, idx) => (
                <tr
                  key={`${row.id ?? idx}-${idx}`}
                  className="group hover:bg-[var(--sheets-row-hover)]"
                >
                  <RowNumberCell n={idx + 2} />
                  {COLUMNS.map((c) => (
                    <td
                      key={c.key}
                      className={`${c.width} border-r border-b border-[var(--sheets-grid)] bg-card px-3 py-2 align-top group-hover:bg-[var(--sheets-row-hover)]`}
                    >
                      {c.render(row, idx)}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Trailing empty rows for the sheet feel */}
              {Array.from({ length: Math.max(0, 14 - displayRows.length) }).map(
                (_, i) => (
                  <EmptySheetRow
                    key={`pad-${i}`}
                    n={displayRows.length + 2 + i}
                    cols={COLUMNS}
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

function RowNumberCell({ n }: { n: number }) {
  return (
    <td className="sticky left-0 z-10 w-10 border-r border-b border-[var(--sheets-grid)] bg-[var(--sheets-header-bg)] text-center text-[11px] font-normal text-[var(--sheets-header-fg)]">
      {n}
    </td>
  );
}

function EmptySheetRow({ n, cols }: { n: number; cols: Column[] }) {
  return (
    <tr className="group hover:bg-[var(--sheets-row-hover)]">
      <RowNumberCell n={n} />
      {cols.map((c) => (
        <td
          key={c.key}
          className={`${c.width} h-8 border-r border-b border-[var(--sheets-grid)] bg-card group-hover:bg-[var(--sheets-row-hover)]`}
        />
      ))}
    </tr>
  );
}
