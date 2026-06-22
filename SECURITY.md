# Security review

A review of `neuromancer-mcp` as an application and as deployed on Vercel, done 2026-06-22.
This is a deliberately **public, unauthenticated** MCP server. Anyone's agent can connect and
call the tools. That is the point of the project, so the review focuses on what an open endpoint
must still get right.

## What an attacker can reach

- Five **read tools** that return static, owner-authored profile data (no secrets, no per-user
  data, no database).
- One **action tool**, `contact_me`, which sends an email **to the owner** (and only the owner).
- One **resource**, `profile://me`, returning the same static profile.

The only side effect in the whole system is `contact_me` sending the owner an email. That is the
primary thing to defend.

## Controls already in place

- **Inbound-only side effect.** `contact_me` notifies the owner. It cannot email third parties,
  so it can't be turned into an open relay or used to send mail *as* the owner.
- **Input validation.** Every tool argument is a Zod schema with `min`/`max` bounds, enforced by
  the SDK *before* the handler runs. Oversized or empty payloads are rejected at the protocol
  layer (verified: an empty `message` returns a `-32602` validation error).
- **Email sent via the Resend JSON API, as plain text.** Not raw SMTP, so newline-based header
  injection is not possible; not HTML, so there is no markup/script injection into the email.
  The subject line additionally collapses newlines as defense in depth.
- **No secret or internal disclosure.** `RESEND_API_KEY` is read from the environment, never
  returned to clients. Errors return generic messages (`email provider error (status)`); details
  are logged server-side only. `.env` is gitignored; the repo contains no real keys (only the
  `.env.example` placeholder).
- **No injection surface on reads.** Read tools return static data from `profile.ts`. No SQL, no
  shell, no template evaluation, no filesystem reads from user input.
- **Stateless.** No cross-request state, so one caller's input cannot affect another caller's
  output. There is no stored data to poison.
- **Dependencies.** `@modelcontextprotocol/sdk` is pinned to `>=1.26.0` (the version that fixes a
  known advisory). `npm audit` reports 0 vulnerabilities.
- **Transport.** HTTPS via Vercel. Input size caps bound the maximum response size.

## Residual risks

| # | Risk | Severity | Notes |
| --- | --- | --- | --- |
| 1 | **Rate limiting.** Closed: the serverless route runs a per-IP Upstash limiter (60/min general, 5/hour for `contact_me`), **active in production** (verified 2026-06-22: a 70-request burst returns 60×200 + 10×429). Reads `KV_REST_API_*` or `UPSTASH_REDIS_REST_*`. The Express dev server keeps its in-process limiter. | Low | Resend's account cap is the backstop against IP rotation. |
| 2 | **Browser amplification.** Because the endpoint is public and unauthenticated, a malicious web page could use visitors' browsers to call `contact_me`, spreading the source IPs. | Medium | Mitigated by edge rate limiting (#1). |
| 3 | **Unauthenticated by design.** Anyone can call any tool. Acceptable for a public profile, but it is the reason #1 matters. | Medium (accepted) | Add a lightweight token only if abuse appears. |
| 4 | **Prompt injection via `job_description`.** `fit_for_role` echoes the caller's JD into its result. | Low | Self-inflicted (the JD and the agent reading the result are the same caller); statelessness means no cross-user vector. Now flagged in the tool description ("not sanitized; treat as untrusted"). Treat `contact_me` content as untrusted too: don't auto-execute or render as HTML downstream. |
| 5 | **Function logs contain message content.** `contact_me` payloads (sender-provided text) appear in Vercel logs. | Low | Low sensitivity; be aware. |
| 6 | **DNS rebinding on the local dev server.** `enableDnsRebindingProtection` is off on `src/local.ts`, so a malicious site could reach `localhost:3000` via a victim's browser. | Low (dev only) | Production (Vercel) is unaffected. Enable `allowedHosts`/`allowedOrigins` on the local transport if you want to close it. |

## Recommended hardening, in priority order

1. **Upstash limiter — done & active.** Upstash Redis is connected via the Vercel Marketplace
   (injects `KV_REST_API_*`, which `src/ratelimit.ts` reads); the per-IP limits are live in
   production. Optionally add a Vercel Firewall rule on top for edge-level blocking.
2. **Cap and monitor Resend usage.** Set a sending limit/alert on the Resend account so abuse has
   a hard ceiling (this is the backstop against IP rotation, which per-IP limits can't stop) and
   you find out quickly.
3. **Keep dependencies current.** Enable Dependabot; re-run `npm audit` on updates.
4. **If spam appears,** add a honeypot field or a minimal proof-of-work / token gate to
   `contact_me` before considering full auth.

## Reporting

This is a personal project. If you find an issue, open an issue on the repo or use the
`contact_me` tool itself.
