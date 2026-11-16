import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
import { PresetCard } from "./preset-card";
import type { Preset } from "@/api/preset-queries";

const systemPreset: Preset = {
  id: "builtin-1-page-tech-resume",
  user_id: "default",
  name: "1-Page Tech Resume",
  description: "Strict 1-page max format for engineering roles.",
  system_instructions: "Focus on high-impact quantitative engineering accomplishments.",
  suggested_theme_id: "builtin-standard-clean",
  language: "English",
  is_built_in: true,
};

const customPreset: Preset = {
  id: "preset-custom-456",
  user_id: "user-1",
  name: "Custom Staff SWE Preset",
  description: "Leadership and system architecture focus.",
  system_instructions: "Highlight technical strategy and cross-functional leadership.",
  suggested_theme_id: "builtin-standard-clean",
  language: "Spanish",
  is_built_in: false,
};

describe("PresetCard Component", () => {
  it("renders system preset with System Preset badge and View Details link, without edit or delete actions", () => {
    render(
      <MemoryRouter>
        <PresetCard
          preset={systemPreset}
          templateName="Standard Clean"
          onDuplicate={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { level: 2, name: /1-page tech resume/i })
    ).toBeInTheDocument();
    expect(screen.getByText("System Strategy")).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(
      screen.getByText("Strict 1-page max format for engineering roles.")
    ).toBeInTheDocument();

    // View Details link exists
    const viewLink = screen.getByRole("link", { name: /view details/i });
    expect(viewLink).toHaveAttribute("href", "/presets/builtin-1-page-tech-resume");

    // Immutability: Edit and Delete buttons MUST NOT be present
    expect(
      screen.queryByRole("link", { name: /^edit/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^delete/i })
    ).not.toBeInTheDocument();

    // Duplicate button is present
    expect(
      screen.getByRole("button", { name: /duplicate.*to custom/i })
    ).toBeInTheDocument();
  });

  it("renders custom preset with Custom badge, Edit link, and Delete action guarded by AlertDialog", async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();
    render(
      <MemoryRouter>
        <PresetCard
          preset={customPreset}
          templateName="Standard Clean"
          onDuplicate={vi.fn()}
          onDelete={handleDelete}
        />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { level: 2, name: /custom staff swe preset/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Custom Strategy")).toBeInTheDocument();
    expect(screen.getAllByText("Spanish").length).toBeGreaterThan(0);
    expect(screen.queryByText(/gemini-4-argon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/reasoning/i)).not.toBeInTheDocument();

    // Edit link exists
    const editLink = screen.getByRole("link", { name: /edit/i });
    expect(editLink).toHaveAttribute("href", "/presets/preset-custom-456");

    // Click Delete button to trigger Radix AlertDialog
    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteBtn);

    // Dialog appears with confirmation
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /delete tailoring strategy/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/are you sure you want to delete "custom staff swe preset"/i)
    ).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByRole("button", { name: /confirm delete/i });
    await user.click(confirmBtn);

    expect(handleDelete).toHaveBeenCalledWith("preset-custom-456");
  });

  it("calls onDuplicate when duplicate button is clicked", async () => {
    const user = userEvent.setup();
    const handleDuplicate = vi.fn();
    render(
      <MemoryRouter>
        <PresetCard
          preset={systemPreset}
          templateName="Standard Clean"
          onDuplicate={handleDuplicate}
        />
      </MemoryRouter>
    );

    const dupBtn = screen.getByRole("button", { name: /duplicate.*to custom/i });
    await user.click(dupBtn);

    expect(handleDuplicate).toHaveBeenCalledWith(systemPreset);
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = render(
      <MemoryRouter>
        <PresetCard
          preset={customPreset}
          templateName="Standard Clean"
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
        />
      </MemoryRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
