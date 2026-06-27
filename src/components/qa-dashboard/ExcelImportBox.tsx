import { useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { readSheet } from "read-excel-file/browser";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

type RunStatus = "pending" | "ok" | "error" | "skipped";
type RunItem = { question: string; status: RunStatus; error?: string };
type ParsedWorkbook = { rows: string[][]; maxCols: number };

function colLetter(i: number) {
  let s = "";
  let n = i;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

const HEADER_KEYWORDS = {
  question: ["question", "questions", "q", "prompt", "query", "pertanyaan"],
  expected: [
    "expected",
    "expected answer",
    "answer",
    "answers",
    "jawaban",
    "telegram",
    "whatsapp",
    "telegram_whatsapp",
  ],
  url: ["url", "urls", "link", "links", "source", "reference", "ref"],
} as const;

function detectColumn(headers: string[], keywords: readonly string[]): number {
  const norm = headers.map((h) => (h ?? "").toString().trim().toLowerCase());
  // exact match first
  for (let i = 0; i < norm.length; i++) {
    if (keywords.includes(norm[i] as never)) return i;
  }
  // contains match
  for (let i = 0; i < norm.length; i++) {
    if (norm[i] && keywords.some((k) => norm[i].includes(k))) return i;
  }
  return -1;
}

function stringifyCellValue(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in value) {
    return String((value as { text: unknown }).text ?? "");
  }
  if (typeof value === "object" && "richText" in value) {
    return (value as { richText: Array<{ text: string }> }).richText
      .map((r) => r.text)
      .join("");
  }
  if (typeof value === "object" && "result" in value) {
    return stringifyCellValue((value as { result: unknown }).result);
  }
  return String(value);
}

function normalizeParsedRows(rows: string[][]): ParsedWorkbook {
  const cleaned = rows
    .map((row) => {
      const next = [...row];
      while (next.length > 0 && (next[next.length - 1] ?? "").trim() === "") {
        next.pop();
      }
      return next;
    })
    .filter((row) => row.some((cell) => (cell ?? "").trim().length > 0));
  return {
    rows: cleaned,
    maxCols: cleaned.reduce((m, r) => Math.max(m, r.length), 0),
  };
}

async function parseWorkbookWithExcelJs(buf: ArrayBuffer): Promise<ParsedWorkbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Workbook has no sheets.");
  const parsedRows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells[colNumber - 1] = stringifyCellValue(cell.value);
    });
    for (let i = 0; i < cells.length; i++) if (cells[i] == null) cells[i] = "";
    parsedRows.push(cells);
  });
  return normalizeParsedRows(parsedRows);
}

async function parseWorkbookWithFallback(file: File): Promise<ParsedWorkbook> {
  const rows: unknown[][] = await readSheet(file, 1);
  return normalizeParsedRows(
    rows.map((row: unknown[]) => row.map((value: unknown) => stringifyCellValue(value))),
  );
}

async function parseExcelFile(file: File, buf: ArrayBuffer): Promise<ParsedWorkbook> {
  try {
    return await parseWorkbookWithExcelJs(buf);
  } catch (excelJsError) {
    try {
      return await parseWorkbookWithFallback(file);
    } catch {
      const rawMessage = excelJsError instanceof Error ? excelJsError.message : "";
      if (/sheets|bookViews|undefined/i.test(rawMessage)) {
        throw new Error(
          "This workbook format is missing readable sheet metadata. Please open it in Excel or Google Sheets, save it again as .xlsx or .csv, then retry.",
        );
      }
      throw new Error(
        "No readable worksheet found. Please save the file again as .xlsx or .csv and retry.",
      );
    }
  }
}

export function ExcelImportBox({
  table,
  existingQuestions = [],
  onComplete,
}: {
  table: string;
  existingQuestions?: string[];
  onComplete?: () => void;
}) {
  const [fileName, setFileName] = useState<string>("");
  const [parsing, setParsing] = useState(false);
  const [grid, setGrid] = useState<string[][]>([]); // first 6 preview rows × all cols
  const [allRows, setAllRows] = useState<string[][]>([]); // full data (no header skipping)
  const [columnCount, setColumnCount] = useState(0);
  const [selectedCol, setSelectedCol] = useState<number>(0);
  const [expectedCol, setExpectedCol] = useState<number>(-1);
  const [urlCol, setUrlCol] = useState<number>(-1);
  const [skipHeader, setSkipHeader] = useState(true);
  const [autoDetected, setAutoDetected] = useState(false);
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState<RunItem[]>([]);

  const existingSet = useMemo(
    () => new Set(existingQuestions.map((q) => q.trim().toLowerCase())),
    [existingQuestions],
  );

  const entries = useMemo(() => {
    const src = skipHeader ? allRows.slice(1) : allRows;
    const get = (r: string[], idx: number) =>
      idx >= 0 ? (r[idx] ?? "").toString().trim() : "";
    return src
      .map((r) => ({
        question: get(r, selectedCol),
        telegram_whatsapp: get(r, expectedCol),
        url: get(r, urlCol),
      }))
      .filter((e) => e.question.length > 0);
  }, [allRows, selectedCol, expectedCol, urlCol, skipHeader]);

  const questions = useMemo(() => entries.map((e) => e.question), [entries]);

  const duplicates = useMemo(
    () => questions.filter((q) => existingSet.has(q.toLowerCase())),
    [questions, existingSet],
  );
  const newOnes = useMemo(
    () => questions.filter((q) => !existingSet.has(q.toLowerCase())),
    [questions, existingSet],
  );

  const onFile = async (file: File) => {
    setFileName(file.name);
    setParsing(true);
    setGrid([]);
    setAllRows([]);
    setItems([]);
    try {
      const buf = await file.arrayBuffer();
      let parsedRows: string[][] = [];
      let parsedMaxCols = 0;
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = new TextDecoder().decode(buf);
        const lines = text.split(/\r?\n/);
        const parsed = normalizeParsedRows(lines.map((ln) => parseCsvLine(ln)));
        parsedRows = parsed.rows;
        parsedMaxCols = parsed.maxCols;
      } else {
        const parsed = await parseExcelFile(file, buf);
        parsedRows = parsed.rows;
        parsedMaxCols = parsed.maxCols;
      }
      if (parsedRows.length === 0 || parsedMaxCols === 0) {
        throw new Error(
          "No readable worksheet found. Please save the file again as .xlsx or .csv and retry.",
        );
      }
      setColumnCount(parsedMaxCols);
      setAllRows(parsedRows);
      setGrid(parsedRows.slice(0, 4));
      // Auto-detect mapping from header row, with positional fallback.
      const headers = (parsedRows[0] ?? []) as string[];
      const qIdx = detectColumn(headers, HEADER_KEYWORDS.question);
      const eIdx = detectColumn(headers, HEADER_KEYWORDS.expected);
      const uIdx = detectColumn(headers, HEADER_KEYWORDS.url);
      const matched = qIdx >= 0 || eIdx >= 0 || uIdx >= 0;
      setSelectedCol(qIdx >= 0 ? qIdx : 0);
      setExpectedCol(eIdx >= 0 ? eIdx : qIdx === 1 ? 2 : 1);
      setUrlCol(uIdx >= 0 ? uIdx : 2);
      if (matched) setSkipHeader(true);
      setAutoDetected(matched);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to read file.");
    } finally {
      setParsing(false);
    }
  };

  const runImport = async () => {
    if (newOnes.length === 0) {
      toast.error("No new questions to insert.");
      return;
    }
    if (!table) {
      toast.error("No active sheet selected.");
      return;
    }
    setRunning(true);
    const initial: RunItem[] = questions.map((q) => ({
      question: q,
      status: existingSet.has(q.toLowerCase()) ? "skipped" : "pending",
    }));
    setItems(initial);
    let ok = 0;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const q = e.question;
      if (existingSet.has(q.toLowerCase())) continue;
      try {
        const payload: Record<string, unknown> = { question: q, table };
        if (e.telegram_whatsapp) payload.telegram_whatsapp = e.telegram_whatsapp;
        if (e.url) payload.url = e.url;
        const res = await fetch("/api/n8n-run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as { ok: boolean; error?: string };
        if (json.ok) ok++;
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? { ...it, status: json.ok ? "ok" : "error", error: json.error }
              : it,
          ),
        );
      } catch (e) {
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: "error",
                  error: e instanceof Error ? e.message : "Request failed",
                }
              : it,
          ),
        );
      }
    }
    setRunning(false);
    if (ok > 0) {
      toast.success(
        `Inserted ${ok}/${newOnes.length} question${newOnes.length === 1 ? "" : "s"}${duplicates.length ? ` · ${duplicates.length} duplicate skipped` : ""}.`,
      );
      onComplete?.();
    } else {
      toast.error("No questions were inserted.");
    }
  };

  const colOptions = Array.from({ length: columnCount }, (_, i) => {
    const header = (allRows[0]?.[i] ?? "").toString().trim();
    return { idx: i, label: header ? `${colLetter(i)} — ${header}` : colLetter(i) };
  });

  return (
    <div className="space-y-3">
      {/* Step-by-step guide */}
      <ol className="flex flex-col gap-1.5 rounded-md border border-[var(--sheets-grid)] bg-muted/40 p-3 text-[12px] sm:flex-row sm:items-start sm:gap-3">
        {[
          "Upload your .xlsx, .xls, or .csv file",
          "Confirm the Question / Expected Answer / URL columns (auto-detected from headers)",
          'Click "Insert questions" to import',
        ].map((text, i) => (
          <li key={i} className="flex flex-1 items-start gap-2">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
              {i + 1}
            </span>
            <span className="text-foreground/80">{text}</span>
          </li>
        ))}
      </ol>

      {/* File picker */}
      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-[var(--sheets-grid)] bg-muted/30 px-4 py-6 text-center text-sm hover:bg-muted/50 ${parsing || running ? "pointer-events-none opacity-60" : ""}`}
      >
        <FileSpreadsheet className="h-7 w-7 text-primary" />
        <div className="font-medium">
          {fileName ? fileName : "Click to choose an .xlsx, .xls, or .csv file"}
        </div>
        <div className="text-xs text-muted-foreground">
          The first worksheet will be used. You'll map Question, Expected Answer, and URL columns next.
        </div>
        <input
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
          disabled={parsing || running}
        />
      </label>

      {parsing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading workbook…
        </div>
      )}

      {/* Preview + column picker */}
      {!parsing && allRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] text-muted-foreground">
              Confirm or adjust the column mapping — preview updates live.
            </p>
            {autoDetected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                Auto-detected from headers
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[11px] font-medium text-yellow-700 dark:text-yellow-300">
                <AlertTriangle className="h-3 w-3" />
                Please confirm the Question column
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(
              [
                { label: "Question column", help: "Required — the prompt that will be sent.", value: selectedCol, set: setSelectedCol, required: true },
                { label: "Expected Answer column", help: "Optional — sent alongside the question.", value: expectedCol, set: setExpectedCol, required: false },
                { label: "URL column", help: "Optional — sent alongside the question.", value: urlCol, set: setUrlCol, required: false },
              ] as const
            ).map((field) => (
              <div key={field.label} className="flex flex-col gap-1 min-w-0">
                <label className="text-[12px] font-medium text-muted-foreground">{field.label}</label>
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.set(Number(v))}
                  disabled={running}
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {!field.required && (
                      <SelectItem value="-1">— None —</SelectItem>
                    )}
                    {colOptions.map((c) => (
                      <SelectItem key={c.idx} value={String(c.idx)}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">{field.help}</p>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-1.5 text-[13px]">
            <input
              type="checkbox"
              checked={skipHeader}
              onChange={(e) => setSkipHeader(e.target.checked)}
              disabled={running}
            />
            First row is a header (skip it)
          </label>

          {/* Preview table — fits dialog width, no horizontal scroll */}
          {(() => {
            const mapped = [selectedCol, expectedCol, urlCol].filter((i) => i >= 0);
            const unmapped: number[] = [];
            for (let i = 0; i < columnCount && unmapped.length < Math.max(0, 5 - mapped.length); i++) {
              if (!mapped.includes(i)) unmapped.push(i);
            }
            const visibleCols = Array.from(
              new Set([...mapped, ...unmapped]),
            ).sort((a, b) => a - b);
            const hiddenCount = columnCount - visibleCols.length;
            const colWidth = visibleCols.length > 0 ? `${100 / visibleCols.length}%` : undefined;
            return (
              <div className="rounded-md border border-[var(--sheets-grid)]">
                <table className="w-full table-fixed text-[12px]">
                  <thead className="bg-muted">
                    <tr>
                      <th className="w-10 border-r border-[var(--sheets-grid)] px-2 py-1 text-left text-muted-foreground">
                        #
                      </th>
                      {visibleCols.map((i) => {
                        const isQ = i === selectedCol;
                        const isMap = i === expectedCol || i === urlCol;
                        const tint = isQ
                          ? "bg-primary/15 text-primary"
                          : isMap
                            ? "bg-primary/[0.08] text-primary/80"
                            : "";
                        const tag =
                          i === selectedCol
                            ? " · Q"
                            : i === expectedCol
                              ? " · A"
                              : i === urlCol
                                ? " · URL"
                                : "";
                        return (
                          <th
                            key={i}
                            style={{ width: colWidth }}
                            className={`truncate border-r border-[var(--sheets-grid)] px-2 py-1 text-left ${tint}`}
                          >
                            {colLetter(i)}
                            {tag}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {grid.map((r, ri) => (
                      <tr key={ri} className={ri === 0 && skipHeader ? "bg-muted/50" : ""}>
                        <td className="w-10 border-r border-t border-[var(--sheets-grid)] px-2 py-1 text-muted-foreground">
                          {ri + 1}
                        </td>
                        {visibleCols.map((ci) => {
                          const isQ = ci === selectedCol;
                          const isMap = ci === expectedCol || ci === urlCol;
                          const tint = isQ
                            ? "bg-primary/[0.06]"
                            : isMap
                              ? "bg-primary/[0.03]"
                              : "";
                          return (
                            <td
                              key={ci}
                              style={{ width: colWidth }}
                              className={`truncate border-r border-t border-[var(--sheets-grid)] px-2 py-1 ${tint}`}
                              title={r[ci] ?? ""}
                            >
                              {r[ci] ?? ""}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {hiddenCount > 0 && (
                  <div className="border-t border-[var(--sheets-grid)] bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                    +{hiddenCount} more column{hiddenCount === 1 ? "" : "s"} hidden from preview (still selectable above)
                  </div>
                )}
              </div>
            );
          })()}


          {/* Summary */}
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="rounded-full bg-muted px-2 py-0.5 tabular-nums">
              {questions.length} question{questions.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary tabular-nums">
              {newOnes.length} new
            </span>
            {duplicates.length > 0 && (
              <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-yellow-700 tabular-nums dark:text-yellow-300">
                <AlertTriangle className="mr-1 inline h-3 w-3" />
                {duplicates.length} duplicate (skipped)
              </span>
            )}
            <Button
              className="ml-auto gap-2"
              onClick={runImport}
              disabled={running || newOnes.length === 0}
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {running ? "Inserting…" : `Insert ${newOnes.length} question${newOnes.length === 1 ? "" : "s"}`}
            </Button>
          </div>

          {items.length > 0 && (
            <ul className="max-h-64 divide-y overflow-auto rounded-md border bg-card text-[13px]">
              {items.map((it, i) => (
                <li key={i} className="flex items-start gap-2 p-2">
                  {it.status === "pending" && (
                    <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                  )}
                  {it.status === "ok" && (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  )}
                  {it.status === "skipped" && (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
                  )}
                  {it.status === "error" && (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="break-words">{it.question}</div>
                    {it.error && (
                      <div className="text-xs text-destructive">{it.error}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQ = false;
      } else cur += c;
    } else {
      if (c === ",") {
        out.push(cur);
        cur = "";
      } else if (c === '"') inQ = true;
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}
