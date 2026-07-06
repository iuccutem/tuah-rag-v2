import { corsHeaders, json } from "../_shared/cors.ts";
import { basicAuthHeader } from "../_shared/n8n-jwt.ts";

const DELETE_WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/498f1285-dd47-489f-bf00-17487742d2c6";
const SUCCESS_MESSAGE = "Delete the auto-test delete workflow successfully.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = basicAuthHeader();
  if (!auth) return json({ ok: false, error: "Webhook credentials are not configured." });

  let body: {
    questions?: string[];
    items?: Array<{ id?: string | number | null; question?: string }>;
    table?: string;
  } = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON body." }, { status: 400 }); }

  const table = typeof body.table === "string" && body.table.trim() ? body.table.trim() : "";
  let items: Array<{ id: string | number | null; question: string }> = [];
  if (Array.isArray(body.items)) {
    items = body.items.map((i) => ({ id: i?.id ?? null, question: (i?.question ?? "").trim() || "null" }));
  } else if (Array.isArray(body.questions)) {
    items = body.questions.map((q) => ({ id: null, question: String(q).trim() || "null" }));
  }
  if (items.length === 0) return json({ ok: false, error: "No questions to delete." });

  const results: Array<{ id: string | number | null; question: string; ok: boolean; error?: string; message?: string }> = [];
  for (const { id, question } of items) {
    let okAll = true;
    let lastError: string | undefined;
    let lastMessage = "";
    try {
      const upstreamPayload: Record<string, unknown> = { id, question };
      if (table) upstreamPayload.table = table;
      const res = await fetch(DELETE_WEBHOOK_URL, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(upstreamPayload),
      });
      lastMessage = await res.text();
      if (!res.ok) { okAll = false; lastError = `Webhook returned ${res.status}`; }
    } catch (error) {
      okAll = false;
      lastError = error instanceof Error ? error.message : "Failed to reach webhook.";
    }
    const messageOk = lastMessage.includes(SUCCESS_MESSAGE);
    if (okAll && !messageOk) {
      okAll = false;
      lastError = `Unexpected webhook response: ${lastMessage.slice(0, 200) || "(empty)"}`;
    }
    results.push(okAll
      ? { id, question, ok: true, message: lastMessage }
      : { id, question, ok: false, error: lastError, message: lastMessage });
  }

  const okCount = results.filter((r) => r.ok).length;
  return json({
    ok: okCount > 0,
    deleted: okCount,
    total: items.length,
    results,
    error: okCount === 0 ? results[0]?.error ?? "All delete requests failed." : undefined,
  });
});
