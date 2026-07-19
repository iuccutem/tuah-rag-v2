import { corsHeaders, json } from "../_shared/cors.ts";
import { basicAuthHeader } from "../_shared/n8n-jwt.ts";

const DEFAULT_WEBHOOK =
  "https://tuah.utem.edu.my/agent/webhook/cde72af9-9674-4054-9f8f-d4de3d1beac6";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const target = Deno.env.get("N8N_RAG_BUILD_WEBHOOK_URL") || DEFAULT_WEBHOOK;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Diagnostic: log what the client actually sent so we can confirm
  // dataset/batch metadata is arriving at the edge function.
  try {
    const b = body as Record<string, unknown>;
    const outgoing = JSON.stringify(body);
    console.log("[n8n-rag-build] incoming body diagnostics", {
      keys: b && typeof b === "object" ? Object.keys(b) : null,
      has_dataset: !!(b && typeof b === "object" && b.dataset),
      dataset_id:
        b && typeof b === "object" && b.dataset && typeof b.dataset === "object"
          ? (b.dataset as Record<string, unknown>).dataset_id
          : null,
      batch_index: (b as { batch_index?: unknown })?.batch_index,
      batch_total: (b as { batch_total?: unknown })?.batch_total,
      rows_length: Array.isArray((b as { rows?: unknown })?.rows)
        ? ((b as { rows: unknown[] }).rows).length
        : null,
      outgoing_bytes: outgoing.length,
    });
  } catch (e) {
    console.log("[n8n-rag-build] diagnostics failed", String(e));
  }


  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const auth = basicAuthHeader();
  if (auth) headers.Authorization = auth;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300_000);
    const res = await fetch(target, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const text = await res.text();
    if (!res.ok) {
      return json(
        { error: `Webhook ${res.status}: ${text.slice(0, 500) || res.statusText}` },
        { status: 502 },
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return json({ error: "Webhook did not return JSON." }, { status: 502 });
    }
    // Accept either a raw array or { rows: [...] } / { data: [...] }
    let rows: unknown = null;
    if (Array.isArray(parsed)) rows = parsed;
    else if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.rows)) rows = obj.rows;
      else if (Array.isArray(obj.data)) rows = obj.data;
      else if (Array.isArray(obj.output)) rows = obj.output;
    }
    if (!Array.isArray(rows)) {
      return json(
        { error: "Webhook response missing RAG array." },
        { status: 502 },
      );
    }
    return json({ rows });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Failed to reach webhook." },
      { status: 502 },
    );
  }
});
