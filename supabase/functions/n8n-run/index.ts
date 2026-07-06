import { corsHeaders, json } from "../_shared/cors.ts";
import { basicAuthHeader } from "../_shared/n8n-jwt.ts";

const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/8757e607-cb93-4b34-8289-9114663381bb";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = basicAuthHeader();
  if (!auth) return json({ ok: false, error: "Webhook credentials are not configured." });

  let body: { question?: string; table?: string; telegram_whatsapp?: string; url?: string } = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON body." }, { status: 400 }); }
  const question = (body.question ?? "").trim();
  const table = (body.table ?? "").trim();
  const expected = (body.telegram_whatsapp ?? "").trim();
  const url = (body.url ?? "").trim();
  if (!question) return json({ ok: false, error: "Question is empty." });

  try {
    const upstream: Record<string, unknown> = { question };
    if (table) upstream.table = table;
    if (expected) upstream.telegram_whatsapp = expected;
    if (url) upstream.url = url;
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
