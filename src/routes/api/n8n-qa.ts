import { createFileRoute } from "@tanstack/react-router";

const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/911d5dbc-b215-4beb-8416-98098fa7d5d0";

type Row = Record<string, unknown>;

function isRowLike(v: unknown): v is Row {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const r = v as Row;
  // Looks like a Q&A row if it has any of these keys
  return (
    "question" in r ||
    "web" in r ||
    "telegram_whatsapp" in r ||
    "id" in r ||
    "createdAt" in r ||
    "updatedAt" in r
  );
}

function normalizeRows(input: unknown): Row[] {
  if (input == null) return [];
  if (Array.isArray(input)) {
    return input.flatMap((item) => normalizeRows(item));
  }
  if (typeof input === "object") {
    const obj = input as Row;
    if (isRowLike(obj)) {
      // Ensure synthetic id if missing so the table can key rows
      if (obj.id == null) obj.id = crypto.randomUUID();
      return [obj];
    }
    // Common wrappers: { data: ... }, { records: ... }, { result: ... }, { results: ... }, { items: ... }
    for (const key of ["data", "records", "result", "results", "items", "rows"]) {
      if (key in obj) {
        const nested = normalizeRows((obj as Row)[key]);
        if (nested.length) return nested;
      }
    }
  }
  return [];
}

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
