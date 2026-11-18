import type { components } from "@/api/schema";
import type { Branch, Preset, TemplateSet } from "@/api/branch-queries";
import type { BranchVersion } from "@/api/generation-queries";
import type { ATSScore } from "@/api/workbench-queries";
import type { MainProfileSnapshot } from "@/api/render-queries";
import type { GapReport } from "@/components/workbench/gap-analysis-card";

type Skill = components["schemas"]["Skill"];
type WorkExperience = components["schemas"]["WorkExperience"];
type Fact = components["schemas"]["Fact"];

/**
 * Extended work experience shape including optional short_id display metadata.
 */
export type TourWorkExperience = WorkExperience & { short_id?: string };

/**
 * Extended fact shape including optional short_id display metadata.
 */
export type TourFact = Fact & { short_id?: string };

export const TOUR_SKILLS: Skill[] = [
  {
    id: "skill-gtm",
    user_id: "demo-jane",
    name: "Go-to-Market Launch",
    category: "Product & Brand Strategy",
    proficiency: "Expert",
  },
  {
    id: "skill-lifecycle",
    user_id: "demo-jane",
    name: "Lifecycle Messaging",
    category: "Product & Brand Strategy",
    proficiency: "Advanced",
  },
  {
    id: "skill-pricing",
    user_id: "demo-jane",
    name: "Pricing & Packaging",
    category: "Product & Brand Strategy",
    proficiency: "Advanced",
  },
  {
    id: "skill-storytelling",
    user_id: "demo-jane",
    name: "Executive Storytelling",
    category: "Research & Analytics",
    proficiency: "Advanced",
  },
];

const FACT_LOYALTY: TourFact = {
  id: "fact-loyalty-1d2e",
  short_id: "FAC-1D2E",
  user_id: "demo-jane",
  owner_id: "exp-northstar-4b9a",
  owner_type: "work_experience",
  statement:
    "Led cross-functional launch of tiered loyalty membership across 45 retail markets, lifting repeat retention by 24%.",
  skills: [TOUR_SKILLS[0]!, TOUR_SKILLS[1]!],
};

const FACT_ONBOARDING: TourFact = {
  id: "fact-onboarding-7c04",
  short_id: "FAC-7C04",
  user_id: "demo-jane",
  owner_id: "exp-northstar-4b9a",
  owner_type: "work_experience",
  statement:
    "Partnered with Sales and Design to redesign onboarding flows, cutting time-to-first-value from 9 days to 3 days.",
  skills: [TOUR_SKILLS[1]!],
};

const FACT_MERCHANDISING: TourFact = {
  id: "fact-retail-8b11",
  short_id: "FAC-8B11",
  user_id: "demo-jane",
  owner_id: "exp-northstar-4b9a",
  owner_type: "work_experience",
  statement:
    "Coordinated seasonal brick-and-mortar store signage and pop-up retail displays across regional outlets.",
  skills: [TOUR_SKILLS[0]!],
};

/**
 * Verified bullet fact appended when the visitor runs the Step 1 "Try it" simulation.
 */
export const TOUR_ADDED_FACT: TourFact = {
  id: "fact-pricing-9e3a",
  short_id: "FAC-9E3A",
  user_id: "demo-jane",
  owner_id: "exp-northstar-4b9a",
  owner_type: "work_experience",
  statement:
    "Presented quarterly pricing experiments to executive board, unlocking $1.8M in net-new annual recurring revenue.",
  skills: [TOUR_SKILLS[2]!, TOUR_SKILLS[3]!],
};

export const TOUR_INITIAL_EXPERIENCES: TourWorkExperience[] = [
  {
    id: "exp-northstar-4b9a",
    short_id: "EXP-4B9A",
    user_id: "demo-jane",
    company: "Northstar Goods",
    role_title: "Senior Growth Product Manager",
    employment_type: "Full-time",
    start_date: "2023-03-01",
    end_date: null,
    is_current: true,
    location: { city: "San Francisco", region: "CA" },
    skills: [TOUR_SKILLS[0]!, TOUR_SKILLS[1]!, TOUR_SKILLS[2]!],
    facts: [FACT_LOYALTY, FACT_ONBOARDING],
  },
];

export const TOUR_PRESETS: Preset[] = [
  {
    id: "preset-exec-story",
    user_id: "system",
    name: "Executive Storytelling",
    description: "Highlights measurable business outcomes, GTM leadership, and pricing impact.",
    system_instructions:
      "Lead with cross-functional business outcomes, retention metrics, and executive alignment.",
    suggested_theme_id: "tmpl-modern-editorial",
    language: "English",
    is_built_in: true,
  },
  {
    id: "preset-impact-concise",
    user_id: "system",
    name: "Impact & Outcomes",
    description: "Concise one-page resume prioritizing top commercial achievements.",
    system_instructions: "Keep bullets crisp under two lines with clear conversion percentages.",
    suggested_theme_id: "tmpl-executive-brief",
    language: "English",
    is_built_in: true,
  },
];

export const TOUR_TEMPLATES: TemplateSet[] = [
  {
    id: "tmpl-modern-editorial",
    user_id: "system",
    name: "Modern Editorial",
    description: "Single-column ATS layout with clean hierarchy for product and brand roles.",
    is_built_in: true,
    html_template: "<div></div>",
    markdown_template: "# Resume",
    text_template: "Resume",
  },
  {
    id: "tmpl-executive-brief",
    user_id: "system",
    name: "Executive Brief",
    description: "High-contrast serif headings with generous ATS whitespace.",
    is_built_in: true,
    html_template: "<div></div>",
    markdown_template: "# Resume",
    text_template: "Resume",
  },
  {
    id: "tmpl-standard-clean",
    user_id: "system",
    name: "Standard Clean",
    description: "Classic single-column ATS template matching canonical main profile.",
    is_built_in: true,
    html_template: "<div></div>",
    markdown_template: "# Resume",
    text_template: "Resume",
  },
];

export const TOUR_MAIN_BRANCH: Branch = {
  id: "branch-default-main",
  user_id: "demo-jane",
  name: "Main Career Profile",
  template_set_id: "tmpl-standard-clean",
  active_version_id: "v14",
  updated_at: "2026-11-07T12:00:00Z",
};

export const TOUR_PATAGONIA_BRANCH: Branch = {
  id: "branch-patagonia",
  user_id: "demo-jane",
  name: "Patagonia - Director of Brand & Retention",
  target_company: "Patagonia",
  target_role: "Director of Brand & Retention",
  preset_id: "preset-impact-concise",
  template_set_id: "tmpl-executive-brief",
  active_version_id: "v2",
  updated_at: "2026-11-07T14:00:00Z",
  gap_report: {
    match_score: 94,
  },
};

export const TOUR_SPOTIFY_INITIAL_VALUES = {
  name: "Spotify - Lead Product Strategist",
  target_company: "Spotify",
  target_role: "Lead Product Strategist",
  target_requirements:
    "Lead creator monetization strategy, global go-to-market launches, and subscriber retention experiments across audio markets.",
  preset_id: "preset-exec-story",
  template_set_id: "tmpl-modern-editorial",
  branch_instructions:
    "Highlight creator partnerships, loyalty retention lift, and board-level pricing experiments.",
};

export const TOUR_SPOTIFY_BRANCH: Branch = {
  id: "branch-spotify",
  user_id: "demo-jane",
  name: "Spotify - Lead Product Strategist",
  target_company: "Spotify",
  target_role: "Lead Product Strategist",
  target_requirements: TOUR_SPOTIFY_INITIAL_VALUES.target_requirements,
  branch_instructions: TOUR_SPOTIFY_INITIAL_VALUES.branch_instructions,
  preset_id: "preset-exec-story",
  template_set_id: "tmpl-modern-editorial",
  is_stale: false,
  updated_at: "2026-11-08T09:30:00Z",
};

export const TOUR_TAILORED_GAP_REPORT: GapReport = {
  overall_match_summary:
    "Strong alignment with creator monetization, retention lift, and executive pricing strategy — zero unverified claims.",
  match_score: 97,
  identified_gaps: [],
  strategic_recommendations: [
    "All key job requirements verified against Main Profile ShortIDs (FAC-1D2E, FAC-9E3A, FAC-5A81).",
  ],
};

export const TOUR_TAILORED_ATS_SCORE: ATSScore = {
  extraction_confidence_score: 98,
  job_matching_score: 95,
  format_used: "markdown",
};

export const TOUR_MAIN_SNAPSHOT: MainProfileSnapshot = {
  profile: {
    id: "profile-jane-doe",
    user_id: "demo-jane",
    full_name: "Jane Doe",
    headline: "Senior Growth Product Manager & Brand Strategist",
    summary:
      "Product and brand leader driving retention, lifecycle marketing, and commercial expansion across retail and digital platforms.",
    email: "jane.doe@example.com",
    location: { city: "San Francisco", region: "CA" },
    main_revision: 15,
  },
  main_revision: 15,
  skills: TOUR_SKILLS,
  experiences: [
    {
      ...TOUR_INITIAL_EXPERIENCES[0]!,
      facts: [FACT_LOYALTY, FACT_MERCHANDISING, TOUR_ADDED_FACT],
    },
  ],
  facts: [FACT_LOYALTY, FACT_MERCHANDISING, TOUR_ADDED_FACT],
  exported_at: "2026-11-08T09:30:00Z",
};

export const TOUR_TAILORED_VERSION: BranchVersion = {
  id: "ver-spotify-v1",
  branch_id: "branch-spotify",
  version_number: 1,
  status: "completed",
  main_revision_used: 15,
  template_set_id_used: "tmpl-modern-editorial",
  model_used: "gemini-4-argon",
  created_at: "2026-11-08T09:45:00Z",
  tailored_content: {
    full_name: "Jane Doe",
    headline: "Lead Product Strategist — Creator Monetization & Retention",
    email: "jane.doe@example.com",
    location: { city: "San Francisco", region: "CA" },
    summary:
      "Product and growth strategist specializing in subscription pricing experiments ($1.8M ARR unlocked) and global GTM launches lifting repeat retention by 24%.",
    skill_groups: [
      {
        category: "Product & Brand Strategy",
        skills: ["Pricing & Packaging", "Go-to-Market Launch", "Lifecycle Messaging"],
      },
      {
        category: "Research & Analytics",
        skills: ["Executive Storytelling"],
      },
    ],
    experiences: [
      {
        source_entity_id: "exp-northstar-4b9a",
        company: "Northstar Goods",
        role_title: "Senior Growth Product Manager",
        start_date: "2023-03-01",
        end_date: null,
        bullet_points: [
          {
            text: "Spearheaded tiered membership go-to-market launch across 45 markets, lifting repeat subscriber retention by 24%.",
            source_fact_ids: ["fact-loyalty-1d2e"],
          },
          {
            text: "Presented quarterly pricing experiments to executive board, unlocking $1.8M in net-new annual recurring revenue.",
            source_fact_ids: ["fact-pricing-9e3a"],
          },
        ],
      },
    ],
  },
  gap_report: TOUR_TAILORED_GAP_REPORT,
  ats_score: TOUR_TAILORED_ATS_SCORE,
};

export const TOUR_RENDERED_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    html { background-color: #ffffff; color-scheme: light; }
    body { font-family: Georgia, "Times New Roman", serif; background-color: #ffffff; color: #0f172a; margin: 28px 34px; line-height: 1.48; font-size: 13px; }
    header { border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 16px; }
    h1 { font-size: 22px; margin: 0 0 4px 0; letter-spacing: 0.02em; }
    .subtitle { font-family: system-ui, sans-serif; font-size: 12px; color: #334155; font-weight: 600; margin-bottom: 4px; }
    .contact { font-family: system-ui, sans-serif; font-size: 11px; color: #475569; }
    h2 { font-family: system-ui, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #312e81; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin: 16px 0 8px 0; }
    .role-row { display: flex; justify-content: space-between; align-items: baseline; margin-top: 8px; }
    .role-title { font-weight: 700; font-size: 13.5px; }
    .role-dates { font-family: system-ui, sans-serif; font-size: 11px; color: #475569; }
    .company { font-style: italic; color: #334155; font-size: 12.5px; margin-bottom: 4px; }
    ul { margin: 4px 0 10px 18px; padding: 0; }
    li { margin-bottom: 4px; }
    .skills { font-family: system-ui, sans-serif; font-size: 12px; color: #1e293b; }
  </style>
</head>
<body>
  <header>
    <h1>Jane Doe</h1>
    <div class="subtitle">Lead Product Strategist — Creator Monetization &amp; Retention</div>
    <div class="contact">San Francisco, CA • jane.doe@example.com</div>
  </header>
  <section>
    <h2>Executive Summary</h2>
    <p>Product and growth strategist specializing in creator ecosystems, subscription pricing experiments ($1.8M ARR unlocked), and global GTM launches lifting repeat retention by 24%.</p>
  </section>
  <section>
    <h2>Experience</h2>
    <div class="role-row">
      <span class="role-title">Senior Growth Product Manager</span>
      <span class="role-dates">Mar 2023 – Present</span>
    </div>
    <div class="company">Northstar Goods • San Francisco, CA</div>
    <ul>
      <li>Spearheaded tiered membership go-to-market launch across 45 markets, lifting repeat subscriber retention by 24%.</li>
      <li>Presented quarterly pricing experiments to executive board, unlocking $1.8M in net-new annual recurring revenue.</li>
    </ul>
    <div class="role-row">
      <span class="role-title">Brand Marketing Lead</span>
      <span class="role-dates">Jun 2020 – Feb 2023</span>
    </div>
    <div class="company">Looma Studio • Portland, OR</div>
    <ul>
      <li>Built multi-channel creator partnership playbook generating 38% of qualified pipeline within 12 months.</li>
    </ul>
  </section>
  <section>
    <h2>Core Competencies</h2>
    <p class="skills"><strong>Product &amp; Brand Strategy:</strong> Pricing &amp; Packaging, Go-to-Market Launch, Lifecycle Messaging<br />
    <strong>Research &amp; Analytics:</strong> Executive Storytelling, Customer Discovery</p>
  </section>
</body>
</html>`;

export const TOUR_RENDERED_MARKDOWN = `# Jane Doe
**Lead Product Strategist — Creator Monetization & Retention**
San Francisco, CA • jane.doe@example.com

## Executive Summary
Product and growth strategist specializing in creator ecosystems, subscription pricing experiments ($1.8M ARR unlocked), and global GTM launches lifting repeat retention by 24%.

## Experience
### Senior Growth Product Manager — Northstar Goods (Mar 2023 – Present)
- Spearheaded tiered membership go-to-market launch across 45 markets, lifting repeat subscriber retention by 24%.
- Presented quarterly pricing experiments to executive board, unlocking $1.8M in net-new annual recurring revenue.

### Brand Marketing Lead — Looma Studio (Jun 2020 – Feb 2023)
- Built multi-channel creator partnership playbook generating 38% of qualified pipeline within 12 months.
`;

export const TOUR_RENDERED_PLAIN_TEXT = `JANE DOE
Lead Product Strategist — Creator Monetization & Retention
San Francisco, CA | jane.doe@example.com

SUMMARY
Product and growth strategist specializing in creator ecosystems, subscription pricing experiments ($1.8M ARR unlocked), and global GTM launches lifting repeat retention by 24%.

EXPERIENCE
Senior Growth Product Manager, Northstar Goods (Mar 2023 - Present)
* Spearheaded tiered membership go-to-market launch across 45 markets, lifting repeat subscriber retention by 24%.
* Presented quarterly pricing experiments to executive board, unlocking $1.8M in net-new annual recurring revenue.

Brand Marketing Lead, Looma Studio (Jun 2020 - Feb 2023)
* Built multi-channel creator partnership playbook generating 38% of qualified pipeline within 12 months.
`;
