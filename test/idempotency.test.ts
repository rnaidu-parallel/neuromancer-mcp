/**
 * idempotency.test.ts — dedupe degrades to a no-op without a Redis store.
 *
 * The test env has no KV_REST_API_* / UPSTASH_REDIS_REST_* vars, so getRedis() returns
 * null and isDuplicateContact must allow every send (return false) rather than throw.
 * (The dedupe-hit path needs a live store and is verified end-to-end in production.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isDuplicateContact } from "../src/idempotency.js";

test("isDuplicateContact returns false (allows send) with no store configured", async () => {
  assert.equal(await isDuplicateContact("Jane, Acme", "Hello"), false);
});

test("isDuplicateContact does not throw on repeated identical input (no store)", async () => {
  assert.equal(await isDuplicateContact("X", "same"), false);
  assert.equal(await isDuplicateContact("X", "same"), false);
});
