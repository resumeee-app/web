import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ProjectsList, parseSkillTokens } from "./projects-list";
import type { components } from "@/api/schema";

const mockProjects: components["schemas"]["Project"][] = [
  {
    id: "proj-11111111-2222-3333-4444-555555555555",
    user_id: "user-1",
    name: "Resumeee Open Source",
    role: "Lead Maintainer",
    url: "https://github.com/rrivera/resumeee",
    start_date: "2023-01",
    end_date: null,
    summary: "AI-native resume builder with Git-like branch versioning.",
    skills: [
      {
        id: "skill-ts",
        user_id: "user-1",
        name: "TypeScript",
      },
      {
        id: "skill-go",
        user_id: "user-1",
        name: "Go",
      },
    ],
    facts: [
      {
        id: "fact-bbbbbbb1-2222-3333-4444-555555555555",
        user_id: "user-1",
        owner_id: "proj-11111111-2222-3333-4444-555555555555",
        owner_type: "project",
        statement: "Implemented 3-tier prompting hierarchy with token optimization.",
      },
    ],
  },
];

describe("parseSkillTokens", () => {
  it("returns an empty array for empty or whitespace-only strings", () => {
    expect(parseSkillTokens("")).toEqual([]);
    expect(parseSkillTokens("   ")).toEqual([]);
    expect(parseSkillTokens(",,,")).toEqual([]);
    expect(parseSkillTokens(" , , , ")).toEqual([]);
  });

  it("trims whitespace and filters empty tokens", () => {
    expect(parseSkillTokens(" Go , TypeScript ,  Docker ")).toEqual([
      "Go",
      "TypeScript",
      "Docker",
    ]);
  });

  it("deduplicates tokens case-insensitively preserving first casing", () => {
    expect(parseSkillTokens("TypeScript, typescript, TYPESCRIPT, Go")).toEqual([
      "TypeScript",
      "Go",
    ]);
  });
});

describe("ProjectsList", () => {
  it("renders projects with ShortID badges and bullet facts", () => {
    render(
      <ProjectsList
        projects={mockProjects}
        onAddProject={vi.fn()}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    expect(screen.getByText("Resumeee Open Source")).toBeInTheDocument();
    expect(screen.getByText("Lead Maintainer")).toBeInTheDocument();
    expect(screen.getByText("2023-01 — Present")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByText("proj-11111111")).toBeInTheDocument();
    expect(screen.getByText("fact-bbbbbbb1")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Implemented 3-tier prompting hierarchy with token optimization."
      )
    ).toBeInTheDocument();
  });

  it("opens modal dialog to add new project", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsList
        projects={mockProjects}
        onAddProject={vi.fn()}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    const addBtn = screen.getByRole("button", { name: /Add Project/i });
    await user.click(addBtn);

    expect(
      screen.getByRole("heading", { name: /Add Project/i })
    ).toBeInTheDocument();
  });

  it("submits modal form and calls onAddProject with valid fields", async () => {
    const user = userEvent.setup();
    const handleAddProject = vi.fn();
    render(
      <ProjectsList
        projects={mockProjects}
        onAddProject={handleAddProject}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    const addBtn = screen.getByRole("button", { name: /Add Project/i });
    await user.click(addBtn);

    const nameInput = screen.getByLabelText(/Project Name/i);
    const roleInput = screen.getByLabelText(/Role/i);
    const urlInput = screen.getByLabelText(/Project URL/i);
    const summaryInput = screen.getByLabelText(/Summary/i);

    await user.type(nameInput, "Distributed Task Engine");
    await user.type(roleInput, "Principal Architect");
    await user.type(urlInput, "https://github.com/engine/distributed");
    await user.type(summaryInput, "Fault-tolerant actor network.");

    const saveBtn = screen.getByRole("button", { name: /Save Project/i });
    await user.click(saveBtn);

    expect(handleAddProject).toHaveBeenCalledWith({
      name: "Distributed Task Engine",
      role: "Principal Architect",
      url: "https://github.com/engine/distributed",
      start_date: undefined,
      end_date: null,
      summary: "Fault-tolerant actor network.",
    });
  });

  it("rejects invalid or dangerous URLs and displays accessible inline error", async () => {
    const user = userEvent.setup();
    const handleAddProject = vi.fn();
    render(
      <ProjectsList
        projects={mockProjects}
        onAddProject={handleAddProject}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    const addBtn = screen.getByRole("button", { name: /Add Project/i });
    await user.click(addBtn);

    const nameInput = screen.getByLabelText(/Project Name/i);
    const urlInput = screen.getByLabelText(/Project URL/i);

    await user.type(nameInput, "Malicious Link Test");
    await user.type(urlInput, "javascript:alert(1)");

    const saveBtn = screen.getByRole("button", { name: /Save Project/i });
    await user.click(saveBtn);

    expect(handleAddProject).not.toHaveBeenCalled();
    expect(urlInput).toHaveAttribute("aria-invalid", "true");
    const errorMsg = screen.getByText(/Please enter a valid HTTP or HTTPS URL/i);
    expect(errorMsg).toBeInTheDocument();
    expect(urlInput).toHaveAttribute("aria-describedby", "proj-url-error");
  });

  it("invokes deletion callbacks for project and fact bullets", async () => {
    const user = userEvent.setup();
    const handleDeleteProject = vi.fn();
    const handleDeleteFact = vi.fn();

    render(
      <ProjectsList
        projects={mockProjects}
        onAddProject={vi.fn()}
        onUpdateProject={vi.fn()}
        onDeleteProject={handleDeleteProject}
        onAddFact={vi.fn()}
        onDeleteFact={handleDeleteFact}
      />
    );

    const deleteProjBtn = screen.getByRole("button", {
      name: /Delete Resumeee Open Source/i,
    });
    await user.click(deleteProjBtn);
    expect(handleDeleteProject).toHaveBeenCalledWith(
      "proj-11111111-2222-3333-4444-555555555555"
    );

    const deleteFactBtn = screen.getByRole("button", {
      name: /Delete bullet point fact-bbbbbbb1/i,
    });
    await user.click(deleteFactBtn);
    expect(handleDeleteFact).toHaveBeenCalledWith(
      "fact-bbbbbbb1-2222-3333-4444-555555555555"
    );
  });

  it("does not render link for projects with invalid or dangerous schemes", () => {
    const unsafeProjects: components["schemas"]["Project"][] = [
      {
        id: "proj-unsafe-1",
        user_id: "user-1",
        name: "Unsafe URL Project",
        url: "javascript:alert(1)",
        facts: [],
      },
    ];

    render(
      <ProjectsList
        projects={unsafeProjects}
        onAddProject={vi.fn()}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("toggles the collapsible Extended Details section in the project modal", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsList
        projects={mockProjects}
        onAddProject={vi.fn()}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    const addBtn = screen.getByRole("button", { name: /Add Project/i });
    await user.click(addBtn);

    const toggleBtn = screen.getByRole("button", { name: /Extended Details/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText(/Start Date/i)).not.toBeInTheDocument();

    await user.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Skills$/i)).toBeInTheDocument();

    await user.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText(/Start Date/i)).not.toBeInTheDocument();
  });

  it("creates a new project with optional Start Date, End Date, and Skills under Extended Details", async () => {
    const user = userEvent.setup();
    const handleAddProject = vi.fn();
    const mockAvailableSkills: components["schemas"]["Skill"][] = [
      { id: "skill-1", user_id: "user-1", name: "Kubernetes" },
      { id: "skill-2", user_id: "user-1", name: "Rust" },
    ];

    render(
      <ProjectsList
        projects={mockProjects}
        availableSkills={mockAvailableSkills}
        onAddProject={handleAddProject}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Add Project/i }));
    await user.type(screen.getByLabelText(/Project Name/i), "Cloud Orchestrator");

    // Open Extended Details
    await user.click(screen.getByRole("button", { name: /Extended Details/i }));

    const startDateInput = screen.getByLabelText(/Start Date/i);
    const endDateInput = screen.getByLabelText(/End Date/i);
    const skillsInput = screen.getByLabelText(/^Skills$/i);

    await user.type(startDateInput, "2024-01");
    await user.type(endDateInput, "2024-12");
    await user.type(skillsInput, "Kubernetes, Rust");

    await user.click(screen.getByRole("button", { name: /Save Project/i }));

    expect(handleAddProject).toHaveBeenCalledWith({
      name: "Cloud Orchestrator",
      role: undefined,
      url: undefined,
      start_date: "2024-01",
      end_date: "2024-12",
      summary: undefined,
      skill_ids: ["skill-1", "skill-2"],
    });
  });

  it("edits an existing project with populated start date, end date, and skills", async () => {
    const user = userEvent.setup();
    const handleUpdateProject = vi.fn();

    render(
      <ProjectsList
        projects={mockProjects}
        onAddProject={vi.fn()}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    const editBtn = screen.getByRole("button", {
      name: /Edit Resumeee Open Source/i,
    });
    await user.click(editBtn);

    // Should be automatically expanded since project has existing start_date and skills
    const toggleBtn = screen.getByRole("button", { name: /Extended Details/i });
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");

    const startDateInput = screen.getByLabelText(/Start Date/i) as HTMLInputElement;
    expect(startDateInput.value).toBe("2023-01");

    const skillsInput = screen.getByLabelText(/^Skills$/i) as HTMLInputElement;
    expect(skillsInput.value).toContain("TypeScript");
    expect(skillsInput.value).toContain("Go");

    // Update End Date
    const endDateInput = screen.getByLabelText(/End Date/i);
    await user.type(endDateInput, "2025-06");

    await user.click(screen.getByRole("button", { name: /Save Project/i }));

    expect(handleUpdateProject).toHaveBeenCalledWith(
      "proj-11111111-2222-3333-4444-555555555555",
      expect.objectContaining({
        name: "Resumeee Open Source",
        start_date: "2023-01",
        end_date: "2025-06",
        skill_ids: ["skill-ts", "skill-go"],
      })
    );
  });

  it("clears all skills when editing an existing project and submits skill_ids: []", async () => {
    const user = userEvent.setup();
    const handleUpdateProject = vi.fn();

    render(
      <ProjectsList
        projects={mockProjects}
        onAddProject={vi.fn()}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    const editBtn = screen.getByRole("button", {
      name: /Edit Resumeee Open Source/i,
    });
    await user.click(editBtn);

    const skillsInput = screen.getByLabelText(/^Skills$/i) as HTMLInputElement;
    expect(skillsInput.value).toContain("TypeScript");
    expect(skillsInput.value).toContain("Go");

    // Clear skills completely
    await user.clear(skillsInput);
    expect(skillsInput.value).toBe("");

    await user.click(screen.getByRole("button", { name: /Save Project/i }));

    expect(handleUpdateProject).toHaveBeenCalledWith(
      "proj-11111111-2222-3333-4444-555555555555",
      expect.objectContaining({
        name: "Resumeee Open Source",
        skill_ids: [],
      })
    );
  });

  it("toggles quick-add skill chips to add and remove skills producing clean comma-separated values", async () => {
    const user = userEvent.setup();
    const handleAddProject = vi.fn();
    const mockAvailableSkills: components["schemas"]["Skill"][] = [
      { id: "skill-1", user_id: "user-1", name: "Kubernetes" },
      { id: "skill-2", user_id: "user-1", name: "Rust" },
      { id: "skill-3", user_id: "user-1", name: "Docker" },
    ];

    render(
      <ProjectsList
        projects={mockProjects}
        availableSkills={mockAvailableSkills}
        onAddProject={handleAddProject}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Add Project/i }));
    await user.type(screen.getByLabelText(/Project Name/i), "Cloud Orchestrator");
    await user.click(screen.getByRole("button", { name: /Extended Details/i }));

    const skillsInput = screen.getByLabelText(/^Skills$/i) as HTMLInputElement;
    const k8sChip = screen.getByRole("button", { name: /Kubernetes/i });
    const rustChip = screen.getByRole("button", { name: /Rust/i });
    const dockerChip = screen.getByRole("button", { name: /Docker/i });

    expect(k8sChip.textContent).toContain("+");
    expect(k8sChip.textContent).not.toContain("✓");

    // Initial click to add Kubernetes
    await user.click(k8sChip);
    expect(skillsInput.value).toBe("Kubernetes");
    expect(k8sChip.textContent).toContain("✓");
    expect(k8sChip.textContent).not.toContain("+");

    // Click Rust to add
    await user.click(rustChip);
    expect(skillsInput.value).toBe("Kubernetes, Rust");

    // Click Docker to add
    await user.click(dockerChip);
    expect(skillsInput.value).toBe("Kubernetes, Rust, Docker");

    // Click Rust to remove (middle element removal -> clean format)
    await user.click(rustChip);
    expect(skillsInput.value).toBe("Kubernetes, Docker");
    expect(skillsInput.value).not.toMatch(/,,/);
    expect(skillsInput.value).not.toMatch(/^,/);
    expect(skillsInput.value).not.toMatch(/,$/);

    // Click Kubernetes to remove (first element removal)
    await user.click(k8sChip);
    expect(skillsInput.value).toBe("Docker");

    // Click Docker to remove (last element removal -> clean empty)
    await user.click(dockerChip);
    expect(skillsInput.value).toBe("");

    // Click Rust to re-add from empty
    await user.click(rustChip);
    expect(skillsInput.value).toBe("Rust");

    await user.click(screen.getByRole("button", { name: /Save Project/i }));
    expect(handleAddProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Cloud Orchestrator",
        skill_ids: ["skill-2"],
      })
    );
  });

  it("passes axe-core accessibility audit with Extended Details expanded", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ProjectsList
        projects={mockProjects}
        onAddProject={vi.fn()}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Add Project/i }));
    await user.click(screen.getByRole("button", { name: /Extended Details/i }));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("passes axe-core accessibility audit", async () => {
    const { container } = render(
      <ProjectsList
        projects={mockProjects}
        onAddProject={vi.fn()}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders project modal with at least 720px width and mobile responsive sizing", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsList
        projects={mockProjects}
        onAddProject={vi.fn()}
        onUpdateProject={vi.fn()}
        onDeleteProject={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Add Project/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("sm:max-w-[720px]");
    expect(dialog).not.toHaveClass("max-w-md");
    expect(dialog).toHaveClass("w-full");
    expect(dialog).toHaveClass("max-h-[90vh]");
    expect(dialog).toHaveClass("overflow-y-auto");
  });
});
