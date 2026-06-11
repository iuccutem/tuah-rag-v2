import type { ReactNode } from "react";
import type { QARow } from "./QATable";
import { DateCell, EmptyCell, LinkOrText } from "./cell-renderers";
import { Badge } from "@/components/ui/badge";

export type QAColumn = {
  key: keyof QARow;
  label: string;
  width: string;
  /** Visual cell render */
  render: (row: QARow, idx: number) => ReactNode;
  /** Raw string for formula bar / copy */
  raw: (row: QARow) => string;
};

const fmtDate = (v: unknown) => {
  if (v == null) return "";
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? String(v) : d.toISOString();
};

export const QA_COLUMNS: QAColumn[] = [
  {
    key: "id",
    label: "ID",
    width: "w-20",
    render: (row, idx) => (
      <span className="font-mono text-[13px] text-muted-foreground">
        {row.id ?? idx + 1}
      </span>
    ),
    raw: (row) => (row.id == null ? "" : String(row.id)),
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
    raw: (row) => row.question ?? "",
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
    raw: (row) => row.web ?? "",
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
    raw: (row) => row.telegram_whatsapp ?? "",
  },
  {
    key: "createdAt",
    label: "Created",
    width: "w-44",
    render: (row) => <DateCell value={row.createdAt} />,
    raw: (row) => fmtDate(row.createdAt),
  },
  {
    key: "updatedAt",
    label: "Updated",
    width: "w-44",
    render: (row) => <DateCell value={row.updatedAt} />,
    raw: (row) => fmtDate(row.updatedAt),
  },
];

// A, B, C, ... Z, AA, AB, ...
export function colLetter(i: number) {
  let s = "";
  let n = i;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

/** Spreadsheet-style cell ref. row is 0-based data row; +2 to account for letter+label rows. */
export function cellRef(col: number, row: number) {
  return `${colLetter(col)}${row + 2}`;
}
