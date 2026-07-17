import { corsHeaders, json } from "../_shared/cors.ts";
import { signN8nJwt } from "../_shared/n8n-jwt.ts";

const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/2f85ad5a-09d6-4ae8-ad66-12772550946b";

type Prompt = {
  id: string;
  name: string;
  model: string | null;
  vector_store_id: string | null;
  description: string | null;
  system_prompt: string;
  temperature: number | null;
  max_tokens: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

function toPrompt(o: Record<string, unknown>): Prompt | null {
  const id = o.id ?? o.prompt_id ?? o.uuid;
  if (id == null) return null;
  const name =
    (o.name as string) ??
    (o.title as string) ??
    (o.label as string) ??
    String(id);
  return {
    id: String(id),
    name: String(name),
    model: (o.openai_model as string) ?? (o.model as string) ?? null,
    vector_store_id: (o.vector_store_id as string) ?? null,
    description: (o.description as string) ?? null,
    system_prompt: (o.system_prompt as string) ?? "",
    temperature:
      typeof o.temperature === "number" ? (o.temperature as number) : null,
    max_tokens:
      typeof o.max_tokens === "number" ? (o.max_tokens as number) : null,
    is_active:
      typeof o.is_active === "boolean" ? (o.is_active as boolean) : null,
    created_at: (o.created_at as string) ?? null,
    updated_at: (o.updated_at as string) ?? null,
  };
}

function normalize(input: unknown): Prompt[] {
  const out: Prompt[] = [];
  const visit = (v: unknown) => {
    if (v == null) return;
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    if (typeof v === "object") {
      const obj = v as Record<string, unknown>;
      if ("system_prompt" in obj || "id" in obj) {
        const p = toPrompt(obj);
        if (p) {
          out.push(p);
          return;
        }
      }
      for (const key of ["data", "prompts", "items", "results", "rows", "list"]) {
        if (key in obj) visit(obj[key]);
      }
    }
  };
  visit(input);
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (!Deno.env.get("N8N_JWT_SECRET")) {
    return json({ prompts: [], error: "Webhook JWT secret is not configured." });
  }
  try {
    const token = await signN8nJwt();
    const res = await fetch(WEBHOOK_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return json({
        prompts: [],
        error: `Webhook returned ${res.status} ${res.statusText}${
          text ? `: ${text.slice(0, 200)}` : ""
        }`,
      });
    }
    const j = await res.json().catch(() => null);
    const prompts = normalize(j).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
    return json({ prompts, error: null });
  } catch (e) {
    return json({
      prompts: [],
      error: e instanceof Error ? e.message : "Failed to reach webhook.",
    });
  }
});
