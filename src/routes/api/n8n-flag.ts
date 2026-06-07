import { createFileRoute } from "@tanstack/react-router";

const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/adf82095-c24f-4a8f-9e10-fca39d0452ff";

const ALLOWED_COLUMNS = new Set([
  "telegram_whatsapp_error",
  "web_error",
  "telegram_whatsapp_highlight",
  "web_highlight",
]);

export const Route = createFileRoute("/api/n8n-flag")({
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
          id?: string | number | null;
          column?: string;
          value?: boolean;
          telegram_whatsapp_error?: boolean;
          web_error?: boolean;
          telegram_whatsapp_highlight?: boolean;
          web_highlight?: boolean;
        };
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
        }

        const { id, column, value } = body ?? {};
        if (id == null || id === "") {
          return Response.json({ ok: false, error: "Missing row id." }, { status: 400 });
        }
        if (!column || !ALLOWED_COLUMNS.has(column)) {
          return Response.json({ ok: false, error: "Invalid column." }, { status: 400 });
        }
        if (typeof value !== "boolean") {
          return Response.json({ ok: false, error: "Value must be boolean." }, { status: 400 });
        }

        const payload = {
          id,
          column,
          value,
          telegram_whatsapp_error: body.telegram_whatsapp_error === true,
          web_error: body.web_error === true,
          telegram_whatsapp_highlight: body.telegram_whatsapp_highlight === true,
          web_highlight: body.web_highlight === true,
        };

        const auth = Buffer.from(`${user}:${password}`).toString("base64");
        try {
          const res = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            return Response.json(
              { ok: false, error: `Webhook ${res.status}: ${text || res.statusText}` },
              { status: 200 },
            );
          }
          return Response.json({ ok: true });
        } catch (e) {
          return Response.json(
            { ok: false, error: e instanceof Error ? e.message : "Failed to reach webhook." },
            { status: 200 },
          );
        }
      },
    },
  },
});
