import { corsHeaders, json } from "../_shared/cors.ts";
import { basicAuthHeader } from "../_shared/n8n-jwt.ts";

const DEFAULT_WEBHOOK =
  "https://tuah.utem.edu.my/agent/webhook/22f796c0-d27f-4e92-a914-a6dcde8a0c5f";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const target = Deno.env.get("N8N_EXPORT_WEBHOOK_URL") || DEFAULT_WEBHOOK;

  let body: unknown;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, { status: 400 }); }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const auth = basicAuthHeader();
  if (auth) headers.Authorization = auth;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    const res = await fetch(target, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const text = await res.text();
    if (!res.ok) return json({ error: `Webhook ${res.status}: ${text.slice(0, 500) || res.statusText}` }, { status: 502 });
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { return json({ error: "Webhook did not return JSON." }, { status: 502 }); }
    let rows: unknown = null;
    if (Array.isArray(parsed)) rows = parsed;
    else if (parsed && typeof parsed === "object" && Array.isArray((parsed as { rows?: unknown }).rows)) {
      rows = (parsed as { rows: unknown[] }).rows;
    }
    if (!Array.isArray(rows)) return json({ error: "Webhook response missing rows array." }, { status: 502 });
    return json({ rows });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Failed to reach webhook." }, { status: 502 });
  }
});
