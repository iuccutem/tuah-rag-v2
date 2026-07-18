## Why the filter isn't showing

The user webhook is now working (edge function returns ~25 users). The filter code is in place, but it's rendered as a collapsed `<details>` element **inside** the Prompt `SelectContent` popover. Two problems:

1. `<details>`/`<summary>` toggle clicks don't reliably work inside a Radix Select popover — Radix intercepts pointer events, so the summary often just closes the Prompt dropdown instead of expanding.
2. Even when it works, it starts collapsed, so at a glance it looks like nothing was added.

## Fix

Move the user filter out of the Prompt dropdown and give it its own always-visible toolbar chip next to the **Prompt** chip, matching the styling of the existing Sheet / Vector / Prompt chips.

```text
[Sheet ▾]  [Vector ▾]  [Prompt ▾] [i]  [User ▾]
                                         └── searchable popover:
                                             ┌─────────────────────────┐
                                             │ [ Search users…      ]  │
                                             │ • All users             │
                                             │ • Adminstrator          │
                                             │ • Alicia                │
                                             │ … (25)                  │
                                             └─────────────────────────┘
```

- **Chip trigger**: small pill labeled `User` with the selected name (or "All users"), truncated. Hidden when `promptUsers.length === 0` or the query errored.
- **Popover**: shadcn `Popover` + a small `Command`-style list (already used elsewhere) — search box, "All users" reset row, then the alphabetized users. Clicking a user sets `promptUserId` and closes the popover. This is a real Popover, not nested in the Select, so clicks work normally.
- **Filter logic**: unchanged — the existing `matchesUser` / `visiblePrompts` derivation already filters the Prompt list by `promptUserId`, and the auto-reset effect already re-snaps `systemPromptId` when the filtered list changes.
- **Persistence**: unchanged — still stored in `localStorage` under `ragBuilder.promptUserId`.

## Cleanup inside the Prompt dropdown

Remove the `<details>`-based filter block from `SelectContent` (lines ~1845–1918 in `src/routes/_authenticated/index.tsx`). Keep the prompt search input and the "Show all" checkbox / count row exactly as they are today.

## Files touched

- `src/routes/_authenticated/index.tsx`
  - Remove the in-popover `<details>` user filter.
  - Add a new toolbar chip + Popover for the user filter, placed immediately after the Prompt chip's Info button.
  - No changes to state, queries, or filter logic — only UI relocation.

## Not changed

- Edge functions (`n8n-prompt-users`, `n8n-system-prompt-list`) — already correct.
- Prompt normalizer (`user_id` mapping) — already correct.
- Run/export pipeline — untouched.
