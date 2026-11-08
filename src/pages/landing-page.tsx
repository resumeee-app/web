import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  GitBranch,
  ShieldCheck,
  FileText,
  Cpu,
  ArrowRight,
  Check,
  Copy,
  CheckCheck,
  Terminal,
  Database,
  Lock,
  KeyRound,
  ExternalLink,
  Sparkles,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
      "Maintain a single master profile of every skill, project, and experience. Branch out targeted versions for each role without messy copy-paste divergences.",
    icon: GitBranch,
    colorClass: "text-indigo-600 dark:text-indigo-400",
    bgClass: "bg-indigo-50 dark:bg-indigo-950",
  },
  {
    id: "anti-hallucination",
    title: "Anti-Hallucination & Provenance",
    description:
      "Every tailored bullet is anchored to real profile facts with short identifier hashes. The AI model is strictly prohibited from inventing false credentials or roles.",
    icon: ShieldCheck,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950",
  },
  {
    id: "ats-optimized",
    title: "ATS-Optimized & Multi-Theme",
    description:
      "Engineered for automated parsing bots and human recruiters alike. Clean typography, strict single-page constraints, and instant exports in PDF, Markdown, and JSON Resume.",
    icon: FileText,
    colorClass: "text-sky-600 dark:text-sky-400",
    bgClass: "bg-sky-50 dark:bg-sky-950",
  },
  {
    id: "local-first",
    title: "Local-First & Open Source Freedom",
    description:
      "Run 100% offline with Docker Compose and local Ollama models. Your career history never leaves your hardware unless you explicitly configure cloud backup.",
    icon: Cpu,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-50 dark:bg-purple-950",
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
    title: "Local SQLite Persistence",
    description:
      "All profile data, branches, and version snapshots stay in a single portable SQLite file on your filesystem.",
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
      "Plug in your personal OpenAI, Anthropic, or Gemini keys, or use local Ollama with zero external API fees.",
    icon: KeyRound,
    iconColorClass: "text-purple-400",
  },
];

/**
 * Data model for monetization tiers.
 */
export interface PricingTier {
  id: string;
  testId: string;
  name: string;
  badge: string;
  badgeClass?: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  isExternalCta?: boolean;
  isPopular?: boolean;
  buttonVariant?: "default" | "outline" | "secondary";
}

/**
 * Transparent pricing options offered to users.
 */
export const PRICING_TIERS: PricingTier[] = [
  {
    id: "open-source",
    testId: "tier-open-source",
    name: "Open Source",
    badge: "Self-Hosted",
    price: "$0",
    period: "free forever",
    description: "Everything you need to own your career locally.",
    features: [
      "Unlimited local resume branches",
      "Self-hosted SQLite & Docker support",
      "BYOK (OpenAI, Gemini, Ollama)",
      "ATS-optimized PDF exports",
      "Community support via GitHub",
    ],
    ctaLabel: "Run Locally Free",
    ctaHref: "https://github.com/rrivera/resumeee",
    isExternalCta: true,
    buttonVariant: "outline",
  },
  {
    id: "cloud-hosted",
    testId: "tier-cloud-hosted",
    name: "Cloud Hosted",
    badge: "Managed Cloud",
    badgeClass: "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300",
    price: "$12",
    period: "/ month",
    description: "Turn-key syncing with premium managed AI quotas.",
    features: [
      "Everything in Open Source",
      "Managed cloud sync & multi-device backup",
      "Included monthly Gemini & Claude generation quotas",
      "Serverless high-fidelity PDF rendering engine",
      "Automated ATS score scanner & keyword gap check",
      "Priority email & ticket support",
    ],
    ctaLabel: "Start 14-Day Trial",
    ctaHref: "/login",
    isPopular: true,
    buttonVariant: "default",
  },
  {
    id: "enterprise",
    testId: "tier-enterprise",
    name: "Enterprise",
    badge: "Organizations",
    price: "Custom",
    period: "tailored quote",
    description: "For university career centers and recruiting teams.",
    features: [
      "Everything in Cloud Hosted",
      "SAML SSO (Okta, Azure AD, Google)",
      "Custom LLM guardrails & compliance policies",
      "Multi-seat applicant review workflows",
      "Dedicated custom ATS templates & SLA",
    ],
    ctaLabel: "Contact Sales",
    ctaHref: "mailto:sales@resumeee.local?subject=Enterprise%20Inquiry",
    isExternalCta: true,
    buttonVariant: "outline",
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
    id: "hallucinations",
    question: "How does Resumeee prevent AI hallucinations?",
    answer:
      "Resumeee structures your career as an immutable relational graph. Every experience, bullet fact, and skill receives a deterministic short identifier hash. When generating tailored resume versions, our engine constrains the LLM to only rephrase and reorder proven facts from your profile. Invented credentials or fabricated companies are rejected before export.",
  },
  {
    id: "offline",
    question: "Can I really use Resumeee 100% offline?",
    answer:
      "Yes. You can run Resumeee on your local machine using Docker Compose or bare-metal binaries connected to local Ollama models (e.g. Llama 3 or Mistral). No external internet access is required, ensuring zero data transmission.",
  },
  {
    id: "ats",
    question: "Will my resumes pass Applicant Tracking Systems (ATS)?",
    answer:
      "Yes. Resumeee templates strictly adhere to ATS standards: semantic headings, parseable text streams, clean single-column layouts, standard system typography, and zero complex graphics or multi-column text frames that break automated parsers.",
  },
  {
    id: "export",
    question: "Can I export my data if I decide to leave?",
    answer:
      "Absolutely. Resumeee provides full one-click JSON Resume and SQLite exports. There is zero proprietary lock-in.",
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
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {feature.description}
        </p>
      </div>
    </div>
  );
};

/**
 * Subcomponent rendering an individual pricing tier card.
 */
export const PricingCard: React.FC<{ tier: PricingTier }> = ({ tier }) => {
  return (
    <div
      data-testid={tier.testId}
      className={`rounded-2xl bg-white dark:bg-slate-900 p-8 shadow-sm flex flex-col justify-between relative ${
        tier.isPopular
          ? "border-2 border-indigo-600 dark:border-indigo-500 shadow-md"
          : "border border-slate-200 dark:border-slate-800"
      }`}
    >
      {tier.isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-indigo-600 px-3.5 py-1 text-xs font-semibold text-white shadow-sm">
            Most Popular
          </span>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <span
            className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${
              tier.badgeClass || "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            {tier.badge}
          </span>
          <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {tier.name}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {tier.description}
          </p>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-slate-900 dark:text-slate-100">
            {tier.price}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {tier.period}
          </span>
        </div>

        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
          {tier.features.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8">
        {tier.isExternalCta ? (
          <Button variant={tier.buttonVariant || "outline"} className="w-full font-semibold" asChild>
            <a href={tier.ctaHref} target={tier.ctaHref.startsWith("http") ? "_blank" : undefined} rel={tier.ctaHref.startsWith("http") ? "noreferrer noopener" : undefined}>
              {tier.ctaLabel}
            </a>
          </Button>
        ) : (
          <Button variant={tier.buttonVariant || "default"} className="w-full font-semibold shadow" asChild>
            <Link to={tier.ctaHref}>{tier.ctaLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * Public Landing Page component showcasing Resumeee.
 *
 * @returns JSX Element rendering the public landing page.
 */
export const LandingPage: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dockerCommand =
    "docker run -d -p 8080:8080 -v ~/.resumeee:/data ghcr.io/rrivera/resumeee:latest";

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
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
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/70 px-3.5 py-1 text-xs font-medium text-indigo-900 dark:border-indigo-800/80 dark:bg-indigo-950/50 dark:text-indigo-300">
          <span className="flex h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
          <span>Open Source Career Graph • Local-First & Self-Hostable</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-4">
          <h1
            id="hero-heading"
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.15]"
          >
            Stop renaming <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">Resume_v2.pdf</span>.
            <br />
            <span>Branch your career like Git.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
            One resume to rule them all. Maintain a single source of career truth, branch tailored variants for every role, and eliminate AI hallucinations with cryptographic fact provenance.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-center">
          <Button size="lg" asChild className="w-full sm:w-auto h-12 px-7 text-base font-semibold shadow-sm">
            <Link to="/login" className="flex items-center justify-center gap-2">
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>

          <Button
            size="lg"
            variant="outline"
            asChild
            className="w-full sm:w-auto h-12 px-7 text-base font-semibold"
          >
            <a
              href="https://github.com/rrivera/resumeee"
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center justify-center gap-2"
            >
              <Terminal className="h-4 w-4" aria-hidden="true" />
              <span>Run Locally on GitHub</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            </a>
          </Button>
        </div>

        {/* Trust & Guarantee Subtitle */}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Zero tracking cookies • 100% MIT Licensed • Runs offline with Ollama
        </p>

        {/* Hero Visualizer: Git-style Career Branch Graphic */}
        <div
          data-testid="hero-branch-visualizer"
          className="w-full mt-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 sm:p-6 shadow-md text-left transition-all"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                career.graph / active-branches
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Check className="h-3 w-3" aria-hidden="true" />
                100% Provenance Verified
              </span>
            </div>
          </div>

          {/* Visual Branch Tree */}
          <div className="space-y-4 font-mono text-xs">
            {/* Root / Main Branch */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80">
              <div className="mt-0.5 h-3 w-3 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    main (Single Source of Truth)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    rev #14 • 24 total facts
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-sans text-xs">
                  Primary career database containing all unedited roles, verified projects, skills, and certifications.
                </p>
              </div>
            </div>

            {/* Fork lines */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4 border-l-2 border-indigo-200 dark:border-indigo-900 ml-1.5">
              {/* Branch 1 */}
              <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    feat/lead-infra
                  </span>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                    ATS 98%
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-sans text-xs">
                  Tailored for Senior Platform & SRE roles. Emphasizes Kubernetes, Terraform, and high-scale reliability.
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>3 bullets rephrased • 0 invented facts</span>
                </div>
              </div>

              {/* Branch 2 */}
              <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    feat/founding-eng
                  </span>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                    ATS 96%
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-sans text-xs">
                  Tailored for Seed/Series A startups. Highlights 0-to-1 product velocity and full-stack ownership.
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>4 bullets rephrased • 0 invented facts</span>
                </div>
              </div>
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
            Engineered for Career Precision
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">
            Say goodbye to copy-paste divergences, fabricated resume points, and ATS rejection black holes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <div className="inline-flex items-center gap-2 font-mono text-xs text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded border border-indigo-800">
            <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Developer-First Architecture</span>
          </div>
          <h2
            id="open-source-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
          >
            Run 100% Offline with Docker & Local Ollama
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Resumeee is built for privacy pragmatists. Spin up an isolated instance locally in seconds. Zero telemetry, zero external trackers, and full support for open-weights LLMs.
          </p>
        </div>

        {/* Terminal Block */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-inner">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-amber-500/80" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-xs text-slate-500">bash — resumeee-deploy</span>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyCommand()}
              aria-label="Copy Docker command"
              className="flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-xs text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
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
        </div>

        {/* Privacy Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {PRIVACY_HIGHLIGHTS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="flex items-start gap-3">
                <Icon className={`h-5 w-5 ${item.iconColorClass} shrink-0 mt-0.5`} aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. PRICING & MONETIZATION TIERS */}
      <section
        id="pricing"
        aria-label="Pricing"
        className="space-y-12"
      >
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2
            id="pricing-heading"
            className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl"
          >
            Simple, Transparent Options
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">
            Start self-hosting for free forever, or upgrade to managed cloud hosting for effortless sync and priority AI quotas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {PRICING_TIERS.map((tier) => (
            <PricingCard key={tier.id} tier={tier} />
          ))}
        </div>
      </section>

      {/* 5. FREQUENTLY ASKED QUESTIONS */}
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
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            Everything you need to know about Resumeee, privacy guarantees, and ATS parsing.
          </p>
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
                    className="px-5 pb-5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3"
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
            Create your master career graph today. Free, privacy-first, and open source forever.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            variant="secondary"
            asChild
            className="w-full sm:w-auto h-12 px-7 text-base font-semibold bg-white text-indigo-900 hover:bg-slate-100 dark:bg-slate-100 dark:text-indigo-950"
          >
            <Link to="/login" className="flex items-center justify-center gap-2">
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>

          <Button
            size="lg"
            variant="outline"
            asChild
            className="w-full sm:w-auto h-12 px-7 text-base font-semibold border-indigo-400 text-white hover:bg-indigo-700/50"
          >
            <a
              href="https://github.com/rrivera/resumeee"
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
