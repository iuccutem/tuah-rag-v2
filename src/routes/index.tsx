import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  RefreshCw,
  AlertCircle,
  Mail,
  Sheet as SheetIcon,
  ListPlus,
  Highlighter,
  AlertTriangle,
  Eraser,
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

  const rowsData = data?.data ?? [];
  const applyFormat = (patch: CellFormat | null) => {
    if (selection?.mode !== "cell") {
      toast.error("Select a cell first.");
      return;
    }
    const row = rowsData[selection.row];
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




  const rows = data?.data ?? [];
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
              onComplete={() => {
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
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
          {selection?.mode === "cell" && rows[selection.row]
            ? QA_COLUMNS[selection.col]?.raw(rows[selection.row]) || (
                <span className="text-muted-foreground">empty</span>
              )
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
          rows={rows}
          isLoading={isLoading}
          selection={selection}
          onSelectionChange={setSelection}
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
