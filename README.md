# neuromancer-mcp

Your résumé, as a remote MCP server.

Most job-search tooling built on the [Model Context Protocol](https://modelcontextprotocol.io)
points one way. A candidate's agent auto-applies to job boards, or a recruiter's agent screens a
stack of résumés. This flips the direction. You publish *yourself* as a remote MCP server, and a
company's agent connects with one command to learn about you and, if there's a fit, reach out.

```bash
claude mcp add --transport http you https://mcp.example.com/api/mcp
```

Then, inside their agent:

> "Look up this candidate. What have they shipped with agents? If they fit our staff engineer
> role, get in touch."

The agent calls `about_me`, reads `get_experience` and `list_projects`, runs the role past
`fit_for_role`, checks `availability`, and if it adds up, calls `contact_me`. You get an email.

### Honest expectations

No recruiter *has* to use this, and there is no discovery layer that routes agents to personal
MCP servers today. But anyone who would bother to connect is exactly the kind of person worth
hearing from, and making yourself addressable by an agent is itself the signal. Treat this as a
high-signal, low-volume channel and a working reference implementation, not a traffic firehose.

## What it exposes

Eight tools and one resource. Everything is read-only except `contact_me`. Every tool returns
human/LLM-readable text **and** machine-parseable `structuredContent` (validated against an
`outputSchema`), so both frontier agents and simpler programmatic clients get value.

| Tool | Input | What it does |
| --- | --- | --- |
| `about_me` | none | Short bio, education, and key links. The entry point. |
| `get_profile` | none | The entire profile in one call (text + structured). Use when you want everything at once. |
| `get_experience` | `area?` | Work history, filtered **at the bullet level** by tag (e.g. `agents` returns only the agent bullets, not the whole role). |
| `list_projects` | `tag?` | Public, shipped work with links. Proof, not claims. |
| `search` | `query` | Free-text keyword search across experience, projects, and skills. |
| `fit_for_role` | `job_description` | Returns the full background framed against the role for the calling agent to judge. The server runs no model — a non-LLM client gets context, not a verdict. |
| `availability` | none | What the owner is open to, so an agent can self-qualify before reaching out. |
| `contact_me` | `from`, `message`, `context?` | Notifies the owner by email that someone wants to connect, and returns a booking link. Inbound only, rate-limited, and idempotent (dedupes accidental repeats). |

Plus a resource, `profile://me`, which returns the whole profile as one document for clients that
prefer to ground on a resource instead of calling tools. (Tools-only clients that don't support
resources can use `get_profile` instead.)

A JSON liveness check is at `GET /api/health` (and `GET /health` locally).

## Use it (connecting)

Any MCP client works (Claude Code, Claude Desktop, Cursor, Windsurf, or your own agent). With
Claude Code:

```bash
claude mcp add --transport http <name> https://<host>/api/mcp
# talk to your agent, then remove it with:
claude mcp remove <name>
```

To explore it visually, point the [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
at the same URL:

```bash
npx @modelcontextprotocol/inspector
# Transport: Streamable HTTP, URL: https://<host>/api/mcp
```

(Running locally, the endpoint is `http://localhost:3000/mcp` via the Express dev server.)

## Make it your own (the template)

This repo is built to be forked. The whole profile lives in one file.

1. Fork the repo and edit [`src/profile.ts`](src/profile.ts). It is the single source of truth.
   The server never invents or fetches anything; it only reads from this file. Keep it to public,
   share-anything facts. Private contact details stay out of the file by design (see below).
2. Copy `.env.example` to `.env` and fill in the values you want (see Configuration).
3. Run it locally to check, then deploy it anywhere that runs Node, and put your
   `claude mcp add` line on your site.

## Run and test it locally

Start the dev server (Express, Streamable HTTP):

```bash
npm install
npm run dev          # serves http://localhost:3000/mcp
```

### MCP Inspector (visual)

The fastest way to poke every tool by hand. With the dev server running:

```bash
npx @modelcontextprotocol/inspector
```

It opens a browser UI. Set **Transport: Streamable HTTP**, **URL: `http://localhost:3000/mcp`**,
click **Connect**, and you'll see all eight tools plus the `profile://me` resource, each callable
from a form.

### curl (raw JSON-RPC)

Note the `Accept` header must list both `application/json` and `text/event-stream`.

```bash
# list tools
curl -s http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# call a tool
curl -s http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"about_me","arguments":{}}}'

# read the resource
curl -s http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":3,"method":"resources/read","params":{"uri":"profile://me"}}'
```

### A real agent (local)

Point Claude Code or Codex at the local server, drive it conversationally, then remove it:

```bash
# Claude Code
claude mcp add --transport http rahul-local http://localhost:3000/mcp
claude mcp remove rahul-local

# Codex
codex mcp add rahul-local --url http://localhost:3000/mcp
codex mcp remove rahul-local
```

## Configuration

All optional. With nothing set, the server runs and `contact_me` falls back to a dry run that
logs the message instead of sending it, so the project works the moment you clone it.

| Variable | Purpose |
| --- | --- |
| `PORT` | Local port. Defaults to `3000`. |
| `RESEND_API_KEY` | [Resend](https://resend.com) API key, so `contact_me` can send email. |
| `CONTACT_TO_EMAIL` | Where `contact_me` notifications are delivered (your inbox). |
| `CONTACT_FROM_EMAIL` | Sender address. Must be verified in Resend. Defaults to Resend's test sender, which delivers to your own account email. |

## How it works

- **Transport.** Streamable HTTP in stateless mode (`sessionIdGenerator: undefined`). Every
  message is a `POST /mcp` and the server replies with plain JSON. A fresh server and transport
  are built per request, so concurrent callers never collide on message IDs, and the same code
  drops onto serverless without changes.
- **No reasoning on the server.** `fit_for_role` does not score or keyword-match. It hands the
  calling agent the full background plus the role and asks for an honest verdict. The frontier
  model on the other end does the semantic judgment, which is better than anything a matcher in
  this repo could do.
- **One side effect, inbound only.** `contact_me` notifies the owner. It never emails third
  parties on the owner's behalf. Inputs are length-capped and validated by the schema before the
  handler runs, and a small per-IP rate limit guards the endpoint.
- **Your inbox is not in the code.** Outreach is delivered via `CONTACT_TO_EMAIL` from the
  environment, so a public repo never exposes a scrapable address.

## Deploy

Production runs on Vercel as a serverless function (`api/mcp.ts`), while local dev uses the
Express server. Both register the same tools via `src/capabilities.ts`. See [DEPLOY.md](DEPLOY.md)
for the full walkthrough: import, environment variables, custom domain, and turning off
Deployment Protection.

## License

MIT. See [LICENSE](LICENSE).
