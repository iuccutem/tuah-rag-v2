# UTeM TUAH RAG Studio MCP connector

This repository includes an authenticated, read-only MCP server for connecting ChatGPT and other MCP clients to verified UTeM TUAH RAG Studio knowledge sources.

## Endpoint

After deployment, use:

```text
https://oqrovjnbwxqtuvnvyzol.supabase.co/functions/v1/mcp
```

The server uses Streamable HTTP and Supabase OAuth 2.1. Users sign in with their existing Studio account and approve access at `https://studio.ainibot.com/oauth/consent`.

## Available tools

- `get_connection_status` confirms authenticated read-only access without returning personal profile data.
- `list_vector_stores` lists verified Studio vector stores.
- `list_knowledge_tables` lists verified Studio knowledge tables.
- `get_knowledge_rows` returns up to 100 rows from one named table.
- `search_knowledge_base` queries a selected vector store and optional table through the existing protected n8n RAG workflow.

The first release deliberately excludes ingestion, update, delete, email, and workflow-execution tools.

## Production activation

1. In Supabase Auth settings, replace the legacy JWT signing secret with an asymmetric ES256 or RS256 signing key if the project still uses HS256.
2. Enable the OAuth 2.1 server, set the authorization path to `/oauth/consent`, and enable dynamic client registration. The matching source configuration is already in `supabase/config.toml`.
3. Confirm the Auth site URL is `https://studio.ainibot.com` and add any preview URLs needed for testing to the redirect allow list.
4. Deploy the `mcp` Edge Function. It must be deployed with JWT verification disabled because the function middleware validates OAuth access tokens itself.
5. Keep the existing `N8N_JWT_SECRET`, `N8N_WEBHOOK_USER`, and `N8N_WEBHOOK_PASSWORD` Supabase secrets configured. Do not expose them in the frontend or commit them to the repository.
6. Publish the frontend so `/oauth/consent` and the safe post-login return flow are available on the production domain.
7. Add the MCP endpoint in ChatGPT Developer mode or your MCP client. Complete the Studio sign-in and consent flow when prompted.

For CLI deployment after linking the project:

```bash
npx supabase functions deploy mcp --no-verify-jwt
```

The OAuth server and signing-key changes are security-sensitive project settings and should be applied in the Supabase dashboard before connecting an external client.

## Local verification

```bash
npm run build
npx deno install --config supabase/functions/mcp/deno.json
npx deno check --config supabase/functions/mcp/deno.json supabase/functions/mcp/index.ts
```

Use a local Supabase stack to exercise the full OAuth redirect flow. The MCP endpoint will return an authorization challenge until a valid user access token is provided.
