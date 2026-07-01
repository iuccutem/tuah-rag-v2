import { createFileRoute } from "@tanstack/react-router";

// Development pipeline: forward question + vector_id to the dev agent webhook.
const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/ad7bc9b8-0b89-4e4a-bdb5-89b83ecddc59";

export const Route = createFileRoute("/api/n8n-dev-process")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let question = "";
        let table = "";
        let vectorId = "";
        try {
          const body = (await request.json()) as {
            question?: string;
            table?: string;
            vector_id?: string;
            vectorId?: string;
          };
          if (typeof body.question === "string") question = body.question.trim();
          if (typeof body.table === "string") table = body.table.trim();
          const vid = body.vector_id ?? body.vectorId;
          if (typeof vid === "string") vectorId = vid.trim();
        } catch {
          // fall through
        }

        const user = process.env.N8N_WEBHOOK_USER;
        const password = process.env.N8N_WEBHOOK_PASSWORD;
        if (!user || !password) {
          return Response.json(
            { ok: false, error: "Webhook credentials are not configured." },
            { status: 200 },
          );
        }

        const auth = Buffer.from(`${user}:${password}`).toString("base64");
        try {
          const upstream: Record<string, unknown> = {};
          if (question) upstream.question = question;
          if (table) upstream.table = table;
          if (vectorId) upstream.vector_id = vectorId;
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
