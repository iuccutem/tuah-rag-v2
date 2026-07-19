// Helpers for assembling Production RAG v2.0.0 dataset payloads.

const KL_TZ = "Asia/Kuala_Lumpur";

function klParts(d: Date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: KL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  // en-CA gives hour "24" at midnight; normalize.
  if (parts.hour === "24") parts.hour = "00";
  return parts;
}

export function nowKLIso(d: Date = new Date()) {
  const p = klParts(d);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+08:00`;
}

export function yymmddKL(d: Date = new Date()) {
  const p = klParts(d);
  return `${p.day}${p.month}${p.year.slice(-2)}`;
}

export function slugForDataset(name: string) {
  const s = (name || "dataset")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "");
  return s.length >= 3 ? s : `${s}_ds`;
}

export function prettyDatasetName(tableTag: string) {
  return tableTag
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function uniqueUrls(rows: Array<{ url?: string | null }>) {
  const seen = new Set<string>();
  for (const r of rows) {
    const u = (r.url || "").trim();
    if (u) seen.add(u);
  }
  return Array.from(seen);
}

// Canonical JSON: object keys sorted recursively; arrays preserve order.
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) sorted[k] = canonicalize(obj[k]);
    return sorted;
  }
  return value;
}

export async function sha256HexOfCanonicalJson(value: unknown): Promise<string> {
  const text = JSON.stringify(canonicalize(value));
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function looksLikeV2Record(r: unknown): boolean {
  if (!r || typeof r !== "object") return false;
  const q = (r as Record<string, unknown>).question;
  return !!(q && typeof q === "object" && "en" in (q as object));
}

export type DatasetHints = {
  dataset_id: string;
  name: string;
  organization: string;
  languages: string[];
  source_scope: string[];
  generated_at: string;
  generated_timezone: string;
};

export function buildDatasetHints(params: {
  tableTag: string;
  rows: Array<{ url?: string | null }>;
}): DatasetHints {
  const stamp = yymmddKL();
  const id = `${slugForDataset(params.tableTag)}_rag_${stamp}`;
  return {
    dataset_id: id,
    name: `${prettyDatasetName(params.tableTag)} Production RAG`,
    organization: "Universiti Teknikal Malaysia Melaka",
    languages: ["en", "ms"],
    source_scope: uniqueUrls(params.rows),
    generated_at: nowKLIso(),
    generated_timezone: KL_TZ,
  };
}

export async function assembleDataset(params: {
  hints: DatasetHints;
  tableTag: string;
  records: unknown[];
}) {
  const generatedAt = params.hints.generated_at;
  const contentHash = await sha256HexOfCanonicalJson(params.records);
  const anyLegacy = params.records.some((r) => !looksLikeV2Record(r));
  const failed_checks: string[] = ["independent_validation_not_run"];
  if (anyLegacy) failed_checks.push("records_not_v2.0.0");

  const dataset = {
    ...params.hints,
    description: `Source-grounded bilingual English-Malay records exported from ${params.tableTag}.`,
    generator: { name: "RAG Builder", version: "2.0.0" },
    record_count: params.records.length,
    content_hash_sha256: contentHash,
    status: "draft",
    quality_summary: {
      score: 0,
      production_ready: false,
      validator_version: "2.0.0",
      validated_at: generatedAt,
      failed_checks,
      warnings: [],
    },
  };
  return {
    payload: { schema_version: "2.0.0", dataset, records: params.records },
    legacyDetected: anyLegacy,
  };
}
