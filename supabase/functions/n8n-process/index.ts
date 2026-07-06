import { corsHeaders, json } from "../_shared/cors.ts";
import { basicAuthHeader } from "../_shared/n8n-jwt.ts";

const WEBHOOK_URLS: Record<string, string> = {
  web: "https://tuah.utem.edu.my/agent/webhook/ad7bc9b8-0b89-4e4a-bdb5-89b83ecddc59",
  telegram_whatsapp: "https://tuah.utem.edu.my/agent/webhook/ad7bc9b8-0b89-4e4a-bdb5-89b83ecddc59",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = basicAuthHeader();
  if (!auth) return json({ ok: false, error: "Webhook credentials are not configured." });

  let channel: "web" | "telegram_whatsapp" = "web";
  let question = "", table = "", vectorId = "";
  try {
    const body = await req.json() as { channel?: string; question?: string; table?: string; vector_id?: string };
    if (body.channel === "telegram_whatsapp" || body.channel === "web") channel = body.channel;
    if (typeof body.question === "string") question = body.question.trim();
    if (typeof body.table === "string") table = body.table.trim();
    if (typeof body.vector_id === "string") vectorId = body.vector_id.trim();
  } catch { /* default */ }

  try {
    const upstream: Record<string, unknown> = {};
    if (question) upstream.question = question;
    if (table) upstream.table = table;
    if (vectorId) upstream.vector_id = vectorId;
    const res = await fetch(WEBHOOK_URLS[channel], {
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
