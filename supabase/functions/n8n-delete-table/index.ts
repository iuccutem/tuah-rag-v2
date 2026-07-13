import { corsHeaders, json } from "../_shared/cors.ts";
import { basicAuthHeader } from "../_shared/n8n-jwt.ts";

const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/3f944ef2-7d47-42b8-8500-b03ab19a71a6";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = basicAuthHeader();
  if (!auth) return json({ ok: false, error: "Webhook credentials are not configured." });

  let body: { name?: string } = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON body." }, { status: 400 }); }
  const name = (body.name ?? "").trim();
  if (!name || !/^qatest-[a-z0-9_-]+$/.test(name))
    return json({ ok: false, error: "Invalid table name." }, { status: 400 });

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ name }),
    });
    const text = await res.text();
    if (!res.ok) return json({ ok: false, error: `Webhook ${res.status}: ${text.slice(0, 200) || res.statusText}` });
    return json({ ok: true, data: text });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Failed to reach webhook." });
  }
});
