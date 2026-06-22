/**
 * profile.ts — the single source of truth for everything the server exposes.
 *
 * This is the ONLY file someone forking the template needs to edit. Keep it to
 * public, share-anything facts: no private contact details, no employer-confidential
 * material. The server reads from here; it never invents or fetches anything.
 */

export interface Experience {
  /** Short area tag used for filtering, e.g. "agents", "infra", "frontend". */
  area: string;
  role: string;
  summary: string;
  highlights: string[];
}

export interface Project {
  name: string;
  url?: string;
  oneLiner: string;
}

export interface Profile {
  name: string;
  headline: string;
  /** A few sentences an agent can quote when asked "who is this person?". */
  bio: string;
  links: Record<string, string>;
  experience: Experience[];
  projects: Project[];
  /** Public résumé URL the agent can hand back. */
  resumeUrl: string;
}

// TODO(rahul): expand with your real, public-safe details before deploying.
export const profile: Profile = {
  name: "Rahul",
  headline: "AI engineer — agent systems, LLM serving, and the economics of both.",
  bio:
    "I build production agent systems and write about what actually breaks in them. " +
    "My work focuses on the unglamorous parts: tool-call reliability across models, " +
    "prompt-cache economics, and running capable agents on constrained hardware. " +
    "I publish each piece of work as a small open-source repo plus a deep write-up.",
  links: {
    blog: "https://blog.neuromancer.in",
    linkedin:
      "https://www.linkedin.com/in/rahul-naidu-siriporam-15472116b",
    github: "https://github.com/rnaidu-parallel",
  },
  experience: [
    {
      area: "agents",
      role: "Agent systems engineer",
      summary:
        "Designing and hardening LLM agent pipelines for production use.",
      highlights: [
        "Coercion layer that keeps tool-calls reliable when swapping models.",
        "Memory architecture: always-injected context vs retrieval-on-every-turn.",
      ],
    },
    {
      area: "infra",
      role: "LLM serving & cost",
      summary:
        "The economics of running models — caching, batching, and local inference.",
      highlights: [
        "Prompt-cache discipline cutting input cost 60–80% on real workloads.",
        "Capable local agent on a 6GB consumer GPU; mapped the five binding constraints.",
      ],
    },
  ],
  projects: [
    {
      name: "agent-coercion-layer",
      url: "https://github.com/rnaidu-parallel/agent-coercion-layer",
      oneLiner:
        "Keep tool-calls working when you swap the model underneath an agent.",
    },
    {
      name: "prompt-cache-economics",
      url: "https://github.com/rnaidu-parallel/prompt-cache-economics",
      oneLiner:
        "A timestamp in your prompt prefix is a 0% cache hit — and it costs you.",
    },
  ],
  resumeUrl: "https://blog.neuromancer.in", // TODO(rahul): point to a real résumé PDF
};
