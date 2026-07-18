import { corsHeaders, json } from "../_shared/cors.ts";
import { signN8nJwt } from "../_shared/n8n-jwt.ts";

const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/7722cc01-2060-42e9-9219-0f7d556f71da";

type User = {
  id: string;
  name: string;
  email: string | null;
};

function toUser(o: Record<string, unknown>): User | null {
  const id = o.id ?? o.user_id ?? o.uuid ?? o.uid;
  if (id == null) return null;
  const name =
    (o.name as string) ??
    (o.full_name as string) ??
    (o.display_name as string) ??
    (o.username as string) ??
    (o.email as string) ??
    String(id);
  return {
    id: String(id),
    name: String(name),
    email: (o.email as string) ?? null,
  };
}

function normalize(input: unknown): User[] {
  const out: User[] = [];
  const visit = (v: unknown) => {
    if (v == null) return;
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    if (typeof v === "object") {
      const obj = v as Record<string, unknown>;
      if ("id" in obj || "user_id" in obj || "email" in obj || "name" in obj) {
        const u = toUser(obj);
        if (u) {
          out.push(u);
          return;
        }
      }
      for (const key of ["data", "users", "items", "results", "rows", "list"]) {
        if (key in obj) visit(obj[key]);
      }
    }
  };
  visit(input);
  const seen = new Set<string>();
  return out.filter((u) => (seen.has(u.id) ? false : (seen.add(u.id), true)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (!Deno.env.get("N8N_JWT_SECRET")) {
    return json({ users: [], error: "Webhook JWT secret is not configured." });
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
        users: [],
        error: `Webhook returned ${res.status} ${res.statusText}${
          text ? `: ${text.slice(0, 200)}` : ""
        }`,
      });
    }
    const j = await res.json().catch(() => null);
    const users = normalize(j).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
    return json({ users, error: null });
  } catch (e) {
    return json({
      users: [],
      error: e instanceof Error ? e.message : "Failed to reach webhook.",
    });
  }
});
