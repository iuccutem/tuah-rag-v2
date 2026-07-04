import { createFileRoute } from "@tanstack/react-router";

const WEBHOOK_URL =
  "https://tuah.utem.edu.my/agent/webhook/config/vector/list";

type Vector = { id: string; name: string };

function normalizeVectors(input: unknown): Vector[] {
  const out: Vector[] = [];
  const visit = (v: unknown) => {
    if (v == null) return;
    if (typeof v === "string") {
      const s = v.trim();
      if (s) out.push({ id: s, name: s });
      return;
    }
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    if (typeof v === "object") {
      const obj = v as Record<string, unknown>;
      const idKey = ["id", "vector_id", "vectorId", "value", "uuid"].find(
        (k) => typeof obj[k] === "string" || typeof obj[k] === "number",
      );
      const nameKey = ["name", "label", "title", "display_name", "displayName"].find(
        (k) => typeof obj[k] === "string",
      );
      if (idKey) {
        const id = String(obj[idKey]);
        const name = nameKey ? String(obj[nameKey]) : id;
        if (id.trim()) out.push({ id: id.trim(), name: name.trim() || id.trim() });
        return;
      }
      for (const key of ["data", "vectors", "results", "items", "rows", "list"]) {
        if (key in obj) visit(obj[key]);
      }
    }
  };
  visit(input);
  const seen = new Set<string>();
  return out.filter((v) => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });
}

export const Route = createFileRoute("/api/n8n-vector-list")({
  server: {
    handlers: {
      GET: async () => {
        if (!process.env.N8N_JWT_SECRET) {
          return Response.json(
            { vectors: [], error: "Webhook JWT secret is not configured." },
            { status: 200, headers: { "Cache-Control": "no-store" } },
          );
        }
        try {
          const { signN8nJwt } = await import("@/lib/n8n-jwt.server");
          const token = await signN8nJwt();
          const res = await fetch(WEBHOOK_URL, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            return Response.json(
              {
                vectors: [],
                error: `Webhook returned ${res.status} ${res.statusText}${
                  text ? `: ${text.slice(0, 200)}` : ""
                }`,
              },
              { status: 200, headers: { "Cache-Control": "no-store" } },
            );
          }
          const json = await res.json().catch(() => null);
          const vectors = normalizeVectors(json);
          return Response.json(
            { vectors, error: null },
            { status: 200, headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          return Response.json(
            {
              vectors: [],
              error:
                error instanceof Error ? error.message : "Failed to reach webhook.",
            },
            { status: 200, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
