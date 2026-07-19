## Goal

Change the Production RAG export filename from `audit_qna_190726_v2.0.0.json` to `audit_qna_rag_190726.json` — pattern `ENTITY_rag_DATE.json`, no version suffix.

## Change

In `src/lib/rag-schema.ts` (line 100), update `dataset_id` construction:

```ts
// before
const id = `${slugForDataset(params.tableTag)}_${stamp}_v2.0.0`;
// after
const id = `${slugForDataset(params.tableTag)}_rag_${stamp}`;
```

This flows through automatically:
- The download filename in `src/routes/_authenticated/index.tsx:822` uses `${datasetHints.dataset_id}.json` → becomes `audit_qna_rag_190726.json`.
- The `dataset.dataset_id` field inside the JSON payload matches the filename.

## Not changing

- Schema version (`schema_version: "2.0.0"`) inside the JSON stays — it's a schema identifier, not a filename.
- `slugForDataset` behavior unchanged (still allows underscores).
- No backend/webhook changes.
