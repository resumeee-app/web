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
    employment_type: "Full-time",
    company_location: { city: "New York", region: "NY" },
    company_contact: { type: "Email", value: "hr@acme.corp" },
    hours_per_week: 40,
    supervisor_name: "Sarah Connor",
    supervisor_contact: "sarah@acme.corp",
    duties_summary: "Leading platform infrastructure and architecture.",
    skills: [
      {
        id: "skill-1",
        user_id: "user-1",
        name: "Go",
        category: "Languages",
        proficiency: "Expert",
        years_experience: 5,
      },
      {
        id: "skill-2",
        user_id: "user-1",
        name: "Distributed Systems",
        category: "Backend",
        proficiency: "Expert",
        years_experience: 4,
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

  it("renders extended details like employment type, duties summary, and skills in experience card", () => {
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

    expect(screen.getByText("Full-time")).toBeInTheDocument();
    expect(
      screen.getByText("Leading platform infrastructure and architecture.")
    ).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByText("Distributed Systems")).toBeInTheDocument();
  });

  it("toggles extended details section when expanding collapsible in dialog", async () => {
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

    const toggleBtn = screen.getByRole("button", {
      name: /Extended Details/i,
    });
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText(/Employment Type/i)).not.toBeInTheDocument();

    await user.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText(/Employment Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Company City/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Company State \/ Region/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Company Contact Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Company Contact Value/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hours Per Week/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Supervisor Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Supervisor Contact/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Duties Summary/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Skills/i)).toBeInTheDocument();

    await user.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText(/Employment Type/i)).not.toBeInTheDocument();
  });

  it("submits modal form with all 8 extended details fields", async () => {
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

    await user.type(screen.getByLabelText(/Company \/ Organization/i), "Acme Labs");
    await user.type(screen.getByLabelText(/Role \/ Title/i), "Principal Architect");
    await user.type(screen.getByLabelText(/Start Date/i), "2023-01");

    const toggleBtn = screen.getByRole("button", { name: /Extended Details/i });
    await user.click(toggleBtn);

    await user.selectOptions(screen.getByLabelText(/Employment Type/i), "Contract");
    await user.type(screen.getByLabelText(/Company City/i), "San Jose");
    await user.type(screen.getByLabelText(/Company State \/ Region/i), "CA");
    await user.selectOptions(screen.getByLabelText(/Company Contact Type/i), "Email");
    await user.type(screen.getByLabelText(/Company Contact Value/i), "hr@acmelabs.com");
    await user.type(screen.getByLabelText(/Hours Per Week/i), "35");
    await user.type(screen.getByLabelText(/Supervisor Name/i), "Dr. Bruce Banner");
    await user.type(screen.getByLabelText(/Supervisor Contact/i), "banner@acmelabs.com");
    await user.type(
      screen.getByLabelText(/Duties Summary/i),
      "Leading cloud migration and infrastructure architecture."
    );
    await user.type(screen.getByLabelText(/Skills/i), "skill-ts, skill-go");

    const saveBtn = screen.getByRole("button", { name: /Save Experience/i });
    await user.click(saveBtn);

    expect(handleAddExperience).toHaveBeenCalledWith({
      company: "Acme Labs",
      role_title: "Principal Architect",
      start_date: "2023-01",
      end_date: null,
      is_current: false,
      location: {
        city: undefined,
        region: undefined,
      },
      employment_type: "Contract",
      company_location: {
        city: "San Jose",
        region: "CA",
      },
      company_contact: {
        type: "Email",
        value: "hr@acmelabs.com",
      },
      hours_per_week: 35,
      supervisor_name: "Dr. Bruce Banner",
      supervisor_contact: "banner@acmelabs.com",
      duties_summary: "Leading cloud migration and infrastructure architecture.",
      skill_ids: ["skill-ts", "skill-go"],
    });
  });

  it("populates extended details when editing an experience and saves updates", async () => {
    const user = userEvent.setup();
    const handleUpdateExperience = vi.fn();
    render(
      <ExperienceList
        experiences={mockExperiences}
        onReorder={vi.fn()}
        onAddExperience={vi.fn()}
        onUpdateExperience={handleUpdateExperience}
        onDeleteExperience={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    const editBtn = screen.getByRole("button", {
      name: /Edit Staff Engineer at Acme Corp/i,
    });
    await user.click(editBtn);

    const toggleBtn = screen.getByRole("button", { name: /Extended Details/i });
    await user.click(toggleBtn);

    expect(screen.getByLabelText(/Employment Type/i)).toHaveValue("Full-time");
    expect(screen.getByLabelText(/Company City/i)).toHaveValue("New York");
    expect(screen.getByLabelText(/Company State \/ Region/i)).toHaveValue("NY");
    expect(screen.getByLabelText(/Company Contact Type/i)).toHaveValue("Email");
    expect(screen.getByLabelText(/Company Contact Value/i)).toHaveValue("hr@acme.corp");
    expect(screen.getByLabelText(/Hours Per Week/i)).toHaveValue(40);
    expect(screen.getByLabelText(/Supervisor Name/i)).toHaveValue("Sarah Connor");
    expect(screen.getByLabelText(/Supervisor Contact/i)).toHaveValue("sarah@acme.corp");
    expect(screen.getByLabelText(/Duties Summary/i)).toHaveValue(
      "Leading platform infrastructure and architecture."
    );

    // Modify supervisor name and hours
    const supervisorInput = screen.getByLabelText(/Supervisor Name/i);
    await user.clear(supervisorInput);
    await user.type(supervisorInput, "John Connor");

    const hoursInput = screen.getByLabelText(/Hours Per Week/i);
    await user.clear(hoursInput);
    await user.type(hoursInput, "45");

    const saveBtn = screen.getByRole("button", { name: /Save Experience/i });
    await user.click(saveBtn);

    expect(handleUpdateExperience).toHaveBeenCalledWith(
      "exp-11111111-2222-3333-4444-555555555555",
      expect.objectContaining({
        company: "Acme Corp",
        role_title: "Staff Engineer",
        start_date: "2021-01",
        end_date: null,
        is_current: true,
        location: { city: "San Francisco", region: "CA" },
        employment_type: "Full-time",
        company_location: {
          city: "New York",
          region: "NY",
        },
        company_contact: {
          type: "Email",
          value: "hr@acme.corp",
        },
        hours_per_week: 45,
        supervisor_name: "John Connor",
        supervisor_contact: "sarah@acme.corp",
        duties_summary: "Leading platform infrastructure and architecture.",
        skill_ids: ["skill-1", "skill-2"],
      })
    );
  });

  it("clears skills on update and passes skill_ids as empty array", async () => {
    const user = userEvent.setup();
    const handleUpdateExperience = vi.fn();
    render(
      <ExperienceList
        experiences={mockExperiences}
        onReorder={vi.fn()}
        onAddExperience={vi.fn()}
        onUpdateExperience={handleUpdateExperience}
        onDeleteExperience={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    const editBtn = screen.getByRole("button", {
      name: /Edit Staff Engineer at Acme Corp/i,
    });
    await user.click(editBtn);

    const toggleBtn = screen.getByRole("button", { name: /Extended Details/i });
    await user.click(toggleBtn);

    const skillsInput = screen.getByLabelText(/Skills/i);
    await user.clear(skillsInput);

    const saveBtn = screen.getByRole("button", { name: /Save Experience/i });
    await user.click(saveBtn);

    expect(handleUpdateExperience).toHaveBeenCalledWith(
      "exp-11111111-2222-3333-4444-555555555555",
      expect.objectContaining({
        skill_ids: [],
      })
    );
  });

  it("renders availableSkills chips and synchronizes selection via click toggles", async () => {
    const user = userEvent.setup();
    const mockSkills: components["schemas"]["Skill"][] = [
      {
        id: "skill-1",
        user_id: "user-1",
        name: "Go",
        category: "Languages",
        proficiency: "Expert",
        years_experience: 5,
      },
      {
        id: "skill-2",
        user_id: "user-1",
        name: "Distributed Systems",
        category: "Backend",
        proficiency: "Expert",
        years_experience: 4,
      },
    ];

    render(
      <ExperienceList
        experiences={mockExperiences}
        availableSkills={mockSkills}
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

    const toggleBtn = screen.getByRole("button", { name: /Extended Details/i });
    await user.click(toggleBtn);

    const skillsInput = screen.getByLabelText(/Skills/i);
    expect(skillsInput).toHaveValue("");

    const goChip = screen.getByRole("button", { name: "Go" });
    const distChip = screen.getByRole("button", { name: "Distributed Systems" });

    expect(goChip).toHaveAttribute("aria-pressed", "false");
    expect(distChip).toHaveAttribute("aria-pressed", "false");

    // Click Go -> should select Go
    await user.click(goChip);
    expect(skillsInput).toHaveValue("Go");
    expect(goChip).toHaveAttribute("aria-pressed", "true");

    // Click Distributed Systems -> should append
    await user.click(distChip);
    expect(skillsInput).toHaveValue("Go, Distributed Systems");
    expect(distChip).toHaveAttribute("aria-pressed", "true");

    // Click Go again -> should remove Go
    await user.click(goChip);
    expect(skillsInput).toHaveValue("Distributed Systems");
    expect(goChip).toHaveAttribute("aria-pressed", "false");
    expect(distChip).toHaveAttribute("aria-pressed", "true");
  });

  it.each([
    ["-10", undefined],
    ["0", undefined],
    ["169", undefined],
    ["999", undefined],
    ["invalid", undefined],
    ["40", 40],
    ["1", 1],
    ["168", 168],
  ])(
    "validates hours_per_week boundary input '%s' resolves to %s",
    async (inputValue, expectedParsed) => {
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

      await user.type(screen.getByLabelText(/Company \/ Organization/i), "Boundary Corp");
      await user.type(screen.getByLabelText(/Role \/ Title/i), "Tester");
      await user.type(screen.getByLabelText(/Start Date/i), "2023-01");

      const toggleBtn = screen.getByRole("button", { name: /Extended Details/i });
      await user.click(toggleBtn);

      const hoursInput = screen.getByLabelText(/Hours Per Week/i);
      await user.clear(hoursInput);
      await user.type(hoursInput, inputValue);

      const saveBtn = screen.getByRole("button", { name: /Save Experience/i });
      await user.click(saveBtn);

      expect(handleAddExperience).toHaveBeenCalledWith(
        expect.objectContaining({
          hours_per_week: expectedParsed,
        })
      );
    }
  );

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
