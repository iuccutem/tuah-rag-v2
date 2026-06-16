# Mobile UI Fixes — RAG Builder Dashboard

Targeted responsive fixes in `src/routes/_authenticated/index.tsx` plus a small CSS utility and one minor table-wrapper tweak. No business logic changes.

## 1. Add "Upload Excel" to the mobile overflow menu
File: `src/routes/_authenticated/index.tsx` (mobile top-bar dropdown, ~lines 1026–1049).

Add a new `DropdownMenuItem` between "Export JSON" and "Register user" that calls `setExcelImportOpen(true)` (same handler as the desktop button at line 1318). Use the `Upload` icon from `lucide-react` (add to the existing import list — check for duplicates first).

```tsx
<DropdownMenuItem onClick={() => setExcelImportOpen(true)}>
  <Upload className="mr-2 h-4 w-4" />
  Upload Excel
</DropdownMenuItem>
```

This reuses the existing `excelImportOpen` state and `ExcelImportBox` dialog, so behavior matches desktop exactly.

## 2. Fix empty date pickers in mobile filter popover
File: `src/routes/_authenticated/index.tsx` (lines 1104, 1117–1131).

- Change `<PopoverContent align="start" className="w-[260px] space-y-2 p-3">` to `align="start" sideOffset={6} className="z-[100] w-[min(92vw,300px)] space-y-2 p-3"`.
- On the two `<input type="date">` elements, add `min-h-[40px]` and remove anything that could collapse them; also drop `h-9` in favor of `h-10` so the native iOS/Android date wheel UI renders. Keep `w-full`.

This ensures the popover sits above all sibling z-stacks and the native date input has enough box height to render its picker affordance.

## 3. Scrollable bottom sheet tabs (no UI freeze on tap)
File: `src/routes/_authenticated/index.tsx` (line 1481 container).

- Container already has `overflow-x-auto`. Add `hide-scrollbar` and `flex-nowrap`, and add `shrink-0` to each tab `<div>` (line 1490) and to the trailing "+" button and "Synced…" status so they don't compress.
- The "Synced…" `ml-auto` div is what currently pushes the "+" off-screen when many tabs exist on mobile. Remove `ml-auto` on mobile by changing it to `hidden sm:block ml-auto …` so the status text is desktop-only; this keeps the "+" button immediately after the last tab on mobile (covers fix #4 visibility).
- Add a global utility in `src/styles.css`:

```css
@layer utilities {
  .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
}
```

Tab click handler at line 1500 is already correct; no logic changes — the "freeze" perception comes from the off-screen "+" and from horizontal overflow on the parent, both addressed here and in #5.

## 4. "Add Sheet" (+) visible and modal fits mobile
- Visibility handled in #3 (status text hidden on mobile so "+" stays in view).
- The New Sheet dialog at line 1696 currently uses `w-[calc(100vw-1.5rem)] sm:max-w-md`. Change to `w-[90vw] max-w-[400px] sm:max-w-md` so on mobile it caps at 400px and uses 90vw, matching the requested spec.

No logic changes to `setNewSheetOpen` / create flow.

## 5. Data table horizontal scrolling on mobile
File: `src/routes/_authenticated/index.tsx` (line 1464) — the QATable wrapper.

- Change `<div className="flex-1 min-w-0 overflow-hidden">` to `<div className="flex-1 min-w-0 w-full overflow-x-auto overflow-y-auto">`.
- `QATable` itself already renders `<table className="w-max min-w-full …">` inside a `h-full overflow-auto` container; the parent's `overflow-hidden` was clipping horizontal scroll on mobile. Switching to `overflow-x-auto` lets users swipe horizontally without expanding the page width (the outer flex column already has `min-w-0`, preventing layout stretch).

No changes inside `QATable.tsx`.

## Out of scope
- No changes to data fetching, webhooks, auth, or any non-UI logic.
- No desktop layout changes beyond the shared dialog width tweak in #4 (still uses `sm:max-w-md` on desktop).
- No new dependencies.
