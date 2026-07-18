# Add user filter to the System Prompt selector

Extend the existing Prompt dropdown with a third filter: a searchable dropdown of user names sourced from a new webhook, so prompts can be filtered by who created them.

## UX

Inside the Prompt selector popover, above the current prompt list:

```text
┌──────────────────────────────────┐
│ [ Search prompts…            ]   │  (existing)
│ [ Filter by user  ▾          ]   │  (NEW — searchable combobox)
│ ☐ Show all (ignore PROD RAG)     │  (existing)
│ 12 of 123                        │
├──────────────────────────────────┤
│ … prompt items …                 │
└──────────────────────────────────┘
```

- **User filter** is a small combobox (shadcn Popover + Command) showing every user name from the new webhook, sorted A→Z, with type-ahead search and an "All users" reset option.
- Persisted to `localStorage` as `ragBuilder.promptUserId` so the choice survives reloads. When the stored id is no longer in the fetched list, it silently resets to "All users".
- Filter composes with the existing filters: `(search match) AND (PROD RAG OR showAll) AND (user match OR All users)`. Currently selected prompt still stays visible if it would otherwise be hidden.
- The current auto-reset that snaps `systemPromptId` to the first visible PROD RAG prompt keeps working; it now runs against the user-filtered list too.

## Data source

New webhook (JWT-authed, same pattern as `n8n-system-prompt-list`):

```
GET https://tuah.utem.edu.my/agent/webhook/7722cc01-2060-42e9-9219-0f7d556f71da
```

Returns a list of users. We normalize each entry to `{ id, name, email? }`, dedupe by id, and sort by name (`localeCompare`, base sensitivity).

Prompt→user linkage: each prompt from `n8n-system-prompt-list` already has fields like `user_id` / `created_by` / `owner_id` in the raw payload (dropped by the current normalizer). The prompt normalizer will start preserving a single `user_id` field (first non-empty of `user_id`, `created_by`, `owner_id`, `author_id`). Filtering matches `prompt.user_id === selectedUserId`.

If the webhook response shape differs from expectation, we fall back gracefully: users list stays empty, the filter dropdown is hidden, and the rest of the selector behaves exactly as today.

## Changes

**New — `supabase/functions/n8n-prompt-users/index.ts`** (+ mirror in `server/src/handlers/n8n-prompt-users.ts`)
- Copy of `n8n-system-prompt-list` structure: signs a short-lived HS256 JWT with `N8N_JWT_SECRET`, calls the new webhook, normalizes to `{ users: [{ id, name, email }], error }`, sorted A→Z. CORS + no-store, same error envelope.

**`supabase/functions/n8n-system-prompt-list/index.ts`** (and Express mirror)
- Extend `toPrompt` to also include `user_id` (first of `user_id` / `created_by` / `owner_id` / `author_id`). No other behavior change.

**`src/routes/_authenticated/index.tsx`**
- Add `useQuery({ queryKey: ["prompt-users"], … })` hitting `/api/n8n-prompt-users`, with the same refetch settings (`staleTime: 0`, `refetchOnMount: "always"`, `refetchOnWindowFocus: true`) and the mount-time `invalidateQueries` already used for prompts.
- Add `promptUserId` state, persisted in `localStorage`.
- Extend `visiblePrompts` derivation to also filter by `promptUserId` when set.
- Render a searchable user combobox above the existing prompt search inside the Prompt select popover. Include an "All users" item at the top. Show/hide based on whether the users list has entries.
- Auto-reset effect that snaps `systemPromptId` to the first PROD RAG prompt now uses the fully filtered list.

## Technical notes

- Reuses the exact JWT + CORS scaffolding from `n8n-system-prompt-list`, so no new secrets, no new auth surface.
- No changes to the run/process pipeline — this is purely a filter over the existing prompt list.
- No changes to `QATable`, exports, or any other feature.
