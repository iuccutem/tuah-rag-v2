## Consolidate duplicate actions and refine toolbar

Scope: `src/routes/_authenticated/index.tsx` only. All existing functionality preserved.

### 1. Unify "Run Questions" (one button, context-aware)

Replace the two separate buttons with a single primary **Run Questions** button in the top-right toolbar:

- **When 0 rows selected** → opens the paste-questions dialog (current insert flow).
- **When ≥1 rows selected** → runs the Text Chat agent on the selected rows (current `setPendingChannel("web")` flow). Button shows spinner + "Running…" while active.
- Button is disabled with the current `vectorDisabledReason` tooltip when no vector store is chosen.

Remove the standalone "Run Text Chat" button from the selection strip.

### 2. Consolidate Format actions

Remove the Format dropdown from the selection strip. Keep only the Cell section (Highlight / Mark error / Clear formatting) inside the top-right **More** menu — as the user chose. These items act on the current selection (same behavior as today).

### 3. Refine toolbar layout (same structure, cleaner)

Same top toolbar structure; tighter visual grouping:

```text
[Sheet ▾] [Vector ▾]  [Search…]  [Dates] [↻]         [ Run Questions ] [Import] [Export] [⋮]
```

- Group left cluster (Sheet, Vector) with a subtle divider before Search.
- Group utility cluster (Dates, Refresh) together, divider before primary actions.
- Primary **Run Questions** styled as filled primary; Import/Export as outline; **⋮** as ghost icon.
- Selection strip below stays, but slimmed down to just: `[N rows selected] [Clear]  •  [ Delete ]  •  Synced …`
  (Run and Format moved out per items 1–2.)
- Consistent heights (h-9 toolbar, h-8 strip), consistent gap-1.5, consistent icon size 4.

### Technical notes

- `insertOpen` dialog stays; trigger is decoupled from `DialogTrigger` and opened conditionally from the unified button's onClick.
- No changes to server functions, webhooks, table logic, format storage, or flag sync.
- No route or component file additions/removals.
