# RAG Builder — API Server

Standalone Node/Express service that hosts every `/api/*` endpoint the SPA needs
(n8n webhook proxies, admin user creation, RAG export). Runs alongside Nginx on
the university host and is reverse-proxied under `/rag-builder/api/*`.

## Setup

```bash
cd server
cp .env.example .env   # fill in secrets
npm install
npm run dev            # tsx watch on http://127.0.0.1:6699
```

## Production

```bash
npm run build          # tsc -> dist/
node dist/index.js     # or use pm2 / systemd
```

## Environment

| Variable | Purpose |
|---|---|
| `PORT` | Listen port (default `6699`). |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable/anon key (unused for now, reserved for auth-verify middleware). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key. Used by `admin-users` to create accounts. |
| `N8N_WEBHOOK_USER` / `N8N_WEBHOOK_PASSWORD` | Basic-auth credentials for the n8n webhooks. |
| `N8N_JWT_SECRET` | HS256 secret for signing short-lived JWTs to n8n. |
| `LOVABLE_API_KEY` | Lovable AI gateway key, if any handler calls the gateway. |

## Nginx (reference)

```nginx
location /rag-builder/api/ {
  proxy_pass http://127.0.0.1:6699/api/;
  proxy_set_header Host $host;
  proxy_set_header Authorization $http_authorization;
}
```

## Routes

Handlers are auto-registered from `src/handlers/*.ts`. Filename becomes the
route path: `n8n-qa.ts` -> `GET /api/n8n-qa`, `admin-users.ts` ->
`POST /api/admin-users`, etc. Each handler exports:

```ts
export const method = "GET" | "POST" | ...;
export const handler = async ({ request }: { request: Request }): Promise<Response> => { ... };
```

The Express bootstrap in `src/index.ts` converts each incoming request into a
Web `Request` object and forwards the returned `Response` back to Express, so
handlers use the same fetch-style API as the previous TanStack Start routes.
