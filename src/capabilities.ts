/**
 * capabilities.ts — registers the tools + resource on a given MCP server.
 *
 * This is shared by BOTH entrypoints: the local Express server (src/local.ts, for
 * `npm run dev` + curl) and the Vercel serverless route (api/mcp.ts, for production).
 * Define a capability once here and both transports expose it.
 *
 * Each tool is the unit of capability an agent sees. The `description` is the most
 * important field you write — it's the only thing the model reads to decide whether
 * and how to call the tool. Treat it like API docs for an LLM.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { profile } from "./profile.js";
import { notifyOwner } from "./notify.js";

/** Cross-tool guidance a client may surface to the model (server `instructions`). */
export const INSTRUCTIONS =
  `This server represents ${profile.name}. Use it to learn about their ` +
  `background and, if you represent a company or recruiter, to reach out. ` +
  `Start with "about_me", use "get_experience" for specifics, and call ` +
  `"contact_me" only when the user genuinely wants to make contact.`;

/** The whole profile as one markdown document — backs the profile://me resource. */
function renderProfileMarkdown(): string {
  const p = profile;
  const lines: string[] = [`# ${p.name}`, "", `*${p.headline}*`, "", p.bio, "", "## Links"];
  for (const [k, v] of Object.entries(p.links)) lines.push(`- ${k}: ${v}`);
  lines.push(`- résumé: ${p.resumeUrl}`, "", "## Experience");
  for (const e of p.experience) {
    lines.push(
      `### ${e.role} — ${e.company} (${e.dates}${e.location ? `, ${e.location}` : ""})`,
      e.summary,
    );
    for (const h of e.highlights) lines.push(`- ${h}`);
    lines.push("");
  }
  lines.push("## Projects");
  for (const pr of p.projects) {
    lines.push(`- **${pr.name}**${pr.url ? ` (${pr.url})` : ""} — ${pr.oneLiner}`);
  }
  lines.push("", "## Skills");
  for (const g of p.skills) lines.push(`- ${g.label}: ${g.items.join(", ")}`);
  lines.push("", "## Education");
  for (const ed of p.education) lines.push(`- ${ed.degree}, ${ed.school} (${ed.dates})`);
  lines.push("", "## Achievements");
  for (const a of p.achievements) lines.push(`- ${a}`);
  lines.push(
    "",
    "## Availability",
    p.availability.summary,
    `- Looking for: ${p.availability.lookingFor.join("; ")}`,
    `- Work mode: ${p.availability.workMode}`,
    `- Timing: ${p.availability.timing}`,
    `- Not looking for: ${p.availability.notLookingFor.join("; ")}`,
  );
  return lines.join("\n");
}

/** Register all tools + the profile resource on an MCP server instance. */
export function registerCapabilities(server: McpServer): void {
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
            `Education: ${profile.education
              .map((e) => `${e.degree}, ${e.school}`)
              .join("; ")}`,
            "",
            "Links:",
            ...Object.entries(profile.links).map(([k, v]) => `- ${k}: ${v}`),
            `- résumé: ${profile.resumeUrl}`,
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
            "Filter to one tag, e.g. 'agents', 'data', or 'health'. Omit for all.",
          ),
      },
    },
    async ({ area }) => {
      const items = area
        ? profile.experience.filter((e) =>
            e.tags.some((t) => t.toLowerCase() === area.toLowerCase()),
          )
        : profile.experience;

      if (items.length === 0) {
        const tags = [...new Set(profile.experience.flatMap((e) => e.tags))].join(", ");
        return {
          content: [
            { type: "text", text: `No experience tagged "${area}". Known tags: ${tags}.` },
          ],
        };
      }

      const text = items
        .map((e) =>
          [
            `${e.role} — ${e.company} (${e.dates}${e.location ? `, ${e.location}` : ""})`,
            e.summary,
            ...e.highlights.map((h) => `  • ${h}`),
          ].join("\n"),
        )
        .join("\n\n");

      return { content: [{ type: "text", text }] };
    },
  );

  // ── Read tool: shipped, open-source work. "What has this person built?" ─────
  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description:
        "Lists shipped, open-source projects with links, optionally filtered by tag. " +
        "Use this for 'what has this person built?' — it's proof, not claims.",
      inputSchema: {
        tag: z
          .string()
          .optional()
          .describe("Filter to one tag, e.g. 'agents' or 'infra'. Omit for all."),
      },
    },
    async ({ tag }) => {
      const items = tag
        ? profile.projects.filter((p) =>
            p.tags.some((t) => t.toLowerCase() === tag.toLowerCase()),
          )
        : profile.projects;

      if (items.length === 0) {
        const tags = [...new Set(profile.projects.flatMap((p) => p.tags))].join(", ");
        return {
          content: [
            { type: "text", text: `No projects tagged "${tag}". Known tags: ${tags}.` },
          ],
        };
      }

      const text = items
        .map((p) =>
          [
            `${p.name}${p.url ? ` — ${p.url}` : ""}`,
            `  ${p.oneLiner}`,
            `  tags: ${p.tags.join(", ")}`,
          ].join("\n"),
        )
        .join("\n\n");
      return { content: [{ type: "text", text }] };
    },
  );

  // ── Read tool: assemble context for a fit assessment, then let the CALLING ──
  // agent's LLM do the reasoning. We deliberately do NO matching here — keyword
  // matching is brittle and misses semantic fits ("orchestration" vs "agent
  // pipelines"). The tool hands over the full background + the JD + an instruction
  // to judge honestly, and gets out of the way.
  server.registerTool(
    "fit_for_role",
    {
      title: "Fit for a role",
      description:
        "Given a job description, returns the candidate's full background framed " +
        "against that role for YOU to assess. One call gives you everything needed " +
        "to judge fit honestly — strengths and genuine gaps.",
      inputSchema: {
        job_description: z
          .string()
          .min(1)
          .max(10000)
          .describe("The full job description, or a summary of the role's requirements."),
      },
    },
    async ({ job_description }) => {
      const text = [
        "Assess this candidate against the role below. Give an honest verdict —",
        "real strengths AND genuine gaps. Reason over the full background; don't flatter.",
        "",
        "── ROLE ──",
        job_description,
        "",
        "── CANDIDATE (full background) ──",
        renderProfileMarkdown(),
      ].join("\n");
      return { content: [{ type: "text", text }] };
    },
  );

  // ── Read tool: lets the agent self-qualify before reaching out. ─────────────
  server.registerTool(
    "availability",
    {
      title: "Availability",
      description:
        "What this person is open to: role types, work mode, timing, and what they are " +
        "NOT looking for. Check this to self-qualify before reaching out via contact_me.",
    },
    async () => {
      const a = profile.availability;
      const text = [
        a.open ? "Open to conversations." : "Not actively looking right now.",
        a.summary,
        "",
        `Looking for: ${a.lookingFor.join("; ")}`,
        `Work mode: ${a.workMode}`,
        `Timing: ${a.timing}`,
        `Not looking for: ${a.notLookingFor.join("; ")}`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    },
  );

  // ── Action tool: the ONLY side effect. Inbound-only — notifies the owner, ──
  // never emails third parties. The min/max on inputs are enforced by the SDK
  // before this handler runs, so junk/oversized payloads never reach our code.
  server.registerTool(
    "contact_me",
    {
      title: "Contact me",
      description:
        `Notify ${profile.name} that you want to connect — e.g. you represent a ` +
        `company and see a fit. Call this only when the user genuinely wants to make ` +
        `contact. It notifies ${profile.name} only; it does NOT email anyone else.`,
      inputSchema: {
        from: z
          .string()
          .min(1)
          .max(200)
          .describe("Who you are — your name and company/role."),
        message: z
          .string()
          .min(1)
          .max(2000)
          .describe("Your message: why you're reaching out and what you're proposing."),
        context: z
          .string()
          .max(500)
          .optional()
          .describe("Optional: the role, or what on this profile prompted you to reach out."),
      },
    },
    async ({ from, message, context }) => {
      const result = await notifyOwner({ from, message, context });
      const reply = [
        result.delivered
          ? `Thanks — your message was delivered to ${profile.name}.`
          : `Your message was recorded (${result.detail}). ${profile.name} reviews these.`,
      ];
      if (profile.schedulingUrl) {
        reply.push(`To set up a call directly: ${profile.schedulingUrl}`);
      }
      return { content: [{ type: "text", text: reply.join("\n") }] };
    },
  );

  // ── Resource: the whole profile as one document. App/client-controlled (the ─
  // client decides to read it), in contrast to the model-driven tools above.
  server.registerResource(
    "profile",
    "profile://me",
    {
      title: "Full profile",
      description:
        "The complete profile (bio, experience, projects, skills, availability) as one " +
        "markdown document — for clients that prefer to ground on a resource.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [
        { uri: uri.href, mimeType: "text/markdown", text: renderProfileMarkdown() },
      ],
    }),
  );
}
