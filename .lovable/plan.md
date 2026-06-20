## Plan

**File:** `src/routes/auth.tsx`

1. **Password preview toggle**
   - Add `showPassword` state (boolean, default false).
   - Wrap the password `<Input>` in a relative container; render an `Eye` / `EyeOff` icon button (lucide-react) positioned absolute right-2.
   - Toggle `type` between `"password"` and `"text"` based on `showPassword`.
   - Add right padding to the input so text doesn't sit under the icon.
   - Icon button is `type="button"`, with `aria-label` "Show password" / "Hide password".

2. **Light/dark mode toggle on login page**
   - Import `useTheme` from `@/hooks/use-theme` and `Sun` / `Moon` from `lucide-react`.
   - Add a small icon button in the top-right corner of the auth page (absolute positioned, or in the card header) that calls `toggle()` and swaps Sun/Moon based on current theme.
   - Reuses the same hook/behaviour as the dashboard toggle for consistency.

**Out of scope:** no changes to auth logic, sign-in flow, or styling system.