/**
 * notify.test.ts — the only side effect in the server.
 *
 * Covers the dry-run path (no env) and the three fetch outcomes (ok / non-2xx /
 * network throw) with a stubbed global fetch, so no real email is ever sent. We capture
 * the outgoing Resend payload to assert the subject is collapsed to a single line.
 */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { notifyOwner } from "../src/notify.js";
import { quiet } from "./helpers.js";

const realFetch = globalThis.fetch;
const saved = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  CONTACT_TO_EMAIL: process.env.CONTACT_TO_EMAIL,
  CONTACT_FROM_EMAIL: process.env.CONTACT_FROM_EMAIL,
};

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

test("dry run when email env is not configured", async () => {
  delete process.env.RESEND_API_KEY;
  delete process.env.CONTACT_TO_EMAIL;
  let fetched = false;
  globalThis.fetch = (async () => {
    fetched = true;
    return new Response("", { status: 200 });
  }) as typeof fetch;

  const res = await quiet(() => notifyOwner({ from: "A", message: "hi" }));
  assert.equal(res.delivered, false);
  assert.match(res.detail, /not configured/);
  assert.equal(fetched, false, "must not call the email provider on a dry run");
});

test("delivers and reports success on a 2xx from Resend", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.CONTACT_TO_EMAIL = "owner@example.com";
  let captured: any;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    captured = JSON.parse(init.body as string);
    return new Response(JSON.stringify({ id: "abc" }), { status: 200 });
  }) as typeof fetch;

  const res = await notifyOwner({ from: "Jane, Acme", message: "Role fits.", context: "Eng" });
  assert.equal(res.delivered, true);
  assert.equal(res.detail, "email sent");
  assert.deepEqual(captured.to, ["owner@example.com"]);
  assert.match(captured.subject, /Jane, Acme/);
  assert.match(captured.text, /Role fits\./);
  assert.match(captured.text, /Context: Eng/);
});

test("collapses newlines in the subject (single-line subject)", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.CONTACT_TO_EMAIL = "owner@example.com";
  let captured: any;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    captured = JSON.parse(init.body as string);
    return new Response("", { status: 200 });
  }) as typeof fetch;

  await notifyOwner({ from: "Line1\nLine2\r\nLine3", message: "x" });
  assert.doesNotMatch(captured.subject, /[\r\n]/);
  assert.match(captured.subject, /Line1 Line2 Line3/);
});

test("reports provider error (not delivered) on a non-2xx", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.CONTACT_TO_EMAIL = "owner@example.com";
  globalThis.fetch = (async () =>
    new Response("forbidden", { status: 403 })) as typeof fetch;

  const res = await quiet(() => notifyOwner({ from: "A", message: "hi" }));
  assert.equal(res.delivered, false);
  assert.match(res.detail, /403/);
});

test("reports a network error when fetch throws", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.CONTACT_TO_EMAIL = "owner@example.com";
  globalThis.fetch = (async () => {
    throw new Error("boom");
  }) as typeof fetch;

  const res = await quiet(() => notifyOwner({ from: "A", message: "hi" }));
  assert.equal(res.delivered, false);
  assert.match(res.detail, /network error/);
});
