## Q&A Evaluation Dashboard (with Basic Auth proxy)

Dashboard at `/` fetches Q&A rows from the n8n webhook via a server-side proxy that injects HTTP Basic auth. Credentials are stored as runtime secrets so they never reach the browser.

### Secrets (runtime)
Stored via Lovable Cloud secrets — never hardcoded, never in client bundle:
- `N8N_WEBHOOK_USER` → `loveable`
- `N8N_WEBHOOK_PASSWORD` → `patriot2026`

I'll request them via the secret form after you approve the plan.

### Server route (proxy)
`src/routes/api/n8n-qa.ts` — TanStack server route:
- `GET` handler fetches `https://tuah.utem.edu.my/agent/webhook/911d5dbc-b215-4beb-8416-98098fa7d5d0`
- Adds `Authorization: Basic <base64(user:password)>` header from `process.env`
- Returns the JSON array to the client; on failure returns `{ data: [], error }` with a 200 so the UI can render a friendly error
- Sets `Cache-Control: no-store`

This keeps the webhook URL and credentials entirely server-side and sidesteps CORS.

### Page
`src/routes/index.tsx` — replace placeholder. Renders:
- Header: title "Q&A Evaluation Dashboard", subtitle "University staff evaluation results"
- Toolbar: last-updated timestamp + "Refresh Data" button (with spinning icon while loading)
- Card containing the data table

### Data layer
- `useQuery({ queryKey: ['qa-rows'], queryFn: () => fetch('/api/n8n-qa').then(r => r.json()) })`
- Refresh button calls `refetch()`; disabled + spinner while `isFetching`
- States: loading skeleton rows, empty state, error state with retry, success table

### Table columns (English headers)
| n8n field | Column header | Rendering |
|---|---|---|
| `bil` | No. | right-aligned, muted, monospace |
| `soalan` | Question | wrapped text, max-w, leading-relaxed |
| `tarikh_pengujian` | Test Date | `Intl.DateTimeFormat` if parseable, else raw |
| `web_browser` | Web Browser | URL → truncated `<a target="_blank" rel="noopener">` with external-link icon; else text; empty → muted "—" |
| `whatsapp_telegram` | WhatsApp / Telegram | same URL/text handling |

### Components
1. `src/routes/api/n8n-qa.ts` — proxy server route
2. `src/routes/index.tsx` — dashboard page
3. `src/components/qa-dashboard/QATable.tsx` — table presentation
4. `src/components/qa-dashboard/cell-renderers.tsx` — URL/date/empty helpers

### Styling
- shadcn `Table`, `Card`, `Button`, `Skeleton`
- Only semantic tokens from `src/styles.css` (no hard-coded colors)
- Sticky header, hover row highlight, rounded card, horizontal scroll on small screens (your current viewport is 478px wide)

### Out of scope
- No Supabase tables, no localStorage
- No pagination, filtering, sorting (can add later)
- No auth on the dashboard itself (open page, fetched data is read-only)
