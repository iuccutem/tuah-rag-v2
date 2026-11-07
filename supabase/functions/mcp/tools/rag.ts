import type { McpServer } from "npm:@modelcontextprotocol/server@2.0.0";
import { z } from "npm:zod@4.6.2";

import { basicAuthHeader, signN8nJwt } from "../../_shared/n8n-jwt.ts";
import { errorResult, jsonResult, runtimeErrorResult } from "./result.ts";

const VECTOR_LIST_URL = "https://tuah.utem.edu.my/agent/webhook/config/vector/list";
const TABLE_LIST_URL =
  "https://tuah.utem.edu.my/agent/webhook/4340097e-3074-4ab4-b97c-feba47f87a55";
const KNOWLEDGE_ROWS_URL =
  "https://tuah.utem.edu.my/agent/webhook/911d5dbc-b215-4beb-8416-98098fa7d5d0";
const SEARCH_URL = "https://tuah.utem.edu.my/agent/webhook/ad7bc9b8-0b89-4e4a-bdb5-89b83ecddc59";

type Vector = { id: string; name: string };
type Row = Record<string, unknown>;

function normalizeVectors(input: unknown): Vector[] {
  const out: Vector[] = [];
  const visit = (value: unknown): void => {
    if (value == null) return;
    if (typeof value === "string") {
      const item = value.trim();
      if (item) out.push({ id: item, name: item });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== "object") return;
    const object = value as Record<string, unknown>;
    const idKey = ["id", "vector_id", "vectorId", "value", "uuid"].find(
      (key) => typeof object[key] === "string" || typeof object[key] === "number",
    );
    const nameKey = ["name", "label", "title", "display_name", "displayName"].find(
      (key) => typeof object[key] === "string",
    );
    if (idKey) {
      const id = String(object[idKey]).trim();
      if (id) out.push({ id, name: nameKey ? String(object[nameKey]).trim() || id : id });
      return;
    }
    for (const key of ["data", "vectors", "results", "items", "rows", "list"]) {
      if (key in object) visit(object[key]);
    }
  };
  visit(input);
  const seen = new Set<string>();
  return out.filter((vector) => !seen.has(vector.id) && Boolean(seen.add(vector.id)));
}

function normalizeTables(input: unknown): string[] {
  const out: string[] = [];
  const visit = (value: unknown): void => {
    if (value == null) return;
    if (typeof value === "string") {
      const item = value.trim();
      if (item) out.push(item);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== "object") return;
    const object = value as Record<string, unknown>;
    for (const key of ["name", "table", "table_name", "tablename"]) {
      if (typeof object[key] === "string") {
        const item = object[key].trim();
        if (item) out.push(item);
        return;
      }
    }
    for (const key of ["data", "tables", "results", "items", "rows"]) {
      if (key in object) visit(object[key]);
    }
  };
  visit(input);
  return [...new Set(out)];
}

function normalizeRows(input: unknown): Row[] {
  if (input == null) return [];
  if (Array.isArray(input)) return input.flatMap(normalizeRows);
  if (typeof input !== "object") return [];
  const object = input as Row;
  if (
    "question" in object ||
    "web" in object ||
    "telegram_whatsapp" in object ||
    "id" in object ||
    "createdAt" in object ||
    "updatedAt" in object
  ) {
    return [object];
  }
  for (const key of ["data", "records", "result", "results", "items", "rows"]) {
    if (key in object) {
      const rows = normalizeRows(object[key]);
      if (rows.length) return rows;
    }
  }
  return [];
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function upstreamError(name: string, response: Response): ReturnType<typeof errorResult> {
  return errorResult(
    `${name} returned ${response.status} ${response.statusText}. Try again later.`,
  );
}

async function fetchVectors(): Promise<Vector[]> {
  const token = await signN8nJwt();
  const response = await fetch(VECTOR_LIST_URL, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Vector service returned ${response.status} ${response.statusText}.`);
  }
  return normalizeVectors(await readJson(response));
}

async function fetchTables(auth: string): Promise<string[]> {
  const response = await fetch(TABLE_LIST_URL, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Knowledge-table service returned ${response.status} ${response.statusText}.`);
  }
  return normalizeTables(await readJson(response));
}

export function registerRagTools(server: McpServer): void {
  server.registerTool(
    "list_vector_stores",
    {
      description: "List verified vector stores currently configured in UTeM TUAH RAG Studio.",
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    },
    async () => {
      try {
        const vectors = await fetchVectors();
        return jsonResult({ vectors, count: vectors.length });
      } catch (error) {
        return runtimeErrorResult(error);
      }
    },
  );

  server.registerTool(
    "list_knowledge_tables",
    {
      description: "List verified knowledge tables currently available in UTeM TUAH RAG Studio.",
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    },
    async () => {
      try {
        const auth = basicAuthHeader();
        if (!auth) return errorResult("The RAG webhook credentials are not configured.");
        const tables = await fetchTables(auth);
        return jsonResult({ tables, count: tables.length });
      } catch (error) {
        return runtimeErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_knowledge_rows",
    {
      description:
        "Read a bounded number of verified rows from one named UTeM TUAH RAG Studio knowledge table.",
      inputSchema: {
        table: z
          .string()
          .trim()
          .min(1)
          .max(128)
          .describe("Exact table name returned by list_knowledge_tables."),
        limit: z.number().int().min(1).max(100).default(25).describe("Maximum rows to return."),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    },
    async ({ table, limit }) => {
      try {
        const auth = basicAuthHeader();
        if (!auth) return errorResult("The RAG webhook credentials are not configured.");
        const tables = await fetchTables(auth);
        if (!tables.includes(table)) {
          return errorResult(
            `Unknown knowledge table "${table}". Call list_knowledge_tables and use an exact returned name.`,
          );
        }
        const url = new URL(KNOWLEDGE_ROWS_URL);
        url.searchParams.set("table", table);
        const response = await fetch(url, {
          headers: { Authorization: auth, Accept: "application/json" },
        });
        if (response.status === 404) return jsonResult({ table, rows: [], count: 0 });
        if (!response.ok) return upstreamError("Knowledge-row service", response);
        const rows = normalizeRows(await readJson(response)).slice(0, limit);
        return jsonResult({ table, rows, count: rows.length, limit });
      } catch (error) {
        return runtimeErrorResult(error);
      }
    },
  );

  server.registerTool(
    "search_knowledge_base",
    {
      description:
        "Ask a question against a verified UTeM TUAH RAG Studio vector store and optional knowledge table.",
      inputSchema: {
        question: z.string().trim().min(2).max(4000).describe("The user question to search for."),
        vector_id: z
          .string()
          .trim()
          .min(1)
          .max(256)
          .describe("Exact id returned by list_vector_stores."),
        table: z.string().trim().max(128).optional().describe("Optional exact table name."),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    },
    async ({ question, vector_id, table }) => {
      try {
        const auth = basicAuthHeader();
        if (!auth) return errorResult("The RAG webhook credentials are not configured.");
        const vectors = await fetchVectors();
        if (!vectors.some((vector) => vector.id === vector_id)) {
          return errorResult(
            `Unknown vector store "${vector_id}". Call list_vector_stores and use an exact returned id.`,
          );
        }
        if (table) {
          const tables = await fetchTables(auth);
          if (!tables.includes(table)) {
            return errorResult(
              `Unknown knowledge table "${table}". Call list_knowledge_tables and use an exact returned name.`,
            );
          }
        }
        const body: Record<string, string> = { question, vector_id };
        if (table) body.table = table;
        const response = await fetch(SEARCH_URL, {
          method: "POST",
          headers: {
            Authorization: auth,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!response.ok) return upstreamError("RAG search service", response);
        return jsonResult({
          result: await readJson(response),
          verified_source: "UTeM TUAH RAG Studio",
        });
      } catch (error) {
        return runtimeErrorResult(error);
      }
    },
  );
}
