/**
 * api/health.ts — a tiny JSON liveness check at /api/health, so agents and uptime
 * monitors can confirm the server is up without doing the MCP initialize handshake.
 */
function handler(): Response {
  return new Response(
    JSON.stringify({ status: "ok", name: "neuromancer-mcp", version: "0.1.0" }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

export { handler as GET };
