/**
 * local.ts — run the server locally over Streamable HTTP.
 *
 * Streamable HTTP is the modern remote MCP transport (SSE is deprecated). Everything
 * the client sends is a POST to /mcp. The response is either plain JSON
 * (enableJsonResponse: true) or an SSE stream — we use JSON since our tools return
 * immediately and don't stream partial results.
 *
 * STATELESS mode (sessionIdGenerator: undefined): no session is tracked between
 * requests. We therefore build a NEW server + transport per POST. Why: a single
 * shared transport would interleave JSON-RPC message IDs across concurrent clients
 * and cross responses. Fresh-per-request is the documented stateless pattern and it
 * maps 1:1 onto serverless (each invocation is naturally isolated) — which is how
 * we'll deploy to Vercel later with almost no change to this file.
 */
import express, { type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";

const PORT = Number(process.env.PORT ?? 3000);

const app = express();
app.use(express.json());

app.post("/mcp", async (req: Request, res: Response) => {
  // One server + transport for THIS request only.
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // <- stateless
    enableJsonResponse: true,
  });

  // Tear everything down when the response closes so we don't leak per-request objects.
  res.on("close", () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("[mcp] request failed:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// Stateless servers have no session to GET a stream from or DELETE — say so clearly.
const methodNotAllowed = (_req: Request, res: Response) =>
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed. This server is stateless; POST to /mcp." },
    id: null,
  });
app.get("/mcp", methodNotAllowed);
app.delete("/mcp", methodNotAllowed);

// A plain health check for humans and uptime monitors (not part of MCP).
app.get("/", (_req, res) => {
  res.type("text/plain").send("neuromancer-mcp is up. POST /mcp to talk to it.\n");
});

app.listen(PORT, () => {
  console.log(`neuromancer-mcp listening on http://localhost:${PORT}/mcp`);
});
