/**
 * redis.ts — a single shared Upstash Redis client (or null when unconfigured).
 *
 * Reads the Vercel Upstash/KV integration names (KV_REST_API_*) or the native Upstash
 * names (UPSTASH_REDIS_REST_*). Returns null if neither is set, so callers degrade to
 * no-ops locally and on un-provisioned deploys. Used by the rate limiter and the
 * contact_me idempotency check.
 */
import { Redis } from "@upstash/redis";

let cached: Redis | null = null;
let tried = false;

export function getRedis(): Redis | null {
  if (tried) return cached;
  tried = true;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) cached = new Redis({ url, token });
  return cached;
}
