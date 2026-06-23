# Deploying neuromancer-mcp

Production runs on **Vercel** as a serverless function. Local dev uses the Express server
(`npm run dev`); production uses [`mcp-handler`](https://github.com/vercel/mcp-handler) via
`api/mcp.ts`. Both register the exact same tools through `src/capabilities.ts`, so there is one
source of truth for the surface.

The deployed endpoint is:

```
https://<your-domain>/api/mcp
```

## 1. Import the project

1. Push this repo to GitHub (already done for the canonical copy).
2. In the Vercel dashboard: **Add New > Project**, pick the repo.
3. **Framework Preset: Other.** Leave Build Command empty and Output Directory empty
   (this is a functions-only project; `vercel.json` already sets `buildCommand` to empty).
   Install Command stays `npm install`.

`vercel.json` pins the function and its `maxDuration`, so there is nothing else to configure
at build time.

## 2. Environment variables

`contact_me` sends email through [Resend](https://resend.com). Without these set, the server
still runs and `contact_me` falls back to a dry run that logs the message instead of sending,
so a first deploy works even before you add keys.

| Variable | Required | Value |
| --- | --- | --- |
| `RESEND_API_KEY` | for real email | A Resend API key from **your own** Resend account. |
| `CONTACT_TO_EMAIL` | for real email | The inbox where contact notifications should land. |
| `CONTACT_FROM_EMAIL` | optional | A verified sender on that Resend account. Defaults to Resend's test sender, which only delivers to your own account email. |
| `UPSTASH_REDIS_REST_URL` | for rate limiting | Set automatically when you connect Upstash via the Vercel Marketplace. |
| `UPSTASH_REDIS_REST_TOKEN` | for rate limiting | Set automatically with the URL above. |

Add them either way:

**Dashboard:** Project > Settings > Environment Variables. Add each one for the
**Production** environment (add **Preview** too if you want preview deploys to send email).
Redeploy after adding, so the new values are picked up.

**CLI:**

```bash
vercel env add RESEND_API_KEY production
vercel env add CONTACT_TO_EMAIL production
vercel env add CONTACT_FROM_EMAIL production
# pull them into a local .env for local testing:
vercel env pull .env
```

Never commit `.env`. It is gitignored.

## 3. Deploy

Pushing to the connected branch auto-deploys. Or from the CLI:

```bash
vercel        # preview deploy
vercel --prod # production deploy
```

## 4. Custom domain

Add `mcp.neuromancer.in` under Project > Settings > Domains, then create the DNS record Vercel
shows (a CNAME to Vercel). Same pattern as `cache.neuromancer.in`. The endpoint becomes
`https://mcp.neuromancer.in/api/mcp`.

## 5. Turn off Deployment Protection for the endpoint

Vercel **Deployment Protection** (Vercel Authentication) blocks MCP clients, because they cannot
pass the auth challenge. Either disable protection for this project, or use the production URL
(protection usually applies to preview URLs). Confirm an unauthenticated request succeeds before
sharing the link.

## 6. Verify

```bash
curl -s https://mcp.neuromancer.in/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

You should get the eight tools back. Then connect a client:

```bash
claude mcp add --transport http rahul https://mcp.neuromancer.in/api/mcp
```

## Notes

- **Rate limiting:** the serverless route runs a per-IP Upstash limiter (`src/ratelimit.ts`:
  60/min general, 5/hour for `contact_me`). It is a **no-op until activated** — connect Upstash
  Redis via the Vercel Marketplace (free tier), which sets `UPSTASH_REDIS_REST_URL` /
  `UPSTASH_REDIS_REST_TOKEN`, then redeploy. Set a sending cap on the Resend account too, as the
  backstop against IP rotation. (The local Express server keeps its own in-process limiter.)
- **Local dev is unchanged:** `npm run dev` still serves `http://localhost:3000/mcp` via Express.
  `api/mcp.ts` is only used on Vercel.
