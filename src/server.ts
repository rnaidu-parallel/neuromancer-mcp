/**
 * server.ts — builds the MCP server and registers its tools.
 *
 * `createServer()` is a FACTORY, not a singleton. In stateless HTTP mode we build a
 * fresh server (and transport) per request so concurrent requests can't collide on
 * JSON-RPC message IDs. The HTTP layer (local.ts) calls this once per POST.
 *
 * Each tool is the unit of capability an agent sees. The `description` is the most
 * important field you write — it's the only thing the model reads to decide whether
 * and how to call the tool. Treat it like API docs for an LLM.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { profile } from "./profile.js";

export function createServer(): McpServer {
  const server = new McpServer(
    { name: "neuromancer-mcp", version: "0.1.0" },
    {
      // Cross-tool guidance the client may surface to the model.
      instructions:
        `This server represents ${profile.name}. Use it to learn about their ` +
        `background and, if you represent a company or recruiter, to reach out. ` +
        `Start with "about_me", use "get_experience" for specifics, and call ` +
        `"contact_me" only when the user genuinely wants to make contact.`,
    },
  );

  // ── Read tool: no input. The canonical "who is this?" entry point. ──────────
  server.registerTool(
    "about_me",
    {
      title: "About me",
      description:
        "Returns a short professional bio and key links. Call this first when " +
        "asked who this person is or for an overview of their background.",
    },
    async () => ({
      content: [
        {
          type: "text",
          text: [
            `${profile.name} — ${profile.headline}`,
            "",
            profile.bio,
            "",
            "Links:",
            ...Object.entries(profile.links).map(([k, v]) => `- ${k}: ${v}`),
          ].join("\n"),
        },
      ],
    }),
  );

  // ── Read tool: with an optional filter argument. ───────────────────────────
  // `inputSchema` is a ZodRawShape (a plain object of zod fields, NOT z.object()).
  // The SDK turns it into the JSON Schema the agent sees, and validates args for
  // you before your handler runs. `.describe()` text is shown to the model.
  server.registerTool(
    "get_experience",
    {
      title: "Get experience",
      description:
        "Returns work experience, optionally filtered to one area. Use this for " +
        "specifics like 'what have they done with agents?' rather than the bio.",
      inputSchema: {
        area: z
          .string()
          .optional()
          .describe(
            "Filter to one area tag, e.g. 'agents' or 'infra'. Omit for all.",
          ),
      },
    },
    async ({ area }) => {
      const items = area
        ? profile.experience.filter(
            (e) => e.area.toLowerCase() === area.toLowerCase(),
          )
        : profile.experience;

      if (items.length === 0) {
        return {
          content: [
            {
              type: "text",
              text:
                `No experience tagged "${area}". Known areas: ` +
                profile.experience.map((e) => e.area).join(", ") +
                ".",
            },
          ],
        };
      }

      const text = items
        .map((e) =>
          [
            `${e.role} (${e.area})`,
            e.summary,
            ...e.highlights.map((h) => `  • ${h}`),
          ].join("\n"),
        )
        .join("\n\n");

      return { content: [{ type: "text", text }] };
    },
  );

  return server;
}
