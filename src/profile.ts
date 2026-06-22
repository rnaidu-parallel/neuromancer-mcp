/**
 * profile.ts — the single source of truth for everything the server exposes.
 *
 * This is the ONLY file someone forking the template needs to edit. Keep it to
 * public, share-anything facts. Private contact details (phone, email) deliberately
 * live OUTSIDE this file — outreach goes through the contact_me tool, whose
 * destination is set via env (CONTACT_TO_EMAIL), so your inbox isn't scraped.
 */

export interface Experience {
  company: string;
  role: string;
  dates: string;
  location?: string;
  /** Lowercase tags for get_experience filtering, e.g. "agents", "data". */
  tags: string[];
  summary: string;
  highlights: string[];
}

export interface Project {
  name: string;
  url?: string;
  oneLiner: string;
  /** Lowercase tags for list_projects filtering. */
  tags: string[];
}

export interface SkillGroup {
  label: string;
  items: string[];
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
  /** Public booking link returned by contact_me. Leave "" to omit it. */
  schedulingUrl: string;
}

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
      tags: ["agents", "ai", "llm", "backend", "infra", "data", "health", "analytics"],
      summary:
        "Founding engineer owning agentic AI products and backend platforms " +
        "end-to-end — agentic chat, consumer-health AI, vision pipelines, and a " +
        "ClickHouse analytics warehouse.",
      highlights: [
        "Built Jarvis, a WhatsApp-native agentic investing companion: a two-tier " +
          "memory architecture (bounded structured memory card + recallable message " +
          "search) kept fresh by mid-session compaction, session-close summarization, " +
          "and a two-phase memory-update agent, plus a scheduled proactive-outreach " +
          "scanner that follows up on each user's open loops. Runs on ECS with per-user " +
          "queueing, tenant-isolated Postgres, prompt caching, and an LLM-judge eval " +
          "harness scoring every turn.",
        "Architected a consumer-health AI assistant for diabetes care (leading 3 " +
          "engineers), serving thousands daily: evolved RAG → GraphRAG → a QLoRA " +
          "fine-tuned model, migrated Azure OpenAI → Vertex AI, and re-architected a " +
          "single agent into a multi-agent system (Agno) covering meal planning, symptom " +
          "triage, CGM analysis, and lab-report parsing.",
        "Shipped a clinician copilot (auto-suggested diagnoses/prescriptions), a coach " +
          "pre-call summarizer over audio understanding, and an automated webinar Q&A " +
          "responder on GKE with KEDA autoscaling and Datadog, tuned for latency/cost " +
          "via prompt engineering and per-task model routing.",
        "Replicated the CGMformer paper into a hybrid Transformer-LSTM glucose " +
          "forecaster on Vertex AI — 94% of 2-hour-ahead predictions in Clarke Error " +
          "Grid Zone A; and a vision meal-logging pipeline processing 10K+ images/day at " +
          "p90 ~6s, lifting meal-logging adoption 24% → 38% (+58%).",
        "Built IRA, a Next.js agentic investment-research assistant (private beta) on " +
          "the Vercel AI SDK, whose skill-loading ToolLoopAgent drives a deterministic " +
          "multi-factor scoring engine with human-in-the-loop clarification.",
        "Built the core of Apperture, a B2B product-analytics platform: funnel/retention/" +
          "cohort analysis and custom metrics on a dynamic ClickHouse query builder, plus " +
          "8+ data connectors (GA, Mixpanel, Amplitude, PostHog, SQL/NoSQL), unifying tens " +
          "of millions of events/day on Debezium CDC + Kafka + Airflow + AWS microservices " +
          "on Docker Swarm with full CI/CD.",
      ],
    },
    {
      company: "Quantile Analytics",
      role: "Quantitative Analyst",
      dates: "Jul 2021 – Jul 2022",
      location: "Bengaluru",
      tags: ["data", "quant", "nlp", "pipelines"],
      summary:
        "Quant analyst building data pipelines and NLP tooling for systematic " +
        "equity strategies.",
      highlights: [
        "Built automated pipelines tracking 20+ global indices and generating " +
          "rebalancing signals, replacing manual workflows and enabling systematic " +
          "strategies on US and international equities.",
        "Built an NLP parser for SEC filings (float/share-data extraction), " +
          "exchange-data scrapers feeding index-rebalancing models, and Flask/Angular " +
          "internal tools that streamlined the research team's workflow.",
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
  skills: [
    { label: "Languages", items: ["Python", "TypeScript", "SQL"] },
    {
      label: "AI/ML",
      items: [
        "Multi-Agent Systems",
        "Agent Evals",
        "RAG",
        "GraphRAG",
        "Fine-tuning",
        "Prompt Engineering",
        "Prompt Caching",
        "Transformers",
        "PyTorch",
      ],
    },
    {
      label: "Backend",
      items: ["FastAPI", "Hono", "Flask", "Next.js", "Kafka", "Debezium", "Airflow", "Drizzle"],
    },
    {
      label: "Infra",
      items: ["Docker", "Docker Swarm", "Kubernetes", "GKE", "KEDA", "Pulumi", "Datadog", "CI/CD"],
    },
    { label: "Data", items: ["PostgreSQL", "MongoDB", "ClickHouse", "Redis", "SQLite"] },
    { label: "Cloud", items: ["AWS", "GCP", "Azure", "ECS", "Vertex AI", "Azure AI"] },
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
  // TODO(rahul): confirm this reflects your current stance before deploying.
  availability: {
    open: true,
    summary:
      "Open to senior / founding engineering roles in agentic AI and LLM systems.",
    lookingFor: [
      "agentic AI & applied LLM engineering",
      "LLM serving / inference infrastructure",
      "founding / early-stage engineering",
    ],
    workMode: "Remote-friendly (based in India)",
    timing: "Open to the right conversation.",
    notLookingFor: ["pure front-end roles", "non-technical / PM-only roles"],
  },
  resumeUrl: "https://blog.neuromancer.in", // TODO(rahul): point to a hosted résumé PDF
  schedulingUrl: "", // TODO(rahul): paste a public booking link, or leave "" to omit it
};
