import { createFileRoute } from "@tanstack/react-router";

const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/498f1285-dd47-489f-bf00-17487742d2c6";

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
          items = body.items
            .map((i) => ({
              id: i?.id ?? null,
              question: String(i?.question ?? "").trim(),
            }))
            .filter((i) => i.question);
        } else if (Array.isArray(body.questions)) {
          items = body.questions
            .map((q) => ({ id: null, question: String(q).trim() }))
            .filter((i) => i.question);
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
        }> = [];

        for (const { id, question } of items) {
          try {
            const res = await fetch(WEBHOOK_URL, {
              method: "POST",
              headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({ id, question }),
            });
            if (!res.ok) {
              results.push({
                id,
                question,
                ok: false,
                error: `Webhook returned ${res.status}`,
              });
            } else {
              results.push({ id, question, ok: true });
            }
          } catch (error) {
            results.push({
              id,
              question,
              ok: false,
              error:
                error instanceof Error ? error.message : "Failed to reach webhook.",
            });
          }
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
