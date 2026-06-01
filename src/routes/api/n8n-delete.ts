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

        let body: { ids?: Array<string | number>; questions?: string[] } = {};
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { ok: false, error: "Invalid JSON body." },
            { status: 400 },
          );
        }

        const ids = Array.isArray(body.ids) ? body.ids : [];
        const questions = Array.isArray(body.questions) ? body.questions : [];
        if (ids.length === 0 && questions.length === 0) {
          return Response.json(
            { ok: false, error: "Nothing to delete." },
            { status: 200 },
          );
        }

        const auth = Buffer.from(`${user}:${password}`).toString("base64");
        try {
          const res = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ ids, questions }),
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
