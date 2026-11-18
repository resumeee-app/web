import React, { useState, useRef, useEffect } from "react";
import {
  GitBranch,
  ShieldCheck,
  FileText,
  Cpu,
  ArrowRight,
  Check,
  Copy,
  CheckCheck,
  Database,
  Lock,
  KeyRound,
  ExternalLink,
  Sparkles,
  HelpCircle,
  ChevronDown,
  User,
  Layers,
  Clock,
  Eye,
  Github,
  Bot,
  Accessibility,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DefaultBranchBadge, BranchStatusBadge } from "@/components/branches/branch-shared-elements";

/**
 * Data model for core capability feature cards.
 */
export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  colorClass: string;
  bgClass: string;
}

/**
 * Core product pillars showcased on the landing page.
 */
export const CORE_FEATURES: FeatureItem[] = [
  {
    id: "multi-branch",
    title: "Multi-Branch Career Graph",
    description:
      "Maintain a single main profile of every skill, project, and experience. Branch out targeted versions for each role without messy copy-paste divergences.",
    icon: GitBranch,
    colorClass: "text-indigo-600 dark:text-indigo-400",
    bgClass: "bg-indigo-50 dark:bg-indigo-950",
  },
  {
    id: "anti-hallucination",
    title: "Anti-Hallucination & Provenance",
    description:
      "Every tailored bullet is anchored to real profile facts. The AI model is prohibited from inventing false credentials or roles. Resumeee discards LLM hallucinations.",
    icon: ShieldCheck,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950",
  },
  {
    id: "ats-optimized",
    title: "ATS-Optimized, JSON Resume Compatible",
    description:
      "Templates that work for parsing bots or human recruiters alike (or write your own template!). Instant export to the well-known JSON Resume standard, Markdown, and ATS-optimized layouts.",
    icon: FileText,
    colorClass: "text-sky-600 dark:text-sky-400",
    bgClass: "bg-sky-50 dark:bg-sky-950",
  },
  {
    id: "ai-freedom",
    title: "Freedom & Local Privacy",
    description:
      "Connect your personal API keys for Google Gemini, OpenAI, or Anthropic Claude, or run privately with local models like Ollama. Complete freedom over where inference happens. No telemetry, no vendor lock-in.",
    icon: Cpu,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-50 dark:bg-purple-950",
  },
  {
    id: "mcp-server",
    title: "Integrated MCP Server & API",
    description:
      "Built-in Model Context Protocol (MCP) server and full REST API. Connect directly to Claude Desktop, Cursor, or autonomous AI agents to query and tailor resumes.",
    icon: Bot,
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950",
  },
  {
    id: "accessibility",
    title: "Accessible by Design",
    description:
      "Built so the UI is usable by everyone. Resumeee follows WCAG 2.1 AA standards with screen reader support, keyboard navigation, and high-contrast themes.",
    icon: Accessibility,
    colorClass: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-50 dark:bg-rose-950",
  },
];

/**
 * Data model for privacy and self-hosting architectural guarantees.
 */
export interface PrivacyHighlight {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  iconColorClass: string;
}

/**
 * Privacy and local-first architecture highlights.
 */
export const PRIVACY_HIGHLIGHTS: PrivacyHighlight[] = [
  {
    id: "sqlite",
    title: "Storage Agnostic (SQLite Included)",
    description:
      "Modular repository architecture with an out-of-the-box local SQLite connector. All data stays in a portable file on your filesystem. Supports MySQL and PostgreSQL. It also lets you write your own storage connector.",
    icon: Database,
    iconColorClass: "text-indigo-400",
  },
  {
    id: "telemetry",
    title: "Zero Telemetry or Training",
    description:
      "No third-party analytics trackers, no tracking pixels, and zero data retained for training foundation models.",
    icon: Lock,
    iconColorClass: "text-emerald-400",
  },
  {
    id: "byok",
    title: "Bring Your Own Key (BYOK)",
    description:
      "Plug in your personal keys for Gemini, OpenAI, or Anthropic Claude, or use local open-weight models via Ollama. No lock-in.",
    icon: KeyRound,
    iconColorClass: "text-purple-400",
  },
  {
    id: "mcp",
    title: "Integrated MCP Server",
    description:
      "Built-in Model Context Protocol server lets AI assistants and agents query your career graph and tailor resumes. Interact with Resumeee using natural language if you prefer.",
    icon: Bot,
    iconColorClass: "text-amber-400",
  },
];

/**
 * Data model for FAQ questions and answers.
 */
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

/**
 * Frequently asked questions regarding privacy, hallucinations, and ATS compatibility.
 */
export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "single-prompt",
    question: "Can't I do the same with a single prompt?",
    answer:
      "Yes, but managing multiple tailored resumes is not simple. Resumeee makes it easy to generate new variants for specific job posts and keep them all updated with a single click as your career progresses. On top of that, the application comes with an integrated REST API and an MCP server to interact with it through your favorite LLM, so you can have the best of both worlds.",
  },
  {
    id: "hallucinations",
    question: "How does Resumeee prevent AI hallucinations?",
    answer:
      "Every experience, bullet fact, and skill receives a deterministic short identifier hash. When generating tailored resume versions, our engine constrains the LLM to only rephrase and reorder proven facts from your profile. Invented credentials or fabricated companies are rejected before export.",
  },
  {
    id: "offline",
    question: "Can I use my preferred AI provider or run offline?",
    answer:
      "Yes. You have total freedom over AI inference. You can configure your personal API keys for Google Gemini, OpenAI, or Anthropic Claude, or run completely offline by connecting to local Ollama models or OpenAI-compatible backends like vLLM. No external network access is required when running locally.",
  },
  {
    id: "ats",
    question: "Will my resumes pass Applicant Tracking Systems (ATS)?",
    answer:
      "Resumeee templates strictly adhere to ATS standards: semantic headings, parseable text streams, clean single-column layouts, standard system typography, and zero complex graphics or multi-column text frames that break automated parsers. However, ATS systems are closed-source and Resumeee can only guess how they work. While this does not guarantee 100% compatibility with every ATS, pre-existing templates have been proven compatible with the most popular ATS platforms.",
  },
  {
    id: "export",
    question: "Can I export my data to JSON Resume or other formats?",
    answer:
      "Absolutely. Resumeee provides full one-click exports to the well-known JSON Resume open standard, SQLite database backups, Markdown, and print-ready ATS PDFs. There is zero proprietary lock-in.",
  },
  {
    id: "import",
    question: "Can I import my data from a PDF or JSON Resume file?",
    answer:
      "Absolutely. Resumeee supports importing a JSON Resume file or a PDF (more formats planned). Resumeee leverages AI (the same one you choose for tailoring) to accurately extract information from PDF files.",
  },
  {
    id: "vibe-coded",
    question: "Is it \"vibe-coded\"?",
    answer:
      "Yes, but several design iterations took place to make sure it provides real value. Real human effort and experience went into its design, architecture, fact-checking, and code quality. It is free and can run 100% locally. Consider this project free tokens compared to building it yourself. There are better alternatives out there (https://simplify.jobs), but with Resumeee, you keep control of your data (and again, it is free).",
  },
];

/**
 * Subcomponent rendering an individual core feature card.
 */
export const FeatureCard: React.FC<{ feature: FeatureItem }> = ({ feature }) => {
  const Icon = feature.icon;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        <div className={`h-10 w-10 rounded-lg ${feature.bgClass} flex items-center justify-center ${feature.colorClass}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {feature.title}
        </h3>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {feature.description}
        </p>
      </div>
    </div>
  );
};

/**
 * Data model for mock tailored branch cards shown in hero visualizer.
 */
export interface MockTailoredBranch {
  id: string;
  role: string;
  company: string;
  department: string;
  layout: string;
  modified: string;
  version: string;
  strategy: string;
  matchScore: string;
}

/**
 * Preview branch cards demonstrating targeted variants in the hero section.
 */
export const MOCK_TAILORED_BRANCHES: MockTailoredBranch[] = [
  {
    id: "branch-stripe",
    role: "Staff Platform Engineer",
    company: "Stripe",
    department: "Infrastructure & Observability",
    layout: "ATS Modern Tech",
    modified: "Nov 7, 2026",
    version: "v3",
    strategy: "Senior Staff Engineering",
    matchScore: "98%",
  },
  {
    id: "branch-supabase",
    role: "Founding Systems Architect",
    company: "Supabase",
    department: "Cloud Core Team",
    layout: "Standard Clean",
    modified: "Nov 7, 2026",
    version: "v2",
    strategy: "0-to-1 Startup Velocity",
    matchScore: "96%",
  },
];

/**
 * Subcomponent rendering an authentic tailored branch card preview in the hero visualizer.
 */
export const MockBranchCard: React.FC<{ branch: MockTailoredBranch }> = ({ branch }) => {
  return (
    <article
      data-testid="mock-branch-card"
      className="flex flex-col justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4"
      aria-label={`${branch.role} branch card`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {branch.role}
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
              <strong className="font-medium text-slate-800 dark:text-slate-200">{branch.company}</strong> • {branch.department}
            </p>
          </div>
          <BranchStatusBadge status="active" />
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-300">
          <div className="flex items-center gap-1.5 truncate">
            <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            <span className="truncate">
              Layout: <strong className="font-medium text-slate-700 dark:text-slate-300">{branch.layout}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            <span className="truncate">
              Modified: <span className="text-slate-700 dark:text-slate-300">{branch.modified}</span>
            </span>
          </div>
          <div className="col-span-2 flex items-center justify-between pt-1">
            <span>
              Active Version: <strong className="font-medium text-slate-700 dark:text-slate-300">{branch.version}</strong>
            </span>
            <span className="truncate">
              Strategy: <strong className="font-medium text-slate-700 dark:text-slate-300">{branch.strategy}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] rounded bg-slate-50 dark:bg-slate-950/70 px-2.5 py-1.5 border border-slate-100 dark:border-slate-800">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <Check className="h-3 w-3" aria-hidden="true" />
            Match Score: {branch.matchScore}
          </span>
          <span className="text-slate-500 dark:text-slate-300 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Verified Facts
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium"
          disabled
          aria-hidden="true"
          tabIndex={-1}
        >
          Open Workbench
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 text-xs font-medium flex items-center gap-1"
          disabled
          aria-hidden="true"
          tabIndex={-1}
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Inspect</span>
        </Button>
      </div>
    </article>
  );
};

/**
 * Public Landing Page component showcasing Resumeee.
 *
 * @returns JSX Element rendering the public landing page.
 */
export const LandingPage: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [copiedManual, setCopiedManual] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyManualTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dockerCommand =
    "docker run -p 8080:8080 -p 8081:8081 -v resumeee-data:/data ghcr.io/resumeee-app/resumeee:latest";
  const manualCommand =
    "git clone https://github.com/resumeee-app/resumeee.git && cd resumeee && ./scripts/clone-all.sh && cp .env.example .env && docker compose up --build";

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      if (copyManualTimeoutRef.current) {
        clearTimeout(copyManualTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(dockerCommand);
    } catch {
      // Fallback for test or legacy environments
    }
    setCopied(true);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleCopyManualCommand = async () => {
    try {
      await navigator.clipboard.writeText(manualCommand);
    } catch {
      // Fallback for test or legacy environments
    }
    setCopiedManual(true);
    if (copyManualTimeoutRef.current) {
      clearTimeout(copyManualTimeoutRef.current);
    }
    copyManualTimeoutRef.current = setTimeout(() => {
      setCopiedManual(false);
    }, 2000);
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq((prev) => (prev === index ? null : index));
  };

  return (
    <div className="space-y-24 py-6 sm:py-10">
      {/* 1. HERO SECTION */}
      <section
        id="hero"
        aria-label="Hero"
        className="relative flex flex-col items-center text-center max-w-4xl mx-auto space-y-8"
      >

        {/* Hero Title */}
        <div className="space-y-4">
          <h1
            id="hero-heading"
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.15]"
          >
            <span className="mb-2 leading-[1.2]">One resume, many variants.</span>
            <br />
            <span className="text-indigo-600 dark:text-indigo-400">Tailored resumes for the job you want.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-700 dark:text-slate-300 leading-relaxed">
            Maintain a single source of career truth and branch tailored variants for every role or need, powered by your preferred AI.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-center">
          <Button size="lg" asChild className="w-full sm:w-auto h-12 px-7 text-base font-semibold shadow-sm">
            <a href="#open-source" className="flex items-center justify-center gap-2">
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>

          <Button
            size="lg"
            variant="outline"
            asChild
            className="w-full sm:w-auto h-12 px-7 text-base font-semibold"
          >
            <a
              href="https://github.com/resumeee-app/resumeee"
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center justify-center gap-2"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              <span>Run It Locally</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            </a>
          </Button>
        </div>

        {/* Trust & Guarantee Subtitle */}
        <p className="text-xs text-slate-500 dark:text-slate-300">
          Zero telemetry • Open Source
        </p>

        {/* Hero Visualizer: Authentic Resumeee Branch Workflow */}
        <div
          data-testid="hero-branch-visualizer"
          className="w-full mt-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 p-4 sm:p-6 shadow-md text-left transition-all"
        >

          {/* Top Window Bar */}
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <h2 >Resume Branch Workflow Preview</h2>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Trunk: Main Career Profile Card (mirrors home-page.tsx & branch-card.tsx) */}
            <article
              className="rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3"
              aria-label="Main Career Profile"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 text-base">
                      <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                      <span>Main Career Profile</span>
                    </h3>
                    <DefaultBranchBadge iconSize="sm" />
                    <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-700/10 dark:ring-indigo-700/30">
                      Rev #14
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-300">
                    Direct Main Profile (Untailored) — mirrors canonical main data with zero LLM tailoring.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <BranchStatusBadge status="active" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">5</span>
                  <span className="text-slate-500 dark:text-slate-300">Experiences</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">24</span>
                  <span className="text-slate-500 dark:text-slate-300">Skills</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">6</span>
                  <span className="text-slate-500 dark:text-slate-300">Projects</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">2</span>
                  <span className="text-slate-500 dark:text-slate-300">Education</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">3</span>
                  <span className="text-slate-500 dark:text-slate-300">Certs</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <span>Template: <strong className="font-medium text-slate-700 dark:text-slate-300">Standard Clean</strong></span>
                </div>
                <div>
                  Active Version: <strong className="font-medium text-slate-700 dark:text-slate-300">v14</strong>
                </div>
              </div>
            </article>

            {/* Tree Branch Split Connector */}
            <div className="flex items-center gap-2 pl-4 py-1">
              <div className="h-4 w-0.5 bg-indigo-300 dark:bg-indigo-700" />
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tailored Resumes</span>
              </div>
            </div>

            {/* Grid of Tailored Role Branch Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-0 sm:pl-4 border-l-2 border-indigo-200 dark:border-indigo-900/60 ml-2">
              {MOCK_TAILORED_BRANCHES.map((branch) => (
                <MockBranchCard key={branch.id} branch={branch} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. CORE FEATURES PILLARS */}
      <section
        id="features"
        aria-label="Features"
        className="space-y-12"
      >
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2
            id="features-heading"
            className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl"
          >
            A better way to keep your resume up to date.
          </h2>
          <p className="text-slate-700 dark:text-slate-300 text-base sm:text-lg">
            You maintain a <span className="font-bold">single</span> profile. Every change creates a new revision that you can come back to at any time.
            Resumeee keeps tailored variations in sync and helps you avoid ATS rejection black holes with job matching and ATS extraction confidence scores.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CORE_FEATURES.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </section>

      {/* 3. TECHNICAL & LOCAL-RUN ARCHITECTURE */}
      <section
        id="open-source"
        aria-label="Open Source & Self-Hosting"
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 p-8 sm:p-12 shadow-lg space-y-8"
      >
        <div className="max-w-3xl space-y-3">
          <h2
            id="open-source-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
          >
            Run It Locally, Choose Your AI Provider
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Resumeee gives you complete flexibility. Spin up a local container in seconds with Docker. Connect seamlessly to Google Gemini, OpenAI, or Anthropic Claude—or keep everything offline with local models like Ollama and vLLM. Zero telemetry, zero tracking.
          </p>
        </div>

        {/* Terminal Block: Prebuilt Docker Image */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950">
              <span className="font-mono text-xs text-slate-300">
                Quickstart with Docker (Web UI :8080 &amp; API :8081)
              </span>
              <button
                type="button"
                onClick={() => void handleCopyCommand()}
                aria-label="Copy Docker command"
                className="flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-xs text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-400 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-4 sm:p-5 font-mono text-xs sm:text-sm text-emerald-400 overflow-x-auto whitespace-pre">
              <code>{dockerCommand}</code>
            </div>
            <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-950/60 text-xs text-slate-300 flex flex-wrap gap-x-6 gap-y-1">
              <span>
                Web UI &amp; proxied API: <code className="text-slate-100">http://localhost:8080</code>
              </span>
              <span>
                Direct REST API: <code className="text-slate-100">http://localhost:8081/api/v1</code>
              </span>
              <span>
                Optional API key: <code className="text-slate-100">-e GEMINI_API_KEY=...</code>
              </span>
            </div>
          </div>

          {/* Terminal Block: Clone & Run Manually */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950">
              <span className="font-mono text-xs text-slate-300">
                Alternative: Clone &amp; Run Manually (Web :3000 &amp; API :8080)
              </span>
              <button
                type="button"
                onClick={() => void handleCopyManualCommand()}
                aria-label="Copy manual setup command"
                className="flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-xs text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                {copiedManual ? (
                  <>
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-400 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-4 sm:p-5 font-mono text-xs sm:text-sm text-sky-300 overflow-x-auto whitespace-pre">
              <code>{manualCommand}</code>
            </div>
            <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-950/60 text-xs text-slate-300 flex flex-wrap gap-x-6 gap-y-1">
              <span>
                Compose exposes Web UI on <code className="text-slate-100">:3000</code> and API on{" "}
                <code className="text-slate-100">:8080/api/v1</code>
              </span>
              <span>
                Without Docker: <code className="text-slate-100">PORT=8080 ADMIN_MODE=true go -C server run ./cmd/server</code>
              </span>
            </div>
          </div>
        </div>

        {/* Privacy Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          {PRIVACY_HIGHLIGHTS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="flex items-start gap-3">
                <Icon className={`h-5 w-5 ${item.iconColorClass} shrink-0 mt-0.5`} aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-300">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. FREQUENTLY ASKED QUESTIONS */}
      <section
        id="faq"
        aria-label="Frequently Asked Questions"
        className="max-w-3xl mx-auto space-y-8"
      >
        <div className="text-center space-y-3">
          <h2
            id="faq-heading"
            className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item, index) => {
            const isExpanded = expandedFaq === index;
            const answerId = `faq-answer-${item.id}`;
            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  aria-expanded={isExpanded}
                  aria-controls={answerId}
                  className="flex w-full items-center justify-between p-5 text-left font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
                    <span>{item.question}</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {isExpanded && (
                  <div
                    id={answerId}
                    className="px-5 pb-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3"
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. BOTTOM CTA CALLOUT */}
      <section
        aria-labelledby="cta-heading"
        className="rounded-2xl bg-indigo-600 dark:bg-indigo-950/70 border border-indigo-700 dark:border-indigo-800 text-white p-8 sm:p-12 text-center space-y-6 shadow-md"
      >
        <div className="max-w-2xl mx-auto space-y-3">
          <h2
            id="cta-heading"
            className="text-3xl font-bold tracking-tight text-white"
          >
            Ready to branch your career?
          </h2>
          <p className="text-indigo-100 text-base">
            Create your main career graph today. Privacy-first and open source forever.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            variant="secondary"
            asChild
            className="w-full sm:w-auto h-12 px-7 text-base font-semibold bg-white text-indigo-900 hover:bg-slate-100 dark:bg-slate-100 dark:text-indigo-950"
          >
            <a href="#open-source" className="flex items-center justify-center gap-2">
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>

          <Button
            size="lg"
            variant="outline"
            asChild
            className="w-full sm:w-auto h-12 px-7 text-base font-semibold bg-transparent dark:bg-transparent border-indigo-200 dark:border-indigo-400 text-white dark:text-white hover:bg-indigo-700/50 dark:hover:bg-indigo-900/60 focus-visible:ring-white focus-visible:ring-offset-indigo-600 dark:focus-visible:ring-offset-indigo-950"
          >
            <a
              href="https://github.com/resumeee-app/resumeee"
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>Star on GitHub</span>
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
