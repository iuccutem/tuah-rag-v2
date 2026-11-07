import type { CallToolResult } from "npm:@modelcontextprotocol/server@2.0.0";

export function jsonResult(value: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value) ?? "null" }],
    structuredContent: value ?? null,
  };
}

export function errorResult(message: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

export function runtimeErrorResult(error: unknown): CallToolResult {
  const message =
    error instanceof Error ? error.message : "The upstream service could not be reached.";
  return errorResult(message);
}
