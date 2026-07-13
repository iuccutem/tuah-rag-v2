## Per-tab suffix for raw JSON and Excel exports

Update the raw JSON and raw Excel export filenames in `src/routes/_authenticated/index.tsx` to pick their suffix from the tab name. Leave the production RAG button (line 578) untouched.

### Suffix rule (applied to the derived tab tag)

Given `tag = buildTableTag()` (already strips `qatest-` / `qatest-dev-` and normalizes to `[a-zA-Z0-9_]`):

1. If `tag` ends with `_faq` → suffix = `faq`, base name = `tag` as-is
2. Else if `tag` ends with `_qna` → suffix = `qna`, base name = `tag` as-is
3. Else if `tag` ends with `_rag` → suffix = `rag`, base name = `tag` as-is
4. Otherwise (no suffix in name) → suffix = `faq` (default), base name = `tag` as-is

Filename shape: `<tag>_<suffix>_<DDMMYY>.<ext>`

Note: the base name is always the full tag (we don't strip the trailing `_faq/_qna/_rag`), so tabs like `pejtncaa_faq` become `pejtncaa_faq_faq_130726.xlsx`. If that double-suffix is undesired for tabs that already end in `_faq/_qna/_rag`, I'll switch to "use the tab name as-is + the matched suffix once" — please flag before approving.

### Actually: strip-then-append variant (recommended, avoids doubling)

To avoid `pejtncaa_faq_faq_...`, I'll implement it as: detect the trailing `_faq/_qna/_rag` on the tag, and if present, use that as the suffix without duplicating. Concretely:

- `pejtncaa_faq` → `pejtncaa_faq_130726` (tag already ends in `_faq`, no extra suffix appended)
- `audit_qna`    → `audit_qna_130726`
- `hotline_rag`  → `hotline_rag_130726`
- `hotline`      → `hotline_faq_130726` (default `_faq_` appended)

This matches the user's examples and instruction "if the table ends with _faq then use that".

### Changes (single file: `src/routes/_authenticated/index.tsx`)

1. Add a small helper next to `buildTableTag` / `buildStamp`:
   ```ts
   const buildExportBase = () => {
     const tag = buildTableTag();
     if (/_(faq|qna|rag)$/.test(tag)) return tag;
     return `${tag}_faq`;
   };
   ```

2. **Raw JSON export** (line 486)
   - From: `` `${buildTableTag()}_rag_${buildStamp()}.json` ``
   - To:   `` `${buildExportBase()}_${buildStamp()}.json` ``

3. **Raw Excel export** (line 1362) — reuse the same rule inline (uses local `tableTag`/`stamp`):
   ```ts
   const baseName = /_(faq|qna|rag)$/.test(tableTag) ? tableTag : `${tableTag}_faq`;
   a.download = `${baseName}_${stamp}.xlsx`;
   ```

4. **Production RAG JSON export** (line 578) — untouched, remains `${buildTableTag()}_rag_${buildStamp()}.json`.

### Resulting filenames (examples, DDMMYY = 130726)

| Tab            | Raw JSON                       | Excel                          | Production RAG (unchanged)     |
|----------------|--------------------------------|--------------------------------|--------------------------------|
| pejtncaa_faq   | `pejtncaa_faq_130726.json`     | `pejtncaa_faq_130726.xlsx`     | `pejtncaa_faq_rag_130726.json` |
| audit_qna      | `audit_qna_130726.json`        | `audit_qna_130726.xlsx`        | `audit_qna_rag_130726.json`    |
| hotline_rag    | `hotline_rag_130726.json`      | `hotline_rag_130726.xlsx`      | `hotline_rag_rag_130726.json`  |
| hotline        | `hotline_faq_130726.json`      | `hotline_faq_130726.xlsx`      | `hotline_rag_130726.json`      |
| utem_maps      | `utem_maps_faq_130726.json`    | `utem_maps_faq_130726.xlsx`    | `utem_maps_rag_130726.json`    |

### Not touched
Production RAG export filename, webhook URLs, payloads, auth, batching, preview dialog, toasts, and any non-export logic.
