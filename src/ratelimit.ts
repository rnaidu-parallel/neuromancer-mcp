/**
 * ratelimit.ts — per-IP rate limiting for the Vercel (serverless) endpoint.
 *
 * The in-process limiter in local.ts is useless on serverless (each instance is
 * separate), so production needs a shared store. This uses Upstash Redis via its REST
 * client, which is free-tier friendly and works from serverless.
 *
 * GRACEFUL: if the Upstash env vars are not set, this is a NO-OP — the endpoint keeps
 * working unprotected rather than breaking. So a deploy without Upstash still serves;
 * connect Upstash (Vercel Marketplace sets the env vars) to turn protection on.
 *
 * Two limits, both keyed by client IP:
 *  - general: blocks hammering of the endpoint generally.
 *  - contact: stricter, because contact_me is the only thing that sends email.
 * The ultimate backstop against IP rotation is the Resend account's own sending cap.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let general: Ratelimit | null = null;
let contact: Ratelimit | null = null;
let initialized = false;

function init(): void {
  if (initialized) return;
  initialized = true;
  // Vercel's Upstash/KV integration injects KV_REST_API_*; the native Upstash
  // integration uses UPSTASH_REDIS_REST_*. Accept either so it works wherever it's
  // connected.
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return; // not configured -> no-op
  const redis = new Redis({ url, token });
  general = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: "nm:gen",
    analytics: false,
  });
  contact = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    prefix: "nm:contact",
    analytics: false,
  });
}

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function tooMany(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Rate limit exceeded. Try again later." },
      id: null,
    }),
    { status: 429, headers: { "content-type": "application/json" } },
  );
}

/** Returns a 429 Response if the caller is over a limit, otherwise null. */
export async function rateLimit(request: Request): Promise<Response | null> {
  init();
  if (!general) return null; // Upstash not configured -> no limiting

  const ip = clientIp(request);

  const g = await general.limit(ip);
  if (!g.success) return tooMany();

  // contact_me is the only side effect, so limit it harder. Detect it by reading a
  // CLONE of the body, leaving the original intact for the MCP handler downstream.
  let isContact = false;
  try {
    const body = await request.clone().json();
    isContact =
      body?.method === "tools/call" && body?.params?.name === "contact_me";
  } catch {
    /* not JSON / unreadable -> treat as non-contact */
  }

  if (isContact && contact) {
    const c = await contact.limit(ip);
    if (!c.success) return tooMany();
  }

  return null;
}
