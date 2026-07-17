# Add System Prompt selector

Mirror the existing Vector Store selector so users can pick a system prompt saved in n8n.

## Webhook
- URL: `https://tuah.utem.edu.my/agent/webhook/2f85ad5a-09d6-4ae8-ad66-12772550946b`
- Auth: Bearer HS256 JWT (existing `N8N_JWT_SECRET`, signed via `signN8nJwt()`).
- Current response: a single object `{ id, name, description, vector_store_id, openai_model, system_prompt, temperature, max_tokens, is_active, created_at, updated_at }`. Client will normalize both a single object and an array.

## Backend — new edge function `n8n-system-prompt-list`
File: `supabase/functions/n8n-system-prompt-list/index.ts`
- Follow the same pattern as `n8n-vector-list/index.ts` (CORS, JWT signing, error swallow → 200 with `error` field).
- Normalize response into `{ prompts: [{ id, name, model, vector_store_id, description, created_at, system_prompt }], error: null }`.
- If the raw payload is a single object, wrap it as `[obj]`; if it's `{ data | prompts | items | results: [...] }`, unwrap.
- Mirror to `server/src/handlers/n8n-system-prompt-list.ts` for the self-host Express server (parity with `n8n-vector-list.ts`).

## Frontend — dashboard selector
File: `src/routes/_authenticated/index.tsx`
- Add `systemPrompts` state + `selectedPromptId` state next to the existing vector store state.
- On mount, `apiFetch("/api/n8n-system-prompt-list")`, populate the list, default-select the first (or the one where `is_active === true`).
- Render a shadcn `<Select>` in the toolbar right after the Vector Store selector, labeled "System prompt". Each item shows `name` with a subtle secondary line for `openai_model`.
- Add a small "info" icon button next to it that opens a `<Dialog>` showing the full `system_prompt` text (read-only, scrollable, monospace) plus `description`, `model`, `vector_store_id`, `updated_at`. Preview only — no editing.
- No behavioral change to Run/Export payloads in this step (selection is local UI state only, to match how vector store selection is treated today unless you tell me otherwise).

## Technical notes
- Reuse `apiFetch` — no new client wiring needed.
- No DB migration, no RLS changes.
- Loading/empty/error states mirror the vector selector's toast + disabled dropdown pattern.

## Out of scope (ask if wanted next)
- Passing `system_prompt_id` into Run Web / Run WA-TG payloads.
- Editing or creating prompts from the dashboard.
