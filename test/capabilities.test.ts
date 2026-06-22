/**
 * capabilities.test.ts — exercises the live tool surface through a real Client/Server
 * pair (in-memory transport). This is the production path: createServer() →
 * registerCapabilities() → JSON-RPC tools/call, with the SDK validating inputs and
 * output schemas. No env is set, so contact_me runs the dry-run + no-dedupe path.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { profile } from "../src/profile.js";
import { connectPair, textOf, quiet, type ConnectedPair } from "./helpers.js";

let pair: ConnectedPair;
const call = (name: string, args?: Record<string, unknown>) =>
  pair.client.callTool({ name, arguments: args ?? {} }) as Promise<{
    content?: Array<{ type: string; text?: string }>;
    structuredContent?: any;
    isError?: boolean;
  }>;

before(async () => {
  pair = await connectPair();
});
after(async () => {
  await pair.close();
});

test("listTools exposes all 8 tools", async () => {
  const { tools } = await pair.client.listTools();
  const names = tools.map((t) => t.name).sort();
  assert.deepEqual(names, [
    "about_me",
    "availability",
    "contact_me",
    "fit_for_role",
    "get_experience",
    "get_profile",
    "list_projects",
    "search",
  ]);
});

test("about_me returns identity in structured + text", async () => {
  const res = await call("about_me");
  assert.equal(res.structuredContent.name, profile.name);
  assert.equal(res.structuredContent.headline, profile.headline);
  assert.equal(res.structuredContent.resumeUrl, profile.resumeUrl);
  assert.ok(Array.isArray(res.structuredContent.education));
  assert.match(textOf(res), new RegExp(profile.name));
});

test("get_experience without a filter returns all roles", async () => {
  const res = await call("get_experience");
  assert.equal(res.structuredContent.roles.length, profile.experience.length);
});

test("get_experience filters at the bullet level", async () => {
  const res = await call("get_experience", { area: "agents" });
  const roles = res.structuredContent.roles as Array<{ highlights: string[] }>;
  assert.ok(roles.length > 0, "expected at least one agent-tagged role");
  // every returned bullet must actually be agent-tagged in the source profile
  const agentBullets = new Set(
    profile.experience.flatMap((e) =>
      e.highlights.filter((hl) => hl.tags.includes("agents")).map((hl) => hl.text),
    ),
  );
  for (const role of roles) {
    assert.ok(role.highlights.length > 0);
    for (const text of role.highlights) {
      assert.ok(agentBullets.has(text), "returned a bullet that isn't agent-tagged");
    }
  }
});

test("get_experience is case-insensitive on the tag", async () => {
  const lower = await call("get_experience", { area: "agents" });
  const upper = await call("get_experience", { area: "AGENTS" });
  assert.deepEqual(upper.structuredContent, lower.structuredContent);
});

test("get_experience with an unknown tag returns empty + lists known tags", async () => {
  const res = await call("get_experience", { area: "does-not-exist" });
  assert.deepEqual(res.structuredContent.roles, []);
  assert.match(textOf(res), /Known tags:/);
});

test("list_projects without a filter returns all projects", async () => {
  const res = await call("list_projects");
  assert.equal(res.structuredContent.projects.length, profile.projects.length);
});

test("list_projects filters by tag (case-insensitive)", async () => {
  const res = await call("list_projects", { tag: "MCP" });
  const projects = res.structuredContent.projects as Array<{ tags: string[] }>;
  assert.ok(projects.length > 0);
  for (const p of projects) {
    assert.ok(p.tags.some((t) => t.toLowerCase() === "mcp"));
  }
});

test("list_projects with an unknown tag returns empty + lists known tags", async () => {
  const res = await call("list_projects", { tag: "nope" });
  assert.deepEqual(res.structuredContent.projects, []);
  assert.match(textOf(res), /Known tags:/);
});

test("search finds a known term across the profile", async () => {
  const res = await call("search", { query: "ClickHouse" });
  const matches = res.structuredContent.matches as Array<{ kind: string; text: string }>;
  assert.ok(matches.length > 0, "expected ClickHouse to be found");
});

test("search returns empty matches + guidance for a miss", async () => {
  const res = await call("search", { query: "zzzznotpresent" });
  assert.deepEqual(res.structuredContent.matches, []);
  assert.match(textOf(res), /No matches/);
});

test("fit_for_role echoes the JD and appends the candidate background", async () => {
  const jd = "UNIQUE_JD_MARKER_42 — backend platform engineer";
  const res = await call("fit_for_role", { job_description: jd });
  const text = textOf(res);
  assert.match(text, /UNIQUE_JD_MARKER_42/);
  assert.match(text, new RegExp(profile.name));
  // by design the server returns no verdict / no structured content
  assert.equal(res.structuredContent, undefined);
});

test("availability mirrors the profile", async () => {
  const res = await call("availability");
  assert.equal(res.structuredContent.open, profile.availability.open);
  assert.deepEqual(res.structuredContent.lookingFor, profile.availability.lookingFor);
  assert.deepEqual(res.structuredContent.notLookingFor, profile.availability.notLookingFor);
});

test("get_profile returns the whole profile in one call", async () => {
  const res = await call("get_profile");
  const s = res.structuredContent;
  assert.equal(s.name, profile.name);
  assert.equal(s.experience.length, profile.experience.length);
  assert.equal(s.projects.length, profile.projects.length);
  assert.equal(s.skills.length, profile.skills.length);
  assert.equal(s.education.length, profile.education.length);
  assert.equal(s.achievements.length, profile.achievements.length);
  assert.ok(textOf(res).startsWith(`# ${profile.name}`));
});

test("contact_me (no email env) records the message, not delivered, not duplicate", async () => {
  const res = await quiet(() =>
    call("contact_me", { from: "Jane Doe, Acme", message: "We have a role that fits." }),
  );
  assert.equal(res.structuredContent.delivered, false);
  assert.equal(res.structuredContent.duplicate, false);
  assert.equal(res.structuredContent.schedulingUrl, profile.schedulingUrl);
});

test("contact_me reports an error for an invalid call (missing required fields)", async () => {
  const res = await call("contact_me", { from: "" });
  assert.equal(res.isError, true);
  assert.match(textOf(res), /validation error/i);
});

test("reading profile://me returns the markdown document", async () => {
  const res = await pair.client.readResource({ uri: "profile://me" });
  const first = res.contents[0] as { mimeType?: string; text?: string };
  assert.equal(first.mimeType, "text/markdown");
  assert.ok((first.text ?? "").startsWith(`# ${profile.name}`));
});
