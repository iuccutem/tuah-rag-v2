# Plan

## 1. Re-run webhooks on already-answered rows

Currently the Run Web / Run WA/TG / Run Both buttons in `src/routes/index.tsx` only appear when selected rows have a missing answer. This blocks re-generating answers for already-filled rows.

**Change:** When any row is selected, always show all three buttons (Run Web, Run WA/TG, Run Both) regardless of whether the answers are empty or filled. Webhook trigger logic stays unchanged.

## 2. Email + password authentication (Lovable Cloud)

Enable **Lovable Cloud** (built-in database & auth — no external accounts) and gate the dashboard behind login.

**Auth storage:** Lovable Cloud's built-in `auth.users` only. No extra profile table, no roles — just email + password as requested.

**Pages**
- `/auth` — single page with two tabs: **Login** and **Register** (email + password each). Uses `supabase.auth.signInWithPassword` and `supabase.auth.signUp`.
- After login/register success → redirect to `/`.
- Email confirmation will be **disabled** so registration logs the user straight in (simpler for a small internal tool — say so if you'd rather require email verification).

**Route protection**
- Move dashboard from `src/routes/index.tsx` into `src/routes/_authenticated/index.tsx` so it inherits the Cloud-managed `_authenticated/route.tsx` gate. Unauthenticated visitors redirect to `/auth`.
- Add a small **Sign out** button in the dashboard header.

## Technical notes
- `src/routes/index.tsx`: simplify run-toolbar visibility to `hasSelection` only; drop `needsWeb`/`needsTg` gating on button rendering. Keep `runChannel` logic intact.
- Enable Lovable Cloud → scaffolds Supabase client, `_authenticated/route.tsx` gate, and `attachSupabaseAuth` middleware.
- New files: `src/routes/auth.tsx`, `src/routes/_authenticated/index.tsx` (moved).
- Add `onAuthStateChange` listener in `__root.tsx` for cache invalidation on sign-in/out.

Confirm and I'll implement.
