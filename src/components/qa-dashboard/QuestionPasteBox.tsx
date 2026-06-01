import { useMemo, useState } from "react";
import { Play, CheckCircle2, XCircle, Loader2 } from "lucide-react";
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

type RunStatus = "pending" | "ok" | "error";
type RunItem = { question: string; status: RunStatus; error?: string };

export function QuestionPasteBox({ onComplete }: { onComplete?: () => void }) {
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [items, setItems] = useState<RunItem[]>([]);

  const questions = useMemo(
    () =>
      text
        .split(/\r?\n/)
        .map((q) => q.trim())
        .filter((q) => q.length > 0),
    [text],
  );

  const runAll = async () => {
    if (questions.length === 0) {
      toast.error("Paste at least one question.");
      return;
    }
    setRunning(true);
    const initial: RunItem[] = questions.map((q) => ({
      question: q,
      status: "pending",
    }));
    setItems(initial);

    let okCount = 0;
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
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
              ? {
                  ...it,
                  status: json.ok ? "ok" : "error",
                  error: json.error,
                }
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
                  error:
                    error instanceof Error ? error.message : "Request failed",
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
      `Inserted ${okCount}/${questions.length} question${
        questions.length === 1 ? "" : "s"
      }. Processing…`,
    );

    setProcessing(true);
    try {
      const res = await fetch("/api/n8n-process", { method: "POST" });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        toast.success("Processing pipeline triggered.");
      } else {
        toast.error(json.error ?? "Failed to trigger processing.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to trigger processing.");
    } finally {
      setProcessing(false);
      onComplete?.();
    }
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
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"apakah beza ftke dan ftkek?\nbila pendaftaran sem baru?"}
          rows={6}
          className="font-mono text-sm leading-relaxed bg-muted/30"
          disabled={busy}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {questions.length} question{questions.length === 1 ? "" : "s"}{" "}
            ready
          </span>
          <Button onClick={runAll} disabled={busy} className="gap-2">
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
              <li
                key={i}
                className="flex items-start gap-3 p-3 text-sm"
              >
                <StatusIcon status={it.status} />
                <div className="flex-1 min-w-0">
                  <div className="break-words">{it.question}</div>
                  {it.error ? (
                    <div className="mt-1 text-xs text-destructive">
                      {it.error}
                    </div>
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
  return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />;
}
