
# Reformat Export JSON to `{lang, intent, question, answer, metadata, url}`

## Target shape (per row)
```json
{
  "lang": "en",
  "intent": "staff.director",
  "question": "...",
  "answer": "...",
  "metadata": "topic1; topic2; topic3",
  "url": "https://..." | null
}
```

## Field mapping
| Field | Source |
|---|---|
| `question` | `row.question` |
| `answer` | AI merges/cleans the best content from `row.web` + `row.telegram_whatsapp` |
| `intent` | AI-generated dotted slug (e.g. `staff.director`, `accommodation.count`) |
| `metadata` | AI-generated `"a; b; c"` topical tags |
| `lang` | Fixed `"en"` |
| `url` | First `https?://...` regex-extracted from the chosen answer text, else `null` |

## Behavior
- `Export JSON` button calls a new server function `exportRowsAsRag` (in `src/lib/rag-export.functions.ts`) with the currently visible/selected rows (same selection logic as today).
- Server function loops rows, calls Lovable AI Gateway (`google/gemini-3-flash-preview`) once per row with `Output.object` schema = `{ intent, answer, metadata }`. Prompt includes the question + both raw channel answers and instructs the model to pick/merge the cleaner one, strip noise, and keep URLs inline.
- Server returns the full array of formatted rows. Client triggers the same blob download as today (filename unchanged).
- URL extraction done client-side via regex on returned `answer`.
- Show a progress toast ("Formatting N rows with AI…"). On AI/credit/rate errors (402/429) show a clear toast and abort the download.
- Concurrency: process rows in small batches (e.g. 4 at a time) to keep latency reasonable; sequential within each batch on error.

## Files
- **New**: `src/lib/rag-export.functions.ts` — `createServerFn` with Zod input `{ rows: Array<{id, question, web, telegram_whatsapp}> }` and AI gateway call using the canonical `createLovableAiGatewayProvider` helper.
- **New**: `src/lib/ai-gateway.server.ts` — gateway provider helper (if not already present).
- **Edit**: `src/routes/_authenticated/index.tsx` — replace body of `exportJson` to call the new server fn, then build/download the JSON.
- **Ensure**: `LOVABLE_API_KEY` secret exists (auto-provisioned via Lovable Cloud AI).

## Out of scope
No DB schema changes. No changes to XLSX export. No changes to other export buttons, table UI, or row data fetching.

## Cost note
Each export call uses ~1 AI request per row. For a 200-row export that's ~200 small Gemini Flash calls; cheap but not free — surfaces via existing Lovable AI credits.
