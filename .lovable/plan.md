## 1. Mount Sonner Toaster globally (fixes missing "Select rows to export." toast)

Root cause: `src/components/ui/sonner.tsx` exports a `Toaster`, but no file mounts it. Every `toast(...)` call in the app silently no-ops, including the new "Select rows to export." error in `exportJson`. Whatever popups the user has seen were likely browser confirms or dialogs, not Sonner toasts.

Fix in `src/routes/__root.tsx` `RootComponent`:
- Import `Toaster` from `@/components/ui/sonner`.
- Render `<Toaster position="top-center" richColors closeButton />` inside `<QueryClientProvider>` next to `<Outlet />`.

After this, the existing guard in `exportJson` (`if (selectedRowIds.size === 0) toast.error("Select rows to export.")`) actually shows. No changes to `exportJson` logic needed.

## 2. Mobile toolbar — mirror full desktop toolbar

Current mobile toolbar (`src/routes/_authenticated/index.tsx`, `flex md:hidden` block around line 1126) is missing several desktop actions. Restructure it so every desktop toolbar capability is reachable on mobile.

Visible buttons (left-to-right): Refresh, Insert, Delete (with badge), Import Excel, Run Text Chat (only when rows selected, with badge), Filters popover (search + dates), and a single overflow `⋮` on the right.

Overflow `⋮` (mobile toolbar) keeps formatting actions: Highlight, Mark error, Clear formatting. Plus a new "Sheets" submenu / section (see #3).

Remove the now-redundant duplicates from the header `⋮` (Upload Excel) — keep header `⋮` focused on account-level actions: Export Excel, Export JSON, Register user, Sign out. Export buttons stay in the header `⋮` on mobile (matching desktop where they're top-right).

Use icon-only buttons with `title=` tooltips to fit narrow widths; labels appear only when there's room (`hidden xs:inline` not needed — just rely on icons + badge).

## 3. Sheet management on mobile

The per-tab `ChevronDown` menu (rename / delete) and `+` add button already exist in the bottom sheet-tabs strip and are shared with desktop, but they're cramped on mobile.

Add a dedicated **Sheets** entry in the mobile toolbar's overflow `⋮` that opens a dropdown listing:
- "New sheet…" → opens `setNewSheetOpen(true)`.
- A separator, then each table in `tables`: clicking switches to it (same logic as the tab button); each row has inline rename + delete icon buttons that trigger `setRenameOpen` / `setDeleteSheetConfirm` the same way the tab dropdown does. Active sheet is marked with a check.

This gives full sheet CRUD from the mobile toolbar without depending on the tiny tab-strip chevrons.

## Out of scope

- No design system / color changes.
- No webhook, export logic, or data-flow changes.
- Desktop toolbar untouched.
- Tab strip at the bottom stays as-is (still works as a quick switcher).
