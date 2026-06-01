import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  AlertCircle,
  Mail,
  Sheet as SheetIcon,
  ListPlus,
  Highlighter,
  AlertTriangle,
  Eraser,
  Search,
  Calendar,
  Copy,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  QATable,
  formatKey,
  type CellFormat,
  type FormatsMap,
  type QARow,
  type Selection,
} from "@/components/qa-dashboard/QATable";
import { QA_COLUMNS, cellRef } from "@/components/qa-dashboard/qa-columns";
import { QuestionPasteBox } from "@/components/qa-dashboard/QuestionPasteBox";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Q&A Evaluation — Sheets" },
      {
        name: "description",
        content:
          "Spreadsheet-style dashboard for Q&A evaluation across web and messaging channels.",
      },
    ],
  }),
  component: DashboardPage,
});

type ApiResponse = { data: QARow[]; error: string | null };

async function fetchRows(): Promise<ApiResponse> {
  const res = await fetch("/api/n8n-qa", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as ApiResponse;
}

function DashboardPage() {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt, error } =
    useQuery({
      queryKey: ["qa-rows"],
      queryFn: fetchRows,
      refetchOnWindowFocus: false,
    });

  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [insertOpen, setInsertOpen] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [formats, setFormats] = useState<FormatsMap>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("qa-formats") ?? "{}") as FormatsMap;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("qa-formats", JSON.stringify(formats));
  }, [formats]);

  const rows = data?.data ?? [];

  const filteredRows = useMemo(() => {
    let result = rows;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) => (r.question ?? "").toLowerCase().includes(q));
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((r) => {
        const d = r.createdAt ? new Date(r.createdAt) : null;
        return d ? d >= from : false;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((r) => {
        const d = r.createdAt ? new Date(r.createdAt) : null;
        return d ? d <= to : false;
      });
    }
    return result;
  }, [rows, searchQuery, dateFrom, dateTo]);

  const applyFormat = (patch: CellFormat | null) => {
    if (selection?.mode !== "cell") {
      toast.error("Select a cell first.");
      return;
    }
    const row = filteredRows[selection.row];
    if (!row) return;
    const col = QA_COLUMNS[selection.col];
    const key = formatKey(row.id ?? selection.row, col.key as string);
    setFormats((prev) => {
      const next = { ...prev };
      if (patch === null) {
        delete next[key];
      } else {
        next[key] = { ...next[key], ...patch };
        if (!next[key].highlight && !next[key].error) delete next[key];
      }
      return next;
    });
  };

  const existingQuestions = useMemo(
    () =>
      rows
        .map((r) => (r.question ?? "").trim())
        .filter((q) => q.length > 0),
    [rows],
  );

  const duplicateGroups = useMemo(() => {
    const map = new Map<string, QARow[]>();
    for (const r of rows) {
      const q = (r.question ?? "").trim().toLowerCase();
      if (!q) continue;
      const arr = map.get(q) ?? [];
      arr.push(r);
      map.set(q, arr);
    }
    return Array.from(map.values()).filter((g) => g.length > 1);
  }, [rows]);

  const duplicateCount = duplicateGroups.reduce(
    (n, g) => n + (g.length - 1),
    0,
  );

  const postDelete = async (questions: string[]) => {
    const res = await fetch("/api/n8n-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions }),
    });
    return (await res.json()) as {
      ok: boolean;
      deleted?: number;
      total?: number;
      error?: string;
    };
  };

  const deleteByQuestions = async (questions: string[]) => {
    const cleaned = questions.map((q) => q.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      toast.error("No questions to delete.");
      return;
    }
    try {
      const json = await postDelete(cleaned);
      if (json.ok) {
        toast.success(
          `Deleted ${json.deleted ?? cleaned.length}/${json.total ?? cleaned.length} question${cleaned.length === 1 ? "" : "s"}.`,
        );
        refetch();
      } else {
        toast.error(json.error ?? "Failed to delete.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete.");
    }
  };

  const deleteDuplicates = async () => {
    if (duplicateGroups.length === 0) {
      toast.info("No duplicates found.");
      return;
    }
    // Keep the latest occurrence of each group, delete the older ones.
    const extras = duplicateGroups
      .flatMap((g) =>
        [...g]
          .sort((a, b) => {
            const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
            const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
            return tb - ta; // newest first
          })
          .slice(1),
      )
      .map((r) => (r.question ?? "").trim())
      .filter(Boolean);
    if (extras.length === 0) {
      toast.error("Nothing to delete.");
      return;
    }
    if (!confirm(`Delete ${extras.length} duplicate row${extras.length === 1 ? "" : "s"}?`)) return;
    try {
      const json = await postDelete(extras);
      if (json.ok) {
        toast.success(
          `Deleted ${json.deleted ?? extras.length}/${json.total ?? extras.length} duplicate${extras.length === 1 ? "" : "s"}.`,
        );
        refetch();
      } else {
        toast.error(json.error ?? "Failed to delete duplicates.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete duplicates.");
    }
  };



  const apiError =
    data?.error ?? (error instanceof Error ? error.message : null);

  const lastUpdated =
    dataUpdatedAt > 0
      ? new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(dataUpdatedAt))
      : "—";

  const openEmailDialog = () => {
    setEmailAddress("");
    setEmailDialogOpen(true);
  };

  const sendEmail = async () => {
    const email = emailAddress.trim();
    if (!email) {
      toast.error("Please enter an email address.");
      return;
    }
    setSendingEmail(true);
    try {
      const res = await fetch("/api/n8n-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        toast.success("Email pipeline triggered.");
        setEmailDialogOpen(false);
      } else {
        toast.error(json.error ?? "Failed to send email.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send email.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="flex h-screen min-h-screen flex-col bg-[var(--sheets-toolbar-bg)] text-foreground">
      {/* Top bar — file name + menu */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--sheets-grid)] bg-card px-3 pt-2 pb-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
          <SheetIcon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-[17px] font-medium leading-tight text-foreground">
            Q&amp;A Evaluation
          </h1>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            Last edit was at {lastUpdated}
          </div>
        </div>
      </div>


      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-1 border-b border-[var(--sheets-grid)] bg-card px-3 py-1.5">
        <ToolbarButton
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh data"
        >
          <RefreshCw
            className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"}
          />
        </ToolbarButton>
        <Separator />
        <div className="flex items-center gap-1.5 rounded-md border border-[var(--sheets-grid)] bg-muted/40 px-2 py-1">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions…"
            className="h-6 w-40 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-[10px] text-muted-foreground hover:text-foreground"
              title="Clear search"
            >
              ✕
            </button>
          ) : null}
        </div>
        <Separator />
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-6 w-32 rounded-sm border border-[var(--sheets-grid)] bg-card px-1 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            title="From date"
          />
          <span className="text-[11px] text-muted-foreground">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-6 w-32 rounded-sm border border-[var(--sheets-grid)] bg-card px-1 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            title="To date"
          />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="text-[10px] text-muted-foreground hover:text-foreground"
              title="Clear date filter"
            >
              ✕
            </button>
          )}
        </div>
        <Separator />
        <Dialog open={insertOpen} onOpenChange={setInsertOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex h-8 items-center gap-1.5 rounded-md border border-transparent px-2 text-[13px] hover:bg-muted"
            >
              <ListPlus className="h-4 w-4 text-primary" />
              Insert questions
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Insert questions</DialogTitle>
              <DialogDescription>
                Paste one question per line. Each row is added to the sheet,
                then the agent fills in the empty answers.
              </DialogDescription>
            </DialogHeader>
            <QuestionPasteBox
              existingQuestions={existingQuestions}
              onComplete={() => {
                setInsertOpen(false);
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
        <Separator />
        <button
          type="button"
          onClick={deleteDuplicates}
          disabled={duplicateCount === 0}
          title={
            duplicateCount === 0
              ? "No duplicate questions"
              : `Delete ${duplicateCount} duplicate row${duplicateCount === 1 ? "" : "s"}`
          }
          className="flex h-8 items-center gap-1.5 rounded-md border border-transparent px-2 text-[13px] hover:bg-muted disabled:opacity-50"
        >
          <Copy className="h-4 w-4 text-destructive" />
          Delete duplicates
          {duplicateCount > 0 ? (
            <span className="ml-1 rounded-sm bg-destructive/15 px-1 text-[11px] text-destructive tabular-nums">
              {duplicateCount}
            </span>
          ) : null}
        </button>
        <Separator />
        <button
          type="button"
          onClick={openEmailDialog}
          disabled={sendingEmail}
          className="flex h-8 items-center gap-1.5 rounded-md border border-transparent px-2 text-[13px] hover:bg-muted disabled:opacity-50"
        >
          <Mail className={sendingEmail ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
          Send email
        </button>
        <Separator />
        <button
          type="button"
          onClick={() => applyFormat({ highlight: true })}
          title="Highlight cell yellow"
          className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] hover:bg-muted"
        >
          <Highlighter className="h-4 w-4 text-yellow-500" />
          Highlight
        </button>
        <button
          type="button"
          onClick={() => applyFormat({ error: true })}
          title="Mark cell text red"
          className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] hover:bg-muted"
        >
          <AlertTriangle className="h-4 w-4 text-red-500" />
          Mark error
        </button>
        <button
          type="button"
          onClick={() => applyFormat(null)}
          title="Clear formatting"
          className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] hover:bg-muted"
        >
          <Eraser className="h-4 w-4 text-muted-foreground" />
          Clear
        </button>
      </div>



      {/* Formula bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--sheets-grid)] bg-card px-2 py-1">
        <div className="flex h-7 w-24 items-center justify-between rounded-sm border border-[var(--sheets-grid)] bg-card px-2 text-[12px] text-foreground">
          {selection?.mode === "cell"
            ? cellRef(selection.col, selection.row)
            : selection?.mode === "col"
              ? `${QA_COLUMNS[selection.col]?.label ?? ""}`
              : selection?.mode === "row"
                ? `Row ${selection.row + 2}`
                : "A1"}
          <span className="text-[10px]">▾</span>
        </div>
        <span className="font-serif text-[14px] italic text-muted-foreground">
          fx
        </span>
        <div className="flex-1 truncate text-[13px] text-foreground">
          {selection?.mode === "cell" && filteredRows[selection.row]
            ? QA_COLUMNS[selection.col]?.raw(filteredRows[selection.row]) || (
                <span className="text-muted-foreground">empty</span>
              )
            : searchQuery || dateFrom || dateTo
              ? `${filteredRows.length}/${rows.length} rows filtered`
              : rows.length > 0
                ? `${rows.length} row${rows.length === 1 ? "" : "s"} loaded`
                : "—"}
        </div>
      </div>

      {/* Error banner */}
      {apiError ? (
        <div className="flex shrink-0 items-start gap-2 border-b border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="flex-1">{apiError}</div>
        </div>
      ) : null}

      {/* Grid */}
      <div className="flex-1 overflow-hidden">
        <QATable
          rows={filteredRows}
          isLoading={isLoading}
          selection={selection}
          onSelectionChange={setSelection}
          formats={formats}
        />
      </div>


      {/* Sheet tabs */}
      <div className="flex shrink-0 items-center gap-1 border-t border-[var(--sheets-grid)] bg-card px-2 py-1">
        <div className="flex h-7 items-center gap-2 rounded-t-md border-t-2 border-primary bg-card px-3 text-[13px] font-medium shadow-[0_-1px_0_var(--sheets-grid)_inset]">
          Q&amp;A Evaluations
        </div>
        <div className="ml-auto text-[11px] text-muted-foreground tabular-nums">

          {isFetching ? "Syncing…" : `Synced ${lastUpdated}`}
        </div>
      </div>

      {/* Email dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>
              Enter the recipient email to send the evaluation report.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendEmail();
              }}
              disabled={sendingEmail}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
              disabled={sendingEmail}
            >
              Cancel
            </Button>
            <Button onClick={sendEmail} disabled={sendingEmail} className="gap-2">
              <Mail className={sendingEmail ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
              {sendingEmail ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/80 hover:bg-muted disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span className="mx-1 h-5 w-px bg-[var(--sheets-grid)]" />;
}
