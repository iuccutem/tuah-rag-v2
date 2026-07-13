# Consolidated Export Flow

## 1. UI changes (`src/routes/_authenticated/index.tsx`)

Replace the current separate **Export JSON** and **Export Excel** buttons (toolbar around lines 1645–1750) with a single primary button:

- **Button:** `Export ▾` (Download icon). Enabled only when rows are selected.
- On click → open a new dialog **"Export options"** with a short summary (`N rows selected`) and two clearly named choices:

  1. **"Raw data"** — export the sheet as-is (for backup / editing).
     - Two sub-actions inside this section:
       - **Download JSON (raw)** → runs the existing `exportJson` / `confirmExportJson` path (calls `/n8n-export`, saves `<tag>_q&a_<stamp>.json`).
       - **Download Excel (.xlsx)** → runs the existing Excel export path (currently behind "Export Excel", ~line 1137 `setExporting(true)` / line 1730).
     - Both operate on currently-selected rows (same rule as today).

  2. **"Production RAG"** — build the final, retrieval-ready dataset.
     - Single action **Generate & Download RAG JSON**.
     - Posts selected rows to the new webhook:
       `https://tuah.utem.edu.my/agent/webhook/cde72af9-9674-4054-9f8f-d4de3d1beac6`
     - On success, saves the returned JSON as `<tag>_rag_<DDMMYY>.json` via a blob download. Shows a loader while waiting; surfaces errors via toast.

Old preview dialog (lines ~2078–2125) is folded into this unified dialog. Both raw actions can still show the same row preview list before download; the RAG action shows the same list plus a note "Rows will be sent to the RAG builder for enrichment".

## 2. Webhook wiring

Add a small edge function **`supabase/functions/n8n-rag-build/index.ts`** mirroring `n8n-export` (basic-auth passthrough, 120 s timeout, returns JSON body untouched). Target URL default:
`https://tuah.utem.edu.my/agent/webhook/cde72af9-9674-4054-9f8f-d4de3d1beac6` (overridable via `N8N_RAG_BUILD_WEBHOOK_URL`).

Client calls it through `apiFetch("/n8n-rag-build", { method: "POST", body: JSON.stringify({ rows, table }) })`, then blob-downloads the response.

Rationale: keeps the browser off the university host directly, same pattern as existing `n8n-export`.

## 3. Prompts for the n8n RAG-builder node

These are what you paste into the LLM node inside the n8n workflow behind the new webhook. `{{ $json.rows }}` is the variable holding the array of selected Q&A rows sent from the app.

### System prompt

```
You are a Production-Ready RAG Generator for UTeM's Tuah assistant.

Convert the provided Q&A records into a compact, grounded, retrieval-optimized JSON array. You never use outside knowledge, memory, or the internet. You never invent facts (names, dates, fees, phones, emails, URLs, policies, locations). You never change the meaning of the original answer.

OUTPUT
- Return ONLY a valid JSON array. No Markdown, no code fences, no commentary.
- Every element MUST use exactly this schema and key order:

{
  "id": "",
  "lang": ["en", "ms"],
  "intent": "",
  "question": "",
  "question_variants": { "en": [], "ms": [] },
  "answer": { "en": "", "ms": "" },
  "search_text": "",
  "must_match": [],
  "source_url": "",
  "do_not_infer": []
}

FIELD RULES
1. id: short, lowercase, snake_case, unique within the array; derived from intent + topic (e.g. "top_management_vc_or_nc").
2. lang: always ["en", "ms"].
3. intent: keep the source intent if useful; refine if too generic (e.g. "directions.transport" → "directions.transport.main_campus").
4. question: keep the original main question in English.
5. question_variants: 3–5 natural English variants AND 3–5 natural Malay variants. Use real user phrasing, include casual forms, no new facts.
6. answer:
   - "en": faithful English rewrite of the source answer.
   - "ms": Malay translation only when meaning is unambiguous.
   - If the source contains a URL, embed it as a Markdown link inside the answer text. Never leave a raw URL in the answer.
   - Do not add details that are not in the source.
7. search_text: ONE compact sentence, 30–70 words, containing main question terms, key entities, acronyms, Malay equivalents, and common user phrasing.
8. must_match: exact entity strings that must appear before Tuah answers (e.g. ["UTeM", "Vice Chancellor", "VC or NC"]).
9. source_url: original URL if present, otherwise "".
10. do_not_infer: list facts Tuah must NOT guess for this record (e.g. ["phone number", "office location", "appointment date"]).

REMOVE any of these if present in the source: old metadata strings, category, topic, source object, retrieval_priority, answer_type, confidence_score, created_at, exported_at, long guardrail text, duplicated keywords, internal notes.

QUALITY CHECK before returning:
- Every record has question_variants (en + ms), search_text, must_match.
- Every answer stays faithful to the source.
- Both "en" and "ms" are populated for question_variants and answer.
- No unsupported facts.
- Output is a single valid JSON array with no Markdown wrapping.
```

### User prompt (with variable)

```
Convert the following Q&A rows into the Production-Ready RAG JSON array as specified.

Dataset tag: {{ $json.table }}
Rows to convert:
{{ $json.rows }}

Process every row. Return ONLY the JSON array.
```

The webhook should respond with the raw JSON array (or `{ "rows": [...] }`). The client will save whichever shape comes back as `<tag>_rag_<DDMMYY>.json`.

## Files touched

- `src/routes/_authenticated/index.tsx` — replace toolbar export buttons, add unified dialog, add RAG download handler.
- `supabase/functions/n8n-rag-build/index.ts` — new edge function (proxy to RAG webhook).
- `supabase/config.toml` — register the new function.
- Docs (`docs/environment.md`, `docs/deployment.md`) — mention optional `N8N_RAG_BUILD_WEBHOOK_URL`.

No changes to columns, data model, or auth.
