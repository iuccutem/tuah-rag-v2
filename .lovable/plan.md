## Switch dark theme to Tuah-style pure black

The current dark theme uses a bluish navy (`oklch(0.129 0.042 264.695)`). The Tuah dashboard reference is near-pure black with neutral gray surfaces — no blue tint.

### Change

Edit `src/styles.css` `.dark { … }` block only. Light theme, dev-mode overrides, and shadcn `@theme inline` mapping stay unchanged. Replace the bluish tokens with a neutral near-black palette:

| Token | Now (bluish) | New (Tuah neutral black) |
|---|---|---|
| `--background` | `oklch(0.129 0.042 264.695)` | `oklch(0.06 0 0)` — near pure black |
| `--card` / `--popover` / `--sidebar` | `oklch(0.208 0.042 265.755)` | `oklch(0.11 0 0)` — slightly lifted panel |
| `--secondary` / `--muted` / `--accent` / `--sidebar-accent` | `oklch(0.279 0.041 260.031)` | `oklch(0.16 0 0)` — neutral gray fill |
| `--muted-foreground` | `oklch(0.704 0.04 256.788)` | `oklch(0.68 0 0)` |
| `--primary-foreground` | `oklch(0.208 0.042 265.755)` | `oklch(0.11 0 0)` |
| `--border` / `--sidebar-border` | `oklch(1 0 0 / 10%)` | keep (already neutral) |
| `--input` | `oklch(1 0 0 / 15%)` | keep |
| `--ring` / `--sidebar-ring` | `oklch(0.551 0.027 264.364)` | `oklch(0.55 0 0)` |
| Chart / destructive / primary accent | unchanged (used for data + brand highlights) |

### Not changed
- Light theme values (`:root`).
- Dev-mode amber overrides (`.dev-mode`, `.dark .dev-mode`).
- Component code — tokens are semantic, no hardcoded colors to touch.
- Theme toggle behavior.

Result: dark mode renders as a clean black canvas with neutral gray cards and borders, matching the Tuah dashboard reference, while primary/destructive brand accents keep their color.
