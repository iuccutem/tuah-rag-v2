import { corsHeaders, json } from "../_shared/cors.ts";
import { basicAuthHeader } from "../_shared/n8n-jwt.ts";

const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/adf82095-c24f-4a8f-9e10-fca39d0452ff";

type Field = "question" | "url" | "web" | "telegram_whatsapp" | null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = basicAuthHeader();
  if (!auth) return json({ ok: false, error: "Webhook credentials are not configured." });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON body." }, { status: 400 }); }

  if (body?.id == null || body.id === "")
    return json({ ok: false, error: "Missing row id." }, { status: 400 });

  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const bool = (v: unknown) => v === true;
  const allowed: Field[] = ["question", "url", "web", "telegram_whatsapp"];
  const field: Field = allowed.includes(body.field as Field) ? (body.field as Field) : null;

  const payload: Record<string, unknown> = {
    id: body.id,
    field,
    question: str(body.question),
    url: str(body.url),
    web: str(body.web),
    telegram_whatsapp: str(body.telegram_whatsapp),
    question_error: bool(body.question_error),
    question_highlight: bool(body.question_highlight),
    telegram_whatsapp_error: bool(body.telegram_whatsapp_error),
    telegram_whatsapp_highlight: bool(body.telegram_whatsapp_highlight),
    web_error: bool(body.web_error),
    web_highlight: bool(body.web_highlight),
  };
  if (typeof body.table === "string" && (body.table as string).trim())
    payload.table = (body.table as string).trim();

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return json({ ok: false, error: `Webhook ${res.status}: ${text || res.statusText}` });
    }
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Failed to reach webhook." });
  }
});
