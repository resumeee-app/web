import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { SkillsEditor } from "./skills-editor";
import type { components } from "@/api/schema";

const mockSkills: components["schemas"]["Skill"][] = [
  {
    id: "skill-11111111-2222-3333-4444-555555555555",
    user_id: "user-1",
    name: "TypeScript",
    category: "Languages",
  },
  {
    id: "skill-22222222-3333-4444-5555-666666666666",
    user_id: "user-1",
    name: "Go",
    category: "Languages",
  },
  {
    id: "skill-33333333-4444-5555-6666-777777777777",
    user_id: "user-1",
    name: "React",
    category: "Frameworks",
  },
];

describe("SkillsEditor", () => {
  it("renders skills grouped by category tags", () => {
    render(
      <SkillsEditor
        skills={mockSkills}
        onAddSkill={vi.fn()}
        onDeleteSkill={vi.fn()}
      />
    );

    expect(screen.getByText("Languages")).toBeInTheDocument();
    expect(screen.getByText("Frameworks")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("adds a new skill to an existing category", async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn();
    const handleAnnouncement = vi.fn();

    render(
      <SkillsEditor
        skills={mockSkills}
        onAddSkill={handleAdd}
        onDeleteSkill={vi.fn()}
        onAnnouncement={handleAnnouncement}
      />
    );

    const input = screen.getByLabelText(/New skill in Languages/i);
    await user.type(input, "Python");

    const addBtn = screen.getByRole("button", {
      name: /Add skill to Languages/i,
    });
    await user.click(addBtn);

    expect(handleAdd).toHaveBeenCalledWith({
      name: "Python",
      category: "Languages",
    });
    expect(handleAnnouncement).toHaveBeenCalledWith(
      expect.stringContaining("Added skill Python")
    );
  });

  it("removes a skill when clicking remove button", async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();
    const handleAnnouncement = vi.fn();

    render(
      <SkillsEditor
        skills={mockSkills}
        onAddSkill={vi.fn()}
        onDeleteSkill={handleDelete}
        onAnnouncement={handleAnnouncement}
      />
    );

    const removeBtn = screen.getByRole("button", {
      name: /Remove skill TypeScript/i,
    });
    await user.click(removeBtn);

    expect(handleDelete).toHaveBeenCalledWith(
      "skill-11111111-2222-3333-4444-555555555555"
    );
    expect(handleAnnouncement).toHaveBeenCalledWith(
      expect.stringContaining("Removed skill TypeScript")
    );
  });

  it("passes axe-core accessibility audit", async () => {
    const { container } = render(
      <SkillsEditor
        skills={mockSkills}
        onAddSkill={vi.fn()}
        onDeleteSkill={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
