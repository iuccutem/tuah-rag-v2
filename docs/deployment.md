# Deployment

There are two supported targets: **Lovable hosting** (default) and a
**self-hosted university deploy** behind Nginx.

## 1. Lovable hosting (recommended)

The app is built and deployed through Lovable:

- **Preview**: every change updates `https://id-preview--<project-id>.lovable.app`.
- **Published**: clicking **Publish** in Lovable promotes the latest build to:
  - `https://tuah-rag.lovable.app` (Lovable subdomain)
  - `https://rag.ainibot.com` (custom domain)

Frontend changes require a **Publish → Update** to go live. Edge Function
changes deploy immediately and automatically — no manual step.

### Edge Function secrets (Lovable Cloud)

Configure these once in Lovable Cloud; they are read by the edge functions via
`Deno.env.get(...)`:

- `N8N_WEBHOOK_USER`, `N8N_WEBHOOK_PASSWORD`
- `N8N_JWT_SECRET`
- `LOVABLE_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` *(auto-provisioned)*

Browser build-time values live in `.env`:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` *(auto-written by the Lovable Cloud connection)*
- `VITE_BASE_PATH` — leave as `/` for Lovable hosting

## 2. Self-hosted university deploy

Serves the same SPA under `https://<uni-host>/rag-builder/` with a Node/Express
API on `127.0.0.1:6699` behind Nginx.

### Build

```bash
bun run build:prod          # sets VITE_BASE_PATH=/rag-builder/
```

Copy `dist/` to the web root (e.g. `/var/www/rag-builder/`).

### Run the API

```bash
cd server
cp .env.example .env        # fill in secrets — see below
npm install
npm run build
node dist/index.js          # or manage with pm2 / systemd
```

### Express server env (self-host only)

| Variable | Purpose |
|---|---|
| `PORT` | Default `6699` |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Auth + admin ops |
| `N8N_WEBHOOK_USER`, `N8N_WEBHOOK_PASSWORD`, `N8N_JWT_SECRET` | n8n auth |
| `LOVABLE_API_KEY` | AI Gateway (used by `n8n-export`) |

### Nginx snippet

```nginx
location /rag-builder/ {
  alias /var/www/rag-builder/;
  try_files $uri $uri/ /rag-builder/index.html;
}

location /rag-builder/api/ {
  proxy_pass http://127.0.0.1:6699/api/;
  proxy_set_header Host $host;
  proxy_set_header Authorization $http_authorization;
}
```

See [`server/README.md`](../server/README.md) for the full server setup.

## Local production preview

```bash
bun run build
bun run preview
```

## Custom domain

`rag.ainibot.com` is wired through the Lovable publish settings. Changing it
does not require code edits.
