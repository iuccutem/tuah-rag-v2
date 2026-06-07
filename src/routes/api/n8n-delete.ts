import { createFileRoute } from "@tanstack/react-router";

const WEBHOOK_URLS = [
  "https://tuah.utem.edu.my/agent/webhook/498f1285-dd47-489f-bf00-17487742d2c6",
  "https://tuah.utem.edu.my/agent/webhook/911d5dbc-b215-4beb-8416-98098fa7d5d0",
];

export const Route = createFileRoute("/api/n8n-delete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = process.env.N8N_WEBHOOK_USER;
        const password = process.env.N8N_WEBHOOK_PASSWORD;
        if (!user || !password) {
          return Response.json(
            { ok: false, error: "Webhook credentials are not configured." },
            { status: 200 },
          );
        }

        let body: {
          questions?: string[];
          items?: Array<{ id?: string | number | null; question?: string }>;
        } = {};
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { ok: false, error: "Invalid JSON body." },
            { status: 400 },
          );
        }

        let items: Array<{ id: string | number | null; question: string }> = [];
        if (Array.isArray(body.items)) {
          items = body.items.map((i) => ({
            id: i?.id ?? null,
            question: (i?.question ?? "").trim() || "null",
          }));
        } else if (Array.isArray(body.questions)) {
          items = body.questions.map((q) => ({
            id: null,
            question: String(q).trim() || "null",
          }));
        }

        if (items.length === 0) {
          return Response.json(
            { ok: false, error: "No questions to delete." },
            { status: 200 },
          );
        }

        const auth = Buffer.from(`${user}:${password}`).toString("base64");
        const results: Array<{
          id: string | number | null;
          question: string;
          ok: boolean;
          error?: string;
          message?: string;
        }> = [];

        for (const { id, question } of items) {
          let okAll = true;
          let lastError: string | undefined;
          let lastMessage = "";
          for (const url of WEBHOOK_URLS) {
            try {
              const res = await fetch(url, {
                method: "POST",
                headers: {
                  Authorization: `Basic ${auth}`,
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({ id, question }),
              });
              lastMessage = await res.text();
              if (!res.ok) {
                okAll = false;
                lastError = `Webhook returned ${res.status}`;
                break;
              }
            } catch (error) {
              okAll = false;
              lastError =
                error instanceof Error ? error.message : "Failed to reach webhook.";
              break;
            }
          }

          const SUCCESS_MESSAGE = "Delete the auto-test delete workflow successfully.";
          const messageOk = lastMessage.includes(SUCCESS_MESSAGE);
          if (okAll && !messageOk) {
            okAll = false;
            lastError = `Unexpected webhook response: ${lastMessage.slice(0, 200) || "(empty)"}`;
          }

          results.push(
            okAll
              ? { id, question, ok: true, message: lastMessage }
              : { id, question, ok: false, error: lastError, message: lastMessage },
          );
        }

        const okCount = results.filter((r) => r.ok).length;
        return Response.json(
          {
            ok: okCount > 0,
            deleted: okCount,
            total: items.length,
            results,
            error:
              okCount === 0
                ? results[0]?.error ?? "All delete requests failed."
                : undefined,
          },
          { status: 200 },
        );
      },
    },
  },
});
