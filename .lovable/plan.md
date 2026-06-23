## Changes to `src/routes/_authenticated/index.tsx`

### 1. Excel export filename (line ~991-993)
Replace ISO timestamp stamp with the same DDMMYY stamp used by JSON export, and prefix with the active table tag:

```ts
const now = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
const stamp = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${String(now.getFullYear()).slice(-2)}`;
const rawTable = (activeTable || "all").replace(/^qatest-/, "");
const tableTag = rawTable.replace(/-/g, "_").replace(/[^a-zA-Z0-9_]/g, "_");
a.download = `${tableTag}_q&a_eval_${stamp}.xlsx`;
```
Result for today (23 Jun 2026) with table `perolehanict`: `perolehanict_q&a_eval_230626.xlsx`.

### 2. JSON export filename (line ~331)
Reorder from `q&a_${tableTag}_${stamp}.json` to put the table tag first:

```ts
a.download = `${tableTag}_q&a_${stamp}.json`;
```
Result: `perolehanict_q&a_230626.json`.

### 3. App name rename "RAG Builder" → "RAG Evaluation Builder"
Update three spots:
- Line 81: `title: "RAG Evaluation Builder"`
- Line 85: meta description text prefix
- Line 1015: `<h1>` heading

### Note on date
The user wrote `220622` in the example but today is 23 Jun 2026, so the DDMMYY stamp will render as `230626`. The existing JSON export already uses DDMMYY of "today" — keeping that same format so both files share one timestamp scheme. Let me know if you wanted YYMMDD (`260623`) instead.

### Out of scope
No backend, payload, or column changes. ExcelImportBox untouched.