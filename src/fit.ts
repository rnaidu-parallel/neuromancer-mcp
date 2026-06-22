/**
 * fit.ts — pure, LLM-free matching of a job description against the profile.
 *
 * Design choice (c): this tool does NOT call any LLM. It returns the ranked, relevant
 * slice of the profile plus an honest, keyword-based "not evidenced here" signal. The
 * agent that called the tool already has a model — it synthesizes the "why a fit"
 * narrative over this structured context, in its own client, for free. That's how we
 * get LLM-quality output with zero server cost, zero API keys, and no dependency on
 * sparsely-supported MCP sampling.
 *
 * The matching is intentionally simple (token overlap), and the result is labelled as
 * keyword-based so the agent treats it as evidence, not a verdict. Honest by construction.
 */
import { profile, type Experience, type Project } from "./profile.js";

// Small stopword set so common words don't inflate match scores.
const STOPWORDS = new Set([
  "the", "and", "for", "with", "you", "our", "are", "will", "have", "has",
  "this", "that", "from", "your", "who", "what", "how", "all", "any", "can",
  "job", "role", "team", "work", "working", "experience", "years", "year",
  "looking", "ideal", "candidate", "responsibilities", "requirements", "plus",
  "etc", "able", "strong", "good", "great", "must", "should", "well", "into",
  "senior", "junior", "lead", "staff", "need", "needs", "plus", "and/or",
]);

/**
 * Lowercase and split into tokens. We keep internal "." / "+" / "#" so "node.js",
 * "c++", "c#" survive, but trim boundary dots so "systems." matches "systems".
 * Then drop stopwords and very short tokens.
 */
function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9+#.]+/g) ?? [])
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function tokenSet(text: string): Set<string> {
  return new Set(tokenize(text));
}

/** Overlap of a corpus string against the JD token set: count + which terms hit. */
function overlap(jd: Set<string>, corpus: string): { score: number; matched: string[] } {
  const matched = [...new Set(tokenize(corpus))].filter((t) => jd.has(t));
  return { score: matched.length, matched };
}

export interface FitResult {
  relevantExperience: Array<{
    role: string;
    area: string;
    summary: string;
    matched: string[];
  }>;
  relevantProjects: Array<{
    name: string;
    url?: string;
    oneLiner: string;
    matched: string[];
  }>;
  matchedSkills: string[];
  /** Prominent JD terms not evidenced anywhere in the profile (keyword-based). */
  notEvidenced: string[];
}

export function fitForRole(jobDescription: string): FitResult {
  const jd = tokenSet(jobDescription);

  // Rank experience by how much of the JD it touches.
  const relevantExperience = profile.experience
    .map((e: Experience) => {
      const { score, matched } = overlap(
        jd,
        [e.area, e.role, e.summary, ...e.highlights].join(" "),
      );
      return { e, score, matched };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ e, matched }) => ({
      role: e.role,
      area: e.area,
      summary: e.summary,
      matched,
    }));

  const relevantProjects = profile.projects
    .map((p: Project) => {
      const { score, matched } = overlap(
        jd,
        [p.name, p.oneLiner, ...p.tags].join(" "),
      );
      return { p, score, matched };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ p, matched }) => ({
      name: p.name,
      url: p.url,
      oneLiner: p.oneLiner,
      matched,
    }));

  const matchedSkills = profile.skills.filter((s) =>
    tokenize(s).some((t) => jd.has(t)),
  );

  // Honest gap signal: the JD's most frequent meaningful terms that appear
  // nowhere in the profile's own vocabulary. Keyword-based, so we label it.
  const profileVocab = new Set(
    tokenize(
      [
        profile.headline,
        profile.bio,
        ...profile.skills,
        ...profile.experience.flatMap((e) => [
          e.area,
          e.role,
          e.summary,
          ...e.highlights,
        ]),
        ...profile.projects.flatMap((p) => [p.name, p.oneLiner, ...p.tags]),
      ].join(" "),
    ),
  );

  const freq = new Map<string, number>();
  for (const t of tokenize(jobDescription)) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  const notEvidenced = [...freq.entries()]
    .filter(([t]) => !profileVocab.has(t))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([t]) => t);

  return { relevantExperience, relevantProjects, matchedSkills, notEvidenced };
}
