import { createFileRoute } from "@tanstack/react-router";

// Insert a single question into the evaluation table.
const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/8757e607-cb93-4b34-8289-9114663381bb";

export const Route = createFileRoute("/api/n8n-run")({
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
          question?: string;
          table?: string;
          telegram_whatsapp?: string;
          url?: string;
        } = {};
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { ok: false, error: "Invalid JSON body." },
            { status: 400 },
          );
        }
        const question = (body.question ?? "").trim();
        const table = (body.table ?? "").trim();
        const expected = (body.telegram_whatsapp ?? "").trim();
        const url = (body.url ?? "").trim();
        if (!question) {
          return Response.json(
            { ok: false, error: "Question is empty." },
            { status: 200 },
          );
        }

        const auth = Buffer.from(`${user}:${password}`).toString("base64");
        try {
          const upstream: Record<string, unknown> = { question };
          if (table) upstream.table = table;
          if (expected) upstream.telegram_whatsapp = expected;
          if (url) upstream.url = url;
          const res = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(upstream),
          });

          const text = await res.text();
          let data: unknown = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch {
            data = text;
          }
          if (!res.ok) {
            return Response.json(
              { ok: false, error: `Webhook returned ${res.status}`, data },
              { status: 200 },
            );
          }
          return Response.json({ ok: true, data }, { status: 200 });
        } catch (error) {
          return Response.json(
            {
              ok: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to reach webhook.",
            },
            { status: 200 },
          );
        }
      },
    },
  },
});
