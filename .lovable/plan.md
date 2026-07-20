## Goal
Use the user's table name as-is for RAW export filenames — no forced `_faq` suffix. Only append `_DDMMYY.<ext>`.

## Change
In `src/routes/_authenticated/index.tsx`:

1. `buildExportBase()` (line 616-619): return `buildTableTag()` unchanged — drop the `/_(faq|qna|rag)$/` check and the `_faq` fallback.
2. `exportXlsx()` (line 1775): remove the same `/_(faq|qna|rag)$/` check; set `baseName = tableTag` directly. Filename becomes `${tableTag}_${stamp}.xlsx`.

Result:
- Table `faix_faq` → `faix_faq_200726.json` / `.xlsx`
- Table `hotline` → `hotline_200726.json` / `.xlsx`
- Table `some_qna` → `some_qna_200726.json` / `.xlsx`

Scope limited to **Export RAW** (JSON + Excel). Production RAG export (which uses `datasetHints.dataset_id`) is unchanged.

## Verification
Build/typecheck passes; export a table named `hotline` and confirm filenames omit `_faq`.