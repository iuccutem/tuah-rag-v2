## What the code already does

- Each sheet tab click sets `activeTable`, which is part of the React Query key `["qa-rows", activeTable]`. Switching tabs auto-refetches.
- `fetchRows(activeTable)` calls `/api/n8n-qa?table=<qatest-…>&ts=…`.
- `src/routes/api/n8n-qa.ts` forwards that `?table=` value to the upstream n8n webhook (`911d5dbc-…`).
- An empty array from upstream already renders the "No evaluation records yet." empty-state in `QATable`.

Since you're wiring the n8n workflow to honor `?table=`, no client-side fetch changes are needed — once n8n filters by the param, each tab will return its own rows (or `[]`).

## One small UX safeguard

When a freshly-created sheet has no rows, some n8n setups respond with a 404 or 500 instead of `[]`. Today that surfaces as a red error banner over an empty grid, which reads as "broken" rather than "empty".

Update `src/routes/api/n8n-qa.ts` so a 404 from upstream (and an empty/204 body) is treated as a successful empty result:

- If `res.status === 404` → return `{ data: [], error: null }`.
- If the upstream body is empty or not valid JSON → return `{ data: [], error: null }` instead of bubbling a parse error.
- Other non-2xx responses keep the current error behavior.

## Tab-switch polish (client)

In `src/routes/_authenticated/index.tsx`, when the user clicks a different tab, also clear the previously cached rows for the new tab's key so the grid shows the skeleton/empty state immediately instead of flashing the previous sheet's rows while the new fetch is in flight:

```tsx
onClick={() => {
  if (t === activeTable) return;
  queryClient.removeQueries({ queryKey: ["qa-rows", t], exact: true });
  setActiveTable(t);
  setSelection(null);
  setSelectedRowIds(new Set());
}}
```

## Files touched

- `src/routes/api/n8n-qa.ts` — treat 404/empty body as `{ data: [], error: null }`.
- `src/routes/_authenticated/index.tsx` — clear the target tab's cached rows on switch.

## Not changed

- Tab discovery, `qatest-` prefix handling, refresh button logic, mutation webhooks, export, formatting — all untouched.
