# Filter the System Prompt selector

Reduce the messy 123-prompt list to only production RAG prompts, with an escape hatch for debugging. No changes to how prompts are run — the selected prompt is still forwarded to the agent webhook exactly as today.

## Behavior

- Default view of the Prompt selector shows only prompts whose `name` contains **"PROD RAG"** (case-insensitive).
- A small **"Show all"** toggle (checkbox/switch) inside the selector dropdown reveals the full list when needed.
- Toggle state persists in `localStorage` (`ragBuilder.promptShowAll`) so a debugging session survives reloads.
- Alphabetical sort, search box, result count, and Eye-icon preview stay exactly as today.
- If the currently selected prompt doesn't match the filter, it stays selected and is shown at the top of the list with a subtle "(hidden by filter)" hint, so the active choice is never silently dropped.
- Result count updates to reflect the filtered list, e.g. `12 of 123 prompts`.

## Files

- `src/routes/_authenticated/index.tsx` — only file touched.
  - Add `promptShowAll` state (persisted to `localStorage`).
  - Derive `visiblePrompts` from `prompts` using the "PROD RAG" filter unless `promptShowAll` is true.
  - Add the toggle row at the top of the selector dropdown (next to the search input).
  - Update the result count label.
  - Keep the pinned "currently selected" row when it's filtered out.

## Out of scope

- No backend/webhook changes. `n8n-system-prompt-list` still returns the full sorted list; filtering is purely client-side so we can iterate on the rule without redeploys.
- No changes to prompt-forwarding logic in `n8n-process`.
- No new prompt-management UI (create/edit/delete) — deferred.

## Verification

- Open the Prompt selector: only "PROD RAG" prompts appear, count reads `N of 123`.
- Toggle "Show all": full 123-prompt list returns; toggle state survives a reload.
- Select a non-PROD prompt, toggle filter back on: the active prompt remains selected and visible at the top of the list.
- Run a question: agent webhook still receives `system_prompt_id`, `system_prompt`, `system_prompt_name`, `model` unchanged.
