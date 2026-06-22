/**
 * profile.test.ts — data-integrity invariants on the single source of truth.
 *
 * profile.ts is the only file a forker edits; these guard the shape the tools rely on
 * (e.g. bullet-level tag filtering needs every highlight to carry lowercase tags).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { profile } from "../src/profile.js";

test("profile: top-level identity fields are present", () => {
  assert.ok(profile.name.length > 0);
  assert.ok(profile.headline.length > 0);
  assert.ok(profile.bio.length > 0);
  assert.match(profile.resumeUrl, /^https?:\/\//);
  assert.match(profile.schedulingUrl, /^https?:\/\//);
});

test("profile: links are non-empty url-ish strings", () => {
  const entries = Object.entries(profile.links);
  assert.ok(entries.length > 0, "expected at least one link");
  for (const [key, url] of entries) {
    assert.ok(key.length > 0);
    assert.match(url, /^https?:\/\//, `link "${key}" should be a URL`);
  }
});

test("profile: every experience role is well-formed", () => {
  assert.ok(profile.experience.length > 0);
  for (const e of profile.experience) {
    assert.ok(e.company.length > 0);
    assert.ok(e.role.length > 0);
    assert.ok(e.dates.length > 0);
    assert.ok(e.summary.length > 0);
    assert.ok(e.highlights.length > 0, `${e.company} should have highlights`);
  }
});

test("profile: every highlight has text and >=1 lowercase tag", () => {
  for (const e of profile.experience) {
    for (const hl of e.highlights) {
      assert.ok(hl.text.length > 0);
      assert.ok(hl.tags.length > 0, `highlight "${hl.text.slice(0, 30)}…" needs tags`);
      for (const tag of hl.tags) {
        assert.equal(tag, tag.toLowerCase(), `tag "${tag}" must be lowercase`);
      }
    }
  }
});

test("profile: every project has a name, one-liner, and tags", () => {
  assert.ok(profile.projects.length > 0);
  for (const p of profile.projects) {
    assert.ok(p.name.length > 0);
    assert.ok(p.oneLiner.length > 0);
    assert.ok(p.tags.length > 0, `${p.name} should have tags`);
    if (p.url !== undefined) assert.match(p.url, /^https?:\/\//);
  }
});

test("profile: skill groups have labels and items; levels are 'core' when set", () => {
  assert.ok(profile.skills.length > 0);
  for (const g of profile.skills) {
    assert.ok(g.label.length > 0);
    assert.ok(g.items.length > 0, `skill group "${g.label}" should have items`);
    for (const i of g.items) {
      assert.ok(i.name.length > 0);
      if (i.level !== undefined) assert.equal(i.level, "core");
    }
  }
});

test("profile: education and achievements are populated", () => {
  assert.ok(profile.education.length > 0);
  for (const ed of profile.education) {
    assert.ok(ed.school.length > 0);
    assert.ok(ed.degree.length > 0);
    assert.ok(ed.dates.length > 0);
  }
  assert.ok(profile.achievements.length > 0);
});

test("profile: availability is complete", () => {
  const a = profile.availability;
  assert.equal(typeof a.open, "boolean");
  assert.ok(a.summary.length > 0);
  assert.ok(a.lookingFor.length > 0);
  assert.ok(a.workMode.length > 0);
  assert.ok(a.timing.length > 0);
  assert.ok(a.notLookingFor.length > 0);
});
