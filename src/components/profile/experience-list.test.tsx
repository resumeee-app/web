import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ExperienceList } from "./experience-list";
import type { components } from "@/api/schema";

const mockExperiences: components["schemas"]["WorkExperience"][] = [
  {
    id: "exp-11111111-2222-3333-4444-555555555555",
    user_id: "user-1",
    company: "Acme Corp",
    role_title: "Staff Engineer",
    start_date: "2021-01",
    end_date: null,
    is_current: true,
    location: { city: "San Francisco", region: "CA" },
    facts: [
      {
        id: "fact-aaaaaaa1-2222-3333-4444-555555555555",
        user_id: "user-1",
        owner_id: "exp-11111111-2222-3333-4444-555555555555",
        owner_type: "work_experience",
        statement: "Designed distributed transaction engine reducing latency by 45%.",
      },
    ],
  },
  {
    id: "exp-22222222-3333-4444-5555-666666666666",
    user_id: "user-1",
    company: "Beta Tech",
    role_title: "Senior Developer",
    start_date: "2018-03",
    end_date: "2020-12",
    is_current: false,
    location: { city: "Austin", region: "TX" },
    facts: [],
  },
];

describe("ExperienceList", () => {
  it("renders experiences with ShortID badges and bullet facts", () => {
    render(
      <ExperienceList
        experiences={mockExperiences}
        onReorder={vi.fn()}
        onAddExperience={vi.fn()}
        onUpdateExperience={vi.fn()}
        onDeleteExperience={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Staff Engineer")).toBeInTheDocument();
    expect(screen.getByText(/Present/i)).toBeInTheDocument();
    expect(screen.getByText("exp-11111111")).toBeInTheDocument();
    expect(screen.getByText("fact-aaaaaaa1")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Designed distributed transaction engine reducing latency by 45%."
      )
    ).toBeInTheDocument();
  });

  it("handles reordering via move up/down buttons", async () => {
    const user = userEvent.setup();
    const handleReorder = vi.fn();
    render(
      <ExperienceList
        experiences={mockExperiences}
        onReorder={handleReorder}
        onAddExperience={vi.fn()}
        onUpdateExperience={vi.fn()}
        onDeleteExperience={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    // The first item can move down
    const moveDownBtn = screen.getByRole("button", {
      name: /move staff engineer at acme corp down/i,
    });
    await user.click(moveDownBtn);
    expect(handleReorder).toHaveBeenCalledWith([
      mockExperiences[1],
      mockExperiences[0],
    ]);
  });

  it("allows adding a new bullet fact to an experience", async () => {
    const user = userEvent.setup();
    const handleAddFact = vi.fn();
    const handleAnnouncement = vi.fn();

    render(
      <ExperienceList
        experiences={mockExperiences}
        onReorder={vi.fn()}
        onAddExperience={vi.fn()}
        onUpdateExperience={vi.fn()}
        onDeleteExperience={vi.fn()}
        onAddFact={handleAddFact}
        onDeleteFact={vi.fn()}
        onAnnouncement={handleAnnouncement}
      />
    );

    const input = screen.getByLabelText(/New bullet point for Acme Corp/i);
    await user.type(input, "Architected high-throughput message bus.");

    const addBtn = screen.getByRole("button", {
      name: /Add bullet to Acme Corp/i,
    });
    await user.click(addBtn);

    expect(handleAddFact).toHaveBeenCalledWith(
      "exp-11111111-2222-3333-4444-555555555555",
      "Architected high-throughput message bus."
    );
    expect(handleAnnouncement).toHaveBeenCalledWith(
      expect.stringContaining("Bullet point added")
    );
  });

  it("opens modal dialog to add new experience", async () => {
    const user = userEvent.setup();
    render(
      <ExperienceList
        experiences={mockExperiences}
        onReorder={vi.fn()}
        onAddExperience={vi.fn()}
        onUpdateExperience={vi.fn()}
        onDeleteExperience={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    const addExpBtn = screen.getByRole("button", {
      name: /Add Work Experience/i,
    });
    await user.click(addExpBtn);

    expect(
      screen.getByRole("heading", { name: /Add Work Experience/i })
    ).toBeInTheDocument();
  });

  it("submits modal form and calls onAddExperience with valid fields", async () => {
    const user = userEvent.setup();
    const handleAddExperience = vi.fn();
    render(
      <ExperienceList
        experiences={mockExperiences}
        onReorder={vi.fn()}
        onAddExperience={handleAddExperience}
        onUpdateExperience={vi.fn()}
        onDeleteExperience={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    const addExpBtn = screen.getByRole("button", {
      name: /Add Work Experience/i,
    });
    await user.click(addExpBtn);

    const companyInput = screen.getByLabelText(/Company \/ Organization/i);
    const roleInput = screen.getByLabelText(/Role \/ Title/i);
    const startInput = screen.getByLabelText(/Start Date/i);
    const cityInput = screen.getByLabelText(/City/i);
    const regionInput = screen.getByLabelText(/State \/ Region/i);

    await user.type(companyInput, "NextGen Cloud Inc");
    await user.type(roleInput, "Distinguished Engineer");
    await user.type(startInput, "2022-04");
    await user.type(cityInput, "Seattle");
    await user.type(regionInput, "WA");

    const currentCheckbox = screen.getByLabelText(/I currently work here/i);
    await user.click(currentCheckbox);

    const saveBtn = screen.getByRole("button", { name: /Save Experience/i });
    await user.click(saveBtn);

    expect(handleAddExperience).toHaveBeenCalledWith({
      company: "NextGen Cloud Inc",
      role_title: "Distinguished Engineer",
      start_date: "2022-04",
      end_date: null,
      is_current: true,
      location: {
        city: "Seattle",
        region: "WA",
      },
    });
  });

  it("invokes onDeleteExperience and onDeleteFact deletion callbacks", async () => {
    const user = userEvent.setup();
    const handleDeleteExperience = vi.fn();
    const handleDeleteFact = vi.fn();

    render(
      <ExperienceList
        experiences={mockExperiences}
        onReorder={vi.fn()}
        onAddExperience={vi.fn()}
        onUpdateExperience={vi.fn()}
        onDeleteExperience={handleDeleteExperience}
        onAddFact={vi.fn()}
        onDeleteFact={handleDeleteFact}
      />
    );

    const deleteExpBtn = screen.getByRole("button", {
      name: /Delete Staff Engineer at Acme Corp/i,
    });
    await user.click(deleteExpBtn);

    expect(handleDeleteExperience).toHaveBeenCalledWith(
      "exp-11111111-2222-3333-4444-555555555555"
    );

    const deleteFactBtn = screen.getByRole("button", {
      name: /Delete bullet point fact-aaaaaaa1/i,
    });
    await user.click(deleteFactBtn);

    expect(handleDeleteFact).toHaveBeenCalledWith(
      "fact-aaaaaaa1-2222-3333-4444-555555555555"
    );
  });

  it("passes axe-core accessibility audit", async () => {
    const { container } = render(
      <ExperienceList
        experiences={mockExperiences}
        onReorder={vi.fn()}
        onAddExperience={vi.fn()}
        onUpdateExperience={vi.fn()}
        onDeleteExperience={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
