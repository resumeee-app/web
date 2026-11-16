import { describe, it, expect, vi } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
import { TailorActionBar } from "./tailor-action-bar";
import type { Branch, Preset, TemplateSet } from "@/api/workbench-queries";

function render(ui: React.ReactElement) {
  return rtlRender(<MemoryRouter>{ui}</MemoryRouter>);
}

const mockBranch: Branch = {
  id: "branch-123",
  user_id: "user-1",
  name: "Senior Backend Engineer",
  target_role: "Staff Infrastructure Engineer",
  target_company: "Stripe",
  template_set_id: "tpl-executive",
  preset_id: "preset-ats",
  is_stale: true,
  last_synced_main_revision: 3,
};

const mockPresets: Preset[] = [
  {
    id: "preset-ats",
    user_id: "user-1",
    name: "ATS Optimized",
    system_instructions: "Emphasize metrics",
    suggested_theme_id: "tpl-executive",
  },
];

const mockTemplates: TemplateSet[] = [
  {
    id: "tpl-executive",
    user_id: "user-1",
    name: "Executive Minimalist",
    description: "Single column executive template",
    html_template: "<div></div>",
    markdown_template: "# Resume",
    text_template: "Resume",
  },
];

describe("TailorActionBar", () => {
  it("displays branch metadata and staleness badge", () => {
    render(
      <TailorActionBar
        branch={mockBranch}
        presets={mockPresets}
        templates={mockTemplates}
        isTailoring={false}
        onTailorResume={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Senior Backend Engineer" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Staff Infrastructure Engineer/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Stripe/i)).toBeInTheDocument();
    expect(screen.getByText("Main Updates Available")).toBeInTheDocument();

    const inspectLink = screen.getByRole("link", {
      name: /inspect resume for senior backend engineer/i,
    });
    expect(inspectLink).toBeInTheDocument();
    expect(inspectLink).toHaveAttribute("href", "/branches/branch-123/preview");
  });

  it("renders default branch with 'Refresh from Main' action and suppresses preset selector", () => {
    const defaultBranch: Branch = {
      ...mockBranch,
      id: "branch-default",
      name: "Main Profile (Default)",
      is_default: true,
      is_stale: false,
    };

    render(
      <TailorActionBar
        branch={defaultBranch}
        presets={mockPresets}
        templates={mockTemplates}
        isTailoring={false}
        onTailorResume={vi.fn()}
      />
    );

    // Primary action button must say Refresh from Main Profile
    expect(
      screen.getByRole("button", {
        name: /refresh from main profile/i,
      })
    ).toBeInTheDocument();

    // Must NOT have Tailor Resume button
    expect(
      screen.queryByRole("button", {
        name: /tailor resume/i,
      })
    ).not.toBeInTheDocument();

    // Must NOT have Sync with Main button on default branch
    expect(
      screen.queryByRole("button", {
        name: /^sync with main$/i,
      })
    ).not.toBeInTheDocument();

    // Tailoring strategy selector is suppressed for default branch
    expect(
      screen.queryByRole("combobox", {
        name: /tailoring strategy/i,
      })
    ).not.toBeInTheDocument();

    // Template selector remains accessible
    expect(
      screen.getByRole("combobox", {
        name: /resume template/i,
      })
    ).toBeInTheDocument();
  });

  it("renders 'Tailor Resume' button when branch is in sync and calls onTailorResume", async () => {
    const user = userEvent.setup();
    const onTailor = vi.fn();

    render(
      <TailorActionBar
        branch={{ ...mockBranch, is_stale: false }}
        presets={mockPresets}
        templates={mockTemplates}
        isTailoring={false}
        onTailorResume={onTailor}
      />
    );

    const tailorButton = screen.getByRole("button", {
      name: /tailor resume/i,
    });
    expect(tailorButton).toBeInTheDocument();

    // Verifies no standalone 'Sync with Main' button exists in header
    expect(
      screen.queryByRole("button", {
        name: /^sync with main$/i,
      })
    ).not.toBeInTheDocument();

    await user.click(tailorButton);
    expect(onTailor).toHaveBeenCalledTimes(1);
  });

  it("updates primary button to 'Sync with Main' when branch is out of sync and calls onTailorResume", async () => {
    const user = userEvent.setup();
    const onTailor = vi.fn();

    render(
      <TailorActionBar
        branch={{ ...mockBranch, is_stale: true }}
        presets={mockPresets}
        templates={mockTemplates}
        isTailoring={false}
        onTailorResume={onTailor}
      />
    );

    // Primary button should now be 'Sync with Main'
    const syncMainButton = screen.getByRole("button", {
      name: /sync with main/i,
    });
    expect(syncMainButton).toBeInTheDocument();

    // 'Tailor Resume' label is replaced
    expect(
      screen.queryByRole("button", {
        name: /tailor resume/i,
      })
    ).not.toBeInTheDocument();

    await user.click(syncMainButton);
    expect(onTailor).toHaveBeenCalledTimes(1);
  });

  it("disables primary button during active tailoring to prevent duplicate triggers", () => {
    const { rerender } = render(
      <TailorActionBar
        branch={{ ...mockBranch, is_stale: false }}
        presets={mockPresets}
        templates={mockTemplates}
        isTailoring={true}
        onTailorResume={vi.fn()}
      />
    );

    const tailoringButton = screen.getByRole("button", {
      name: /tailoring\.\.\./i,
    });
    expect(tailoringButton).toBeDisabled();

    // Stale branch during tailoring shows 'Syncing...'
    rerender(
      <MemoryRouter>
        <TailorActionBar
          branch={{ ...mockBranch, is_stale: true }}
          presets={mockPresets}
          templates={mockTemplates}
          isTailoring={true}
          onTailorResume={vi.fn()}
        />
      </MemoryRouter>
    );

    const syncingButton = screen.getByRole("button", {
      name: /syncing\.\.\./i,
    });
    expect(syncingButton).toBeDisabled();
  });

  it("renders prominent stale banner informing about revisions when branch is stale without duplicate button", () => {
    render(
      <TailorActionBar
        branch={{ ...mockBranch, is_stale: true }}
        presets={mockPresets}
        templates={mockTemplates}
        isTailoring={false}
        onTailorResume={vi.fn()}
      />
    );

    expect(
      screen.getByText(/upstream main profile revisions available/i)
    ).toBeInTheDocument();

    // No duplicate sync button in the banner
    expect(
      screen.queryByRole("button", {
        name: /sync with main profile/i,
      })
    ).not.toBeInTheDocument();
  });

  it("renders interactive select dropdowns for preset and template selection", async () => {
    const user = userEvent.setup();
    const onUpdatePreset = vi.fn();
    const onUpdateTemplate = vi.fn();

    render(
      <TailorActionBar
        branch={mockBranch}
        presets={mockPresets}
        templates={mockTemplates}
        isTailoring={false}
        onTailorResume={vi.fn()}
        onUpdatePreset={onUpdatePreset}
        onUpdateTemplate={onUpdateTemplate}
      />
    );

    const presetSelect = screen.getByRole("combobox", {
      name: /tailoring strategy/i,
    });
    const templateSelect = screen.getByRole("combobox", {
      name: /resume template/i,
    });

    expect(presetSelect).toBeInTheDocument();
    expect(templateSelect).toBeInTheDocument();

    await user.selectOptions(presetSelect, "preset-ats");
    expect(onUpdatePreset).toHaveBeenCalledWith("preset-ats");

    await user.selectOptions(templateSelect, "tpl-executive");
    expect(onUpdateTemplate).toHaveBeenCalledWith("tpl-executive");
  });



  it("disables 'Inspect Resume' button and contextualizes guidance when branch has zero completed versions", () => {
    render(
      <TailorActionBar
        branch={mockBranch}
        presets={mockPresets}
        templates={mockTemplates}
        hasCompletedVersions={false}
        isTailoring={false}
        onTailorResume={vi.fn()}
      />
    );

    // Should NOT have an active link navigating to /branches/:id/preview
    expect(
      screen.queryByRole("link", {
        name: /inspect resume/i,
      })
    ).not.toBeInTheDocument();

    // Should have disabled button with accessible aria attributes
    const disabledButton = screen.getByRole("button", {
      name: /inspect resume/i,
    });
    expect(disabledButton).toBeInTheDocument();
    expect(disabledButton).toBeDisabled();
    expect(disabledButton).toHaveAttribute("aria-disabled", "true");

    // Helpful guidance to tailor first must be visible
    expect(
      screen.getByText(/tailor resume first to preview/i)
    ).toBeInTheDocument();
  });

  it("renders active 'Inspect Resume' link targeting active version when branch has completed versions", () => {
    const { rerender } = render(
      <TailorActionBar
        branch={mockBranch}
        presets={mockPresets}
        templates={mockTemplates}
        hasCompletedVersions={true}
        activeVersionNumber={2}
        isTailoring={false}
        onTailorResume={vi.fn()}
      />
    );

    const inspectLink = screen.getByRole("link", {
      name: /inspect resume for senior backend engineer/i,
    });
    expect(inspectLink).toBeInTheDocument();
    expect(inspectLink).toHaveAttribute("href", "/branches/branch-123/preview?version=2");

    // Falls back cleanly to base preview path if activeVersionNumber is omitted
    rerender(
      <MemoryRouter>
        <TailorActionBar
          branch={mockBranch}
          presets={mockPresets}
          templates={mockTemplates}
          hasCompletedVersions={true}
          isTailoring={false}
          onTailorResume={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(
      screen.getByRole("link", {
        name: /inspect resume for senior backend engineer/i,
      })
    ).toHaveAttribute("href", "/branches/branch-123/preview");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <TailorActionBar
        branch={mockBranch}
        presets={mockPresets}
        templates={mockTemplates}
        isTailoring={false}
        onTailorResume={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("calls onUpdateTemplate when template combobox selection changes", async () => {
    const user = userEvent.setup();
    const onUpdateTemplate = vi.fn();

    render(
      <TailorActionBar
        branch={mockBranch}
        presets={mockPresets}
        templates={mockTemplates}
        isTailoring={false}
        onUpdateTemplate={onUpdateTemplate}
        onTailorResume={vi.fn()}
      />
    );

    const templateSelect = screen.getByRole("combobox", {
      name: /resume template/i,
    });
    expect(templateSelect).toBeInTheDocument();

    await user.selectOptions(templateSelect, "tpl-executive");
    expect(onUpdateTemplate).toHaveBeenCalledWith("tpl-executive");
  });

  it("renders visual feedback when templateFeedback is provided and triggers onPreviewLayout", async () => {
    const user = userEvent.setup();
    const onPreviewLayout = vi.fn();

    render(
      <TailorActionBar
        branch={mockBranch}
        presets={mockPresets}
        templates={mockTemplates}
        isTailoring={false}
        templateFeedback="Layout switched to Executive Minimalist."
        onPreviewLayout={onPreviewLayout}
        onTailorResume={vi.fn()}
      />
    );

    expect(
      screen.getByText("Layout switched to Executive Minimalist.")
    ).toBeInTheDocument();

    const quickPreviewBtn = screen.getByRole("button", {
      name: /preview layout in modal/i,
    });
    await user.click(quickPreviewBtn);
    expect(onPreviewLayout).toHaveBeenCalledTimes(1);
  });
});
