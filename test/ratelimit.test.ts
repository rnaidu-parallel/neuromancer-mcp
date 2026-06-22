/**
 * ratelimit.test.ts — the limiter degrades to a no-op without Upstash.
 *
 * With no KV_REST_API_* / UPSTASH_REDIS_REST_* vars, rateLimit() must return null (no
 * limiting) so the endpoint keeps serving rather than breaking. The actual 429 path is
 * Upstash-backed and verified live in production (burst test); here we only assert the
 * documented graceful-degradation contract.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimit } from "../src/ratelimit.js";

function req(body?: unknown): Request {
  return new Request("https://example.com/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("rateLimit returns null (no-op) for a general request when unconfigured", async () => {
  assert.equal(await rateLimit(req({ method: "tools/list" })), null);
});

test("rateLimit returns null even for a contact_me call when unconfigured", async () => {
  const body = { method: "tools/call", params: { name: "contact_me" } };
  assert.equal(await rateLimit(req(body)), null);
});

test("rateLimit does not throw on a request with no body", async () => {
  assert.equal(await rateLimit(req()), null);
});
