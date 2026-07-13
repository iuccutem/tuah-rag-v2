## Batch the Production RAG export to avoid Cloudflare 524 timeouts

### Problem
The single call to `/n8n-rag-build` sends every selected row in one request. For >10 rows the n8n workflow needs more than 120s and Cloudflare returns 524. Output must remain one JSON file.

### Fix (frontend only — `src/routes/_authenticated/index.tsx`, `confirmExportRag`)

Split the selected rows into fixed-size chunks and call the existing `/n8n-rag-build` endpoint once per chunk, sequentially. Concatenate every returned `rows` array into one array and download it as the same `<tab>_rag_<DDMMYY>.json` file. No backend, edge-function, prompt, or webhook change.

**Batch size:** 5 rows per request (safe headroom under the 120s proxy limit; adjustable via a single `RAG_BATCH_SIZE` const at the top of the function). Sheets ≤5 rows behave exactly as today (one request).

**Sequential, not parallel:** avoids hammering the n8n instance and keeps ordering stable so the merged JSON matches the on-screen preview order.

**Progress feedback:** update the existing loading toast after each batch — `Building production RAG… batch X / Y (Z rows done)`. Reuse the same toast id so it stays a single line.

**Per-batch failure handling:**
- On network error or non-2xx response, retry that batch once after a short delay (2s).
- If it still fails, abort the whole export, dismiss the loading toast, show an error toast that names the failing batch and how many rows had already completed, and do NOT download a partial file (user asked for a single complete JSON).

**Merging:** collect each response's `rows` into `const merged: unknown[] = []`; push with `merged.push(...payload.rows)`. Serialize once at the end with `JSON.stringify(merged, null, 2)` — identical shape to today's output, just longer.

**Success toast:** unchanged wording, uses `merged.length`.

### Out of scope
- No changes to `supabase/functions/n8n-rag-build/index.ts` (still forwards one payload).
- No changes to the n8n webhook, prompts, filename format, or the Raw JSON / Raw Excel paths.
- No parallelism, no resumable state, no partial downloads.

### Result
Exporting 28 rows issues 6 sequential requests of ≤5 rows each, each well under the 120s limit, then downloads a single `<tab>_rag_<DDMMYY>.json` containing all 28 merged records.
