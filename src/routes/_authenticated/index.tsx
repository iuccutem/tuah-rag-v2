import { apiFetch } from "@/lib/api";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Globe,
  MessageSquare,
  Layers,
  Loader2,
  LogOut,
  UserPlus,
  Plus,
  MoreVertical,
  SlidersHorizontal,
  FileSpreadsheet,
  Upload,
  Pencil,
  ChevronDown,
  Check,
  Sun,
  Moon,
  Sparkles,
  Info,
  Eye,
  X,
  Users,
  RotateCcw,
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
import { useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";



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
import { ExcelImportBox } from "@/components/qa-dashboard/ExcelImportBox";
import { assembleDataset, buildDatasetHints } from "@/lib/rag-schema";



export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "RAG Evaluation Workspace" },
      {
        name: "description",
        content:
          "RAG Evaluation Workspace — spreadsheet-style workspace to curate Q&A and test against selectable vector stores.",
      },
    ],
  }),
  component: () => <DashboardPage />,
});

type ApiResponse = { data: QARow[]; error: string | null };

async function fetchRows(table: string): Promise<ApiResponse> {
  const params = new URLSearchParams({ ts: String(Date.now()) });
  if (table) params.set("table", table);
  const res = await apiFetch(`/n8n-qa?${params.toString()}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as ApiResponse;
}

type TablesResponse = { tables: string[]; error: string | null };

async function fetchTables(): Promise<TablesResponse> {
  const res = await apiFetch(`/n8n-tables?ts=${Date.now()}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as TablesResponse;
}

const TABLE_PREFIX = "qatest-";
const DEV_PREFIX = "qatest-dev-";
function isDevTable(name: string): boolean {
  return name.toLowerCase().startsWith(DEV_PREFIX);
}
function belongsTo(name: string, dev: boolean): boolean {
  if (!name.toLowerCase().startsWith(TABLE_PREFIX)) return false;
  return isDevTable(name) === dev;
}
function formatTableLabel(raw: string): string {
  const stripped = raw
    .replace(/^qatest-/i, "")
    .replace(/^dev-/i, "");
  if (!stripped) return raw;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

export function DashboardPage() {
  // Dev/prod merged: single workspace with always-available vector store picker.
  const isDev = false;
  const processEndpoint = "/api/n8n-process";
  const VECTOR_STORAGE_KEY = "rag-vector-id";
  const [vectorId, setVectorId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(VECTOR_STORAGE_KEY) ?? "";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (vectorId) localStorage.setItem(VECTOR_STORAGE_KEY, vectorId);
  }, [vectorId]);
  const vectorsQuery = useQuery({
    queryKey: ["vector-list"],
    queryFn: async () => {
      const res = await apiFetch(`/n8n-vector-list?ts=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      return (await res.json()) as {
        vectors: Array<{ id: string; name: string }>;
        error: string | null;
      };
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const vectors = vectorsQuery.data?.vectors ?? [];
  useEffect(() => {
    if (!vectorId && vectors.length > 0) setVectorId(vectors[0].id);
  }, [vectorId, vectors]);
  const vectorDisabledReason = !vectorId
    ? vectorsQuery.isLoading
      ? "Loading vector stores…"
      : vectors.length === 0
        ? `No vector stores available${vectorsQuery.data?.error ? `: ${vectorsQuery.data.error}` : "."}`
        : "Select a vector store first."
    : null;
  

  // System prompt selector
  const PROMPT_STORAGE_KEY = "rag-system-prompt-id";
  const [systemPromptId, setSystemPromptId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(PROMPT_STORAGE_KEY) ?? "";
  });
  useEffect(() => {
    if (systemPromptId) localStorage.setItem(PROMPT_STORAGE_KEY, systemPromptId);
  }, [systemPromptId]);
  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false);
  const [previewPromptId, setPreviewPromptId] = useState<string | null>(null);
  type SystemPrompt = {
    id: string;
    name: string;
    model: string | null;
    vector_store_id: string | null;
    description: string | null;
    system_prompt: string;
    is_active: boolean | null;
    user_id: string | null;
    updated_at: string | null;
  };
  const promptsQuery = useQuery({
    queryKey: ["system-prompt-list"],
    queryFn: async () => {
      const res = await apiFetch(`/n8n-system-prompt-list?ts=${Date.now()}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      return (await res.json()) as {
        prompts: SystemPrompt[];
        error: string | null;
      };
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  type PromptUser = { id: string; name: string; email: string | null };
  const promptUsersQuery = useQuery({
    queryKey: ["prompt-users"],
    queryFn: async () => {
      const res = await apiFetch(`/n8n-prompt-users?ts=${Date.now()}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      return (await res.json()) as {
        users: PromptUser[];
        error: string | null;
      };
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const promptUsers = promptUsersQuery.data?.users ?? [];

  const prompts = promptsQuery.data?.prompts ?? [];
  const [promptSearch, setPromptSearch] = useState("");
  const PROMPT_SHOW_ALL_KEY = "ragBuilder.promptShowAll";
  const [promptShowAll, setPromptShowAll] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(PROMPT_SHOW_ALL_KEY) === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(PROMPT_SHOW_ALL_KEY, promptShowAll ? "1" : "0");
  }, [promptShowAll]);
  const PROMPT_USER_KEY = "ragBuilder.promptUserId";
  const PROMPT_USER_DEFAULT_KEY = "ragBuilder.promptUserDefaultApplied";
  const DEFAULT_USER_EMAIL = "osgoh88@gmail.com";
  const DEFAULT_USER_NAME = "Goh";
  const [promptUserId, setPromptUserId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(PROMPT_USER_KEY) ?? "";
  });
  const [userFilterOpen, setUserFilterOpen] = useState(false);
  // Auto-select the default user (Goh) on first load if nothing is saved.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (promptUsers.length === 0) return;
    if (localStorage.getItem(PROMPT_USER_DEFAULT_KEY) === "1") return;
    if (localStorage.getItem(PROMPT_USER_KEY)) {
      localStorage.setItem(PROMPT_USER_DEFAULT_KEY, "1");
      return;
    }
    const match =
      promptUsers.find(
        (u) => (u.email ?? "").toLowerCase() === DEFAULT_USER_EMAIL,
      ) ??
      promptUsers.find(
        (u) => u.name.toLowerCase() === DEFAULT_USER_NAME.toLowerCase(),
      );
    if (match) setPromptUserId(match.id);
    localStorage.setItem(PROMPT_USER_DEFAULT_KEY, "1");
  }, [promptUsers]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (promptUserId) localStorage.setItem(PROMPT_USER_KEY, promptUserId);
    else localStorage.removeItem(PROMPT_USER_KEY);
  }, [promptUserId]);
  // Reset user filter if the stored id is no longer in the list.
  useEffect(() => {
    if (!promptUserId || promptUsers.length === 0) return;
    if (!promptUsers.some((u) => u.id === promptUserId)) setPromptUserId("");
  }, [promptUserId, promptUsers]);
  const [promptUserSearch, setPromptUserSearch] = useState("");
  const filteredPromptUsers = promptUserSearch.trim()
    ? promptUsers.filter((u) =>
        (u.name + " " + (u.email ?? ""))
          .toLowerCase()
          .includes(promptUserSearch.trim().toLowerCase()),
      )
    : promptUsers;
  const selectedPromptUser =
    promptUsers.find((u) => u.id === promptUserId) ?? null;

  const PROMPT_FILTER = "prod rag";
  const matchesUser = (p: SystemPrompt) =>
    !promptUserId || p.user_id === promptUserId;
  const prodPrompts = prompts.filter(
    (p) => p.name.toLowerCase().includes(PROMPT_FILTER) && matchesUser(p),
  );
  const scopedPromptsRaw = promptShowAll
    ? prompts.filter(matchesUser)
    : prodPrompts;
  useEffect(() => {
    if (prompts.length === 0) return;
    const current = prompts.find((p) => p.id === systemPromptId);
    const currentIsProd =
      current && current.name.toLowerCase().includes(PROMPT_FILTER);
    const currentMatchesUser = current && matchesUser(current);
    if (currentIsProd && currentMatchesUser) return;
    const firstProd = prodPrompts[0] ?? scopedPromptsRaw[0] ?? prompts[0];
    if (firstProd && firstProd.id !== systemPromptId) {
      setSystemPromptId(firstProd.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemPromptId, prompts, prodPrompts, promptUserId]);
  const selectedPrompt = prompts.find((p) => p.id === systemPromptId) ?? null;
  const extraProcessBody = (() => {
    const body: Record<string, unknown> = {};
    if (vectorId) body.vector_id = vectorId;
    if (selectedPrompt) {
      body.system_prompt_id = selectedPrompt.id;
      if (selectedPrompt.system_prompt) body.system_prompt = selectedPrompt.system_prompt;
      if (selectedPrompt.name) body.system_prompt_name = selectedPrompt.name;
      if (selectedPrompt.model) body.model = selectedPrompt.model;
    }
    return Object.keys(body).length > 0 ? body : undefined;
  })();
  const previewPrompt =
    (previewPromptId ? prompts.find((p) => p.id === previewPromptId) : null) ??
    selectedPrompt;
  const scopedPrompts = scopedPromptsRaw;
  const searchedPrompts = promptSearch.trim()
    ? scopedPrompts.filter((p) =>
        p.name.toLowerCase().includes(promptSearch.trim().toLowerCase()),
      )
    : scopedPrompts;
  const selectionHiddenByFilter = false;
  const filteredPrompts = searchedPrompts;



  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["vector-list"] });
    queryClient.invalidateQueries({ queryKey: ["system-prompt-list"] });
    queryClient.invalidateQueries({ queryKey: ["prompt-users"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeTable, setActiveTable] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  const tablesQuery = useQuery({
    queryKey: ["qa-tables"],
    queryFn: fetchTables,
    refetchOnWindowFocus: false,
  });
  const allTables = (tablesQuery.data?.tables ?? []).filter((t) =>
    t.startsWith(TABLE_PREFIX),
  );
  const tables = allTables
    .filter((t) => belongsTo(t, isDev))
    .sort((a, b) => a.localeCompare(b));
  const oppositeTables = allTables.filter((t) => belongsTo(t, !isDev));

  // Set the first table as the active one on initial load / after env switch.
  useEffect(() => {
    if (!activeTable && tables.length > 0) {
      setActiveTable(tables[0]);
    } else if (activeTable && !tables.includes(activeTable)) {
      // Env changed underneath us — pick a valid table for this env.
      setActiveTable(tables[0] ?? "");
      setSelection(null);
      setSelectedRowIds(new Set());
    }
  }, [tables, activeTable]);

  // Auto-seed the `test` starter table on first Dev load.
  const seedRanRef = useRef(false);
  useEffect(() => {
    if (!isDev) return;
    if (seedRanRef.current) return;
    if (tablesQuery.isLoading) return;
    if (tables.length > 0) return;
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("rag-dev-test-seeded") === "1") return;
      sessionStorage.setItem("rag-dev-test-seeded", "1");
    }
    seedRanRef.current = true;
    (async () => {
      try {
        const res = await apiFetch("/n8n-create-table", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "qatest-dev-test" }),
        });
        const json = (await res.json()) as { ok: boolean; error?: string };
        if (json.ok) {
          toast.success('Created starter table "test".');
          await tablesQuery.refetch();
          setActiveTable("qatest-dev-test");
        }
      } catch {
        /* silent — user can create manually */
      }
    })();
  }, [isDev, tablesQuery.isLoading, tables.length]);


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
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingRag, setExportingRag] = useState(false);
  const [exportPreview, setExportPreview] = useState<{
    open: boolean;
    rows: Array<{
      id: string | number | null;
      question: string;
      expected_answer: string;
      url: string;
    }>;
  }>({ open: false, rows: [] });
  const [runningChannel, setRunningChannel] = useState<"web" | "telegram_whatsapp" | "both" | null>(null);
  const [pendingChannel, setPendingChannel] = useState<"web" | "telegram_whatsapp" | "both" | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registering, setRegistering] = useState(false);
  const registerUserFn = async (data: { email: string; password: string }) => {
    const res = await apiFetch("/admin-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(payload.error || `Registration failed (${res.status})`);
    return payload;
  };
  const [insertOpen, setInsertOpen] = useState(false);
  const [copyingRowIds, setCopyingRowIds] = useState<Set<string | number>>(new Set());
  const [confirmOverwriteRowId, setConfirmOverwriteRowId] = useState<string | number | null>(null);
  const confirmOverwriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState<{ open: boolean; from: string }>({ open: false, from: "" });
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [deleteSheetConfirm, setDeleteSheetConfirm] = useState<{ open: boolean; name: string }>({ open: false, name: "" });
  const [deletingSheet, setDeletingSheet] = useState(false);

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
  const [importOpen, setImportOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<string>("");
  const [importQueue, setImportQueue] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
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

  const openExportDialog = () => {
    if (exportingJson || exportingRag || exporting) return;
    if (selectedRowIds.size === 0) {
      toast.error("Select rows to export.");
      return;
    }
    const selected = filteredRows.filter((r) =>
      selectedRowIds.has(r.id ?? r.question ?? ""),
    );
    const previewRows = selected
      .filter((r) => (r.question ?? "").trim().length > 0)
      .map((r) => ({
        id: (r.id ?? null) as string | number | null,
        question: r.question ?? "",
        expected_answer: r.telegram_whatsapp ?? "",
        url: r.url ?? "",
      }));
    if (previewRows.length === 0) {
      toast.error("No rows with a question to export.");
      return;
    }
    setExportPreview({ open: true, rows: previewRows });
  };

  const buildTableTag = () => {
    const rawTable = (activeTable || "all").replace(/^qatest-(dev-)?/, "");
    return rawTable.replace(/-/g, "_").replace(/[^a-zA-Z0-9_]/g, "_");
  };
  const buildStamp = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(now.getDate())}${pad(now.getMonth() + 1)}${String(now.getFullYear()).slice(-2)}`;
  };
  const buildExportBase = () => {
    const tag = buildTableTag();
    return /_(faq|qna|rag)$/.test(tag) ? tag : `${tag}_faq`;
  };

  const confirmExportJson = async () => {
    if (exportingJson) return;
    const previewRows = exportPreview.rows;
    if (previewRows.length === 0) return;
    const JSON_BATCH_SIZE = 1;
    setExportingJson(true);

    const inputRows = previewRows.map((r) => ({
      id: r.id,
      question: r.question,
      telegram_whatsapp: r.expected_answer,
      url: r.url,
    }));
    const batches: (typeof inputRows)[] = [];
    for (let i = 0; i < inputRows.length; i += JSON_BATCH_SIZE) {
      batches.push(inputRows.slice(i, i + JSON_BATCH_SIZE));
    }
    const tableName = activeTable || "all";
    const tId = toast.loading(
      `Generating ${inputRows.length} row${inputRows.length === 1 ? "" : "s"}… (0 / ${inputRows.length})`,
    );

    const runBatch = async (batch: typeof inputRows) => {
      const res = await apiFetch("/n8n-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: tableName, rows: batch }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        rows?: unknown;
        error?: string;
      };
      if (!res.ok || !Array.isArray(payload.rows)) {
        throw new Error(payload.error || `Export failed (${res.status})`);
      }
      return payload.rows as unknown[];
    };

    try {
      const merged: unknown[] = [];
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        let rows: unknown[];
        try {
          rows = await runBatch(batch);
        } catch {
          await new Promise((r) => setTimeout(r, 2000));
          try {
            rows = await runBatch(batch);
          } catch (err2) {
            const msg = err2 instanceof Error ? err2.message : String(err2);
            throw new Error(
              `Generation failed after retry (${merged.length} / ${inputRows.length} rows completed): ${msg}`,
            );
          }
        }
        merged.push(...rows);
        if (i < batches.length - 1) {
          toast.loading(
            `Generating… (${merged.length} / ${inputRows.length})`,
            { id: tId },
          );
        }
      }

      toast.dismiss(tId);
      const json = JSON.stringify(merged, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${buildExportBase()}_${buildStamp()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(
        `Exported ${merged.length} row${merged.length === 1 ? "" : "s"}.`,
      );
      setExportPreview({ open: false, rows: [] });
    } catch (e) {
      toast.dismiss(tId);
      toast.error(e instanceof Error ? e.message : "Failed to export JSON.");
    } finally {
      setExportingJson(false);
    }
  };


  const runRagPipeline = async (
    inputRows: Array<{ id: string | number | null; question: string; telegram_whatsapp: string; url: string }>,
    ctx: {
      tableName: string;
      tableTag: ReturnType<typeof buildTableTag>;
      datasetHints: ReturnType<typeof buildDatasetHints>;
      previewRows: typeof exportPreview.rows;
    },
    opts: { isRetry?: boolean } = {},
  ) => {
    if (inputRows.length === 0) return;
    setExportingRag(true);
    const total = inputRows.length;
    const tId = toast.loading(
      `${opts.isRetry ? "Retrying" : "Building"} production RAG for ${total} row${total === 1 ? "" : "s"}… (0 / ${total})`,
    );

    const validateOutgoing = (payload: Record<string, unknown>) => {
      const missing: string[] = [];
      if (!payload.table || typeof payload.table !== "string") missing.push("table");
      if (typeof payload.batch_index !== "number" || Number.isNaN(payload.batch_index as number))
        missing.push("batch_index");
      if (typeof payload.batch_total !== "number" || !(payload.batch_total as number))
        missing.push("batch_total");
      if (!Array.isArray(payload.rows) || (payload.rows as unknown[]).length === 0)
        missing.push("rows");
      const ds = payload.dataset as Record<string, unknown> | undefined;
      if (!ds || typeof ds !== "object") missing.push("dataset");
      else {
        for (const k of [
          "dataset_id",
          "name",
          "organization",
          "languages",
          "source_scope",
          "generated_at",
          "generated_timezone",
        ]) {
          const v = ds[k];
          if (v === undefined || v === null || v === "") missing.push(`dataset.${k}`);
          else if (Array.isArray(v) && v.length === 0 && k !== "source_scope") missing.push(`dataset.${k}`);
        }
      }
      return missing;
    };

    const callOnce = async (row: typeof inputRows[number], index: number) => {
      const outgoing: Record<string, unknown> = {
        table: ctx.tableName,
        rows: [row],
        dataset: ctx.datasetHints,
        batch_index: index,
        batch_total: total,
      };
      const missing = validateOutgoing(outgoing);
      if (missing.length > 0) {
        throw new Error(`Incomplete payload — missing: ${missing.join(", ")}`);
      }
      const res = await apiFetch("/n8n-rag-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(outgoing),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        rows?: unknown;
        error?: string;
      };
      if (!res.ok || !Array.isArray(payload.rows)) {
        throw new Error(payload.error || `RAG build failed (${res.status})`);
      }
      if ((payload.rows as unknown[]).length === 0) {
        throw new Error("Webhook returned 0 records.");
      }
      return payload.rows as unknown[];
    };

    let done = 0;
    let failing = 0;
    const updateProgress = () => {
      toast.loading(
        `Building production RAG… (${done} / ${total}${failing ? `, failing ${failing}` : ""})`,
        { id: tId },
      );
    };

    type RowResult =
      | { ok: true; index: number; rows: unknown[] }
      | { ok: false; index: number; row: typeof inputRows[number]; error: string };

    const runOneWithRetry = async (
      row: typeof inputRows[number],
      index: number,
    ): Promise<RowResult> => {
      let lastErr: unknown;
      let countedFailing = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const rows = await callOnce(row, index);
          if (countedFailing) {
            failing = Math.max(0, failing - 1);
          }
          done += 1;
          updateProgress();
          return { ok: true, index, rows };
        } catch (err) {
          lastErr = err;
          if (!countedFailing) {
            failing += 1;
            countedFailing = true;
            updateProgress();
          }
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, attempt * 1000));
          }
        }
      }
      return {
        ok: false,
        index,
        row,
        error: lastErr instanceof Error ? lastErr.message : String(lastErr),
      };
    };

    try {
      const results = await Promise.all(inputRows.map((r, i) => runOneWithRetry(r, i)));

      const successes = results.filter((r): r is Extract<RowResult, { ok: true }> => r.ok);
      const failures = results.filter((r): r is Extract<RowResult, { ok: false }> => !r.ok);
      successes.sort((a, b) => a.index - b.index);
      const merged: unknown[] = successes.flatMap((s) => s.rows);

      toast.dismiss(tId);

      if (merged.length > 0) {
        const { payload, legacyDetected } = await assembleDataset({
          hints: ctx.datasetHints,
          tableTag: ctx.tableTag,
          records: merged,
        });
        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${ctx.datasetHints.dataset_id}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        if (legacyDetected) {
          toast.warning(
            `Downloaded ${merged.length} record${merged.length === 1 ? "" : "s"} — some are not in v2.0.0 shape. Update the n8n agent prompt.`,
          );
        }
      }

      if (failures.length === 0) {
        toast.success(
          `Production RAG v2.0.0 ready (${merged.length} record${merged.length === 1 ? "" : "s"}).`,
        );
        setExportPreview({ open: false, rows: [] });
      } else {
        const failedRows = failures.map((f) => f.row);
        const firstMsg = failures[0].error;
        toast.error(
          <div className="space-y-2 min-w-[18rem]">
            <div className="font-medium">
              {failures.length} row{failures.length === 1 ? "" : "s"} failed after 3 attempts
            </div>
            <p className="text-xs text-muted-foreground break-words">
              {merged.length > 0
                ? `Downloaded ${merged.length} successful record${merged.length === 1 ? "" : "s"}. `
                : "No records were built. "}
              First error: {firstMsg}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  toast.dismiss();
                  void runRagPipeline(failedRows, ctx, { isRetry: true });
                }}
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Retry failed rows
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => toast.dismiss()}
              >
                Dismiss
              </Button>
            </div>
          </div>,
          { duration: Infinity },
        );
      }
    } catch (e) {
      toast.dismiss(tId);
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || "Failed to build RAG.");
    } finally {
      setExportingRag(false);
    }
  };

  const confirmExportRag = async () => {
    if (exportingRag) return;
    const previewRows = exportPreview.rows;
    if (previewRows.length === 0) return;

    const inputRows = previewRows.map((r) => ({
      id: r.id,
      question: r.question,
      telegram_whatsapp: r.expected_answer,
      url: r.url,
    }));
    const tableName = activeTable || "all";
    const tableTag = buildTableTag();
    const datasetHints = buildDatasetHints({ tableTag, rows: previewRows });
    await runRagPipeline(inputRows, { tableName, tableTag, datasetHints, previewRows });
  };





  const createSheet = async () => {
    const raw = newSheetName.trim();
    if (!raw) {
      toast.error("Table name is required.");
      return;
    }
    const prefix = isDev ? DEV_PREFIX : TABLE_PREFIX;
    const slug = raw
      .toLowerCase()
      .replace(/^qatest-(dev-)?/, "")
      .replace(/^dev-/, "")
      .replace(/\s+/g, "_");
    const formatted = `${prefix}${slug}`;
    if (!/^[a-z0-9_-]+$/.test(slug) || !slug) {
      toast.error("Use letters, numbers, spaces, underscores or dashes only.");
      return;
    }
    if (tables.some((t) => t.toLowerCase() === formatted)) {
      toast.error("That sheet already exists.");
      return;
    }
    setCreatingSheet(true);
    try {
      const res = await apiFetch("/n8n-create-table", {
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

  const renameSheet = async () => {
    const from = renameOpen.from;
    const raw = renameValue.trim();
    if (!raw) {
      toast.error("New name is required.");
      return;
    }
    const prefix = isDev ? DEV_PREFIX : TABLE_PREFIX;
    const slug = raw
      .toLowerCase()
      .replace(/^qatest-(dev-)?/, "")
      .replace(/^dev-/, "")
      .replace(/\s+/g, "_");
    const formatted = `${prefix}${slug}`;
    if (!/^[a-z0-9_-]+$/.test(slug) || !slug) {
      toast.error("Use letters, numbers, spaces, underscores or dashes only.");
      return;
    }
    if (formatted === from) {
      toast.error("New name is the same as the current name.");
      return;
    }
    if (tables.some((t) => t.toLowerCase() === formatted)) {
      toast.error("A sheet with that name already exists.");
      return;
    }
    setRenaming(true);
    try {
      const res = await apiFetch("/n8n-rename-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: from, newName: formatted }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error || "Failed to rename sheet.");
      toast.success(`Renamed to "${formatTableLabel(formatted)}".`);
      setRenameOpen({ open: false, from: "" });
      setRenameValue("");
      await tablesQuery.refetch();
      if (activeTable === from) {
        setActiveTable(formatted);
        setSelection(null);
        setSelectedRowIds(new Set());
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to rename sheet.");
    } finally {
      setRenaming(false);
    }
  };

  const deleteSheet = async () => {
    const name = deleteSheetConfirm.name;
    if (!name) return;
    setDeletingSheet(true);
    try {
      const res = await apiFetch("/n8n-delete-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error || "Failed to delete sheet.");
      toast.success(`Deleted sheet "${formatTableLabel(name)}".`);
      setDeleteSheetConfirm({ open: false, name: "" });
      const result = await tablesQuery.refetch();
      const fresh = (result.data?.tables ?? []).filter((t) => belongsTo(t, isDev));
      if (activeTable === name) {
        const next = fresh[0] ?? "";
        setActiveTable(next);
        setSelection(null);
        setSelectedRowIds(new Set());
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete sheet.");
    } finally {
      setDeletingSheet(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Step 1: Re-fetch tables first
      const tableResult = await tablesQuery.refetch();
      const freshTables = (tableResult.data?.tables ?? []).filter((t) =>
        belongsTo(t, isDev),
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

  const buildRowPayload = (
    row: QARow,
    overrides: Partial<Record<`${FlagCol}_${"error" | "highlight"}`, boolean>> = {},
    fieldPatch: Partial<Pick<QARow, "question" | "url" | "web" | "telegram_whatsapp">> = {},
  ) => {
    const allFlagFields = [
      "question_error",
      "question_highlight",
      "telegram_whatsapp_error",
      "web_error",
      "telegram_whatsapp_highlight",
      "web_highlight",
    ] as const;
    const flags: Record<string, boolean> = {};
    for (const f of allFlagFields) {
      const [c, k] = f.endsWith("_highlight")
        ? [f.replace("_highlight", "") as FlagCol, "highlight" as const]
        : [f.replace("_error", "") as FlagCol, "error" as const];
      flags[f] = overrides[f] !== undefined ? overrides[f]! : readFlag(row, c, k);
    }
    return {
      question: (fieldPatch.question ?? row.question ?? "") as string,
      url: (fieldPatch.url ?? row.url ?? "") as string,
      web: (fieldPatch.web ?? row.web ?? "") as string,
      telegram_whatsapp: (fieldPatch.telegram_whatsapp ?? row.telegram_whatsapp ?? "") as string,
      ...flags,
    };
  };

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

    const optimisticPatch: Record<string, boolean> = {};
    for (const f of allFields) {
      const [c, k] = f.endsWith("_highlight")
        ? [f.replace("_highlight", "") as FlagCol, "highlight" as const]
        : [f.replace("_error", "") as FlagCol, "error" as const];
      const next = overrides[f] !== undefined ? overrides[f]! : readFlag(row, c, k);
      optimisticPatch[`${rowId}::${f}`] = next;
    }

    setOptimisticFlags((p) => ({ ...p, ...optimisticPatch }));

    try {
      const payload = {
        id: rowId,
        table: activeTable,
        field: null,
        ...buildRowPayload(row, overrides),
      };
      const res = await apiFetch("/n8n-flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const handleEditCell = async (
    row: QARow,
    col: { key: keyof QARow },
    value: string,
  ): Promise<boolean> => {
    const field =
      col.key === "question"
        ? "question"
        : col.key === "url"
          ? "url"
          : col.key === "telegram_whatsapp"
            ? "telegram_whatsapp"
            : null;
    if (!field) return false;
    const rowId = row.id;
    if (rowId == null || rowId === "") {
      toast.error("This row has no id and cannot be saved.");
      return false;
    }
    const prev = (row[field] ?? "") as string;
    // Optimistic update of cached rows
    queryClient.setQueryData<ApiResponse>(["qa-rows", activeTable], (old) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.map((r) =>
          (r.id ?? r.question ?? "") === (row.id ?? row.question ?? "")
            ? { ...r, [field]: value }
            : r,
        ),
      };
    });
    try {
      const payload = {
        id: rowId,
        table: activeTable,
        field,
        ...buildRowPayload(row, {}, { [field]: value }),
      };
      const res = await apiFetch("/n8n-flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error || "Failed to save.");
      toast.success(
        `${field === "question" ? "Question" : field === "url" ? "URL" : "Expected Answer"} updated.`,
      );
      // background refresh
      void refetch();
      return true;
    } catch (e) {
      // revert
      queryClient.setQueryData<ApiResponse>(["qa-rows", activeTable], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((r) =>
            (r.id ?? r.question ?? "") === (row.id ?? row.question ?? "")
              ? { ...r, [field]: prev }
              : r,
          ),
        };
      });
      toast.error(e instanceof Error ? e.message : "Failed to save.");
      return false;
    }
  };


  const handleCopyWebToAnswer = async (row: QARow) => {
    const source = (row.web ?? "").trim();
    if (!source) return;
    const rowId = row.id;
    if (rowId == null || rowId === "") {
      toast.error("This row has no id and cannot be saved.");
      return;
    }
    const existing = (row.telegram_whatsapp ?? "").trim();
    // Two-step confirm when overwriting a non-empty answer
    if (existing.length > 0 && confirmOverwriteRowId !== rowId) {
      setConfirmOverwriteRowId(rowId);
      if (confirmOverwriteTimerRef.current)
        clearTimeout(confirmOverwriteTimerRef.current);
      confirmOverwriteTimerRef.current = setTimeout(() => {
        setConfirmOverwriteRowId((cur) => (cur === rowId ? null : cur));
      }, 2000);
      return;
    }
    if (confirmOverwriteTimerRef.current) {
      clearTimeout(confirmOverwriteTimerRef.current);
      confirmOverwriteTimerRef.current = null;
    }
    setConfirmOverwriteRowId(null);
    const col = QA_COLUMNS.find((c) => c.key === "telegram_whatsapp");
    if (!col) return;
    setCopyingRowIds((prev) => {
      const next = new Set(prev);
      next.add(rowId);
      return next;
    });
    try {
      await handleEditCell(row, col, row.web ?? "");
    } finally {
      setCopyingRowIds((prev) => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
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
        `Only "Question" and "Text Chat" cells can be flagged. Selected: ${col.label}.`,
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

  const openImportDialog = () => {
    if (selectedRowIds.size === 0) {
      toast.error("Select at least one row to import.");
      return;
    }
    const questions: string[] = [];
    for (const row of filteredRows) {
      const key = row.id ?? row.question ?? "";
      if (selectedRowIds.has(key)) {
        const q = (row.question ?? "").trim();
        if (q) questions.push(q);
      }
    }
    if (questions.length === 0) {
      toast.error("Selected rows have no question text.");
      return;
    }
    setImportQueue(questions);
    setImportTarget(oppositeTables[0] ?? "");
    setImportOpen(true);
  };

  const runImport = async () => {
    if (!importTarget) {
      toast.error("Pick a target sheet.");
      return;
    }
    if (importQueue.length === 0) {
      toast.error("No questions to import.");
      return;
    }
    setImporting(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const question of importQueue) {
        try {
          const res = await apiFetch("/n8n-run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, table: importTarget }),
          });
          const json = (await res.json()) as { ok: boolean; error?: string };
          if (json.ok) ok++;
          else fail++;
        } catch {
          fail++;
        }
      }
      if (ok > 0) {
        toast.success(
          `Imported ${ok}/${importQueue.length} question${importQueue.length === 1 ? "" : "s"} to "${formatTableLabel(importTarget)}"${fail > 0 ? ` · ${fail} failed` : ""}.`,
        );
      } else {
        toast.error("No questions imported.");
      }
      queryClient.invalidateQueries({ queryKey: ["qa-rows", importTarget], exact: true });
      setImportOpen(false);
      setImportQueue([]);
    } finally {
      setImporting(false);
    }
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
    const res = await apiFetch("/n8n-delete", {
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
    if (vectorDisabledReason) {
      toast.error(vectorDisabledReason);
      return;
    }
    setRunningChannel(channel);
    const channels: Array<"web" | "telegram_whatsapp"> =
      channel === "both" ? ["web", "telegram_whatsapp"] : [channel];
    const label =
      channel === "web"
        ? "Text Chat"
        : channel === "telegram_whatsapp"
          ? "Text Chat"
          : "Text Chat";


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
          const body: Record<string, unknown> = {
            channel: ch,
            question,
            table: activeTable,
            ...(extraProcessBody ?? {}),
          };
          const res = await apiFetch(processEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
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
            const name = "Text Chat";
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
      wb.views = [
        {
          x: 0,
          y: 0,
          width: 10000,
          height: 20000,
          firstSheet: 0,
          activeTab: 0,
          visibility: "visible",
        },
      ];
      const ws = wb.addWorksheet("RAG Evaluation Builder");

      ws.columns = QA_COLUMNS.map((c) => ({
        header: c.label,
        key: c.key as string,
        width: Math.max(14, Math.min(60, c.label.length + 20)),
      }));

      ws.getRow(1).font = { bold: true };
      ws.getRow(1).alignment = { vertical: "middle" };

      // Key rows the same way derivedFormats does: row.id when present,
      // else the row's index within filteredRows.
      const filteredIndexById = new Map<string | number, number>();
      filteredRows.forEach((r, i) => {
        const key = (r.id ?? r.question ?? i) as string | number;
        filteredIndexById.set(key, i);
      });

      const rowsToExport =
        selectedRowIds.size > 0
          ? filteredRows.filter((r) =>
              selectedRowIds.has(r.id ?? r.question ?? ""),
            )
          : filteredRows;

      rowsToExport.forEach((row) => {
        const rowValues: Record<string, unknown> = {};
        QA_COLUMNS.forEach((c) => {
          rowValues[c.key as string] = c.raw(row);
        });
        const addedRow = ws.addRow(rowValues);
        addedRow.alignment = { wrapText: true, vertical: "top" };

        const lookupKey =
          row.id ??
          filteredIndexById.get((row.question ?? "") as string) ??
          0;

        QA_COLUMNS.forEach((c, cIdx) => {
          const fmt = derivedFormats[formatKey(lookupKey, c.key as string)];
          if (!fmt) return;
          const cell = addedRow.getCell(cIdx + 1);
          if (fmt.highlight) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFEF08A" },
            };
          } else if (fmt.error) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFECACA" },
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
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const stamp = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${String(now.getFullYear()).slice(-2)}`;
      const rawTable = (activeTable || "all").replace(/^qatest-(dev-)?/, "");
      const tableTag = rawTable
        .replace(/-/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "_");
      a.href = url;
      const baseName = /_(faq|qna|rag)$/.test(tableTag) ? tableTag : `${tableTag}_faq`;
      a.download = `${baseName}_${stamp}.xlsx`;
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
    <div className="flex h-screen min-h-screen flex-col bg-background text-foreground">
      {/* ============================== AppBar ============================== */}
      <header
        className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 h-12"
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <SheetIcon className="h-4 w-4 text-primary" />
          </div>
          <h1 className="truncate text-[14px] font-semibold leading-tight">
            RAG Evaluation Workspace
          </h1>
        </div>


        {/* Right cluster — desktop */}
        <div className="ml-auto hidden md:flex items-center gap-1">

          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/80 hover:bg-muted"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-foreground/80 hover:bg-muted"
              >
                <UserPlus className="h-4 w-4" />
                <span>Account</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
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

        {/* Right cluster — mobile */}
        <div className="ml-auto md:hidden">
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
            <DropdownMenuContent align="end" className="w-56">

              <DropdownMenuItem onClick={toggleTheme}>
                {theme === "dark" ? (
                  <Sun className="mr-2 h-4 w-4" />
                ) : (
                  <Moon className="mr-2 h-4 w-4" />
                )}
                {theme === "dark" ? "Light mode" : "Dark mode"}
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
      </header>

      {/* ============================ WorkspaceBar ============================ */}
      <div
        className="shrink-0 border-b border-border bg-card"
      >
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          {/* Sheet context chip */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={activeTable || "Select a sheet"}
                className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-[13px] font-medium hover:bg-muted"
              >
                <SheetIcon className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate max-w-[7rem] sm:max-w-[12rem] lg:max-w-[14rem]">
                  {activeTable ? formatTableLabel(activeTable) : "No sheet"}
                </span>
                <span className="hidden sm:inline shrink-0 text-[11px] text-muted-foreground tabular-nums">
                  · {filteredRows.length}/{rows.length}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 max-h-[70vh] overflow-y-auto">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Sheets
              </div>
              {tables.map((t) => {
                const active = t === activeTable;
                return (
                  <div key={t} className="flex items-center gap-1 px-1 py-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (t === activeTable) return;
                        queryClient.removeQueries({ queryKey: ["qa-rows", t], exact: true });
                        setActiveTable(t);
                        setSelection(null);
                        setSelectedRowIds(new Set());
                      }}
                      className={
                        active
                          ? "flex flex-1 items-center gap-2 truncate rounded px-2 py-1.5 text-[13px] font-medium bg-muted"
                          : "flex flex-1 items-center gap-2 truncate rounded px-2 py-1.5 text-[13px] hover:bg-muted"
                      }
                      title={t}
                    >
                      <Check className={active ? "h-3.5 w-3.5 text-primary" : "h-3.5 w-3.5 opacity-0"} />
                      <span className="truncate">{formatTableLabel(t)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameValue(t.replace(/^qatest-(dev-)?/, ""));
                        setRenameOpen({ open: true, from: t });
                      }}
                      title="Rename sheet"
                      className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteSheetConfirm({ open: true, name: t });
                      }}
                      title="Delete sheet"
                      className="flex h-7 w-7 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setNewSheetOpen(true)}>
                <Plus className="mr-2 h-4 w-4 text-primary" />
                New sheet…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Vector store chip */}
          <div
            className={
              "flex h-9 min-w-0 items-center gap-1.5 rounded-md border px-2 text-[13px] " +
              (vectorId
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-destructive/40 bg-destructive/5")
            }
            title={vectorDisabledReason ?? "Selected vector store"}
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Vector
            </span>
            <Select value={vectorId} onValueChange={setVectorId}>
              <SelectTrigger className="h-7 min-w-[8rem] border-0 bg-transparent px-1 text-[13px] shadow-none focus:ring-0">
                <SelectValue
                  placeholder={vectorsQuery.isLoading ? "Loading…" : "Select store"}
                />
              </SelectTrigger>
              <SelectContent>
                {vectors.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    {vectorsQuery.data?.error ?? "No vector stores found."}
                  </div>
                ) : (
                  vectors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* System prompt chip */}
          <div
            className={
              "flex h-9 min-w-0 items-center gap-1.5 rounded-md border px-2 text-[13px] " +
              (systemPromptId
                ? "border-primary/40 bg-primary/10"
                : "border-border bg-muted/30")
            }
            title={
              promptsQuery.data?.error ??
              (selectedPrompt ? `Prompt: ${selectedPrompt.name}` : "Select a system prompt")
            }
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Prompt
            </span>
            <Select value={systemPromptId} onValueChange={setSystemPromptId}>
              <SelectTrigger className="h-7 min-w-[7rem] max-w-[9rem] sm:min-w-[9rem] sm:max-w-[14rem] border-0 bg-transparent px-1 text-[13px] shadow-none focus:ring-0">
                <SelectValue
                  placeholder={promptsQuery.isLoading ? "Loading…" : "Select prompt"}
                />
              </SelectTrigger>
              <SelectContent className="w-[22rem] max-w-[calc(100vw-2rem)]">
                {prompts.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    {promptsQuery.data?.error ?? "No system prompts found."}
                  </div>
                ) : (
                  <>
                    <div className="sticky top-0 z-10 border-b bg-popover px-2 py-1.5">
                      {promptUsers.length > 0 && (
                        <div className="mb-1.5 rounded-md border border-border/60 bg-muted/30 p-1.5">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              User
                            </span>
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setUserFilterOpen((v) => !v);
                              }}
                              className={
                                "ml-auto flex h-6 min-w-0 flex-1 items-center justify-between gap-1 rounded border px-1.5 text-[11px] " +
                                (promptUserId
                                  ? "border-primary/40 bg-primary/10 text-foreground"
                                  : "border-border bg-background text-muted-foreground hover:text-foreground")
                              }
                            >
                              <span className="truncate">
                                {selectedPromptUser ? selectedPromptUser.name : "All users"}
                              </span>
                              <ChevronDown
                                className={
                                  "h-3 w-3 shrink-0 opacity-60 transition-transform " +
                                  (userFilterOpen ? "rotate-180" : "")
                                }
                              />
                            </button>
                            {promptUserId && (
                              <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setPromptUserId("");
                                }}
                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label="Clear user filter"
                                title="Clear user filter"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          {userFilterOpen && (
                            <div className="mt-1.5">
                              <input
                                type="text"
                                value={promptUserSearch}
                                onChange={(e) => setPromptUserSearch(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                placeholder="Search users…"
                                className="h-6 w-full rounded border border-border bg-background px-2 text-[11px] outline-none focus:ring-1 focus:ring-primary"
                              />
                              <div className="mt-1 max-h-40 overflow-auto rounded border border-border/60 bg-background">
                                <button
                                  type="button"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setPromptUserId("");
                                    setUserFilterOpen(false);
                                  }}
                                  className={
                                    "flex w-full items-center justify-between rounded px-2 py-1 text-left text-[11px] hover:bg-muted " +
                                    (promptUserId === "" ? "bg-muted font-medium" : "")
                                  }
                                >
                                  <span>All users</span>
                                  {promptUserId === "" && (
                                    <Check className="h-3 w-3 text-primary" />
                                  )}
                                </button>
                                {filteredPromptUsers.length === 0 ? (
                                  <div className="px-2 py-2 text-[11px] text-muted-foreground">
                                    No users match.
                                  </div>
                                ) : (
                                  filteredPromptUsers.map((u) => (
                                    <button
                                      key={u.id}
                                      type="button"
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setPromptUserId(u.id);
                                        setUserFilterOpen(false);
                                      }}
                                      className={
                                        "flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-[11px] hover:bg-muted " +
                                        (promptUserId === u.id ? "bg-muted font-medium" : "")
                                      }
                                    >
                                      <span className="flex min-w-0 flex-col">
                                        <span className="truncate">{u.name}</span>
                                        {u.email && u.email !== u.name && (
                                          <span className="truncate text-[10px] text-muted-foreground">
                                            {u.email}
                                          </span>
                                        )}
                                      </span>
                                      {promptUserId === u.id && (
                                        <Check className="h-3 w-3 shrink-0 text-primary" />
                                      )}
                                    </button>
                                  ))
                                )}
                              </div>
                              <div className="mt-1 text-right text-[10px] text-muted-foreground">
                                {filteredPromptUsers.length} of {promptUsers.length}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <input
                        type="text"
                        value={promptSearch}
                        onChange={(e) => setPromptSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        placeholder="Search prompts…"
                        className="h-7 w-full rounded border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={promptShowAll}
                            onChange={(e) => setPromptShowAll(e.target.checked)}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="h-3 w-3 accent-primary"
                          />
                          Show all
                        </label>
                        <div className="text-[10px] text-muted-foreground">
                          {searchedPrompts.length} of {prompts.length}
                        </div>
                      </div>

                    </div>
                    <div className="max-h-[22rem] overflow-auto">
                      {filteredPrompts.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-muted-foreground">
                          No matches.
                        </div>
                      ) : (
                        filteredPrompts.map((p) => (
                          <div key={p.id} className="flex items-center gap-1 pr-1">
                            <SelectItem value={p.id} className="flex-1">
                              <div className="flex flex-col">
                                <span className="truncate">
                                  {p.name}
                                  {selectionHiddenByFilter && p.id === selectedPrompt?.id && (
                                    <span className="ml-1 text-[10px] text-muted-foreground">(hidden by filter)</span>
                                  )}
                                </span>
                                {p.model && (
                                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    {p.model}
                                  </span>
                                )}
                              </div>
                            </SelectItem>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setPreviewPromptId(p.id);
                                      setPromptPreviewOpen(true);
                                    }}
                                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                                    aria-label="View the full prompt"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">View the full prompt</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </SelectContent>
            </Select>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewPromptId(systemPromptId || null);
                      setPromptPreviewOpen(true);
                    }}
                    disabled={!selectedPrompt}
                    className="ml-0.5 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
                    aria-label="Preview system prompt"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Preview system prompt</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>




          <Dialog
            open={promptPreviewOpen}
            onOpenChange={(open) => {
              setPromptPreviewOpen(open);
              if (!open) setPreviewPromptId(null);
            }}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="truncate">
                  {previewPrompt?.name ?? "System prompt"}
                  {previewPrompt && selectedPrompt?.id === previewPrompt.id && (
                    <span className="ml-2 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-primary">
                      Selected
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="space-y-1">
                  {previewPrompt?.description && (
                    <div>{previewPrompt.description}</div>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {previewPrompt?.model && <span>Model: {previewPrompt.model}</span>}
                    {previewPrompt?.vector_store_id && (
                      <span>Vector: {previewPrompt.vector_store_id}</span>
                    )}
                    {previewPrompt?.updated_at && (
                      <span>Updated: {new Date(previewPrompt.updated_at).toLocaleString()}</span>
                    )}
                  </div>
                </DialogDescription>
              </DialogHeader>
              <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 font-mono text-xs">
                {previewPrompt?.system_prompt ?? ""}
              </pre>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPromptPreviewOpen(false);
                    setPreviewPromptId(null);
                  }}
                >
                  Close
                </Button>
                {previewPrompt && previewPrompt.id !== selectedPrompt?.id && (
                  <Button
                    onClick={() => {
                      setSystemPromptId(previewPrompt.id);
                      setPromptPreviewOpen(false);
                      setPreviewPromptId(null);
                    }}
                  >
                    Use this prompt
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>




          {/* Search */}
          <div className="flex h-9 min-w-0 flex-1 sm:flex-none items-center gap-1.5 rounded-md border border-border bg-background px-2 focus-within:ring-1 focus-within:ring-primary">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="h-7 w-full min-w-0 bg-transparent text-[13px] focus:outline-none sm:w-44"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[11px] text-muted-foreground hover:text-foreground"
                title="Clear search"
              >
                ✕
              </button>
            ) : null}
          </div>

          {/* Date filter */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Date filter"
                className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-[13px] hover:bg-muted"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {dateFrom || dateTo ? "Filtered" : "Dates"}
                </span>
                {(dateFrom || dateTo) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={6}
              className="z-[100] w-64 space-y-2 p-3"
            >
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-[13px] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-[13px] focus:outline-none"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="w-full rounded-md px-2 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted"
                >
                  Clear dates
                </button>
              )}
            </PopoverContent>
          </Popover>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || isFetching}
            title="Refresh"
            className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/80 hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw
              className={refreshing || isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
          </button>

          {/* Primary actions */}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
            <Dialog open={insertOpen} onOpenChange={setInsertOpen}>
              <button
                type="button"
                onClick={() => {
                  if (selectedRowIds.size > 0) {
                    if (runningChannel !== null || vectorDisabledReason) return;
                    setPendingChannel("web");
                  } else {
                    setInsertOpen(true);
                  }
                }}
                disabled={
                  selectedRowIds.size > 0 &&
                  (runningChannel !== null || !!vectorDisabledReason)
                }
                title={
                  selectedRowIds.size > 0
                    ? (vectorDisabledReason ?? "Run Text Chat agent on selected rows")
                    : "Paste new questions"
                }
                className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {selectedRowIds.size > 0 && runningChannel === "web" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : selectedRowIds.size > 0 ? (
                  <MessageSquare className="h-4 w-4" />
                ) : (
                  <ListPlus className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {selectedRowIds.size > 0
                    ? runningChannel === "web"
                      ? "Running…"
                      : `Run Questions (${selectedRowIds.size})`
                    : isDev
                      ? "Test Questions"
                      : "Run Questions"}
                </span>
                <span className="sm:hidden">Run</span>
              </button>
              <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {isDev ? "Test questions (Development)" : "Insert questions"}
                  </DialogTitle>
                  <DialogDescription>
                    Paste one question per line. Each row is added to the sheet,
                    then the agent fills in the empty answers.
                  </DialogDescription>
                </DialogHeader>
                <QuestionPasteBox
                  existingQuestions={existingQuestions}
                  table={activeTable}
                  processEndpoint={processEndpoint}
                  extraProcessBody={extraProcessBody}
                  disabledReason={vectorDisabledReason}
                  onComplete={async () => {
                    setInsertOpen(false);
                    setInserting(true);
                    try {
                      const result = await refetch();
                      if (result.error) throw result.error;
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "Failed to refresh table.",
                      );
                    } finally {
                      setInserting(false);
                    }
                  }}
                />
              </DialogContent>
            </Dialog>

            {!isDev && (
              <button
                type="button"
                onClick={() => setExcelImportOpen(true)}
                disabled={!activeTable}
                title="Import questions from Excel/CSV"
                className="hidden sm:flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[13px] font-medium hover:bg-muted disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span className="hidden lg:inline">Import</span>
              </button>
            )}
            {!isDev && (
              <button
                type="button"
                onClick={openExportDialog}
                disabled={exporting || exportingJson || exportingRag}
                title="Export selected rows"
                className="hidden sm:flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[13px] font-medium hover:bg-muted disabled:opacity-50"
              >
                {exportingJson || exportingRag || exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="hidden lg:inline">Export</span>
              </button>
            )}

            {selection?.mode === "cell" && (
              <TooltipProvider delayDuration={100}>
                <div className="order-last w-full sm:order-none sm:w-auto flex items-center justify-center gap-1 sm:border-l sm:border-border sm:pl-1.5 sm:ml-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => applyFormat({ highlight: true })}
                        className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/80 hover:bg-muted"
                        aria-label="Highlight cell"
                      >
                        <Highlighter className="h-4 w-4 text-yellow-500" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Highlight cell</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => applyFormat({ error: true })}
                        className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/80 hover:bg-muted"
                        aria-label="Mark error"
                      >
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Mark error</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => applyFormat(null)}
                        className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/80 hover:bg-muted"
                        aria-label="Clear formatting"
                      >
                        <Eraser className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Clear formatting</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="More actions"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/80 hover:bg-muted"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-[70vh] overflow-y-auto">
                <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Data
                </div>
                {!isDev && (
                  <DropdownMenuItem
                    className="sm:hidden"
                    onClick={openExportDialog}
                    disabled={exporting || exportingJson || exportingRag}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export…
                  </DropdownMenuItem>
                )}
                {!isDev && (
                  <DropdownMenuItem
                    className="sm:hidden"
                    onClick={() => setExcelImportOpen(true)}
                    disabled={!activeTable}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Import Excel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Sheet
                </div>
                <DropdownMenuItem onClick={() => setNewSheetOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New sheet…
                </DropdownMenuItem>
                {activeTable ? (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        setRenameValue(activeTable.replace(/^qatest-(dev-)?/, ""));
                        setRenameOpen({ open: true, from: activeTable });
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename current sheet
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() =>
                        setDeleteSheetConfirm({ open: true, name: activeTable })
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete current sheet
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Selection strip */}
        {selectedRowIds.size > 0 && (
          <div
            className={
              "flex flex-wrap items-center gap-2 border-t px-3 py-2 " +
              (isDev
                ? "border-amber-500/25 bg-amber-500/[0.08]"
                : "border-border/70 bg-primary/[0.06]")
            }
          >
            {/* Count chip */}
            <div className="flex items-center gap-2">
              <span
                className={
                  "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-semibold tabular-nums " +
                  (isDev
                    ? "bg-amber-500/25 text-amber-800 dark:text-amber-200"
                    : "bg-primary/15 text-primary")
                }
              >
                {selectedRowIds.size}
              </span>
              <span className="text-[12px] font-medium text-foreground">
                row{selectedRowIds.size === 1 ? "" : "s"} selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedRowIds(new Set())}
                className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Clear
              </button>
            </div>

            <div className="mx-1 h-5 w-px bg-border/60" />

            {/* Unselect all */}
            <button
              type="button"
              onClick={() => setSelectedRowIds(new Set())}
              className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[12px] font-medium text-foreground hover:bg-muted"
              title="Unselect all rows"
            >
              <X className="h-3.5 w-3.5" />
              Unselect all
            </button>

            {/* Destructive */}
            <button
              type="button"
              onClick={deleteSelectedRows}
              className="flex h-8 items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 text-[12px] font-medium text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>

            <div className="ml-auto text-[11px] text-muted-foreground tabular-nums">
              {isFetching ? "Syncing…" : `Synced ${lastUpdated}`}
            </div>
          </div>
        )}
      </div>


      {/* ============================ Formula bar ============================ */}
      <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card px-2 py-1">
        <div className="flex h-7 w-24 items-center justify-between rounded-sm border border-border bg-card px-2 text-[12px] text-foreground">
          {selection?.mode === "cell"
            ? cellRef(selection.col, selection.row)
            : selection?.mode === "col"
              ? `${QA_COLUMNS[selection.col]?.label ?? ""}`
              : selection?.mode === "row"
                ? `Row ${selection.row + 2}`
                : "A1"}
          <span className="text-[10px]">▾</span>
        </div>
        <span className="font-serif text-[14px] italic text-muted-foreground">fx</span>
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
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
          {isFetching ? "Syncing…" : `Synced ${lastUpdated}`}
        </span>
      </div>

      {/* Error banner */}
      {apiError ? (
        <div className="flex shrink-0 items-start gap-2 border-b border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="flex-1">{apiError}</div>
        </div>
      ) : null}


      {/* Grid */}
      <div className="flex-1 min-w-0 w-full overflow-x-auto overflow-y-auto">
        <QATable
          rows={filteredRows}
          isLoading={isLoading}
          selection={selection}
          onSelectionChange={setSelection}
          formats={derivedFormats}
          selectedRowIds={selectedRowIds}
          onToggleRow={toggleRow}
          onSelectAll={selectAllRows}
          onEditCell={handleEditCell}
          onCopyWebToAnswer={handleCopyWebToAnswer}
          copyingRowIds={copyingRowIds}
          confirmOverwriteRowId={confirmOverwriteRowId}
        />


      </div>


      {/* Excel import dialog */}
      <Dialog open={excelImportOpen} onOpenChange={setExcelImportOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import questions from Excel</DialogTitle>
            <DialogDescription>
              Upload an .xlsx, .xls, or .csv file. Pick the column that holds
              questions, then insert them into{" "}
              <span className="font-mono">
                {activeTable ? formatTableLabel(activeTable) : "the active sheet"}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <ExcelImportBox
            table={activeTable}
            existingQuestions={existingQuestions}
            onComplete={async () => {
              setExcelImportOpen(false);
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

      {/* Rename sheet dialog */}
      <Dialog
        open={renameOpen.open}
        onOpenChange={(o) => !renaming && setRenameOpen((s) => ({ ...s, open: o }))}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rename sheet</DialogTitle>
            <DialogDescription>
              Rename <span className="font-mono">{renameOpen.from}</span>. The{" "}
              <span className="font-mono">{isDev ? DEV_PREFIX : TABLE_PREFIX}</span> prefix is added automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              disabled={renaming}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !renaming) {
                  e.preventDefault();
                  void renameSheet();
                }
              }}
            />
            {renameValue.trim() && (
              <div className="text-[12px] text-muted-foreground">
                Will rename to:{" "}
                <span className="font-mono text-foreground">
                  {isDev ? DEV_PREFIX : TABLE_PREFIX}{renameValue.trim().toLowerCase().replace(/^qatest-(dev-)?/, "").replace(/\s+/g, "_")}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameOpen({ open: false, from: "" })}
              disabled={renaming}
            >
              Cancel
            </Button>
            <Button onClick={renameSheet} disabled={renaming} className="gap-2">
              {renaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              {renaming ? "Renaming…" : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete sheet dialog */}
      <Dialog
        open={deleteSheetConfirm.open}
        onOpenChange={(o) => !deletingSheet && setDeleteSheetConfirm((s) => ({ ...s, open: o }))}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete sheet?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete the{" "}
              <span className="font-mono">{deleteSheetConfirm.name}</span> table
              and all its rows. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteSheetConfirm({ open: false, name: "" })}
              disabled={deletingSheet}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteSheet} disabled={deletingSheet} className="gap-2">
              {deletingSheet ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deletingSheet ? "Deleting…" : "Delete sheet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full-screen overlay while rename/delete sheet runs */}
      {(renaming || deletingSheet) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-lg border border-[var(--sheets-grid)] bg-card px-8 py-6 shadow-lg">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <div className="text-[15px] font-medium text-foreground">
                {renaming ? "Renaming sheet…" : "Deleting sheet…"}
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground">
                Waiting for the workflow to confirm.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New sheet dialog */}
      <Dialog open={newSheetOpen} onOpenChange={(o) => !creatingSheet && setNewSheetOpen(o)}>
        <DialogContent className="w-[90vw] max-w-[400px] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New sheet</DialogTitle>
            <DialogDescription>
              Enter a table name. It will be lowercased, spaces become dashes,
              and a <span className="font-mono">{isDev ? DEV_PREFIX : TABLE_PREFIX}</span> prefix is added.
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
                Will create: <span className="font-mono text-foreground">{isDev ? DEV_PREFIX : TABLE_PREFIX}{newSheetName.trim().toLowerCase().replace(/^qatest-(dev-)?/, "").replace(/\s+/g, "_")}</span>
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

      {/* Export JSON preview dialog */}
      <Dialog
        open={exportPreview.open}
        onOpenChange={(o) => {
          if (!o) setExportPreview({ open: false, rows: [] });
        }}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Export ({exportPreview.rows.length} row{exportPreview.rows.length === 1 ? "" : "s"})</DialogTitle>
            <DialogDescription>
              Review the selected rows below, then pick an export format.
              <span className="mt-1 block text-[12px] text-muted-foreground">
                <strong>Raw data</strong> — download the sheet as-is (JSON or Excel) for backup or manual editing.<br />
                <strong>Production RAG</strong> — send the rows to the RAG builder webhook and download the enriched, retrieval-ready JSON.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto rounded-md border border-[var(--sheets-grid)] bg-muted/30 p-2 space-y-2">
            {exportPreview.rows.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No rows.</p>
            ) : (
              exportPreview.rows.map((r, i) => {
                const hasAnswer = r.expected_answer.trim().length > 0;
                return (
                  <div key={i} className="rounded border border-[var(--sheets-grid)] bg-background p-3 text-[13px]">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Question</div>
                    <div className="mt-0.5 font-medium text-foreground break-words">{r.question}</div>
                    <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Expected Answer</div>
                    {hasAnswer ? (
                      <div className="mt-0.5 whitespace-pre-wrap break-words text-foreground/90">{r.expected_answer}</div>
                    ) : (
                      <div className="mt-0.5 text-[12px] italic text-amber-600 dark:text-amber-400">(no expected answer — output may be blank)</div>
                    )}
                    {r.url ? (
                      <div className="mt-2 truncate text-[11px] text-muted-foreground" title={r.url}>{r.url}</div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
            <Button
              variant="ghost"
              onClick={() => setExportPreview({ open: false, rows: [] })}
              disabled={exportingJson || exportingRag || exporting}
            >
              Cancel
            </Button>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={confirmExportJson}
                disabled={exportPreview.rows.length === 0 || exportingJson || exportingRag || exporting}
                className="gap-2"
                title="Download the selected rows as raw JSON (id, question, expected answer, url)."
              >
                {exportingJson ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exportingJson ? "Sending…" : "Raw JSON"}
              </Button>
              <Button
                variant="outline"
                onClick={exportXlsx}
                disabled={exportPreview.rows.length === 0 || exportingJson || exportingRag || exporting}
                className="gap-2"
                title="Download the selected rows as an Excel workbook."
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                {exporting ? "Exporting…" : "Raw Excel"}
              </Button>
              <Button
                onClick={confirmExportRag}
                disabled={exportPreview.rows.length === 0 || exportingJson || exportingRag || exporting}
                className="gap-2"
                title="Send rows to the RAG builder and download a v2.0.0 dataset (bilingual, source-grounded, retrieval-tested)."
              >
                {exportingRag ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exportingRag ? "Building…" : "Production RAG"}
              </Button>
            </div>
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
              Re-run the Text Chat agent for {selectedRowIds.size} selected question
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


      {/* Import → opposite environment dialog */}
      <Dialog
        open={importOpen}
        onOpenChange={(o) => {
          if (!importing) setImportOpen(o);
        }}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Import {importQueue.length} question{importQueue.length === 1 ? "" : "s"} to{" "}
              {isDev ? "Production" : "Development"}
            </DialogTitle>
            <DialogDescription>
              Only the question text is copied. Answers, URLs and channels stay
              empty in the destination sheet and can be re-run there.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">
                Target sheet ({isDev ? "Production" : "Development"})
              </label>
              {oppositeTables.length === 0 ? (
                <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-[12px] text-yellow-900 dark:text-yellow-200">
                  No sheets exist in {isDev ? "Production" : "Development"} yet.
                  Create one there first, then try again.
                </div>
              ) : (
                <Select value={importTarget} onValueChange={setImportTarget}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select sheet…" />
                  </SelectTrigger>
                  <SelectContent>
                    {oppositeTables.map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatTableLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto rounded-md border border-[var(--sheets-grid)] bg-muted/30 p-2">
            {importQueue.length === 0 ? (
              <p className="p-2 text-[12px] text-muted-foreground">
                No questions in the queue.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {importQueue.map((q, i) => (
                  <li
                    key={`${i}-${q}`}
                    className="flex items-start gap-2 px-2 py-2 text-[13px]"
                  >
                    <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
                      {i + 1}
                    </span>
                    <span className="flex-1 line-clamp-2 break-words text-foreground">
                      {q}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setImportQueue((prev) =>
                          prev.filter((_, idx) => idx !== i),
                        )
                      }
                      disabled={importing}
                      title="Remove from import"
                      className="shrink-0 rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportOpen(false)}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              onClick={runImport}
              disabled={
                importing ||
                importQueue.length === 0 ||
                !importTarget ||
                oppositeTables.length === 0
              }
              className="gap-2"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {importing
                ? "Importing…"
                : `Import ${importQueue.length} question${importQueue.length === 1 ? "" : "s"}`}
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
                  await registerUserFn({ email, password: registerPassword });
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
              <MessageSquare className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-foreground">
                Running Text Chat agent…
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
