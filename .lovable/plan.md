## Changes

### 1. Default user filter to "Goh" (osgoh88@gmail.com)

In `src/routes/_authenticated/index.tsx`, when the users query resolves and `localStorage` has no saved `ragBuilder.promptUserId`, auto-select the user whose `email === "osgoh88@gmail.com"` (fallback: `name === "Goh"`). If neither is found, leave as "All users". Persist the auto-picked id like a normal user choice so subsequent loads are stable, and the user can still switch to "All users" or anyone else.

### 2. Move the user filter back inside the Prompt chip — polished layout

Remove the standalone toolbar "User" chip added last turn. Rebuild the filter inside the Prompt `SelectContent` popover as a compact, always-visible header (not a `<details>`), rendered above the prompt search bar. Because Radix Select intercepts pointer events on nested triggers, use an inline expandable panel driven by React state (`userFilterOpen`) rather than nesting another Popover.

Layout inside the Prompt dropdown:

```text
┌────────────────────────────────────────────┐
│  User  [ Goh                    ▾ ]  (×)   │  ← header row, always visible
│  ─────────────────────────────────────     │
│  ▸ when expanded:                          │
│     [ Search users…                    ]   │
│     • All users                            │
│     • Adminstrator                         │
│     • Goh                             ✓    │
│     …                     12 of 25         │
│  ─────────────────────────────────────     │
│  [ Search prompts…                     ]   │  ← existing
│  ☐ Show all (ignore PROD RAG)              │  ← existing
│  12 of 123                                 │
├────────────────────────────────────────────┤
│  … prompt items …                          │
└────────────────────────────────────────────┘
```

Details:
- **Header row**: `Users` icon, label `User`, current selection name (truncated) in a chip. Clicking the chip toggles the inline list. A small `×` clears back to "All users" (only shown when a user is selected).
- **Expandable list**: uses `onPointerDown`/`onMouseDown` `stopPropagation` on all interactive elements so clicks aren't swallowed by Radix Select; buttons call `setPromptUserId(...)` and collapse the panel. Since we're not nesting a Radix trigger, the Select popover stays open and clicks work reliably.
- **Hidden entirely** when `promptUsers.length === 0` (webhook empty/errored).
- **State**: reuse existing `promptUserId`, `promptUserSearch`, `filteredPromptUsers`, `selectedPromptUser`. Add one new local `userFilterOpen` boolean.

### Files touched

- `src/routes/_authenticated/index.tsx`
  - Add `userFilterOpen` state.
  - Add mount effect: if no `localStorage` value for `ragBuilder.promptUserId`, pick the Goh user from `promptUsersQuery.data.users` once available.
  - Remove the standalone toolbar user-filter chip added last turn.
  - Insert the new in-popover user-filter header + expandable panel at the top of the Prompt `SelectContent`.

No backend, query, or filter-logic changes — this is purely a UI relocation plus a default-selection effect.
