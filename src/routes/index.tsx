import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw, AlertCircle, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { QATable, type QARow } from "@/components/qa-dashboard/QATable";
import { QuestionPasteBox } from "@/components/qa-dashboard/QuestionPasteBox";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Q&A Evaluation Dashboard" },
      {
        name: "description",
        content:
          "University staff dashboard for monitoring Q&A testing results across web and messaging channels.",
      },
      { property: "og:title", content: "Q&A Evaluation Dashboard" },
      {
        property: "og:description",
        content:
          "University staff dashboard for monitoring Q&A testing results.",
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

  const rows = data?.data ?? [];
  const apiError =
    data?.error ?? (error instanceof Error ? error.message : null);

  const lastUpdated =
    dataUpdatedAt > 0
      ? new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
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
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Q&amp;A Evaluation Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              University staff evaluation results, fetched live from the
              testing pipeline.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right text-xs text-muted-foreground">
              <div>Last updated</div>
              <div className="font-medium text-foreground tabular-nums">
                {lastUpdated}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={openEmailDialog}
              disabled={sendingEmail}
              className="gap-2"
            >
              <Mail className={sendingEmail ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
              Send Email
            </Button>
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw
                className={
                  isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"
                }
              />
              {isFetching ? "Refreshing…" : "Refresh Data"}
            </Button>
          </div>
        </header>

        <div className="space-y-6">
          <QuestionPasteBox onComplete={() => refetch()} />

          <Card>
            <CardHeader>
              <CardTitle>Evaluation records</CardTitle>
              <CardDescription>
                {rows.length}{" "}
                {rows.length === 1 ? "record" : "records"} returned from the
                webhook.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {apiError ? (
                <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-medium">Could not load data</div>
                    <div className="mt-1 text-destructive/90">{apiError}</div>
                  </div>
                </div>
              ) : null}

              <QATable rows={rows} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
