/**
 * server.ts — builds an MCP server instance for the local Express transport.
 *
 * `createServer()` is a FACTORY, not a singleton. In stateless HTTP mode we build a
 * fresh server (and transport) per request so concurrent requests can't collide on
 * JSON-RPC message IDs. The HTTP layer (local.ts) calls this once per POST.
 *
 * The actual tools + resource live in capabilities.ts so the Vercel route (api/mcp.ts)
 * can register the exact same surface. Define capabilities once, expose them anywhere.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { INSTRUCTIONS, registerCapabilities } from "./capabilities.js";

export function createServer(): McpServer {
  const server = new McpServer(
    { name: "neuromancer-mcp", version: "0.1.0" },
    { instructions: INSTRUCTIONS },
  );
  registerCapabilities(server);
  return server;
}
