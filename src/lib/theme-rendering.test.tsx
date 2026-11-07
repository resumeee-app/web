import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "vitest-axe";
import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { BranchCard } from "@/components/branches/branch-card";
import {
  BranchStatusBadge,
  DefaultBranchBadge,
} from "@/components/branches/branch-shared-elements";
import { PresetCard } from "@/components/presets/preset-card";
import { PresetForm } from "@/components/presets/preset-form";
import { ContactForm } from "@/components/profile/contact-form";
import { GapAnalysisCard, type GapReport } from "@/components/workbench/gap-analysis-card";
import { Badge } from "@/components/workbench/badge";
import { MemoryRouter } from "react-router-dom";
import type { Branch } from "@/api/branch-queries";
import type { Preset, TemplateSet } from "@/api/preset-queries";

describe("Dark Theme Rendering & Accessibility Verification", () => {
  beforeEach(() => {
    document.documentElement.classList.add("dark");
    localStorage.clear();
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  it("renders ThemeToggle in dark mode with dark styling", async () => {
    const { container } = render(
      <ThemeProvider defaultTheme="dark">
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole("button", { name: /toggle theme/i });
    expect(button).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders BranchCard under dark theme without accessibility violations", async () => {
    const mockBranch: Branch = {
      id: "branch-1234",
      user_id: "user-1",
      template_set_id: "tmpl-1",
      name: "Senior Frontend Engineer",
      target_role: "Staff Engineer",
      target_company: "Acme Corp",
      created_at: "2026-10-20T12:00:00Z",
      updated_at: "2026-10-25T14:30:00Z",
    };

    const { container } = render(
      <MemoryRouter>
        <BranchCard
          branch={mockBranch}
          onDelete={() => {}}
        />
      </MemoryRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders PresetCard under dark theme without accessibility violations", async () => {
    const mockPreset: Preset = {
      id: "preset-custom-1",
      user_id: "user-1",
      name: "FAANG Engineering Lead",
      description: "Tailored for senior leadership and scalable systems",
      system_instructions: "Emphasize leadership and scalability metrics.",
      template_set_id: "tmpl-1",
      is_built_in: false,
      created_at: "2026-10-20T12:00:00Z",
      updated_at: "2026-10-25T14:30:00Z",
    };

    const { container } = render(
      <MemoryRouter>
        <PresetCard
          preset={mockPreset}
          onDelete={() => {}}
          onDuplicate={() => {}}
        />
      </MemoryRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders GapAnalysisCard under dark theme without accessibility violations", async () => {
    const mockReport: GapReport = {
      match_score: 84,
      identified_gaps: [
        {
          requirement: "Rust Concurrency",
          missing_area: "Systems Programming",
          importance: "critical",
          recommended_action: "Add Tokio runtime experience",
        },
      ],
      strategic_recommendations: [
        "Quantify cloud infrastructure cost savings",
      ],
    };

    const { container } = render(
      <GapAnalysisCard gapReport={mockReport} versionNumber={1} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders various Badges under dark theme with high contrast variants", async () => {
    const { container } = render(
      <div className="flex gap-2 p-4">
        <Badge variant="default">Default</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="secondary">Secondary</Badge>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders BranchStatusBadge under dark theme across all operational states without accessibility violations", async () => {
    const { container } = render(
      <div className="flex gap-2 p-4">
        <BranchStatusBadge status="active" />
        <BranchStatusBadge status="tailoring" />
        <BranchStatusBadge status="stale" />
        <BranchStatusBadge status="error" />
      </div>
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Tailoring")).toBeInTheDocument();
    expect(screen.getByText("Out of Sync")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders DefaultBranchBadge under dark theme without accessibility violations", async () => {
    const { container } = render(
      <div className="p-4">
        <DefaultBranchBadge iconSize="md" />
        <DefaultBranchBadge iconSize="sm" />
      </div>
    );

    const badges = screen.getAllByText("Default Branch");
    expect(badges).toHaveLength(2);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders PresetForm system preset banner under dark theme without accessibility violations", async () => {
    const mockTemplates: TemplateSet[] = [
      {
        id: "builtin-standard",
        user_id: "default",
        name: "Standard Clean",
        html_template: "<html></html>",
        markdown_template: "# Res",
        text_template: "Res",
      },
    ];

    const { container } = render(
      <MemoryRouter>
        <PresetForm
          isBuiltIn={true}
          initialValues={{
            id: "builtin-1-page-tech-resume",
            name: "1-Page Tech Resume",
            description: "Strict 1-page max format",
            system_instructions: "Focus on impact",
            template_set_id: "builtin-standard",
            is_built_in: true,
          }}
          templateSets={mockTemplates}
          onSubmit={() => {}}
          onDuplicate={() => {}}
        />
      </MemoryRouter>
    );

    const bannerHeading = screen.getByText(/system preset \(read-only\)/i);
    expect(bannerHeading).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders ContactForm under dark theme with touched error states without accessibility violations", async () => {
    const { container } = render(
      <ContactForm
        initialData={{
          full_name: "",
          email: "invalid-email-format",
          headline: "Software Engineer",
          links: [{ network: "linkedin", url: "not-a-valid-url" }],
        }}
        onChange={() => {}}
      />
    );

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const linkedInInput = screen.getByLabelText(/linkedin/i);

    fireEvent.blur(nameInput);
    fireEvent.blur(emailInput);
    fireEvent.blur(linkedInInput);

    expect(screen.getByText("Full name is required.")).toBeInTheDocument();
    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Please enter a valid URL.")).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
