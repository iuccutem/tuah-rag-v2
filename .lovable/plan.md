## Remove amber dev-mode tint from dashboard

The dashboard root wrapper in `src/routes/_authenticated/index.tsx` (line 1211) applies `className="dev-mode ..."` unconditionally. The `.dev-mode` and `.dark .dev-mode` blocks in `src/styles.css` override background/card/border tokens with amber-tinted values, so the whole authenticated app renders with an amber cast — even in dark mode where the user wants pure near-black.

### Change

1. `src/routes/_authenticated/index.tsx` line 1211 — drop `dev-mode` from the className, keeping the rest:
   `<div className="flex h-screen min-h-screen flex-col bg-background text-foreground">`

2. `src/styles.css` — remove the now-unused `.dev-mode { … }` and `.dark .dev-mode { … }` blocks (lines 181–214).

### Not changed
- `.dark` palette (already the Tuah neutral black from the previous change).
- Light theme, semantic tokens, component code, `isDev` logic (that flag is separate and stays `false`).

Result: after login, the dashboard uses the standard dark theme — clean near-black background and neutral gray panels — with no amber tint.
