# Fix vector list webhook auth (JWT)

## Problem
`GET /api/n8n-vector-list` and the dev process route currently send HTTP Basic auth (`N8N_WEBHOOK_USER` / `N8N_WEBHOOK_PASSWORD`), but the vector list webhook now requires **JWT** auth — hence `403 Forbidden: jwt malformed` in the vector dropdown.

## Changes

### 1. Store the JWT secret
Save `N8N_JWT_SECRET` = `f51enu3ZBE1EPEKFnbsposMbGTZDWX73qtI2HPqq` as a runtime secret via `set_secret` (server-only, never bundled).

### 2. Add a signing helper (`src/lib/n8n-jwt.server.ts`)
- Export `signN8nJwt()` that mints a short-lived HS256 JWT (`iat`, `exp` ~5 min, minimal payload) using `N8N_JWT_SECRET`.
- Implemented with Web Crypto `crypto.subtle` (Workers-compatible — no `jsonwebtoken` npm dep).

### 3. Switch vector list route to JWT
`src/routes/api/n8n-vector-list.ts`:
- Replace the Basic auth header with `Authorization: Bearer <signed JWT>`.
- Drop the `N8N_WEBHOOK_USER` / `N8N_WEBHOOK_PASSWORD` reads here.

### 4. Dev process route
`src/routes/api/n8n-dev-process.ts`: leave on Basic auth for now (that webhook wasn't reported broken). If you'd rather flip it to JWT too, say so and I'll include it.

## CORS question (answer, no code)
CORS only applies to browser → webhook calls. In this app the browser calls **our** TanStack server routes; those routes call n8n **server-to-server**, where CORS is irrelevant. So the allow-list on n8n does not need the Lovable preview/published origins for this app to work — you can leave it as-is or trim it. Only add an origin there if you ever call `tuah.utem.edu.my` directly from browser JS.

## Out of scope
No UI changes. No changes to other n8n routes.
