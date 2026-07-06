# Routes

The app uses **[@tanstack/react-router](https://tanstack.com/router)** with the
file-based route plugin (Vite). Every `.tsx` file in this directory is a route.
Do **not** create `src/pages/`, Next.js `app/layout.tsx`, or Remix conventions —
the only root layout is `src/routes/__root.tsx`, and `routeTree.gen.ts` is
regenerated automatically by the Vite plugin.

This project is a **client-only SPA** — there is no `src/routes/api/` directory.
Backend endpoints live in `supabase/functions/<name>/index.ts` (and, for the
self-hosted deploy, in `server/src/handlers/`). The browser reaches them via
`apiFetch()` in `src/lib/api.ts`.

## Conventions

| File | URL |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` (dynamic — bare `$`, no curly braces) |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment) |
| `files/$.tsx` | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx` | layout route (renders children via `<Outlet />`) |
| `__root.tsx` | app shell — wraps every page; preserve `<Outlet />` |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.
