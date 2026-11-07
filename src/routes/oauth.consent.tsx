import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Check, ExternalLink, Loader2, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type ConsentDetails = {
  authorization_id: string;
  redirect_uri: string;
  client: {
    id: string;
    name: string;
    uri: string;
    logo_uri: string;
  };
  user: { id: string; email: string };
  scope: string;
};

export const Route = createFileRoute("/oauth/consent")({
  component: OAuthConsentPage,
});

function OAuthConsentPage() {
  const [details, setDetails] = useState<ConsentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approve" | "deny" | null>(null);
  const authorizationId = useMemo(
    () => new URLSearchParams(window.location.search).get("authorization_id")?.trim() ?? "",
    [],
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!authorizationId) {
        setError(
          "This authorization request is missing its identifier. Start the connection again.",
        );
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        const next = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/auth?next=${encodeURIComponent(next)}`);
        return;
      }

      const { data, error: requestError } =
        await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (requestError || !data) {
        setError(requestError?.message ?? "The authorization request could not be loaded.");
        return;
      }
      if (!("authorization_id" in data)) {
        window.location.assign(data.redirect_url);
        return;
      }
      setDetails(data);
    };

    void load();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const submitDecision = async (action: "approve" | "deny") => {
    if (!details || decision) return;
    setDecision(action);
    setError(null);
    const response =
      action === "approve"
        ? await supabase.auth.oauth.approveAuthorization(details.authorization_id, {
            skipBrowserRedirect: true,
          })
        : await supabase.auth.oauth.denyAuthorization(details.authorization_id, {
            skipBrowserRedirect: true,
          });

    if (response.error || !response.data?.redirect_url) {
      setDecision(null);
      setError(response.error?.message ?? "The authorization decision could not be saved.");
      return;
    }
    window.location.assign(response.data.redirect_url);
  };

  const scopes = details?.scope.split(/\s+/).filter(Boolean) ?? [];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-48 -right-40 h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-3xl" />
      </div>

      <section className="relative w-full max-w-lg rounded-2xl border border-border bg-card/95 p-6 shadow-2xl shadow-primary/10 backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Secure connection
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              Authorize TUAH RAG Studio
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Review the access request before connecting your Studio account.
            </p>
          </div>
        </div>

        {error ? (
          <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : !details ? (
          <div className="flex items-center justify-center gap-3 rounded-xl border border-border bg-muted/30 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Loading authorization request…
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">
                    {details.client.name || "MCP client"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Signed in as {details.user.email}
                  </p>
                </div>
                {details.client.uri ? (
                  <a
                    href={details.client.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Client details <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>

            <div className="my-5">
              <h2 className="text-sm font-medium text-foreground">This connection can</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Search verified UTeM TUAH RAG Studio knowledge sources.
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  List configured vector stores and knowledge tables.
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Read bounded knowledge rows. This version cannot modify or delete Studio data.
                </li>
              </ul>
              {scopes.length ? (
                <p className="mt-4 break-words text-xs text-muted-foreground">
                  Requested scopes: {scopes.join(", ")}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={Boolean(decision)}
                onClick={() => void submitDecision("deny")}
                className="gap-2"
              >
                {decision === "deny" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Deny
              </Button>
              <Button
                type="button"
                disabled={Boolean(decision)}
                onClick={() => void submitDecision("approve")}
                className="gap-2"
              >
                {decision === "approve" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Allow connection
              </Button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
