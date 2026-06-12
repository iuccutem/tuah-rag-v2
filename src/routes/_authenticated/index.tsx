import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  AlertCircle,
  Download,
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
  Plus,
  MoreVertical,
  SlidersHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { registerUser } from "@/lib/admin-users.functions";
import { exportRowsAsRag } from "@/lib/rag-export.functions";


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
      { title: "RAG Builder" },
      {
        name: "description",
        content:
          "RAG Builder — spreadsheet-style workspace to curate Q&A across faculties and messaging channels.",
      },
    ],
  }),
  component: DashboardPage,
});

type ApiResponse = { data: QARow[]; error: string | null };

async function fetchRows(table: string): Promise<ApiResponse> {
  const params = new URLSearchParams({ ts: String(Date.now()) });
  if (table) params.set("table", table);
  const res = await fetch(`/api/n8n-qa?${params.toString()}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as ApiResponse;
}

type TablesResponse = { tables: string[]; error: string | null };

async function fetchTables(): Promise<TablesResponse> {
  const res = await fetch(`/api/n8n-tables?ts=${Date.now()}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as TablesResponse;
}

function formatTableLabel(raw: string): string {
  const stripped = raw.replace(/^qatest-/i, "");
  if (!stripped) return raw;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTable, setActiveTable] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  const tablesQuery = useQuery({
    queryKey: ["qa-tables"],
    queryFn: fetchTables,
    refetchOnWindowFocus: false,
  });
  const tables = (tablesQuery.data?.tables ?? []).filter((t) =>
    t.startsWith("qatest-"),
  );

  // Set the first table as the active one on initial load.
  useEffect(() => {
    if (!activeTable && tables.length > 0) {
      setActiveTable(tables[0]);
    }
  }, [tables, activeTable]);

  const { data, isLoading, isFetching, refetch, dataUpdatedAt, error } =
    useQuery({
      queryKey: ["qa-rows", activeTable],
      queryFn: () => fetchRows(activeTable),
      enabled: !!activeTable,
      refetchOnWindowFocus: false,
      refetchInterval: 3000,
      refetchIntervalInBackground: false,
    });



  const [exporting, setExporting] = useState(false);
  const [runningChannel, setRunningChannel] = useState<"web" | "telegram_whatsapp" | "both" | null>(null);
  const [pendingChannel, setPendingChannel] = useState<"web" | "telegram_whatsapp" | "both" | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registering, setRegistering] = useState(false);
  const registerUserFn = useServerFn(registerUser);
  const [insertOpen, setInsertOpen] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");
  const [creatingSheet, setCreatingSheet] = useState(false);

  const [selectedRowIds, setSelectedRowIds] = useState<Set<string | number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    items: Array<{ id: string | number | null; question: string }>;
  }>({ open: false, items: [] });
  const [deleting, setDeleting] = useState(false);
  const [deletePhase, setDeletePhase] = useState<"deleting" | "refreshing">("deleting");
  const [syncing, setSyncing] = useState(false);
  const [syncPhase, setSyncPhase] = useState<"waiting" | "refreshing">("waiting");
  const [inserting, setInserting] = useState(false);
  const [formats, setFormats] = useState<FormatsMap>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("qa-formats") ?? "{}") as FormatsMap;
    } catch {
      return {};
    }
  });
  // In-flight optimistic flag overrides keyed by `${rowId}::${dbField}`.
  const [optimisticFlags, setOptimisticFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("qa-formats", JSON.stringify(formats));
  }, [formats]);

  // When the user returns from the external Sync form tab, auto-refresh the
  // table and keep the overlay visible until the fresh data has loaded.
  useEffect(() => {
    if (!syncing || syncPhase !== "waiting") return;
    const onFocus = async () => {
      setSyncPhase("refreshing");
      try {
        const result = await refetch();
        if (result.error) throw result.error;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to refresh table.");
      } finally {
        setSyncing(false);
        setSyncPhase("waiting");
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [syncing, syncPhase, refetch]);

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

  const exportJson = () => {
    try {
      const selected =
        selectedRowIds.size > 0
          ? filteredRows.filter((r) =>
              selectedRowIds.has(r.id ?? r.question ?? ""),
            )
          : filteredRows;
      // Strip to a clean shape: only known column fields + the 6 flag booleans.
      const flagKeys = [
        "question_highlight",
        "question_error",
        "web_highlight",
        "web_error",
        "telegram_whatsapp_highlight",
        "telegram_whatsapp_error",
      ] as const;
      const cleanRows = selected.map((row) => {
        const out: Record<string, unknown> = {};
        for (const c of QA_COLUMNS) {
          out[c.key as string] = (row as Record<string, unknown>)[c.key as string] ?? null;
        }
        for (const f of flagKeys) {
          const v = (row as Record<string, unknown>)[f];
          if (typeof v === "boolean") out[f] = v;
        }
        return out;
      });
      const json = JSON.stringify(cleanRows, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
      const tableTag = (activeTable || "all").replace(/[^a-zA-Z0-9_-]/g, "_");
      a.href = url;
      a.download = `rag-builder-${tableTag}-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(
        `Exported ${cleanRows.length} row${cleanRows.length === 1 ? "" : "s"}.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to export JSON.");
    }
  };

  const createSheet = async () => {
    const raw = newSheetName.trim();
    if (!raw) {
      toast.error("Table name is required.");
      return;
    }
    const formatted = `qatest-${raw.toLowerCase().replace(/\s+/g, "-")}`;
    if (!/^qatest-[a-z0-9-]+$/.test(formatted)) {
      toast.error("Use letters, numbers, spaces or dashes only.");
      return;
    }
    if (tables.some((t) => t.toLowerCase() === formatted)) {
      toast.error("That sheet already exists.");
      return;
    }
    setCreatingSheet(true);
    try {
      const res = await fetch("/api/n8n-create-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formatted }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error || "Failed to create sheet.");
      toast.success(`Created sheet "${formatTableLabel(formatted)}".`);
      setNewSheetName("");
      setNewSheetOpen(false);
      await tablesQuery.refetch();
      setActiveTable(formatted);
      setSelection(null);
      setSelectedRowIds(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create sheet.");
    } finally {
      setCreatingSheet(false);
    }
  };


  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Step 1: Re-fetch tables first
      const tableResult = await tablesQuery.refetch();
      const freshTables = (tableResult.data?.tables ?? []).filter((t) =>
        t.startsWith("qatest-"),
      );

      // Step 2: Verify active table; switch if no longer valid
      let targetTable = activeTable;
      if (freshTables.length > 0 && !freshTables.includes(activeTable)) {
        targetTable = freshTables[0];
        setActiveTable(targetTable);
        setSelection(null);
        setSelectedRowIds(new Set());
      }

      // Step 3: Re-fetch rows for the active table
      if (targetTable) {
        await queryClient.refetchQueries({
          queryKey: ["qa-rows", targetTable],
          exact: true,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to refresh.");
    } finally {
      setRefreshing(false);
    }
  };


  // Helpers to read a flag (server value, optionally overridden by an in-flight
  // optimistic toggle) and to merge DB-driven flags into the formats map that
  // QATable consumes for cell styling.
  const flagFields = ["question", "web", "telegram_whatsapp"] as const;
  type FlagCol = (typeof flagFields)[number];

  const readFlag = (
    row: QARow,
    col: FlagCol,
    kind: "error" | "highlight",
  ): boolean => {
    const field = `${col}_${kind}`;
    const rowId = (row.id ?? row.question ?? "") as string | number;
    const optKey = `${rowId}::${field}`;
    if (optKey in optimisticFlags) return optimisticFlags[optKey];
    return (row as unknown as Record<string, unknown>)[field] === true;
  };

  const derivedFormats = useMemo<FormatsMap>(() => {
    const out: FormatsMap = { ...formats };
    for (let i = 0; i < filteredRows.length; i += 1) {
      const row = filteredRows[i];
      const baseKey = (row.id ?? i) as string | number;
      for (const col of flagFields) {
        const error = readFlag(row, col, "error");
        const highlight = readFlag(row, col, "highlight");
        if (!error && !highlight) continue;
        const k = formatKey(baseKey, col);
        out[k] = {
          ...out[k],
          ...(highlight ? { highlight: true } : {}),
          ...(error ? { error: true } : {}),
        };
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formats, filteredRows, optimisticFlags]);

  const sendRowFlags = async (
    rowId: string | number,
    row: QARow,
    overrides: Partial<Record<`${FlagCol}_${"error" | "highlight"}`, boolean>>,
  ) => {
    const allFields = [
      "question_error",
      "question_highlight",
      "telegram_whatsapp_error",
      "web_error",
      "telegram_whatsapp_highlight",
      "web_highlight",
    ] as const;

    const flags: Record<string, boolean> = {};
    const optimisticPatch: Record<string, boolean> = {};
    for (const f of allFields) {
      const [c, k] = f.endsWith("_highlight")
        ? [f.replace("_highlight", "") as FlagCol, "highlight" as const]
        : [f.replace("_error", "") as FlagCol, "error" as const];
      const next = overrides[f] !== undefined ? overrides[f]! : readFlag(row, c, k);
      flags[f] = next;
      optimisticPatch[`${rowId}::${f}`] = next;
    }

    setOptimisticFlags((p) => ({ ...p, ...optimisticPatch }));

    try {
      const res = await fetch("/api/n8n-flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rowId, table: activeTable, ...flags }),
      });

      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error || "Failed to update.");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update.");
    } finally {
      setOptimisticFlags((p) => {
        const n = { ...p };
        for (const k of Object.keys(optimisticPatch)) delete n[k];
        return n;
      });
    }
  };

  const applyFormat = (patch: CellFormat | null) => {
    if (selection?.mode !== "cell") {
      toast.error("Select a cell first.");
      return;
    }
    const row = filteredRows[selection.row];
    if (!row) return;
    const col = QA_COLUMNS[selection.col];
    const colKey = col.key as string;

    if (colKey !== "web" && colKey !== "telegram_whatsapp" && colKey !== "question") {
      toast.error(
        `Only "Question", "Web" and "Telegram/WhatsApp" cells can be flagged. Selected: ${col.label}.`,
      );
      return;
    }

    const rowId = (row.id ?? "") as string | number;
    if (rowId === "" || rowId == null) {
      toast.error("Row has no id; cannot persist.");
      return;
    }

    const overrides: Partial<Record<`${FlagCol}_${"error" | "highlight"}`, boolean>> = {};
    if (patch === null) {
      overrides[`${colKey}_error`] = false;
      overrides[`${colKey}_highlight`] = false;
    } else {
      if (patch.highlight) overrides[`${colKey}_highlight`] = true;
      if (patch.error) overrides[`${colKey}_error`] = true;
    }
    void sendRowFlags(rowId, row, overrides);
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
    const items: Array<{ id: string | number | null; question: string }> = [];
    for (const row of filteredRows) {
      const key = row.id ?? row.question ?? "";
      if (selectedRowIds.has(key)) {
        const q = (row.question ?? "").trim();
        items.push({ id: row.id ?? null, question: q || "null" });
      }
    }
    if (items.length === 0) {
      toast.error("No rows selected.");
      return;
    }
    setDeleteConfirm({ open: true, items });
  };

  const confirmDelete = async () => {
    const items = deleteConfirm.items;
    // Close the confirm dialog and switch to a full-screen loading overlay.
    setDeleteConfirm({ open: false, items: [] });
    setDeletePhase("deleting");
    setDeleting(true);
    try {
      await deleteByItems(items);
    } finally {
      setDeleting(false);
    }
  };

  const postDelete = async (
    items: Array<{ id: string | number | null; question: string }>,
  ) => {
    const res = await fetch("/api/n8n-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        questions: items.map((i) => i.question),
        table: activeTable,
      }),
    });

    return (await res.json()) as {
      ok: boolean;
      deleted?: number;
      total?: number;
      error?: string;
      results?: Array<{ ok: boolean; error?: string; message?: string }>;
    };
  };

  const deleteByItems = async (
    items: Array<{ id: string | number | null; question: string }>,
  ) => {
    const cleaned = items.map((i) => ({
      id: i.id ?? null,
      question: (i.question ?? "").trim() || "null",
    }));
    if (cleaned.length === 0) {
      toast.error("No questions to delete.");
      return;
    }
    try {
      const json = await postDelete(cleaned);
      // Success only when the workflow confirms with the expected message.
      if (json.ok && json.deleted === cleaned.length) {
        toast.success(
          `Deleted ${json.deleted}/${json.total ?? cleaned.length} question${
            cleaned.length === 1 ? "" : "s"
          }.`,
        );
        // Auto-refresh: trigger the fetch-table webhook and wait for it to finish
        // before hiding the loading overlay so the new table shows immediately.
        setDeletePhase("refreshing");
        const deletedIds = new Set(
          cleaned
            .map((item) => item.id)
            .filter((id): id is string | number => id !== null),
        );
        let refreshed = await refetch();
        if (refreshed.error) throw refreshed.error;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const refreshedRows = refreshed.data?.data ?? [];
          const deletedRowsStillVisible = refreshedRows.some(
            (row) => row.id != null && deletedIds.has(row.id),
          );
          if (!deletedRowsStillVisible) break;
          await new Promise((resolve) => setTimeout(resolve, 1000));
          refreshed = await refetch();
          if (refreshed.error) throw refreshed.error;
        }
        setSelectedRowIds(new Set());
        setSelection(null);
      } else {
        const firstError =
          json.results?.find((r) => !r.ok)?.error ??
          json.error ??
          "Workflow did not confirm success.";
        toast.error(firstError);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete.");
    }
  };





  const runChannel = async (channel: "web" | "telegram_whatsapp" | "both") => {
    setRunningChannel(channel);
    const channels: Array<"web" | "telegram_whatsapp"> =
      channel === "both" ? ["web", "telegram_whatsapp"] : [channel];
    const label =
      channel === "web"
        ? "Web Chat"
        : channel === "telegram_whatsapp"
          ? "Telegram/WhatsApp"
          : "both channels";

    // Collect selected questions to forward into the webhook.
    const selectedQuestions: string[] = [];
    for (const row of filteredRows) {
      const id = row.id ?? row.question ?? "";
      if (selectedRowIds.has(id)) {
        const q = (row.question ?? "").trim();
        if (q) selectedQuestions.push(q);
      }
    }
    if (selectedQuestions.length === 0) {
      toast.error("Select at least one row with a question to run.");
      setRunningChannel(null);
      return;
    }

    try {
      const results: Array<{ ch: "web" | "telegram_whatsapp"; question: string; ok: boolean; error?: string }> = [];
      for (const ch of channels) {
        for (const question of selectedQuestions) {
          const res = await fetch("/api/n8n-process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channel: ch, question, table: activeTable }),
          });

          const json = (await res.json()) as { ok: boolean; error?: string };
          results.push({ ch, question, ok: json.ok, error: json.error });
        }
      }
      const okAll = results.every((r) => r.ok);
      if (okAll) {
        toast.success(
          `Triggered ${label} for ${selectedQuestions.length} question${selectedQuestions.length === 1 ? "" : "s"}.`,
        );
      } else {
        for (const r of results) {
          if (!r.ok) {
            const name = r.ch === "web" ? "Web Chat" : "Telegram/WhatsApp";
            toast.error(`${name} · "${r.question.slice(0, 40)}": ${r.error ?? "Failed to trigger."}`);
          }
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

  const exportXlsx = async () => {
    setExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.created = new Date();
      const ws = wb.addWorksheet("Q&A Evaluation");

      ws.columns = QA_COLUMNS.map((c) => ({
        header: c.label,
        key: c.key as string,
        width: Math.max(14, Math.min(60, c.label.length + 20)),
      }));

      ws.getRow(1).font = { bold: true };
      ws.getRow(1).alignment = { vertical: "middle" };

      const rowsToExport =
        selectedRowIds.size > 0
          ? filteredRows.filter((r) =>
              selectedRowIds.has(r.id ?? r.question ?? ""),
            )
          : filteredRows;

      rowsToExport.forEach((row, rIdx) => {
        const rowValues: Record<string, unknown> = {};
        QA_COLUMNS.forEach((c) => {
          rowValues[c.key as string] = c.raw(row);
        });
        const addedRow = ws.addRow(rowValues);
        addedRow.alignment = { wrapText: true, vertical: "top" };

        QA_COLUMNS.forEach((c, cIdx) => {
          const fmt = derivedFormats[formatKey(row.id ?? rIdx, c.key as string)];
          if (!fmt) return;
          const cell = addedRow.getCell(cIdx + 1);
          if (fmt.highlight) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFEF08A" },
            };
          }
          if (fmt.error) {
            cell.font = { color: { argb: "FFDC2626" }, bold: true };
          }
        });
      });

      ws.views = [{ state: "frozen", ySplit: 1 }];

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.href = url;
      a.download = `qa-evaluation-${stamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rowsToExport.length} rows.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to export.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-screen min-h-screen flex-col bg-[var(--sheets-toolbar-bg)] text-foreground">
      {/* Top bar — file name + account actions */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--sheets-grid)] bg-card px-3 pt-2 pb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
          <SheetIcon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-[15px] sm:text-[17px] font-medium leading-tight text-foreground">
            RAG Builder
          </h1>
          <div className="mt-0.5 hidden sm:block text-[12px] text-muted-foreground">
            Last edit was at {lastUpdated}
          </div>
        </div>
        {/* Desktop: full action row */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            type="button"
            onClick={exportXlsx}
            disabled={exporting}
            title="Export visible rows to Excel (.xlsx) with highlights and error marks preserved"
            className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-foreground/80 hover:bg-muted disabled:opacity-50"
          >
            <Download className={exporting ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
            <span className="hidden sm:inline">{exporting ? "Exporting…" : "Export"}</span>
          </button>
          <button
            type="button"
            onClick={exportJson}
            title="Export currently visible rows as a JSON file"
            className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-foreground/80 hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export JSON</span>
          </button>
          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            title="Register a new user"
            className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-foreground/80 hover:bg-muted"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Register</span>
          </button>
          <div className="mx-1 h-5 w-px bg-[var(--sheets-grid)]" />
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
            title="Sign out"
            className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-foreground/80 hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
        {/* Mobile: overflow menu */}
        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/80 hover:bg-muted"
                title="Menu"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={exportXlsx} disabled={exporting}>
                <Download className="mr-2 h-4 w-4" />
                {exporting ? "Exporting…" : "Export Excel"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportJson}>
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRegisterOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Register user
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/auth" });
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>



      {/* Mobile toolbar */}
      <div className="flex md:hidden shrink-0 flex-col gap-2 border-b border-[var(--sheets-grid)] bg-card px-3 py-2">
        <div className="flex items-center gap-1.5">
          <ToolbarButton
            onClick={handleRefresh}
            disabled={refreshing || isFetching}
            title="Refresh data"
          >
            <RefreshCw className={refreshing || isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </ToolbarButton>

          <button
            type="button"
            onClick={() => setInsertOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-[13px] font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <ListPlus className="h-4 w-4" />
            Insert
          </button>

          <button
            type="button"
            onClick={deleteSelectedRows}
            disabled={selectedRowIds.size === 0}
            title={selectedRowIds.size === 0 ? "Select rows to delete" : `Delete ${selectedRowIds.size}`}
            className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-foreground/90 hover:bg-muted disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
            {selectedRowIds.size > 0 ? (
              <span className="rounded-full bg-destructive/15 px-1.5 text-[10px] font-semibold text-destructive tabular-nums">
                {selectedRowIds.size}
              </span>
            ) : null}
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Filters"
                className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-foreground/90 hover:bg-muted"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {(searchQuery || dateFrom || dateTo) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[260px] space-y-2 p-3">
              <div className="flex h-9 items-center gap-1.5 rounded-md border border-[var(--sheets-grid)] bg-background px-2 focus-within:ring-1 focus-within:ring-primary">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions…"
                  className="h-7 flex-1 min-w-0 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--sheets-grid)] bg-background px-2 text-[13px] text-foreground focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 w-full rounded-md border border-[var(--sheets-grid)] bg-background px-2 text-[13px] text-foreground focus:outline-none"
                />
              </div>
              {(searchQuery || dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setDateFrom(""); setDateTo(""); }}
                  className="w-full rounded-md px-2 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted"
                >
                  Clear filters
                </button>
              )}
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="More actions"
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-foreground/80 hover:bg-muted"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {selectedRowIds.size > 0 && (
                <>
                  <DropdownMenuItem onClick={() => setPendingChannel("web")} disabled={runningChannel !== null}>
                    <Globe className="mr-2 h-4 w-4 text-primary" />
                    Run Web ({selectedRowIds.size})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPendingChannel("telegram_whatsapp")} disabled={runningChannel !== null}>
                    <MessageSquare className="mr-2 h-4 w-4 text-primary" />
                    Run WA/TG ({selectedRowIds.size})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPendingChannel("both")} disabled={runningChannel !== null}>
                    <Layers className="mr-2 h-4 w-4 text-primary" />
                    Run Both
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => applyFormat({ highlight: true })}>
                <Highlighter className="mr-2 h-4 w-4 text-yellow-500" />
                Highlight cell
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyFormat({ error: true })}>
                <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
                Mark error
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyFormat(null)}>
                <Eraser className="mr-2 h-4 w-4" />
                Clear formatting
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Desktop Toolbar */}
      <div className="hidden md:flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--sheets-grid)] bg-card px-3 py-2">
        {/* Group: data view */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={handleRefresh}
            disabled={refreshing || isFetching}
            title="Refresh data"
          >
            <RefreshCw
              className={
                refreshing || isFetching
                  ? "h-4 w-4 animate-spin"
                  : "h-4 w-4"
              }
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
            <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Insert questions</DialogTitle>
                <DialogDescription>
                  Paste one question per line. Each row is added to the sheet,
                  then the agent fills in the empty answers.
                </DialogDescription>
              </DialogHeader>
              <QuestionPasteBox
                existingQuestions={existingQuestions}
                table={activeTable}

                onComplete={async () => {
                  setInsertOpen(false);
                  setInserting(true);
                  try {
                    const result = await refetch();
                    if (result.error) throw result.error;
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed to refresh table.");
                  } finally {
                    setInserting(false);
                  }
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

          {/* Sync Q&A sheet button hidden for now */}
          {false && (
            <a
              href="https://tuah.utem.edu.my/agent/form/3711c0e7-968e-4fea-ab27-31a4da013a7f"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setSyncPhase("waiting");
                setSyncing(true);
              }}
              className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-foreground/90 hover:bg-muted"
              title="Open agent form to sync the full Q&A sheet"
            >
              <ExternalLink className="h-4 w-4 text-primary" />
              <span>Sync Q&A sheet</span>
            </a>
          )}
        </ToolbarGroup>

        <Divider />

        {/* Group: run processing — when rows are selected, allow re-running any channel */}
        {selectedRowIds.size > 0 ? (
          <>
            <ToolbarGroup>
              <ToolbarAction
                onClick={() => setPendingChannel("web")}
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
                onClick={() => setPendingChannel("telegram_whatsapp")}
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
                onClick={() => setPendingChannel("both")}
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

        {/* Right side — sheet status */}
        <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
          {isFetching ? "Syncing…" : `Synced ${lastUpdated}`}
        </div>
      </div>





      {/* Formula bar */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-[var(--sheets-grid)] bg-card px-2 py-1">
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

      {/* Row count strip */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--sheets-grid)] bg-card px-3 py-1.5">
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {activeTable ? `Sheet: ${formatTableLabel(activeTable)}` : "No sheet selected"}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
          {filteredRows.length}/{rows.length} row{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Grid */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <QATable
          rows={filteredRows}
          isLoading={isLoading}
          selection={selection}
          onSelectionChange={setSelection}
          formats={derivedFormats}
          selectedRowIds={selectedRowIds}
          onToggleRow={toggleRow}
          onSelectAll={selectAllRows}
        />
      </div>


      {/* Sheet tabs */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-t border-[var(--sheets-grid)] bg-card px-2 py-1">
        {tables.length === 0 ? (
          <div className="flex h-7 items-center px-3 text-[12px] text-muted-foreground">
            {tablesQuery.isLoading ? "Loading sheets…" : "No sheets yet"}
          </div>
        ) : (
          tables.map((t) => {
            const active = t === activeTable;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  if (t === activeTable) return;
                  queryClient.removeQueries({ queryKey: ["qa-rows", t], exact: true });
                  setActiveTable(t);
                  setSelection(null);
                  setSelectedRowIds(new Set());
                }}
                title={t}
                className={
                  active
                    ? "flex h-7 items-center gap-2 rounded-t-md border-t-2 border-primary bg-card px-3 text-[13px] font-medium shadow-[0_-1px_0_var(--sheets-grid)_inset]"
                    : "flex h-7 items-center gap-2 rounded-t-md border-t-2 border-transparent px-3 text-[13px] font-medium text-muted-foreground hover:bg-muted"
                }
              >
                {formatTableLabel(t)}
              </button>
            );
          })
        )}
        <button
          type="button"
          onClick={() => setNewSheetOpen(true)}
          title="Add a new sheet"
          className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="ml-auto text-[11px] text-muted-foreground tabular-nums">
          {refreshing ? "Refreshing…" : isFetching ? "Syncing…" : `Synced ${lastUpdated}`}
        </div>
      </div>

      {/* New sheet dialog */}
      <Dialog open={newSheetOpen} onOpenChange={(o) => !creatingSheet && setNewSheetOpen(o)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New sheet</DialogTitle>
            <DialogDescription>
              Enter a table name. It will be lowercased, spaces become dashes,
              and a <span className="font-mono">qatest-</span> prefix is added.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input
              autoFocus
              placeholder="e.g. New Faculty"
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              disabled={creatingSheet}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !creatingSheet) {
                  e.preventDefault();
                  void createSheet();
                }
              }}
            />
            {newSheetName.trim() && (
              <div className="text-[12px] text-muted-foreground">
                Will create: <span className="font-mono text-foreground">qatest-{newSheetName.trim().toLowerCase().replace(/\s+/g, "-")}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSheetOpen(false)} disabled={creatingSheet}>
              Cancel
            </Button>
            <Button onClick={createSheet} disabled={creatingSheet} className="gap-2">
              {creatingSheet ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {creatingSheet ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Run confirmation dialog */}
      <Dialog
        open={pendingChannel !== null}
        onOpenChange={(o) => {
          if (!o) setPendingChannel(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Run agent on selected rows?</DialogTitle>
            <DialogDescription>
              {pendingChannel === "web"
                ? "Re-run the Web Chat agent"
                : pendingChannel === "telegram_whatsapp"
                  ? "Re-run the Telegram/WhatsApp agent"
                  : "Re-run both Web Chat and Telegram/WhatsApp agents"}
              {" "}for {selectedRowIds.size} selected question
              {selectedRowIds.size === 1 ? "" : "s"}. Existing answers will be updated.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const qs = filteredRows
              .filter((r) => selectedRowIds.has(r.id ?? r.question ?? ""))
              .map((r) => (r.question ?? "").trim())
              .filter(Boolean);
            return (
              <div className="max-h-64 overflow-auto rounded-md border border-[var(--sheets-grid)] bg-muted/30 p-2">
                {qs.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">No questions selected.</p>
                ) : (
                  <ol className="list-decimal space-y-1 pl-5 text-[13px] text-foreground">
                    {qs.map((q, i) => (
                      <li key={i} className="break-words">{q}</li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingChannel(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const ch = pendingChannel;
                setPendingChannel(null);
                if (ch) runChannel(ch);
              }}
            >
              Confirm & Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Register user dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
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
                  await registerUserFn({ data: { email, password: registerPassword } });
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

      <Dialog
        open={deleteConfirm.open}
        onOpenChange={(o) =>
          !deleting && setDeleteConfirm((d) => ({ ...d, open: o }))
        }
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete {deleteConfirm.items.length} question
              {deleteConfirm.items.length === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription>
              This will remove the selected row{deleteConfirm.items.length === 1 ? "" : "s"} from the knowledge base. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-y-auto rounded-md border border-[var(--sheets-grid)] bg-muted/30 p-2 text-[13px]">
            <ul className="space-y-1">
              {deleteConfirm.items.slice(0, 20).map((it, i) => (
                <li key={i} className="truncate">
                  <span className="font-mono text-muted-foreground">
                    #{it.id ?? "—"}
                  </span>{" "}
                  {it.question}
                </li>
              ))}
              {deleteConfirm.items.length > 20 && (
                <li className="text-muted-foreground">
                  …and {deleteConfirm.items.length - 20} more
                </li>
              )}
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm({ open: false, items: [] })}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full-screen loading overlay shown while the delete workflow runs. */}
      {deleting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-lg border border-[var(--sheets-grid)] bg-card px-8 py-6 shadow-lg">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <div className="text-[15px] font-medium text-foreground">
                {deletePhase === "refreshing" ? "Refreshing table…" : "Deleting…"}
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground">
                {deletePhase === "refreshing"
                  ? "Waiting for the latest data from the workflow."
                  : "Waiting for the workflow to confirm."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay shown while the user syncs via the external form and the
          table refresh that follows. */}
      {inserting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-lg border border-[var(--sheets-grid)] bg-card px-8 py-6 shadow-lg">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <div className="text-[15px] font-medium text-foreground">Refreshing table…</div>
              <div className="mt-1 text-[12px] text-muted-foreground">
                Loading the latest rows from the workflow.
              </div>
            </div>
          </div>
        </div>
      )}

      {syncing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-lg border border-[var(--sheets-grid)] bg-card px-8 py-6 shadow-lg">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <div className="text-[15px] font-medium text-foreground">
                {syncPhase === "refreshing" ? "Refreshing table…" : "Syncing Q&A sheet…"}
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground">
                {syncPhase === "refreshing"
                  ? "Loading the latest rows from the workflow."
                  : "Complete the form in the new tab, then return here."}
              </div>
              {syncPhase === "waiting" && (
                <button
                  type="button"
                  onClick={() => setSyncing(false)}
                  className="mt-3 text-[12px] text-muted-foreground underline hover:text-foreground"
                >
                  Cancel
                </button>
              )}
            </div>
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
