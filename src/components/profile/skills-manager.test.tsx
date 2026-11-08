import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
    is_global: false,
  },
  {
    id: "skill-2",
    user_id: "user-1",
    name: "Go",
    category: "Languages",
    is_global: false,
  },
  {
    id: "skill-3",
    user_id: "user-1",
    name: "React",
    category: "Frameworks",
    is_global: false,
  },
  {
    id: "skill-4",
    user_id: "user-1",
    name: "Cobol",
    category: "Languages",
    is_global: false,
  },
];

const mockGlobalSkill: components["schemas"]["Skill"] = {
  id: "skill-global-1",
  user_id: "system",
  name: "Rust",
  category: "Languages",
  is_global: true,
};

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
        statement: "Built web app with microfrontends",
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
    role: "Lead Creator",
    skills: [{ id: "skill-2", user_id: "user-1", name: "Go" }],
  },
];

const mockEducation: components["schemas"]["Education"][] = [
  {
    id: "edu-1",
    user_id: "user-1",
    institution: "Stanford University",
    degree: "B.S.",
    field: "Computer Science",
    facts: [
      {
        id: "fact-edu-1",
        user_id: "user-1",
        owner_id: "edu-1",
        owner_type: "education",
        statement: "Completed advanced systems engineering research",
        skills: [{ id: "skill-global-1", user_id: "system", name: "Rust" }],
      },
    ],
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

  it("renders career graph context explanation banner and summary stats", () => {
    render(
      <SkillsManager
        skills={[...mockSkills, mockGlobalSkill]}
        experiences={mockExperiences}
        projects={mockProjects}
        education={mockEducation}
        onAddSkill={vi.fn()}
        onDeleteSkill={vi.fn()}
      />
    );

    // Context banner explaining the role in career graph
    expect(
      screen.getByText(/Skills represent verified competencies that ground your tailored resumes/i)
    ).toBeInTheDocument();

    // Metric summaries
    expect(screen.getByText("Total Skills")).toBeInTheDocument();
    expect(screen.getByText("In Use (With Evidence)")).toBeInTheDocument();
    expect(screen.getByText("Awaiting Evidence")).toBeInTheDocument();
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
    const allFilterBtn = screen.getByRole("button", { name: /^All \(/i });
    expect(allFilterBtn).toHaveAttribute("aria-pressed", "true");
    expect(unattachedFilterBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(unattachedFilterBtn);

    expect(unattachedFilterBtn).toHaveAttribute("aria-pressed", "true");
    expect(allFilterBtn).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Cobol")).toBeInTheDocument();
    expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
    expect(screen.queryByText("React")).not.toBeInTheDocument();

    // Filter to Attached
    const attachedFilterBtn = screen.getByRole("button", { name: /In Use/i });
    await user.click(attachedFilterBtn);

    expect(attachedFilterBtn).toHaveAttribute("aria-pressed", "true");
    expect(unattachedFilterBtn).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Cobol")).not.toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
  });

  it("filters skills in real time via search input", async () => {
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

    const searchInput = screen.getByRole("searchbox", { name: /Search skills/i });
    await user.type(searchInput, "Type");

    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.queryByText("Go")).not.toBeInTheDocument();
    expect(screen.queryByText("React")).not.toBeInTheDocument();
    expect(screen.queryByText("Cobol")).not.toBeInTheDocument();

    // Clear search
    await user.clear(searchInput);
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
  });

  it("filters skills by origin (All, Custom, Global)", async () => {
    const user = userEvent.setup();

    render(
      <SkillsManager
        skills={[...mockSkills, mockGlobalSkill]}
        experiences={mockExperiences}
        projects={mockProjects}
        onAddSkill={vi.fn()}
        onDeleteSkill={vi.fn()}
      />
    );

    // Check initial aria-pressed on origin filters
    const allOriginBtn = screen.getByRole("button", { name: /^All Types$/i });
    const globalFilterBtn = screen.getByRole("button", { name: /^Global$/i });
    const customFilterBtn = screen.getByRole("button", { name: /^Custom$/i });
    expect(allOriginBtn).toHaveAttribute("aria-pressed", "true");
    expect(globalFilterBtn).toHaveAttribute("aria-pressed", "false");
    expect(customFilterBtn).toHaveAttribute("aria-pressed", "false");

    // Filter to Global
    await user.click(globalFilterBtn);
    expect(globalFilterBtn).toHaveAttribute("aria-pressed", "true");
    expect(allOriginBtn).toHaveAttribute("aria-pressed", "false");

    expect(screen.getByText("Rust")).toBeInTheDocument();
    expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
    expect(screen.queryByText("Cobol")).not.toBeInTheDocument();

    // Filter to Custom
    await user.click(customFilterBtn);
    expect(customFilterBtn).toHaveAttribute("aria-pressed", "true");
    expect(globalFilterBtn).toHaveAttribute("aria-pressed", "false");

    expect(screen.queryByText("Rust")).not.toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Cobol")).toBeInTheDocument();
  });

  it("opens provenance dialog and displays detailed career graph evidence links", async () => {
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

    // Click provenance evidence button for TypeScript
    const tsButton = screen.getByRole("button", { name: /View evidence for TypeScript/i });
    await user.click(tsButton);

    const dialog = screen.getByRole("dialog", { name: /TypeScript — Provenance & Evidence/i });
    expect(dialog).toBeInTheDocument();

    // Verify linked experience details
    expect(within(dialog).getByText("Acme")).toBeInTheDocument();
    expect(within(dialog).getByText("Staff Dev")).toBeInTheDocument();

    // Close dialog
    const closeBtn = within(dialog).getAllByRole("button", { name: /Close/i })[0]!;
    await user.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("displays education provenance details in evidence dialog", async () => {
    const user = userEvent.setup();

    render(
      <SkillsManager
        skills={[...mockSkills, mockGlobalSkill]}
        experiences={mockExperiences}
        projects={mockProjects}
        education={mockEducation}
        onAddSkill={vi.fn()}
        onDeleteSkill={vi.fn()}
      />
    );

    // Rust is linked via Education Fact
    const rustButton = screen.getByRole("button", { name: /View evidence for Rust/i });
    await user.click(rustButton);

    const dialog = screen.getByRole("dialog", { name: /Rust — Provenance & Evidence/i });
    expect(dialog).toBeInTheDocument();

    expect(within(dialog).getAllByText(/Stanford University/i).length).toBeGreaterThanOrEqual(1);
    expect(
      within(dialog).getByText(/Completed advanced systems engineering research/i)
    ).toBeInTheDocument();
  });

  it("renders education usage indicator on skill chip when linked to education", () => {
    render(
      <SkillsManager
        skills={[...mockSkills, mockGlobalSkill]}
        experiences={mockExperiences}
        projects={mockProjects}
        education={mockEducation}
        onAddSkill={vi.fn()}
        onDeleteSkill={vi.fn()}
      />
    );

    // Rust is attached to Stanford University education via fact
    expect(screen.getByText("Used in 1 education")).toBeInTheDocument();
  });

  it("allows editing custom skills via onUpdateSkill", async () => {
    const user = userEvent.setup();
    const handleUpdate = vi.fn();
    const handleAnnouncement = vi.fn();

    render(
      <SkillsManager
        skills={mockSkills}
        experiences={mockExperiences}
        projects={mockProjects}
        onAddSkill={vi.fn()}
        onUpdateSkill={handleUpdate}
        onDeleteSkill={vi.fn()}
        onAnnouncement={handleAnnouncement}
      />
    );

    const editBtn = screen.getByRole("button", { name: /Edit skill TypeScript/i });
    await user.click(editBtn);

    const editDialog = screen.getByRole("dialog", { name: /Edit Skill/i });
    expect(editDialog).toBeInTheDocument();

    const nameInput = within(editDialog).getByLabelText(/Skill Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "TypeScript 5.x");

    const saveBtn = within(editDialog).getByRole("button", { name: /Save Changes/i });
    await user.click(saveBtn);

    expect(handleUpdate).toHaveBeenCalledWith(
      "skill-1",
      expect.objectContaining({
        name: "TypeScript 5.x",
      })
    );
    expect(handleAnnouncement).toHaveBeenCalledWith(
      expect.stringContaining("Updated skill TypeScript 5.x")
    );
  });

  it("adds a new skill to a category via inline input", async () => {
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

  it("adds a new skill via the primary Add Skill modal", async () => {
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

    const openAddBtn = screen.getByRole("button", { name: /Add New Skill/i });
    await user.click(openAddBtn);

    const addDialog = screen.getByRole("dialog", { name: /Add Skill to Profile/i });
    expect(addDialog).toBeInTheDocument();

    const nameInput = within(addDialog).getByLabelText(/Skill Name/i);
    await user.type(nameInput, "Elixir");

    const categoryInput = within(addDialog).getByLabelText(/Category/i);
    await user.clear(categoryInput);
    await user.type(categoryInput, "Languages");

    const submitBtn = within(addDialog).getByRole("button", { name: /^Create Skill$/i });
    await user.click(submitBtn);

    expect(handleAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Elixir",
        category: "Languages",
      })
    );
    expect(handleAnnouncement).toHaveBeenCalledWith(
      expect.stringContaining("Added skill Elixir")
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
    const duplicateFacts: components["schemas"]["Fact"][] = [
      {
        id: "fact-1",
        user_id: "user-1",
        owner_id: "exp-1",
        owner_type: "work_experience",
        statement: "Built web app with microfrontends",
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

  it("consolidates skills attached to experiences or projects when absent from root skills array", () => {
    const experienceWithExtraSkill: components["schemas"]["WorkExperience"][] = [
      {
        id: "exp-2",
        user_id: "user-1",
        company: "Beta Corp",
        role_title: "Senior Engineer",
        start_date: "2022-01-01",
        is_current: true,
        skills: [
          {
            id: "skill-discovered",
            user_id: "user-1",
            name: "Kubernetes",
            category: "Cloud",
          },
        ],
      },
    ];

    render(
      <SkillsManager
        skills={[]}
        experiences={experienceWithExtraSkill}
        projects={[]}
        facts={[]}
        onAddSkill={vi.fn()}
        onDeleteSkill={vi.fn()}
      />
    );

    // Kubernetes should be consolidated into the view and visible with usage indicator
    expect(screen.getByText("Kubernetes")).toBeInTheDocument();
    expect(screen.getByText("Used in 1 experience")).toBeInTheDocument();
  });

  it("passes axe-core accessibility audit", async () => {
    const { container } = render(
      <SkillsManager
        skills={mockSkills}
        experiences={mockExperiences}
        projects={mockProjects}
        education={mockEducation}
        onAddSkill={vi.fn()}
        onDeleteSkill={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
