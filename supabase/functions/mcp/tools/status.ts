import type { McpServer } from "npm:@modelcontextprotocol/server@2.0.0";

import { jsonResult } from "./result.ts";
import type { ToolContext } from "./types.ts";

export function registerConnectionStatusTool(server: McpServer, context: ToolContext): void {
  server.registerTool(
    "get_connection_status",
    {
      description:
        "Confirm that the caller is authenticated to UTeM TUAH RAG Studio. Returns no personal profile data.",
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    () =>
      jsonResult({
        authenticated: Boolean(context.userClaims.id),
        service: "UTeM TUAH RAG Studio",
        access: "read-only",
      }),
  );
}
