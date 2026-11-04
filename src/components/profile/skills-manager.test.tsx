import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { SkillsManager } from "./skills-manager";
import type { components } from "@/api/schema";

const mockSkills: components["schemas"]["Skill"][] = [
  {
    id: "skill-1",
    user_id: "user-1",
    name: "TypeScript",
    category: "Languages",
  },
  {
    id: "skill-2",
    user_id: "user-1",
    name: "Go",
    category: "Languages",
  },
  {
    id: "skill-3",
    user_id: "user-1",
    name: "React",
    category: "Frameworks",
  },
  {
    id: "skill-4",
    user_id: "user-1",
    name: "Cobol",
    category: "Languages",
  },
];

const mockExperiences: components["schemas"]["WorkExperience"][] = [
  {
    id: "exp-1",
    user_id: "user-1",
    company: "Acme",
    role_title: "Staff Dev",
    start_date: "2020-01-01",
    is_current: true,
    location: { city: "SF" },
    skills: [
      { id: "skill-1", user_id: "user-1", name: "TypeScript" },
    ],
    facts: [
      {
        id: "fact-1",
        user_id: "user-1",
        owner_id: "exp-1",
        owner_type: "work_experience",
        statement: "Built web app",
        skills: [{ id: "skill-3", user_id: "user-1", name: "React" }],
      },
    ],
  },
];

const mockProjects: components["schemas"]["Project"][] = [
  {
    id: "proj-1",
    user_id: "user-1",
    name: "CLI Tool",
    skills: [{ id: "skill-2", user_id: "user-1", name: "Go" }],
  },
];

describe("SkillsManager", () => {
  it("renders skills grouped by category tags and calculates usage counts", () => {
    render(
      <SkillsManager
        skills={mockSkills}
        experiences={mockExperiences}
        projects={mockProjects}
        onAddSkill={vi.fn()}
        onDeleteSkill={vi.fn()}
      />
    );

    expect(screen.getByText("Languages")).toBeInTheDocument();
    expect(screen.getByText("Frameworks")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Cobol")).toBeInTheDocument();

    // Verify usage indicators
    expect(screen.getAllByText("Used in 1 experience")).toHaveLength(2);
    expect(screen.getByText("Used in 1 project")).toBeInTheDocument();
    expect(screen.getByText("Used in 1 fact")).toBeInTheDocument();
    expect(screen.getByText("Unattached")).toBeInTheDocument(); // Cobol is unattached
  });

  it("filters skills by usage status (All, Attached, Unattached)", async () => {
    const user = userEvent.setup();

    render(
      <SkillsManager
        skills={mockSkills}
        experiences={mockExperiences}
        projects={mockProjects}
        onAddSkill={vi.fn()}
        onDeleteSkill={vi.fn()}
      />
    );

    // Filter to only Unattached
    const unattachedFilterBtn = screen.getByRole("button", { name: /Unattached/i });
    await user.click(unattachedFilterBtn);

    expect(screen.getByText("Cobol")).toBeInTheDocument();
    expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
    expect(screen.queryByText("React")).not.toBeInTheDocument();

    // Filter to Attached
    const attachedFilterBtn = screen.getByRole("button", { name: /In Use/i });
    await user.click(attachedFilterBtn);

    expect(screen.queryByText("Cobol")).not.toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
  });

  it("adds a new skill to a category", async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn();
    const handleAnnouncement = vi.fn();

    render(
      <SkillsManager
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
      <SkillsManager
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

    expect(handleDelete).toHaveBeenCalledWith("skill-1");
    expect(handleAnnouncement).toHaveBeenCalledWith(
      expect.stringContaining("Removed skill TypeScript")
    );
  });

  it("deduplicates fact IDs between nested experience facts and snapshot facts without double-counting", () => {
    // fact-1 is present in experience.facts and in standalone facts array (common in snapshot)
    const duplicateFacts: components["schemas"]["Fact"][] = [
      {
        id: "fact-1",
        user_id: "user-1",
        owner_id: "exp-1",
        owner_type: "work_experience",
        statement: "Built web app",
        skills: [{ id: "skill-3", user_id: "user-1", name: "React" }],
      },
      {
        id: "fact-standalone",
        user_id: "user-1",
        owner_id: "exp-1",
        owner_type: "work_experience",
        statement: "Another fact",
        skills: [{ id: "skill-3", user_id: "user-1", name: "React" }],
      },
    ];

    render(
      <SkillsManager
        skills={mockSkills}
        experiences={mockExperiences}
        facts={duplicateFacts}
        onAddSkill={vi.fn()}
        onDeleteSkill={vi.fn()}
      />
    );

    // React is in fact-1 (nested + in facts) and fact-standalone (in facts). Total unique facts = 2, not 3!
    expect(screen.getByText("Used in 2 facts")).toBeInTheDocument();
  });

  it("passes axe-core accessibility audit", async () => {
    const { container } = render(
      <SkillsManager
        skills={mockSkills}
        experiences={mockExperiences}
        projects={mockProjects}
        onAddSkill={vi.fn()}
        onDeleteSkill={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
