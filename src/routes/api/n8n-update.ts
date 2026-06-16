import { createFileRoute } from "@tanstack/react-router";

const WEBHOOK_QUESTION =
  "https://tuah.utem.edu.my/agent/webhook/9f887e4b-b49f-4f98-b4a3-b545206bffa4";
const WEBHOOK_URL_FIELD =
  "https://tuah.utem.edu.my/agent/webhook/18285d76-b8dd-42df-92d2-f3069f2e51db";

export const Route = createFileRoute("/api/n8n-update")({
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
          table?: string;
          field?: "question" | "url";
          value?: string | null;
        };
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { ok: false, error: "Invalid JSON body." },
            { status: 400 },
          );
        }

        if (body?.id == null || body.id === "") {
          return Response.json(
            { ok: false, error: "Missing row id." },
            { status: 400 },
          );
        }
        if (body.field !== "question" && body.field !== "url") {
          return Response.json(
            { ok: false, error: "Invalid field." },
            { status: 400 },
          );
        }

        const target =
          body.field === "question" ? WEBHOOK_QUESTION : WEBHOOK_URL_FIELD;

        const payload: Record<string, unknown> = {
          id: body.id,
          [body.field]: typeof body.value === "string" ? body.value : "",
        };
        if (typeof body.table === "string" && body.table.trim()) {
          payload.table = body.table.trim();
        }

        const auth = Buffer.from(`${user}:${password}`).toString("base64");
        try {
          const res = await fetch(target, {
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
              {
                ok: false,
                error: `Webhook ${res.status}: ${text || res.statusText}`,
              },
              { status: 200 },
            );
          }
          return Response.json({ ok: true });
        } catch (e) {
          return Response.json(
            {
              ok: false,
              error:
                e instanceof Error ? e.message : "Failed to reach webhook.",
            },
            { status: 200 },
          );
        }
      },
    },
  },
});
