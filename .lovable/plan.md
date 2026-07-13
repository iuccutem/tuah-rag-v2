## Batch the Raw JSON export to avoid timeouts

Apply the same batching pattern already used in `confirmExportRag` to `confirmExportJson` in `src/routes/_authenticated/index.tsx`.

### Changes (frontend only)

- Introduce `const JSON_BATCH_SIZE = 5;` alongside `RAG_BATCH_SIZE` (single knob at top of function).
- Split `previewRows` into sequential chunks of 5 and call `/n8n-export` once per chunk with the same payload shape (`{ table, rows: chunk }`).
- Reuse the existing loading toast id; update text after each batch: `Generating batch X / Y (Z rows done)…`. Sheets ≤5 rows behave exactly like today (one request, original toast wording).
- Per-batch retry: on network error or non-2xx, wait 2s and retry once. If it still fails, abort the whole export, dismiss the toast, show an error toast naming the failing batch and rows already completed, and do NOT download a partial file.
- Merge results: `const merged: unknown[] = []; merged.push(...payload.rows)` per batch. Serialize once at the end with `JSON.stringify(merged, null, 2)` — identical shape to today's output.
- Filename unchanged: `${buildTableTag()}_q&a_${buildStamp()}.json`.
- Success toast unchanged wording, uses `merged.length`.

### Out of scope

- No changes to `supabase/functions/n8n-export/index.ts`, the n8n webhook, Raw Excel path, or Production RAG path.
- No parallelism, no resumable state, no partial downloads.

### Result

Exporting 28 rows via Raw JSON issues 6 sequential requests of ≤5 rows each, each well under the 120s Cloudflare limit, then downloads a single merged `<tab>_q&a_<DDMMYY>.json`.
