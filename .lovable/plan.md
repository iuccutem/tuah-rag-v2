## Goal
Ensure vector stores and system prompts are always fetched fresh whenever the dashboard mounts / page is refreshed, so newly created or edited items in n8n appear without manual cache-busting.

## Current behavior
`src/main.tsx` configures the global TanStack Query client with `staleTime: 30_000` and `refetchOnWindowFocus: false`. As a result, the two relevant queries in `src/routes/_authenticated/index.tsx` inherit that stale window:

- `queryKey: ["vector-list"]` → `/n8n-vector-list`
- `queryKey: ["system-prompt-list"]` → `/n8n-system-prompt-list`

On a hard browser reload the cache is empty so a fetch happens, but on any in-app remount (route change back to `/`, tab switch, SPA navigation) within 30s the cached lists are reused and updates made in n8n don't show up. There is also no explicit refetch tied to the dashboard mount.

## Changes

1. In `src/routes/_authenticated/index.tsx`, on the two `useQuery` calls add:
   - `staleTime: 0`
   - `refetchOnMount: "always"`
   - `refetchOnWindowFocus: true`

   This forces a fresh network call every time the dashboard mounts or the tab regains focus, for these two lists only (other queries keep the global 30s stale window).

2. Add a small `useEffect` on mount in the dashboard component that calls:
   ```ts
   queryClient.invalidateQueries({ queryKey: ["vector-list"] });
   queryClient.invalidateQueries({ queryKey: ["system-prompt-list"] });
   ```
   as a belt-and-braces guarantee that a returning user always sees the latest list, even if React Query decided the data was still fresh.

3. Keep the existing `?ts=${Date.now()}` cache-buster in the fetch URLs (already bypasses any intermediate HTTP cache).

## Out of scope
- No backend / edge function changes.
- No change to how the selected `vectorId` / `systemPromptId` are persisted in `localStorage`; selection is preserved across refresh, only the *list* is refreshed.
- No change to the global `QueryClient` defaults (other screens keep current caching).