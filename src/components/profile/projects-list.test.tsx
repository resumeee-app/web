import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ProjectsList } from "./projects-list";
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
});
