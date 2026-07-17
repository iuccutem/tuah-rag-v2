## Goal
Pass the currently selected system prompt along with each question when triggering the agent, so the n8n webhook uses the prompt the user picked in the toolbar.

## Changes

### 1. Frontend — `src/routes/_authenticated/index.tsx`
- Extend `extraProcessBody` to include the selected prompt fields whenever a prompt is chosen:
  - `system_prompt_id`: `selectedPrompt.id`
  - `system_prompt`: `selectedPrompt.system_prompt` (full text)
  - `system_prompt_name`: `selectedPrompt.name`
  - `model`: `selectedPrompt.model` (if present)
- Keep existing `vector_id` behavior. Result: both the "Run selected rows" flow (line ~1290) and the `QuestionPasteBox` "Run Text Chat" flow automatically forward the prompt because both already spread `extraProcessBody`.

### 2. Edge function — `supabase/functions/n8n-process/index.ts`
- Parse and forward the new optional fields to the upstream n8n webhook:
  - `system_prompt_id`, `system_prompt`, `system_prompt_name`, `model`
- Only include each field when it's a non-empty string. No change to auth, CORS, or response shape.

### 3. Express handler — `server/src/handlers/n8n-process.ts`
- Mirror the same additive field passthrough so the self-hosted server behaves identically.

## Not changed
- `n8n-run` (question insert) is untouched — the prompt is only relevant for agent processing.
- No UI changes; the existing prompt selector is the single source of truth.
- No schema or storage changes.

## Open question
Do you want the full `system_prompt` text sent every call, or just the `system_prompt_id` (so n8n looks it up itself)? Default in this plan: send both, since it's cheap and lets the n8n workflow choose.
