import { createFileRoute } from "@tanstack/react-router";

const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/911d5dbc-b215-4beb-8416-98098fa7d5d0";

export const Route = createFileRoute("/api/n8n-qa")({
  server: {
    handlers: {
      GET: async () => {
        const user = process.env.N8N_WEBHOOK_USER;
        const password = process.env.N8N_WEBHOOK_PASSWORD;

        if (!user || !password) {
          return Response.json(
            { data: [], error: "Webhook credentials are not configured." },
            { status: 200, headers: { "Cache-Control": "no-store" } },
          );
        }

        const auth = Buffer.from(`${user}:${password}`).toString("base64");

        try {
          const res = await fetch(WEBHOOK_URL, {
            method: "GET",
            headers: {
              Authorization: `Basic ${auth}`,
              Accept: "application/json",
            },
          });

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.error("n8n webhook error", res.status, text);
            return Response.json(
              {
                data: [],
                error: `Webhook returned ${res.status} ${res.statusText}`,
              },
              { status: 200, headers: { "Cache-Control": "no-store" } },
            );
          }

          const json = await res.json();
          const data = normalizeRows(json);

          return Response.json(
            { data, error: null },
            { status: 200, headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          console.error("n8n webhook fetch failed", error);
          return Response.json(
            {
              data: [],
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to reach webhook.",
            },
            { status: 200, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
