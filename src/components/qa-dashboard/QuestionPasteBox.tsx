import { useMemo, useState } from "react";
import { Play, CheckCircle2, XCircle, Loader2, AlertTriangle, Scissors } from "lucide-react";
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
  onDeleteDuplicates,
}: {
  onComplete?: () => void;
  existingQuestions?: string[];
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

  const runAll = async () => {
    if (questions.length === 0) {
      toast.error("Paste at least one question.");
      return;
    }
    if (newOnes.length === 0) {
      toast.error("All pasted questions already exist. Delete them first to re-insert.");
      return;
    }
    setRunning(true);
    // Duplicates are ALWAYS skipped — never sent to the insert webhook.
    const initial: RunItem[] = questions.map((q) => ({
      question: q,
      status: existingSet.has(q.toLowerCase()) ? "skipped" : "pending",
    }));
    setItems(initial);

    let okCount = 0;
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      if (existingSet.has(question.toLowerCase())) continue;
      try {
        const res = await fetch("/api/n8n-run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        });
        const json = (await res.json()) as { ok: boolean; error?: string };
        if (json.ok) okCount++;
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
      return;
    }

    toast.success(
      `Inserted ${okCount}/${newOnes.length} new question${newOnes.length === 1 ? "" : "s"}${
        duplicates.length > 0 ? ` · ${duplicates.length} duplicate skipped` : ""
      }. Processing…`,
    );

    setProcessing(true);
    try {
      const res = await fetch("/api/n8n-process", { method: "POST" });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) toast.success("Processing pipeline triggered.");
      else toast.error(json.error ?? "Failed to trigger processing.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to trigger processing.");
    } finally {
      setProcessing(false);
      onComplete?.();
    }
  };


  const deleteDuplicates = async () => {
    if (duplicates.length === 0 || !onDeleteDuplicates) return;
    setDeleting(true);
    try {
      await onDeleteDuplicates(duplicates);
    } finally {
      setDeleting(false);
    }
  };

  const busy = running || processing || deleting;

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
                  To re-insert these, delete them from the sheet first.
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={deleteDuplicates}
                    disabled={busy || !onDeleteDuplicates}
                    className="gap-1.5"
                  >
                    {deleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete duplicates from sheet
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
          <Button
            onClick={runAll}
            disabled={busy || newOnes.length === 0}
            className="gap-2"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {running
              ? "Inserting…"
              : processing
                ? "Processing…"
                : "Run Questions"}
          </Button>
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
