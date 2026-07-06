import { corsHeaders, json } from "../_shared/cors.ts";
import { basicAuthHeader } from "../_shared/n8n-jwt.ts";

const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/ad7bc9b8-0b89-4e4a-bdb5-89b83ecddc59";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = basicAuthHeader();
  if (!auth) return json({ ok: false, error: "Webhook credentials are not configured." });

  let question = "", table = "", vectorId = "";
  try {
    const body = await req.json() as { question?: string; table?: string; vector_id?: string; vectorId?: string };
    if (typeof body.question === "string") question = body.question.trim();
    if (typeof body.table === "string") table = body.table.trim();
    const vid = body.vector_id ?? body.vectorId;
    if (typeof vid === "string") vectorId = vid.trim();
  } catch { /* fallthrough */ }

  try {
    const upstream: Record<string, unknown> = {};
    if (question) upstream.question = question;
    if (table) upstream.table = table;
    if (vectorId) upstream.vector_id = vectorId;
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(upstream),
    });
    const text = await res.text();
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) return json({ ok: false, error: `Webhook returned ${res.status}`, data });
    return json({ ok: true, data });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Failed to reach webhook." });
  }
});
