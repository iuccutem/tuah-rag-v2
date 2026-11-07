import type { McpServer } from "npm:@modelcontextprotocol/server@2.0.0";

import { registerRagTools } from "./rag.ts";
import { registerConnectionStatusTool } from "./status.ts";
import type { ToolContext } from "./types.ts";

export type { ToolContext } from "./types.ts";

export function registerTools(server: McpServer, context: ToolContext): void {
  registerConnectionStatusTool(server, context);
  registerRagTools(server);
}
