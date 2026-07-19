## Context

- Client (`confirmExportRag` in `src/routes/_authenticated/index.tsx`) sends `{ table, rows, dataset, batch_index, batch_total }`.
- Edge function (`supabase/functions/n8n-rag-build/index.ts`) forwards the body verbatim to the n8n webhook.
- n8n screenshot shows the webhook body only contains `table` + `rows` (no `dataset`, no `batch_index`), so downstream expressions render `[undefined]` / `NaN`.
- Only one call site posts to `/n8n-rag-build`, and the code on both sides looks correct — so we need a definitive trace to see what's actually leaving the browser and what's arriving at n8n.

## Step 1 — Instrument the edge function (diagnostic)

Add lightweight logging in `supabase/functions/n8n-rag-build/index.ts` right after `body = await req.json()`:

- Log `Object.keys(body)`, `typeof body.dataset`, `body.batch_index`, `body.batch_total`, `Array.isArray(body.rows) ? body.rows.length : null`.
- Log the exact JSON string length being POSTed to n8n.

This is temporary instrumentation; no behavioral change.

## Step 2 — Trigger one fresh Production RAG export

User runs a single export from the app. Then we read `supabase--edge_function_logs` for `n8n-rag-build`.

Two outcomes:

**A) Logs show `dataset` / `batch_index` present**
→ The edge function IS forwarding them. The n8n screenshot was a stale pinned execution. Fix is on the n8n side: re-pin the newest execution so the expression editor resolves the new fields. No further code change.

**B) Logs show them missing**
→ The client isn't actually sending them (stale bundle, cached SW, or a code path we haven't found). We then:
  1. Hard-refresh preview and repeat.
  2. If still missing, add a `console.log` in `confirmExportRag` before the `fetch` to print the outgoing body keys, and inspect network payload in DevTools.
  3. Fix whatever the root cause is (most likely a stale deployed bundle on the university host — will need a rebuild + redeploy of `dist/`).

## Step 3 — Clean up

Remove the diagnostic `console.log` from the edge function once the cause is confirmed and fixed.

## Non-goals

- No change to architecture, routing, prompts, or the export UI.
- No change to the client payload shape (it's already correct).

## Technical notes

- Edge function currently does `body: JSON.stringify(await req.json())` — this is a pure passthrough, so any missing field must originate upstream (client bundle) or be a stale n8n execution view.
- n8n's expression preview always evaluates against the currently pinned/last-loaded execution — it does not auto-refresh when new executions arrive. This is the single most common cause of `[undefined]` in the preview panel even when live traffic is correct.
