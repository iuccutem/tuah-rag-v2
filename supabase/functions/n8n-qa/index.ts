import { corsHeaders, json } from "../_shared/cors.ts";
import { basicAuthHeader } from "../_shared/n8n-jwt.ts";

const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/911d5dbc-b215-4beb-8416-98098fa7d5d0";

type Row = Record<string, unknown>;

function isRowLike(v: unknown): v is Row {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const r = v as Row;
  return "question" in r || "web" in r || "telegram_whatsapp" in r ||
    "id" in r || "createdAt" in r || "updatedAt" in r;
}

function normalizeRows(input: unknown): Row[] {
  if (input == null) return [];
  if (Array.isArray(input)) return input.flatMap((i) => normalizeRows(i));
  if (typeof input === "object") {
    const obj = input as Row;
    if (isRowLike(obj)) {
      if (obj.id == null) obj.id = crypto.randomUUID();
      return [obj];
    }
    for (const key of ["data", "records", "result", "results", "items", "rows"]) {
      if (key in obj) {
        const nested = normalizeRows((obj as Row)[key]);
        if (nested.length) return nested;
      }
    }
  }
  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = basicAuthHeader();
  if (!auth) return json({ data: [], error: "Webhook credentials are not configured." });

  const url = new URL(req.url);
  const table = (url.searchParams.get("table") ?? "").trim();
  const upstream = new URL(WEBHOOK_URL);
  if (table) upstream.searchParams.set("table", table);

  try {
    const res = await fetch(upstream.toString(), {
      method: "GET",
      headers: { Authorization: auth, Accept: "application/json" },
    });
    if (res.status === 404) return json({ data: [], error: null });
    if (!res.ok) {
      return json({ data: [], error: `Webhook returned ${res.status} ${res.statusText}` });
    }
    const rawText = await res.text().catch(() => "");
    if (!rawText.trim()) return json({ data: [], error: null });
    let j: unknown = null;
    try { j = JSON.parse(rawText); } catch { return json({ data: [], error: null }); }
    return json({ data: normalizeRows(j), error: null });
  } catch (e) {
    return json({
      data: [],
      error: e instanceof Error ? e.message : "Failed to reach webhook.",
    });
  }
});
