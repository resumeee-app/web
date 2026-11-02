import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { TailorActionBar } from "./tailor-action-bar";
import type { Branch, Preset, TemplateSet } from "@/api/workbench-queries";

const mockBranch: Branch = {
  id: "branch-123",
  user_id: "user-1",
  name: "Senior Backend Engineer",
  target_role: "Staff Infrastructure Engineer",
  target_company: "Stripe",
  template_set_id: "tpl-executive",
  preset_id: "preset-ats",
  is_stale: true,
  last_synced_master_revision: 3,
};

const mockPresets: Preset[] = [
  {
    id: "preset-ats",
    user_id: "user-1",
    name: "ATS Optimized",
    system_instructions: "Emphasize metrics",
    template_set_id: "tpl-executive",
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
        isSyncing={false}
        onTailorResume={vi.fn()}
        onSyncMaster={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Senior Backend Engineer" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Staff Infrastructure Engineer/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Stripe/i)).toBeInTheDocument();
    expect(screen.getByText("Master Updates Available")).toBeInTheDocument();
  });

  it("calls onTailorResume when 'Tailor Resume' button is clicked", async () => {
    const user = userEvent.setup();
    const onTailor = vi.fn();

    render(
      <TailorActionBar
        branch={mockBranch}
        presets={mockPresets}
        templates={mockTemplates}
        isTailoring={false}
        isSyncing={false}
        onTailorResume={onTailor}
        onSyncMaster={vi.fn()}
      />
    );

    const tailorButton = screen.getByRole("button", {
      name: /tailor resume/i,
    });
    await user.click(tailorButton);

    expect(onTailor).toHaveBeenCalledTimes(1);
  });

  it("disables 'Tailor Resume' button during active tailoring to prevent duplicate triggers", () => {
    render(
      <TailorActionBar
        branch={mockBranch}
        presets={mockPresets}
        templates={mockTemplates}
        isTailoring={true}
        isSyncing={false}
        onTailorResume={vi.fn()}
        onSyncMaster={vi.fn()}
      />
    );

    const tailorButton = screen.getByRole("button", {
      name: /tailoring/i,
    });
    expect(tailorButton).toBeDisabled();
  });

  it("calls onSyncMaster when 'Sync with Master' is clicked", async () => {
    const user = userEvent.setup();
    const onSync = vi.fn();

    render(
      <TailorActionBar
        branch={mockBranch}
        presets={mockPresets}
        templates={mockTemplates}
        isTailoring={false}
        isSyncing={false}
        onTailorResume={vi.fn()}
        onSyncMaster={onSync}
      />
    );

    const syncButton = screen.getByRole("button", {
      name: /^sync with master$/i,
    });
    await user.click(syncButton);

    expect(onSync).toHaveBeenCalledTimes(1);
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
        isSyncing={false}
        onTailorResume={vi.fn()}
        onSyncMaster={vi.fn()}
        onUpdatePreset={onUpdatePreset}
        onUpdateTemplate={onUpdateTemplate}
      />
    );

    const presetSelect = screen.getByRole("combobox", {
      name: /target preset/i,
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

  it("renders prominent stale banner with sync trigger when branch is stale", async () => {
    const user = userEvent.setup();
    const onSync = vi.fn();

    render(
      <TailorActionBar
        branch={{ ...mockBranch, is_stale: true }}
        presets={mockPresets}
        templates={mockTemplates}
        isTailoring={false}
        isSyncing={false}
        onTailorResume={vi.fn()}
        onSyncMaster={onSync}
      />
    );

    expect(
      screen.getByText(/upstream master profile revisions available/i)
    ).toBeInTheDocument();

    const bannerSyncButton = screen.getByRole("button", {
      name: /sync with master profile/i,
    });
    await user.click(bannerSyncButton);

    expect(onSync).toHaveBeenCalled();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <TailorActionBar
        branch={mockBranch}
        presets={mockPresets}
        templates={mockTemplates}
        isTailoring={false}
        isSyncing={false}
        onTailorResume={vi.fn()}
        onSyncMaster={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
