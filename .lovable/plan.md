# Scrollable bottom sheet-tab bar

## Goal
The bottom row of faculty/sheet tabs currently hides its scrollbar (`hide-scrollbar`) and never scrolls itself when a new tab is added or when the user switches to a tab that's off-screen. On mobile/iPad the extra tabs are effectively unreachable.

## Changes (all in `src/routes/_authenticated/index.tsx`, sheet-tabs block around lines 1643–1722)

1. **Make the strip visibly scrollable**
   - Keep `overflow-x-auto` but remove `hide-scrollbar` so a thin native horizontal scrollbar shows when tabs overflow.
   - Add `scroll-smooth` and `snap-x snap-proximity` so scrolling to a tab feels natural; add `snap-start` to each tab item.
   - Add touch affordance: `style={{ WebkitOverflowScrolling: "touch" }}` and `overscroll-x-contain`.
   - Keep the "＋ Add sheet" button and the "Synced …" status inside the strip, but wrap the status in a `shrink-0` element so it doesn't collapse the tabs.

2. **Auto-scroll to the latest / active tab**
   - Add a `tabsScrollRef` on the strip container and a `tabRefs = useRef<Map<string, HTMLDivElement>>(new Map())` for each tab.
   - `useEffect` on `[tables.length]`: scroll the strip to its right end (`el.scrollLeft = el.scrollWidth`) — this handles new sheets being appended.
   - `useEffect` on `[activeTable]`: call `tabRefs.current.get(activeTable)?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" })` so switching tabs (including via the mobile "Switch sheet" menu) brings the tab into view.
   - After a successful create/rename, we already call `tablesQuery.refetch()` and then `setActiveTable(...)`; the two effects above cover both cases without extra code at call sites.

3. **Non-goals / preserved behavior**
   - No changes to tab creation, rename, delete, or table content rendering.
   - No visual redesign — same colors, sizing, dark-mode tokens, dropdown menu.

## Technical notes
- `hide-scrollbar` is defined in `src/styles.css`; we simply stop applying it on this element (leave the utility for other places).
- `scrollIntoView({ inline: "nearest" })` only scrolls the nearest scrollable ancestor, so it won't move the page vertically.
- The effects are cheap (run only when `tables.length` or `activeTable` changes) and safe under SSR because they're inside `useEffect`.
