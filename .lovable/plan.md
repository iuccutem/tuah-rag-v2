## RAG Builder — additive enhancements (v2: dynamic faculty filter)

Keep the existing spreadsheet UI, toolbar, colors, and all current logic untouched. Layer on branding, a dynamic faculty dropdown filter, a Faculty column, and an Export JSON button.

### 1. Branding
- Update the visible header text "QA Evaluation" → "RAG Builder" in `src/routes/_authenticated/index.tsx`.
- Update `head().meta` title to "RAG Builder" and refresh the description string.
- No styling / layout changes.

### 2. Dynamic Faculty filter (dropdown, above the table)
- Use the existing shadcn `Select` component (`@/components/ui/select`).
- Placement: just above the `QATable`, below the existing toolbar; left-aligned, label "Filter by Faculty/Office".
- New state: `activeFaculty: string` (default `"all"`).
- Build options dynamically from the **full** `rows` (not filteredRows, so the dropdown stays stable as other filters change):
  ```ts
  const facultyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const f = (r.faculty ?? "").trim();
      if (f) set.add(f);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);
  ```
- The Select shows `All Faculties` first, then the sorted unique values.
- Extend `filteredRows` with one extra condition: when `activeFaculty !== "all"`, keep only rows whose `faculty` matches (case-insensitive compare). All existing search/date filters continue to apply unchanged.
- Switching the filter clears `selection` and `selectedRowIds` to avoid stale references.

### 3. Faculty column (new, inserted next to Question)
- Add to `QARow` type (`src/components/qa-dashboard/QATable.tsx`): `faculty?: string | null`.
- In `src/components/qa-dashboard/qa-columns.tsx`, insert a new `QA_COLUMNS` entry **immediately after `question`**:
  - key: `"faculty"`, label: `"Faculty"`, width: `w-28`.
  - render: a small `Badge` (variant `secondary`) with the value, or `<EmptyCell />` when missing.
  - raw: returns the string for copy/formula bar.
- `QATable.tsx` iterates `QA_COLUMNS`, so the new column appears automatically with the same selection styling pipeline.
- The flag column allow-list in `applyFormat` (`["question", "web", "telegram_whatsapp"]`) is **not** extended — Faculty is metadata only, not flaggable.

### 4. Export JSON button (toolbar, top-right area)
- New button: label "Export JSON", `Download` icon, same `variant="outline" size="sm"` as neighboring toolbar buttons.
- Pure client-side handler:
  1. Take `filteredRows` (already reflects active dropdown + search + date range).
  2. `JSON.stringify(rows, null, 2)` → `Blob({ type: "application/json" })`.
  3. Trigger download named `rag-builder-{faculty}-{YYYYMMDD-HHmm}.json` via a temporary `<a download>`.
- No server call, no webhook.

### 5. Preserve existing functionality
- Insert, Delete, Sync, Highlight, Mark Error, Clear, the n8n flag webhook payload (all 6 booleans), Run flows, overlays, auth/header buttons — all untouched.
- The new Faculty column does not participate in flagging, so `sendRowFlags` / `/api/n8n-flag` payload stays exactly as today.

### Files touched
- `src/routes/_authenticated/index.tsx` — header text, `head()`, `activeFaculty` state, Select dropdown, filter extension, Export JSON button + handler.
- `src/components/qa-dashboard/qa-columns.tsx` — add Faculty column entry.
- `src/components/qa-dashboard/QATable.tsx` — extend `QARow` with `faculty?: string | null`.

### Assumptions
- The n8n webhook will start returning a `faculty` string per row (e.g. `"FTMK"`). Until it does, the dropdown will only show "All Faculties" and the Faculty cell renders empty — no crashes.
- Faculty values are matched case-insensitively against the selected option.
