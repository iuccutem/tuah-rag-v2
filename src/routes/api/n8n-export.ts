import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_WEBHOOK =
  "https://tuah.utem.edu.my/agent/webhook/22f796c0-d27f-4e92-a914-a6dcde8a0c5f";

export const Route = createFileRoute("/api/n8n-export")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const target = process.env.N8N_EXPORT_WEBHOOK_URL || DEFAULT_WEBHOOK;
        const user = process.env.N8N_WEBHOOK_USER;
        const password = process.env.N8N_WEBHOOK_PASSWORD;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { error: "Invalid JSON body." },
            { status: 400 },
          );
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };
        if (user && password) {
          headers.Authorization = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
        }

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 120_000);
          const res = await fetch(target, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          const text = await res.text();
          if (!res.ok) {
            return Response.json(
              { error: `Webhook ${res.status}: ${text.slice(0, 500) || res.statusText}` },
              { status: 502 },
            );
          }

          let parsed: unknown;
          try {
            parsed = JSON.parse(text);
          } catch {
            return Response.json(
              { error: "Webhook did not return JSON." },
              { status: 502 },
            );
          }

          // Accept { rows: [...] } or a bare array
          let rows: unknown = null;
          if (Array.isArray(parsed)) rows = parsed;
          else if (
            parsed &&
            typeof parsed === "object" &&
            Array.isArray((parsed as { rows?: unknown }).rows)
          ) {
            rows = (parsed as { rows: unknown[] }).rows;
          }

          if (!Array.isArray(rows)) {
            return Response.json(
              { error: "Webhook response missing rows array." },
              { status: 502 },
            );
          }

          return Response.json({ rows });
        } catch (e) {
          return Response.json(
            {
              error:
                e instanceof Error ? e.message : "Failed to reach webhook.",
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
