import { corsHeaders, json } from "../_shared/cors.ts";
import { basicAuthHeader } from "../_shared/n8n-jwt.ts";

const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/8c131be7-21e7-4049-9dbb-4210b4ba5a79";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({})) as { email?: string };
  const email = body?.email?.trim();
  if (!email) return json({ ok: false, error: "Email is required." });
  const auth = basicAuthHeader();
  if (!auth) return json({ ok: false, error: "Webhook credentials are not configured." });

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email }),
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
