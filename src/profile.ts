/**
 * profile.ts — the single source of truth for everything the server exposes.
 *
 * This is the ONLY file someone forking the template needs to edit. Keep it to public,
 * share-anything facts. Private contact details (phone, email) deliberately live OUTSIDE
 * this file — outreach goes through the contact_me tool, whose destination is set via env
 * (CONTACT_TO_EMAIL), so your inbox isn't scraped.
 *
 * Highlights are tagged individually so get_experience can filter at the bullet level
 * (asking for "agents" returns only the agent bullets, not the whole role).
 */

/** A single tagged accomplishment under a role. */
export interface Highlight {
  text: string;
  /** Lowercase tags for bullet-level filtering, e.g. "agents", "data". */
  tags: string[];
}

export interface Experience {
  company: string;
  role: string;
  dates: string;
  location?: string;
  summary: string;
  highlights: Highlight[];
}

export interface Project {
  name: string;
  url?: string;
  oneLiner: string;
  tags: string[];
}

/** A skill, with an optional self-assessed proficiency. */
export interface SkillItem {
  name: string;
  /** "core" = used heavily/recently in shipped work. Omitted = familiar. Owner-edited. */
  level?: "core";
}

export interface SkillGroup {
  label: string;
  items: SkillItem[];
}

export interface Education {
  school: string;
  degree: string;
  dates: string;
}

export interface Availability {
  open: boolean;
  summary: string;
  lookingFor: string[];
  workMode: string;
  timing: string;
  notLookingFor: string[];
}

export interface Profile {
  name: string;
  headline: string;
  bio: string;
  links: Record<string, string>;
  experience: Experience[];
  projects: Project[];
  skills: SkillGroup[];
  education: Education[];
  achievements: string[];
  availability: Availability;
  resumeUrl: string;
  schedulingUrl: string;
}

// shorthand for tagged highlights
const h = (text: string, ...tags: string[]): Highlight => ({ text, tags });
// shorthand for a core skill
const core = (name: string): SkillItem => ({ name, level: "core" });

export const profile: Profile = {
  name: "Rahul Naidu Siriporam",
  headline:
    "Founding Software Engineer — agentic AI systems, LLM products, and backend platforms from scratch to production.",
  bio:
    "Founding software engineer with ~5 years of end-to-end product experience — " +
    "architecting and shipping backend platforms, data pipelines, and LLM systems " +
    "from scratch into production. At Canvas AI I've owned consumer-health AI " +
    "products, agentic chat platforms, vision pipelines, Text-to-SQL bots, " +
    "WhatsApp-native AI companions, and a ClickHouse-backed analytics warehouse. " +
    "I lead small teams, own problems end-to-end with minimal direction, and pair " +
    "strong engineering execution with product intuition. I write at " +
    "blog.neuromancer.in on agentic AI systems, local LLM deployments, and agents " +
    "on consumer hardware.",
  links: {
    portfolio: "https://neuromancer.in",
    blog: "https://blog.neuromancer.in",
    linkedin: "https://www.linkedin.com/in/rahul-naidu-siriporam-15472116b",
    github: "https://github.com/rnaidu-parallel",
    x: "https://x.com/rahulwlw",
  },
  experience: [
    {
      company: "Canvas AI (prev. Apperture / Parallel)",
      role: "Founding Software Engineer",
      dates: "Jul 2022 – Present",
      location: "Remote",
      summary:
        "Founding engineer owning agentic AI products and backend platforms " +
        "end-to-end — agentic chat, consumer-health AI, vision pipelines, and a " +
        "ClickHouse analytics warehouse.",
      highlights: [
        h(
          "Built Jarvis, a WhatsApp-native agentic investing companion: a two-tier " +
            "memory architecture (bounded structured memory card + recallable message " +
            "search) kept fresh by mid-session compaction, session-close summarization, " +
            "and a two-phase memory-update agent, plus a scheduled proactive-outreach " +
            "scanner that follows up on each user's open loops. Runs on ECS with per-user " +
            "queueing, tenant-isolated Postgres, prompt caching, and an LLM-judge eval " +
            "harness scoring every turn.",
          "agents",
          "llm",
          "memory",
          "infra",
        ),
        h(
          "Architected a consumer-health AI assistant for diabetes care (leading 3 " +
            "engineers), serving thousands daily: evolved RAG → GraphRAG → a QLoRA " +
            "fine-tuned model, migrated Azure OpenAI → Vertex AI, and re-architected a " +
            "single agent into a multi-agent system (Agno) covering meal planning, symptom " +
            "triage, CGM analysis, and lab-report parsing.",
          "agents",
          "ai",
          "health",
          "rag",
          "fine-tuning",
        ),
        h(
          "Shipped a clinician copilot (auto-suggested diagnoses/prescriptions), a coach " +
            "pre-call summarizer over audio understanding, and an automated webinar Q&A " +
            "responder on GKE with KEDA autoscaling and Datadog, tuned for latency/cost " +
            "via prompt engineering and per-task model routing.",
          "ai",
          "health",
          "infra",
        ),
        h(
          "Replicated the CGMformer paper into a hybrid Transformer-LSTM glucose " +
            "forecaster on Vertex AI — 94% of 2-hour-ahead predictions in Clarke Error " +
            "Grid Zone A; and a vision meal-logging pipeline processing 10K+ images/day at " +
            "p90 ~6s, lifting meal-logging adoption 24% → 38% (+58%).",
          "ml",
          "health",
          "vision",
        ),
        h(
          "Built IRA, a Next.js agentic investment-research assistant (private beta) on " +
            "the Vercel AI SDK, whose skill-loading ToolLoopAgent drives a deterministic " +
            "multi-factor scoring engine with human-in-the-loop clarification.",
          "agents",
          "llm",
          "frontend",
        ),
        h(
          "Built the core of Apperture, a B2B product-analytics platform: funnel/retention/" +
            "cohort analysis and custom metrics on a dynamic ClickHouse query builder, plus " +
            "8+ data connectors (GA, Mixpanel, Amplitude, PostHog, SQL/NoSQL), unifying tens " +
            "of millions of events/day on Debezium CDC + Kafka + Airflow + AWS microservices " +
            "on Docker Swarm with full CI/CD.",
          "data",
          "infra",
          "analytics",
        ),
      ],
    },
    {
      company: "Quantile Analytics",
      role: "Quantitative Analyst",
      dates: "Jul 2021 – Jul 2022",
      location: "Bengaluru",
      summary:
        "Quant analyst building data pipelines and NLP tooling for systematic " +
        "equity strategies.",
      highlights: [
        h(
          "Built automated pipelines tracking 20+ global indices and generating " +
            "rebalancing signals, replacing manual workflows and enabling systematic " +
            "strategies on US and international equities.",
          "data",
          "quant",
          "pipelines",
        ),
        h(
          "Built an NLP parser for SEC filings (float/share-data extraction), " +
            "exchange-data scrapers feeding index-rebalancing models, and Flask/Angular " +
            "internal tools that streamlined the research team's workflow.",
          "data",
          "nlp",
          "pipelines",
        ),
      ],
    },
  ],
  // Public open-source / portfolio work (distinct from employer roles above).
  projects: [
    {
      name: "neuromancer-mcp",
      url: "https://github.com/rnaidu-parallel/neuromancer-mcp",
      oneLiner:
        "Publish yourself as a remote MCP server — a company's agent connects to learn about you and reach out.",
      tags: ["mcp", "agents"],
    },
    {
      name: "agent-coercion-layer",
      url: "https://github.com/rnaidu-parallel/agent-coercion-layer",
      oneLiner:
        "Keep tool-calls working when you swap the model underneath an agent.",
      tags: ["agents", "tool-calling", "reliability", "evals"],
    },
    {
      name: "prompt-cache-economics",
      url: "https://github.com/rnaidu-parallel/prompt-cache-economics",
      oneLiner:
        "A timestamp in your prompt prefix is a 0% cache hit — and it costs you.",
      tags: ["infra", "caching", "cost", "evals"],
    },
    {
      name: "6GB-VRAM local agent",
      url: "https://blog.neuromancer.in/blog/6gb-vram-local-agent/",
      oneLiner:
        "A capable Hermes/Qwen agent on a 6GB consumer GPU; the five constraints that decide a local stack.",
      tags: ["local-inference", "agents", "hardware"],
    },
  ],
  // TODO(rahul): "core" = heavy/recent use in shipped work; refine to taste. Years
  // intentionally omitted rather than guessed.
  skills: [
    { label: "Languages", items: [core("Python"), core("TypeScript"), core("SQL")] },
    {
      label: "AI/ML",
      items: [
        core("Multi-Agent Systems"),
        core("Agent Evals"),
        core("RAG"),
        { name: "GraphRAG" },
        { name: "Fine-tuning" },
        core("Prompt Engineering"),
        core("Prompt Caching"),
        { name: "Transformers" },
        { name: "PyTorch" },
      ],
    },
    {
      label: "Backend",
      items: [
        core("FastAPI"),
        { name: "Hono" },
        { name: "Flask" },
        core("Next.js"),
        { name: "Kafka" },
        { name: "Debezium" },
        { name: "Airflow" },
        { name: "Drizzle" },
      ],
    },
    {
      label: "Infra",
      items: [
        core("Docker"),
        { name: "Docker Swarm" },
        { name: "Kubernetes" },
        { name: "GKE" },
        { name: "KEDA" },
        { name: "Pulumi" },
        { name: "Datadog" },
        { name: "CI/CD" },
      ],
    },
    {
      label: "Data",
      items: [
        core("PostgreSQL"),
        { name: "MongoDB" },
        core("ClickHouse"),
        { name: "Redis" },
        { name: "SQLite" },
      ],
    },
    {
      label: "Cloud",
      items: [
        core("AWS"),
        core("GCP"),
        { name: "Azure" },
        { name: "ECS" },
        { name: "Vertex AI" },
        { name: "Azure AI" },
      ],
    },
  ],
  education: [
    {
      school: "Indian Institute of Technology, Indore",
      degree: "B.Tech",
      dates: "2017 – 2021",
    },
  ],
  achievements: [
    "JEE Main 2017: AIR 3,289 (top 0.27% of 1.2M candidates); JEE Advanced 2017: AIR 4,473; CAT 2021: 99.19 percentile.",
    "Bronze Medal, BitGrit Data Science Contest, Inter-IIT Tech Meet, IIT Roorkee 2019.",
  ],
  availability: {
    open: true,
    summary: "Actively looking for new roles in agentic AI and LLM systems.",
    lookingFor: [
      "agentic AI & applied LLM engineering",
      "LLM serving / inference infrastructure",
      "founding / early-stage engineering",
    ],
    workMode: "Remote-friendly (based in India)",
    timing: "Actively interviewing and available to talk now.",
    notLookingFor: ["pure front-end roles", "non-technical / PM-only roles"],
  },
  resumeUrl: "https://blog.neuromancer.in/resume.pdf",
  schedulingUrl: "https://calendar.app.google/6ukMiHNSgbPLC5YA7",
};
