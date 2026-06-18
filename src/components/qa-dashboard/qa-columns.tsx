import type { ReactNode } from "react";
import type { QARow } from "./QATable";
import { DateCell, EmptyCell, LinkOrText } from "./cell-renderers";


export type QAColumn = {
  key: keyof QARow;
  label: string;
  width: string;
  /** Whether this cell can be edited inline (double-click to edit). */
  editable?: boolean;
  /** Single-line input vs multi-line textarea for editing. */
  inputType?: "text" | "textarea";
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
    key: "question",
    label: "Question",
    width: "w-[22rem]",
    editable: true,
    inputType: "textarea",
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
    label: "Text Chat",
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
    label: "Expected Answer",
    width: "w-[22rem]",
    editable: true,
    inputType: "textarea",
    render: (row) =>
      row.telegram_whatsapp ? (
        <span className="whitespace-pre-wrap break-words leading-snug">
          {row.telegram_whatsapp}
        </span>
      ) : (
        <EmptyCell />
      ),
    raw: (row) => row.telegram_whatsapp ?? "",
  },
  {
    key: "url",
    label: "URL",
    width: "w-[20rem]",
    editable: true,
    inputType: "text",
    render: (row) => <LinkOrText value={row.url} />,
    raw: (row) => row.url ?? "",
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
