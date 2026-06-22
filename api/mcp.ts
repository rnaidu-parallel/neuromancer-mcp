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
 * mcp-handler returns a Web-standard (Request) => Response handler. We wrap it with a
 * per-IP rate limiter (no-op until Upstash is configured) and re-export under the
 * GET/POST/DELETE method names Vercel invokes.
 */
import { createMcpHandler } from "mcp-handler";
import { registerCapabilities, INSTRUCTIONS } from "../src/capabilities.js";
import { rateLimit } from "../src/ratelimit.js";

const handler = createMcpHandler(
  (server) => {
    registerCapabilities(server);
  },
  { instructions: INSTRUCTIONS },
  { basePath: "/api", maxDuration: 60 },
);

async function guarded(request: Request): Promise<Response> {
  const limited = await rateLimit(request);
  if (limited) return limited;
  return handler(request);
}

export { guarded as GET, guarded as POST, guarded as DELETE };
