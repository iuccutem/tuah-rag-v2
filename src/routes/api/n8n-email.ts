import { createFileRoute } from "@tanstack/react-router";

const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/8c131be7-21e7-4049-9dbb-4210b4ba5a79";

export const Route = createFileRoute("/api/n8n-email")({
  server: {
    handlers: {
      POST: async () => {
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
          const res = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({}),
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
