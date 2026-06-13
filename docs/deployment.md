# Deployment

## Lovable hosting (recommended)

The app is built and deployed through Lovable:

- **Preview**: every change updates `https://id-preview--<project-id>.lovable.app`.
- **Published**: clicking **Publish** in Lovable promotes the latest build to:
  - `https://tuah-rag.lovable.app` (Lovable subdomain)
  - `https://rag.ainibot.com` (custom domain)

Under the hood, Nitro produces a Cloudflare Workers bundle.

## Runtime notes (Cloudflare Workers + nodejs_compat)

The server-side code runs on **workerd**, not a full Node host. Practical implications:

- ✅ Safe: `fetch`, `crypto`, `Buffer`, `stream`, `url`, `zlib`, most Web APIs.
- ❌ Unsafe: `child_process`, `sharp`, `puppeteer`, `fs.watch`, native modules, `os.cpus()`.
- All npm packages must be **fully bundled at build time** — no runtime module resolution exists.

When adding new dependencies, prefer pure-JS or WASM packages that explicitly support edge / Workers runtimes.

## Required secrets at deploy time

Configure these in the hosting environment (Lovable Cloud / Cloudflare):

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `LOVABLE_API_KEY`
- `N8N_WEBHOOK_USER`, `N8N_WEBHOOK_PASSWORD`

The browser-side `VITE_*` mirrors are baked in at build time.

## Local production build

```bash
bun run build
bun run preview
```

## Custom domain

The custom domain `rag.ainibot.com` is wired through the Lovable publish settings. Changing it does not require code edits.
