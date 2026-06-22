# neuromancer-mcp

**Your résumé, as a remote MCP server.** Most job-search MCPs point one way — a
candidate's agent auto-applies to job boards, or a recruiter's agent screens a stack of
résumés. This flips it: you publish *yourself* as a remote [Model Context
Protocol](https://modelcontextprotocol.io) server, and a company's agent connects with
one command to learn about you — and reach out.

```bash
claude mcp add --transport http you https://mcp.example.com/mcp
```

Then, in their agent: *"What has this person done with agents? If they look like a fit
for our role, get in touch."*

> **Honest expectations:** no recruiter *has* to use this, and there's no discovery layer
> that routes agents to personal MCP servers yet. But anyone who *would* bother is exactly
> the audience worth reaching — and making yourself agent-addressable is itself the signal.
> This is a high-signal, low-volume channel and a working reference implementation, not a
> traffic firehose.

## Tools

| Tool | Input | What it does |
| --- | --- | --- |
| `about_me` | — | Short bio + key links. The "who is this?" entry point. |
| `get_experience` | `area?` | Work experience, optionally filtered to one area. |
| `contact_me` | _(coming next)_ | Notifies the owner that someone wants to connect. |

## Run it locally

```bash
npm install
npm run dev          # starts http://localhost:3000/mcp
```

Smoke-test without an agent (raw JSON-RPC over the Streamable HTTP transport):

```bash
# list the tools
curl -s http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Make it yours (the template)

Fork, then edit **one file** — [`src/profile.ts`](src/profile.ts). It's the single source
of truth for everything the server exposes. The server never invents or fetches anything;
it only reads from `profile.ts`. Deploy, and put the `claude mcp add` line on your site.

## How it works

- **Transport:** Streamable HTTP, **stateless** (`sessionIdGenerator: undefined`). Every
  message is a `POST /mcp`; we return plain JSON. A fresh server + transport is built per
  request, so concurrent callers never collide — and it drops straight onto serverless.
- **Data:** static, owner-controlled (`src/profile.ts`). No live LLM, no database — cheap,
  reproducible, and nothing to abuse on the read path.

## License

MIT
