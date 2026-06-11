import { createFileRoute } from "@tanstack/react-router";

// Trigger the agent to process rows for a given channel.
const WEBHOOK_URLS = {
  web: "https://tuah.utem.edu.my/agent/webhook/dfa18ba2-f8f8-4257-a8fd-646b2c002d95",
  telegram_whatsapp:
    "https://tuah.utem.edu.my/agent/webhook/ad7bc9b8-0b89-4e4a-bdb5-89b83ecddc59",
} as const;

type Channel = keyof typeof WEBHOOK_URLS;

export const Route = createFileRoute("/api/n8n-process")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let channel: Channel = "web";
        let question = "";
        let table = "";
        try {
          const body = (await request.json()) as {
            channel?: string;
            question?: string;
            table?: string;
          };
          if (body.channel === "telegram_whatsapp" || body.channel === "web") {
            channel = body.channel;
          }
          if (typeof body.question === "string") {
            question = body.question.trim();
          }
          if (typeof body.table === "string") {
            table = body.table.trim();
          }
        } catch {
          // default to web, no question
        }
        const WEBHOOK_URL = WEBHOOK_URLS[channel];
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
