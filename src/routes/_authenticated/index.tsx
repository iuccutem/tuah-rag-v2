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
  Trash2,
  ExternalLink,
  Globe,
  MessageSquare,
  Layers,
  Loader2,
  LogOut,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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



export const Route = createFileRoute("/_authenticated/")({
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
  const navigate = useNavigate();
  const { data, isLoading, isFetching, refetch, dataUpdatedAt, error } =
    useQuery({
      queryKey: ["qa-rows"],
      queryFn: fetchRows,
      refetchOnWindowFocus: false,
    });

  const [sendingEmail, setSendingEmail] = useState(false);
  const [runningChannel, setRunningChannel] = useState<"web" | "telegram_whatsapp" | "both" | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registering, setRegistering] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string | number>>(new Set());
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

  const toggleRow = (id: string | number) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllRows = (select: boolean) => {
    if (select) {
      setSelectedRowIds(new Set(filteredRows.map((r) => r.id ?? r.question ?? "")));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const deleteSelectedRows = async () => {
    if (selectedRowIds.size === 0) {
      toast.error("No rows selected.");
      return;
    }
    const questions: string[] = [];
    for (const row of filteredRows) {
      const id = row.id ?? row.question ?? "";
      if (selectedRowIds.has(id)) {
        const q = (row.question ?? "").trim();
        if (q) questions.push(q);
      }
    }
    if (questions.length === 0) {
      toast.error("Selected rows have no questions to delete.");
      return;
    }
    if (!confirm(`Delete ${questions.length} selected question${questions.length === 1 ? "" : "s"}?`)) return;
    await deleteByQuestions(questions);
    setSelectedRowIds(new Set());
  };

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




  const runChannel = async (channel: "web" | "telegram_whatsapp" | "both") => {
    setRunningChannel(channel);
    const channels: Array<"web" | "telegram_whatsapp"> =
      channel === "both" ? ["web", "telegram_whatsapp"] : [channel];
    const selectedCount = selectedRowIds.size;
    const label =
      channel === "web"
        ? "Web Chat"
        : channel === "telegram_whatsapp"
          ? "Telegram/WhatsApp"
          : "both channels";
    try {
      const results = await Promise.all(
        channels.map(async (ch) => {
          const res = await fetch("/api/n8n-process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channel: ch }),
          });
          const json = (await res.json()) as { ok: boolean; error?: string };
          return { ch, ok: json.ok, error: json.error };
        }),
      );
      const okAll = results.every((r) => r.ok);
      if (okAll) {
        toast.success(
          `Triggered ${label}${selectedCount > 0 ? ` (${selectedCount} row${selectedCount === 1 ? "" : "s"} selected)` : ""}.`,
        );
      } else {
        for (const r of results) {
          const name = r.ch === "web" ? "Web Chat" : "Telegram/WhatsApp";
          if (!r.ok) toast.error(`${name}: ${r.error ?? "Failed to trigger."}`);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to trigger.");
    } finally {
      setRunningChannel(null);
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
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--sheets-grid)] bg-card px-3 py-2">
        {/* Group: data view */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh data"
          >
            <RefreshCw
              className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
          </ToolbarButton>

          <div className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--sheets-grid)] bg-background px-2 focus-within:ring-1 focus-within:ring-primary">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions…"
              className="h-6 w-44 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground"
                title="Clear search"
              >
                <span className="text-[11px]">✕</span>
              </button>
            ) : null}
          </div>

          <div className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--sheets-grid)] bg-background px-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-6 w-[120px] bg-transparent text-[12px] text-foreground focus:outline-none"
              title="From date"
            />
            <span className="text-[11px] text-muted-foreground">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-6 w-[120px] bg-transparent text-[12px] text-foreground focus:outline-none"
              title="To date"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="text-muted-foreground hover:text-foreground"
                title="Clear date filter"
              >
                <span className="text-[11px]">✕</span>
              </button>
            )}
          </div>
        </ToolbarGroup>

        <Divider />

        {/* Group: data actions */}
        <ToolbarGroup>
          <Dialog open={insertOpen} onOpenChange={setInsertOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-[13px] font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <ListPlus className="h-4 w-4" />
                Insert
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

          <ToolbarAction
            onClick={deleteSelectedRows}
            disabled={selectedRowIds.size === 0}
            title={
              selectedRowIds.size === 0
                ? "Select rows to delete"
                : `Delete ${selectedRowIds.size} selected row${selectedRowIds.size === 1 ? "" : "s"}`
            }
            icon={<Trash2 className="h-4 w-4 text-destructive" />}
            label="Delete"
            badge={selectedRowIds.size > 0 ? selectedRowIds.size : undefined}
            badgeTone="danger"
          />

          <a
            href="https://tuah.utem.edu.my/agent/form/d252fbe8-8741-40dd-acae-fee0590e9eaa"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-foreground/90 hover:bg-muted"
            title="Open agent form to sync the full Q&A sheet"
          >
            <ExternalLink className="h-4 w-4 text-primary" />
            <span>Sync Q&A sheet</span>
          </a>
        </ToolbarGroup>

        <Divider />

        {/* Group: run processing — when rows are selected, allow re-running any channel */}
        {selectedRowIds.size > 0 ? (
          <>
            <ToolbarGroup>
              <ToolbarAction
                onClick={() => runChannel("web")}
                disabled={runningChannel !== null}
                title={`Run Web Chat agent (${selectedRowIds.size} selected)`}
                icon={
                  runningChannel === "web" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4 text-primary" />
                  )
                }
                label="Run Web"
                badge={selectedRowIds.size}
              />
              <ToolbarAction
                onClick={() => runChannel("telegram_whatsapp")}
                disabled={runningChannel !== null}
                title={`Run Telegram/WhatsApp agent (${selectedRowIds.size} selected)`}
                icon={
                  runningChannel === "telegram_whatsapp" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-primary" />
                  )
                }
                label="Run WA/TG"
                badge={selectedRowIds.size}
              />
              <ToolbarAction
                onClick={() => runChannel("both")}
                disabled={runningChannel !== null}
                title="Run both Web Chat and Telegram/WhatsApp agents"
                icon={
                  runningChannel === "both" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Layers className="h-4 w-4 text-primary" />
                  )
                }
                label="Run Both"
              />
            </ToolbarGroup>

            <Divider />
          </>
        ) : null}




        {/* Group: formatting */}
        <ToolbarGroup>
          <ToolbarAction
            onClick={() => applyFormat({ highlight: true })}
            title="Highlight cell yellow"
            icon={<Highlighter className="h-4 w-4 text-yellow-500" />}
            label="Highlight"
          />
          <ToolbarAction
            onClick={() => applyFormat({ error: true })}
            title="Mark cell text red"
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            label="Mark error"
          />
          <ToolbarAction
            onClick={() => applyFormat(null)}
            title="Clear formatting"
            icon={<Eraser className="h-4 w-4 text-muted-foreground" />}
            label="Clear"
          />
        </ToolbarGroup>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1">
          <ToolbarAction
            onClick={openEmailDialog}
            disabled={sendingEmail}
            icon={<Mail className={sendingEmail ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />}
            label="Send email"
            title="Send evaluation report by email"
          />
          <ToolbarAction
            onClick={() => setRegisterOpen(true)}
            icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
            label="Register"
            title="Register a new user"
          />
          <ToolbarAction
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
            icon={<LogOut className="h-4 w-4 text-muted-foreground" />}
            label="Sign out"
            title="Sign out"
          />
        </div>
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
          selectedRowIds={selectedRowIds}
          onToggleRow={toggleRow}
          onSelectAll={selectAllRows}
        />
      </div>


      {/* Sheet tabs */}
      <div className="flex shrink-0 items-center gap-1 border-t border-[var(--sheets-grid)] bg-card px-2 py-1">
        <div className="flex h-7 items-center gap-2 rounded-t-md border-t-2 border-primary bg-card px-3 text-[13px] font-medium shadow-[0_-1px_0_var(--sheets-grid)_inset]">
          Q&amp;A Evaluations
        </div>
        <button
          type="button"
          onClick={() => setRegisterOpen(true)}
          className="flex h-7 items-center gap-1.5 rounded-t-md border-t-2 border-transparent px-3 text-[13px] font-medium text-foreground/70 hover:bg-muted/60 hover:text-foreground"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Register
        </button>
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

      {/* Register user dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register new user</DialogTitle>
            <DialogDescription>
              Create a new account that can sign in to this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" htmlFor="reg-email">Email</label>
              <Input
                id="reg-email"
                type="email"
                placeholder="user@example.com"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                disabled={registering}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" htmlFor="reg-password">Password</label>
              <Input
                id="reg-password"
                type="password"
                placeholder="At least 6 characters"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                disabled={registering}
                minLength={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterOpen(false)} disabled={registering}>
              Cancel
            </Button>
            <Button
              className="gap-2"
              disabled={registering}
              onClick={async () => {
                const email = registerEmail.trim();
                if (!email || !registerPassword) {
                  toast.error("Email and password are required.");
                  return;
                }
                if (registerPassword.length < 6) {
                  toast.error("Password must be at least 6 characters.");
                  return;
                }
                setRegistering(true);
                try {
                  const { error } = await supabase.auth.signUp({
                    email,
                    password: registerPassword,
                    options: { emailRedirectTo: `${window.location.origin}/` },
                  });
                  if (error) throw error;
                  toast.success("User registered.");
                  setRegisterEmail("");
                  setRegisterPassword("");
                  setRegisterOpen(false);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Registration failed.");
                } finally {
                  setRegistering(false);
                }
              }}
            >
              <UserPlus className={registering ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
              {registering ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Processing overlay */}
      {runningChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-xl border border-[var(--sheets-grid)] bg-card p-8 shadow-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              {runningChannel === "web" && <Globe className="h-6 w-6 text-primary animate-pulse" />}
              {runningChannel === "telegram_whatsapp" && <MessageSquare className="h-6 w-6 text-primary animate-pulse" />}
              {runningChannel === "both" && <Layers className="h-6 w-6 text-primary animate-pulse" />}
            </div>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-foreground">
                {runningChannel === "web"
                  ? "Running Web Chat agent…"
                  : runningChannel === "telegram_whatsapp"
                    ? "Running Telegram/WhatsApp agent…"
                    : "Running both agents…"}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Please wait while the answers are being generated.
              </p>
            </div>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        </div>
      )}
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

function Divider() {
  return <span className="mx-0.5 h-6 w-px bg-[var(--sheets-grid)]" />;
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}

function ToolbarAction({
  onClick,
  disabled,
  title,
  icon,
  label,
  badge,
  badgeTone,
}: {
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  badgeTone?: "warning" | "danger";
}) {
  const toneClass =
    badgeTone === "danger"
      ? "bg-destructive/15 text-destructive"
      : badgeTone === "warning"
        ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
        : "bg-muted text-muted-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-foreground/90 hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent"
    >
      {icon}
      <span>{label}</span>
      {typeof badge === "number" ? (
        <span className={`ml-0.5 rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${toneClass}`}>
          {badge}
        </span>
      ) : null}
    </button>
  );
}
