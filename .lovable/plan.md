## Goal

Replace the System + User prompts in `docs/rag-builder-agent-prompt.md` with a hardened version that fixes the four root causes behind the 76/100 audit, so fresh exports score ≥90 and can be marked production-ready.

## What the new prompts must enforce

Targeted at the exact failures in the last audit (Validator Reliability 28, Source Grounding 61):

1. **Correct SHA-256 hashes (fixes 23/23 evidence hash failures)**
   - `source.content_hash_sha256` = SHA-256 hex of the concatenated `evidence[].excerpt` values (in array order, joined by `\n`), lowercase, 64 hex chars.
   - `evidence[i].evidence_hash_sha256` = SHA-256 hex of that evidence's `excerpt` string, lowercase.
   - Explicit rule: never invent, never reuse a hash across records, never use a placeholder.
   - Instruct the agent to use its Code / Crypto tool in n8n (or a Function step) to compute hashes — spelled out as a mandatory step, not optional.

2. **Verbatim evidence excerpts (fixes source-grounding score)**
   - Excerpt must be copied character-for-character from the row's `answer` (or fetched source), ≥40 chars, no paraphrasing, no added punctuation.
   - `evidence[].locator` must be a real anchor (URL fragment, section title, or `answer[chars a–b]`), never "n/a".
   - At least 2 evidence entries per record when the answer has ≥2 sentences; one per language covered.

3. **Real per-record variation (fixes "identical variants / default 96 score")**
   - `question_variants.en` and `.ms` must each contain 5–10 UNIQUE strings, none equal to `question.en`/`question.ms`, no cross-record duplication within the batch.
   - `quality.score` must be computed from the checks (formula in prompt: start 100, −8 per failed check, −5 per warning, floor 0), never a constant.
   - `retrieval.keywords`, `aliases`, `any_of.*` must be derived from the actual answer text, not a fixed list.

4. **Honest production_ready flag**
   - `quality.production_ready = true` ONLY when: score ≥ 90 AND all 11 checks true AND issues=[] AND every `retrieval_tests[].passed=true` AND `security.prompt_injection_detected=false` AND both languages populated AND all hashes verified.
   - Otherwise `false` with the failing check names listed in `quality.issues`.
   - `retrieval_tests[].expected_match` and `.passed` strictly Boolean (`true`/`false`), never strings.

5. **Retrieval test coverage (locks in Retrieval 88 → ≥95)**
   - Exactly ≥8 tests per record covering all of: `exact`, `paraphrase`, `acronym`, `colloquial`, `negative`, `bilingual_en`, `bilingual_ms`, `entity_scope`.
   - Negative test must use a term from another entity/domain and assert `expected_match=false`.

6. **Field the answer as `answer`** (keep the existing `.map` rename in the User prompt so the agent never sees `telegram_whatsapp`).

## Deliverable

Rewrite the two code blocks in `docs/rag-builder-agent-prompt.md`:

- **System message** — full replacement, encoding rules 1–5 above with explicit "MUST"/"NEVER" wording and a short "SELF-CHECK BEFORE EMIT" checklist the agent runs per record.
- **User prompt** — keep the `$json.body.*` bindings and the `.map(r => ({ ...r, answer: r.telegram_whatsapp }))` rename; add a one-line reminder to compute hashes from the excerpts it just wrote.

Add a short "Expected score" note under the prompts: with these rules followed, a clean batch should score ≥90 and flip `production_ready` to true.

## Not changing

- No app / edge function / schema code changes.
- Webhook URL, batch size (5), retry logic, dataset assembly, filename pattern all unchanged.
- `schema_version: "2.0.0"` unchanged.
