## Fix: distinct processing UI after insert succeeds

Currently the same green button just changes label from "Inserting…" → "Processing…", which is visually identical and confusing. The per-question status list also still shows only the insert result (green check), giving no signal that the agent is now working.

### Changes (only in `src/components/qa-dashboard/QuestionPasteBox.tsx`)

1. **Processing overlay state** — when `processing === true` (insert finished, agent running), replace the action button row + per-row results with a centered processing panel inside the card:
   - Large spinner
   - Heading: "Processing answers…"
   - Sub text: "Inserted N question(s). The agent is generating answers — this can take a moment."
   - Channel chip(s) showing which webhook(s) are running (Web Chat / Telegram-WhatsApp / Both)
   - Disabled "Please wait" hint; no buttons during this phase

2. **Inserting phase unchanged** — while `running === true` keep the current button-with-spinner + per-row pending/ok/error list (that feedback is useful there).

3. **After processing completes** — overlay disappears, results list is restored and each previously-inserted row is marked "Answered" (reuse existing ok state, no logic change).

4. No changes to:
   - `runAll` logic, webhook calls, duplicate handling, toasts
   - Any API route, parent component, or table refresh
   - Business logic / data flow

### Technical notes
- Pure presentational change inside one component.
- Use existing `Loader2` + Tailwind tokens; no new deps.
- Gate overlay with `{processing ? <ProcessingPanel/> : <NormalView/>}` inside `CardContent`.
