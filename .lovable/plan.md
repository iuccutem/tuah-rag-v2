## Goal
Update the `/auth` login page to feel like a modern SaaS sign-in experience, and rename the product title from "Q&A Evaluation" to "RAG Builder".

## What will change
1. **Title rebrand**
   - Replace `Q&A Evaluation` heading with `RAG Builder`.
   - Update subtitle from generic `Sign in to continue` to a short SaaS-style tagline.

2. **Visual refresh (clean centered card SaaS style)**
   - Keep the centered single-card layout on a full-height page.
   - Replace the flat solid background with a subtle layered background: soft radial gradient + faint blurred color orbs using existing primary/accent tokens, so it works in both light and dark mode without hard-coded colors.
   - Elevate the card: larger padding, rounded-2xl, stronger but soft shadow, and a thin border using semantic tokens.
   - Improve the brand header: keep the Sheets icon (on-brand for the existing app), but enlarge it slightly and stack the icon above the title for a more product-like login hero.
   - Add a small footer line under the form (e.g. "Enter your credentials to access your workspace") for a polished SaaS feel.
   - Keep the existing form fields, password visibility toggle, sign-in button, loading states, error dialog, and theme toggle exactly as they are.

3. **Token hygiene**
   - Convert any inline `var(--sheets-*)` background references to semantic tokens (`bg-background`, `bg-card`, `border-border`, `text-muted-foreground`, etc.) so the page respects the design system and dark mode.

## Files to edit
- `src/routes/auth.tsx`

## Out of scope
- No changes to authentication logic, Supabase calls, or route behavior.
- No changes to the theme toggle position or functionality.
- No new dependencies.

## Acceptance criteria
- Page title reads "RAG Builder".
- Login card is centered, uses semantic tokens, and has a soft SaaS-style background.
- Existing sign-in flow, validation, error dialog, loading state, and theme toggle remain functional.
- TypeScript typecheck passes.