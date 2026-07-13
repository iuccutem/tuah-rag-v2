## Unify all export filenames to `<tab>_rag_<DDMMYY>.<ext>`

All three export paths in `src/routes/_authenticated/index.tsx` will produce the same filename shape (matching the production RAG export), differing only by extension.

### Problem being fixed
- Excel export currently produces names like `pejtncaa_faq_q&a_eval_130726.xlsx` — the `_q&a_eval` suffix is redundant and the `&` is awkward.
- Raw JSON export uses `_q&a_` for the same reason.
- Production RAG export already uses the clean `_rag_` pattern — adopt it everywhere.

### Changes (single file: `src/routes/_authenticated/index.tsx`)

1. **Raw JSON export** (line 486)
   - From: `${buildTableTag()}_q&a_${buildStamp()}.json`
   - To:   `${buildTableTag()}_rag_${buildStamp()}.json`

2. **Production RAG JSON export** (line 578) — already correct, unchanged:
   - `${buildTableTag()}_rag_${buildStamp()}.json`

3. **Raw Excel export** (line 1362)
   - From: `${tableTag}_q&a_eval_${stamp}.xlsx`
   - To:   `${tableTag}_rag_${stamp}.xlsx`

### Resulting filenames (examples, DDMMYY = 130726)

| Tab            | Raw JSON                       | Excel                          | Production RAG                 |
|----------------|--------------------------------|--------------------------------|--------------------------------|
| audit_qna      | `audit_qna_rag_130726.json`    | `audit_qna_rag_130726.xlsx`    | `audit_qna_rag_130726.json`    |
| hotline        | `hotline_rag_130726.json`      | `hotline_rag_130726.xlsx`      | `hotline_rag_130726.json`      |
| pejtncaa_faq   | `pejtncaa_faq_rag_130726.json` | `pejtncaa_faq_rag_130726.xlsx` | `pejtncaa_faq_rag_130726.json` |
| utem_maps      | `utem_maps_rag_130726.json`    | `utem_maps_rag_130726.xlsx`    | `utem_maps_rag_130726.json`    |

Tab-name derivation (already implemented in `buildTableTag()`) strips the internal `qatest-`/`qatest-dev-` prefix and normalizes to `[a-zA-Z0-9_]`.

### Not touched
Webhook URLs, payloads, auth, batching, preview dialog, toast messages, and any non-export logic.
