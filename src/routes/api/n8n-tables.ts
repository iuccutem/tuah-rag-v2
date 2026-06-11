import { createFileRoute } from "@tanstack/react-router";

const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/4340097e-3074-4ab4-b97c-feba47f87a55";

function normalizeTables(input: unknown): string[] {
  const out: string[] = [];
  const visit = (v: unknown) => {
    if (v == null) return;
    if (typeof v === "string") {
      const s = v.trim();
      if (s) out.push(s);
      return;
    }
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    if (typeof v === "object") {
      const obj = v as Record<string, unknown>;
      for (const key of ["name", "table", "table_name", "tablename"]) {
        if (typeof obj[key] === "string") {
          const s = (obj[key] as string).trim();
          if (s) out.push(s);
          return;
        }
      }
      for (const key of ["data", "tables", "results", "items", "rows"]) {
        if (key in obj) visit(obj[key]);
      }
    }
  };
  visit(input);
  // Dedupe, preserve order.
  return Array.from(new Set(out));
}

export const Route = createFileRoute("/api/n8n-tables")({
  server: {
    handlers: {
      GET: async () => {
        const user = process.env.N8N_WEBHOOK_USER;
        const password = process.env.N8N_WEBHOOK_PASSWORD;
        if (!user || !password) {
          return Response.json(
            { tables: [], error: "Webhook credentials are not configured." },
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
            return Response.json(
              {
                tables: [],
                error: `Webhook returned ${res.status} ${res.statusText}${
                  text ? `: ${text.slice(0, 200)}` : ""
                }`,
              },
              { status: 200, headers: { "Cache-Control": "no-store" } },
            );
          }
          const json = await res.json().catch(() => null);
          const tables = normalizeTables(json);
          return Response.json(
            { tables, error: null },
            { status: 200, headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          return Response.json(
            {
              tables: [],
              error:
                error instanceof Error ? error.message : "Failed to reach webhook.",
            },
            { status: 200, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
