import { createFileRoute } from "@tanstack/react-router";

const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/f87381b1-9fac-403e-b238-2c5420aa3af5";

export const Route = createFileRoute("/api/n8n-create-table")({
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

        let body: { name?: string } = {};
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { ok: false, error: "Invalid JSON body." },
            { status: 400 },
          );
        }
        const name = (body.name ?? "").trim();
        if (!name) {
          return Response.json(
            { ok: false, error: "Table name is required." },
            { status: 400 },
          );
        }
        if (name.length > 80 || !/^[A-Za-z0-9_-]+$/.test(name)) {
          return Response.json(
            { ok: false, error: "Invalid table name." },
            { status: 400 },
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
            body: JSON.stringify({ name }),
          });
          const text = await res.text();
          if (!res.ok) {
            return Response.json(
              {
                ok: false,
                error: `Webhook ${res.status}: ${text.slice(0, 200) || res.statusText}`,
              },
              { status: 200 },
            );
          }
          return Response.json({ ok: true, data: text }, { status: 200 });
        } catch (e) {
          return Response.json(
            {
              ok: false,
              error: e instanceof Error ? e.message : "Failed to reach webhook.",
            },
            { status: 200 },
          );
        }
      },
    },
  },
});
