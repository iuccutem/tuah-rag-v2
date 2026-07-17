# Handle full prompt list (123 items)

The webhook now returns an array. Existing `normalize()` in the edge function already handles arrays, so data will load. Two small UX changes to make picking from 123 items practical.

## Edge function `supabase/functions/n8n-system-prompt-list/index.ts`
- After `normalize(j)`, sort by `updated_at` desc (fallback `created_at` desc) so newest prompts appear first.

## Dashboard `src/routes/_authenticated/index.tsx`
- Keep the existing chip + `<Select>`, but make the dropdown searchable/scrollable for long lists:
  - Add a sticky text input at the top of `<SelectContent>` that filters by name (case-insensitive substring).
  - Cap dropdown height (`max-h-[24rem] overflow-auto`) so 123 items scroll instead of overflowing the viewport.
  - Show a small "N of 123" count line under the search input.
- Default-select logic: if none stored, pick the first item in the (already newest-first) list. Do not privilege `is_active` since many entries are flagged active.
- Preview dialog unchanged.

## Out of scope
- No change to Run/Export payloads (selection stays local UI state).
- No changes to the Express mirror handler beyond matching the sort (parity).
