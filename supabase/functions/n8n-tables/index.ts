import { corsHeaders, json } from "../_shared/cors.ts";
import { basicAuthHeader } from "../_shared/n8n-jwt.ts";

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
    if (Array.isArray(v)) { v.forEach(visit); return; }
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
  return Array.from(new Set(out));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = basicAuthHeader();
  if (!auth) return json({ tables: [], error: "Webhook credentials are not configured." });
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "GET",
      headers: { Authorization: auth, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return json({
        tables: [],
        error: `Webhook returned ${res.status} ${res.statusText}${text ? `: ${text.slice(0, 200)}` : ""}`,
      });
    }
    const j = await res.json().catch(() => null);
    return json({ tables: normalizeTables(j), error: null });
  } catch (e) {
    return json({
      tables: [],
      error: e instanceof Error ? e.message : "Failed to reach webhook.",
    });
  }
});
