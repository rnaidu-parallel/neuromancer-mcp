/**
 * api/mcp.ts — the Vercel serverless entrypoint (production).
 *
 * Vercel runs serverless functions, not a long-lived Express process, so production
 * uses Vercel's mcp-handler instead of src/local.ts. Same tools, same resource: both
 * entrypoints call registerCapabilities(), so there's one source of truth for the
 * surface. Local dev still uses src/local.ts (`npm run dev`); this file is only used
 * once deployed to Vercel.
 *
 * The file lives at /api/mcp, so the deployed endpoint is  https://<host>/api/mcp .
 * mcp-handler returns a Web-standard (Request) => Response handler; Vercel Functions
 * invoke it via the GET/POST/DELETE method exports below.
 */
import { createMcpHandler } from "mcp-handler";
import { registerCapabilities, INSTRUCTIONS } from "../src/capabilities.js";

const handler = createMcpHandler(
  (server) => {
    registerCapabilities(server);
  },
  { instructions: INSTRUCTIONS },
  { basePath: "/api", maxDuration: 60 },
);

export { handler as GET, handler as POST, handler as DELETE };
