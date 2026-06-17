import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, Loader2, AlertTriangle, Scissors, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

type RunStatus = "pending" | "ok" | "error" | "skipped";
type RunItem = { question: string; status: RunStatus; error?: string };

export function QuestionPasteBox({
  onComplete,
  existingQuestions = [],
  table,
}: {
  onComplete?: () => void;
  existingQuestions?: string[];
  table?: string;
  /** @deprecated kept for compatibility */
  onDeleteDuplicates?: (questions: string[]) => Promise<void> | void;
}) {

  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [items, setItems] = useState<RunItem[]>([]);

  const existingSet = useMemo(
    () => new Set(existingQuestions.map((q) => q.trim().toLowerCase())),
    [existingQuestions],
  );

  const questions = useMemo(
    () =>
      text
        .split(/\r?\n/)
        .map((q) => q.trim())
        .filter((q) => q.length > 0),
    [text],
  );

  const duplicates = useMemo(
    () => questions.filter((q) => existingSet.has(q.toLowerCase())),
    [questions, existingSet],
  );
  const newOnes = useMemo(
    () => questions.filter((q) => !existingSet.has(q.toLowerCase())),
    [questions, existingSet],
  );

  const [activeChannel, setActiveChannel] = useState<"web" | "telegram_whatsapp" | "both" | null>(null);

  const runAll = async (channel: "web" | "telegram_whatsapp" | "both") => {
    if (questions.length === 0) {
      toast.error("Paste at least one question.");
      return;
    }
    if (newOnes.length === 0) {
      toast.error("All pasted questions already exist. Delete them first to re-insert.");
      return;
    }
    setRunning(true);
    setActiveChannel(channel);
    // Duplicates are ALWAYS skipped — never sent to the insert webhook.
    const initial: RunItem[] = questions.map((q) => ({
      question: q,
      status: existingSet.has(q.toLowerCase()) ? "skipped" : "pending",
    }));
    setItems(initial);

    let okCount = 0;
    const insertedQuestions: string[] = [];
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      if (existingSet.has(question.toLowerCase())) continue;
      try {
        const res = await fetch("/api/n8n-run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(table ? { question, table } : { question }),
        });

        const json = (await res.json()) as { ok: boolean; error?: string };
        if (json.ok) {
          okCount++;
          insertedQuestions.push(question);
        }
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? { ...it, status: json.ok ? "ok" : "error", error: json.error }
              : it,
          ),
        );
      } catch (error) {
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: "error",
                  error: error instanceof Error ? error.message : "Request failed",
                }
              : it,
          ),
        );
      }
    }
    setRunning(false);

    if (okCount === 0) {
      toast.error("No questions inserted. Skipping processing.");
      setActiveChannel(null);
      return;
    }

    toast.success(
      `Inserted ${okCount}/${newOnes.length} new question${newOnes.length === 1 ? "" : "s"}${
        duplicates.length > 0 ? ` · ${duplicates.length} duplicate skipped` : ""
      }. Processing…`,
    );

    setProcessing(true);
    const channels: Array<"web" | "telegram_whatsapp"> =
      channel === "both" ? ["web", "telegram_whatsapp"] : [channel];
    // Only forward questions that were successfully inserted.
    try {
      const results: Array<{ ch: "web" | "telegram_whatsapp"; question: string; ok: boolean; error?: string }> = [];
      // Send each question one-by-one to each selected channel webhook.
      for (const ch of channels) {
        for (const question of insertedQuestions) {
          const res = await fetch("/api/n8n-process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(table ? { channel: ch, question, table } : { channel: ch, question }),
          });

          const json = (await res.json()) as { ok: boolean; error?: string };
          results.push({ ch, question, ok: json.ok, error: json.error });
        }
      }
      const grouped = new Map<string, { ok: number; fail: number }>();
      for (const r of results) {
        const name = r.ch === "web" ? "Web Chat" : "Telegram/WhatsApp";
        const g = grouped.get(name) ?? { ok: 0, fail: 0 };
        if (r.ok) g.ok++;
        else g.fail++;
        grouped.set(name, g);
        if (!r.ok) {
          toast.error(`${name} · "${r.question.slice(0, 40)}": ${r.error ?? "Failed."}`);
        }
      }
      for (const [name, g] of grouped) {
        if (g.ok > 0) toast.success(`${name}: processed ${g.ok}/${g.ok + g.fail} question${g.ok + g.fail === 1 ? "" : "s"}.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to trigger processing.");
    } finally {
      setProcessing(false);
      setActiveChannel(null);
      onComplete?.();
    }
  };


  const removeDuplicatesFromText = () => {
    if (duplicates.length === 0) return;
    const lines = text.split(/\r?\n/);
    const kept = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true; // preserve blank lines
      return !existingSet.has(trimmed.toLowerCase());
    });
    setText(kept.join("\n"));
    toast.success(
      `Removed ${duplicates.length} duplicate line${duplicates.length === 1 ? "" : "s"} from the list.`,
    );
  };

  const busy = running || processing;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Run Questions</CardTitle>
        <CardDescription>
          Paste one question per line. Each is inserted into the evaluation
          table, then the agent processes any rows with empty answers. Empty
          lines are ignored.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {processing ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-md border bg-muted/30 p-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="space-y-1">
              <div className="text-base font-medium">Processing answers…</div>
              <div className="text-sm text-muted-foreground">
                Inserted {items.filter((i) => i.status === "ok").length} question
                {items.filter((i) => i.status === "ok").length === 1 ? "" : "s"}. The agent is
                generating answers — this can take a moment.
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {(activeChannel === "web" || activeChannel === "both") && (
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs">
                  <Globe className="h-3.5 w-3.5" /> Web Chat
                </span>
              )}
              {(activeChannel === "telegram_whatsapp" || activeChannel === "both") && (
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs">
                  <MessageSquare className="h-3.5 w-3.5" /> Telegram / WhatsApp
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">Please wait — do not close this dialog.</div>
          </div>
        ) : (
        <>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"apakah beza ftke dan ftkek?\nbila pendaftaran sem baru?"}
          rows={6}
          className="font-mono text-sm leading-relaxed bg-muted/30"
          disabled={busy}
        />

        {duplicates.length > 0 ? (
          <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
              <div className="flex-1 space-y-2">
                <div className="font-medium text-yellow-900 dark:text-yellow-200">
                  {duplicates.length} duplicate question
                  {duplicates.length === 1 ? "" : "s"} already in the table —
                  will NOT be inserted
                </div>
                <ul className="list-disc space-y-0.5 pl-4 text-xs text-yellow-900/80 dark:text-yellow-200/80">
                  {duplicates.slice(0, 5).map((q, i) => (
                    <li key={i} className="break-words">{q}</li>
                  ))}
                  {duplicates.length > 5 ? (
                    <li>…and {duplicates.length - 5} more</li>
                  ) : null}
                </ul>
                <div className="text-xs text-yellow-900/80 dark:text-yellow-200/80">
                  Remove them from the list below, or delete the existing rows
                  from the sheet (only if they have no answers yet) before
                  re-inserting.
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={removeDuplicatesFromText}
                    disabled={busy}
                    className="gap-1.5"
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    Remove duplicates from list
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {questions.length} question{questions.length === 1 ? "" : "s"} ready
            {duplicates.length > 0
              ? ` · ${newOnes.length} new · ${duplicates.length} duplicate${duplicates.length === 1 ? "" : "s"} skipped`
              : ""}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => runAll("telegram_whatsapp")}
              disabled={busy || newOnes.length === 0}
              variant="outline"
              className="gap-2"
            >
              {busy && activeChannel === "telegram_whatsapp" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              {activeChannel === "telegram_whatsapp"
                ? running
                  ? "Inserting…"
                  : processing
                    ? "Processing…"
                    : "Telegram / WhatsApp"
                : "Telegram / WhatsApp"}
            </Button>
            <Button
              onClick={() => runAll("web")}
              disabled={busy || newOnes.length === 0}
              className="gap-2"
            >
              {busy && activeChannel === "web" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              {activeChannel === "web"
                ? running
                  ? "Inserting…"
                  : processing
                    ? "Processing…"
                    : "Web Chat"
                : "Web Chat"}
            </Button>
            <Button
              onClick={() => runAll("both")}
              disabled={busy || newOnes.length === 0}
              variant="secondary"
              className="gap-2"
              title="Insert questions, then trigger BOTH Web Chat and Telegram/WhatsApp"
            >
              {busy && activeChannel === "both" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Layers className="h-4 w-4" />
              )}
              {activeChannel === "both"
                ? running
                  ? "Inserting…"
                  : processing
                    ? "Processing both…"
                    : "Run Both"
                : "Run Both"}
            </Button>
          </div>
        </div>

        {items.length > 0 ? (
          <ul className="divide-y rounded-md border bg-card">
            {items.map((it, i) => (
              <li key={i} className="flex items-start gap-3 p-3 text-sm">
                <StatusIcon status={it.status} />
                <div className="flex-1 min-w-0">
                  <div className="break-words">{it.question}</div>
                  {it.error ? (
                    <div className="mt-1 text-xs text-destructive">{it.error}</div>
                  ) : null}
                  {it.status === "skipped" ? (
                    <div className="mt-1 text-xs text-yellow-600">Skipped (duplicate)</div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        </>
        )}
      </CardContent>
    </Card>
  );
}

function StatusIcon({ status }: { status: RunStatus }) {
  if (status === "pending")
    return (
      <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
    );
  if (status === "ok")
    return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />;
  if (status === "skipped")
    return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />;
  return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />;
}
