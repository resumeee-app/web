import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { EducationList } from "./education-list";
import type { components } from "@/api/schema";

const mockEducation: components["schemas"]["Education"][] = [
  {
    id: "edu-11111111-2222-3333-4444-555555555555",
    user_id: "user-1",
    institution: "University of Cambridge",
    degree: "Bachelor of Arts",
    field: "Mathematics",
    start_date: "2014-09",
    end_date: "2018-06",
    score: "First Class Honours",
    location: {
      city: "Cambridge",
      region: "England",
    },
    facts: [
      {
        id: "fact-11111111-2222-3333-4444-555555555555",
        user_id: "user-1",
        owner_id: "edu-11111111-2222-3333-4444-555555555555",
        owner_type: "education",
        statement: "Published thesis on computational algebraic geometry",
      },
    ],
  },
];

describe("EducationList", () => {
  it("renders education entries with ShortID badges, location, and polymorphic facts", () => {
    render(
      <EducationList
        education={mockEducation}
        onAddEducation={vi.fn()}
        onUpdateEducation={vi.fn()}
        onDeleteEducation={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    expect(screen.getByText("University of Cambridge")).toBeInTheDocument();
    expect(screen.getByText(/Bachelor of Arts/i)).toBeInTheDocument();
    expect(screen.getByText(/Mathematics/i)).toBeInTheDocument();
    expect(screen.getByText("First Class Honours")).toBeInTheDocument();
    expect(screen.getByText("edu-11111111")).toBeInTheDocument();

    // Verify location is displayed
    expect(screen.getByText("Cambridge, England")).toBeInTheDocument();

    // Verify bullet point fact and its ShortID badge
    expect(
      screen.getByText("Published thesis on computational algebraic geometry")
    ).toBeInTheDocument();
    expect(screen.getByText("fact-11111111")).toBeInTheDocument();
  });

  it("opens modal dialog to add new education", async () => {
    const user = userEvent.setup();
    render(
      <EducationList
        education={mockEducation}
        onAddEducation={vi.fn()}
        onUpdateEducation={vi.fn()}
        onDeleteEducation={vi.fn()}
      />
    );

    const addBtn = screen.getByRole("button", { name: /Add Education/i });
    await user.click(addBtn);

    expect(
      screen.getByRole("heading", { name: /Add Education/i })
    ).toBeInTheDocument();
  });

  it("submits modal form and calls onAddEducation with valid fields", async () => {
    const user = userEvent.setup();
    const handleAddEducation = vi.fn();
    render(
      <EducationList
        education={mockEducation}
        onAddEducation={handleAddEducation}
        onUpdateEducation={vi.fn()}
        onDeleteEducation={vi.fn()}
      />
    );

    const addBtn = screen.getByRole("button", { name: /Add Education/i });
    await user.click(addBtn);

    const instInput = screen.getByLabelText(/Institution/i);
    const degreeInput = screen.getByLabelText(/Degree/i);
    const fieldInput = screen.getByLabelText(/Field of Study/i);
    const startInput = screen.getByLabelText(/Start Date/i);
    const endInput = screen.getByLabelText(/Graduation Date/i);
    const scoreInput = screen.getByLabelText(/Honors \/ GPA \/ Awards/i);

    await user.type(instInput, "Stanford University");
    await user.type(degreeInput, "Master of Science");
    await user.type(fieldInput, "Computer Science");
    await user.type(startInput, "2018-09");
    await user.type(endInput, "2020-06");
    await user.type(scoreInput, "4.0 GPA");

    const saveBtn = screen.getByRole("button", { name: /Save Education/i });
    await user.click(saveBtn);

    expect(handleAddEducation).toHaveBeenCalledWith({
      institution: "Stanford University",
      degree: "Master of Science",
      field: "Computer Science",
      start_date: "2018-09",
      end_date: "2020-06",
      score: "4.0 GPA",
    });
  });

  it("toggles the collapsible 'Extended Details' section in the Add Education modal", async () => {
    const user = userEvent.setup();
    render(
      <EducationList
        education={mockEducation}
        onAddEducation={vi.fn()}
        onUpdateEducation={vi.fn()}
        onDeleteEducation={vi.fn()}
      />
    );

    const addBtn = screen.getByRole("button", { name: /Add Education/i });
    await user.click(addBtn);

    const extendedToggle = screen.getByRole("button", {
      name: /Extended Details/i,
    });
    expect(extendedToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText(/City/i)).not.toBeInTheDocument();

    // Click to expand
    await user.click(extendedToggle);
    expect(extendedToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/State \/ Region/i)).toBeInTheDocument();

    // Click to collapse
    await user.click(extendedToggle);
    expect(extendedToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText(/City/i)).not.toBeInTheDocument();
  });

  it("submits modal form with optional location details under Extended Details", async () => {
    const user = userEvent.setup();
    const handleAddEducation = vi.fn();
    render(
      <EducationList
        education={mockEducation}
        onAddEducation={handleAddEducation}
        onUpdateEducation={vi.fn()}
        onDeleteEducation={vi.fn()}
      />
    );

    const addBtn = screen.getByRole("button", { name: /Add Education/i });
    await user.click(addBtn);

    await user.type(screen.getByLabelText(/Institution/i), "Harvard University");
    await user.type(screen.getByLabelText(/Degree/i), "Master of Science");

    // Expand Extended Details
    const extendedToggle = screen.getByRole("button", {
      name: /Extended Details/i,
    });
    await user.click(extendedToggle);

    await user.type(screen.getByLabelText(/City/i), "Cambridge");
    await user.type(screen.getByLabelText(/State \/ Region/i), "MA");

    const saveBtn = screen.getByRole("button", { name: /Save Education/i });
    await user.click(saveBtn);

    expect(handleAddEducation).toHaveBeenCalledWith(
      expect.objectContaining({
        institution: "Harvard University",
        degree: "Master of Science",
        location: {
          city: "Cambridge",
          region: "MA",
        },
      })
    );
  });

  it("opens edit modal with existing location populated and allows updating", async () => {
    const user = userEvent.setup();
    const handleUpdateEducation = vi.fn();
    render(
      <EducationList
        education={mockEducation}
        onAddEducation={vi.fn()}
        onUpdateEducation={handleUpdateEducation}
        onDeleteEducation={vi.fn()}
      />
    );

    const editBtn = screen.getByRole("button", {
      name: /Edit education at University of Cambridge/i,
    });
    await user.click(editBtn);

    expect(
      screen.getByRole("heading", { name: /Edit Education/i })
    ).toBeInTheDocument();

    // Extended details should be expandable or pre-expanded when location exists
    const extendedToggle = screen.getByRole("button", {
      name: /Extended Details/i,
    });
    if (extendedToggle.getAttribute("aria-expanded") === "false") {
      await user.click(extendedToggle);
    }

    const cityInput = screen.getByLabelText(/City/i);
    expect(cityInput).toHaveValue("Cambridge");
    await user.clear(cityInput);
    await user.type(cityInput, "Oxford");

    const saveBtn = screen.getByRole("button", { name: /Save Education/i });
    await user.click(saveBtn);

    expect(handleUpdateEducation).toHaveBeenCalledWith(
      "edu-11111111-2222-3333-4444-555555555555",
      expect.objectContaining({
        institution: "University of Cambridge",
        location: {
          city: "Oxford",
          region: "England",
        },
      })
    );
  });

  it("allows adding and deleting facts (bullet points) in the list view", async () => {
    const user = userEvent.setup();
    const handleAddFact = vi.fn();
    const handleDeleteFact = vi.fn();
    render(
      <EducationList
        education={mockEducation}
        onAddEducation={vi.fn()}
        onUpdateEducation={vi.fn()}
        onDeleteEducation={vi.fn()}
        onAddFact={handleAddFact}
        onDeleteFact={handleDeleteFact}
      />
    );

    // Add bullet point from list view
    const bulletInput = screen.getByPlaceholderText(
      /Add quantifiable bullet point/i
    );
    await user.type(bulletInput, "Awarded Turing Institute Fellowship");

    const addBulletBtn = screen.getByRole("button", {
      name: /Add bullet to University of Cambridge/i,
    });
    await user.click(addBulletBtn);

    expect(handleAddFact).toHaveBeenCalledWith(
      "edu-11111111-2222-3333-4444-555555555555",
      "Awarded Turing Institute Fellowship"
    );

    // Delete bullet point
    const deleteFactBtn = screen.getByRole("button", {
      name: /Delete bullet point fact-11111111-2222-3333-4444-555555555555/i,
    });
    await user.click(deleteFactBtn);

    expect(handleDeleteFact).toHaveBeenCalledWith(
      "fact-11111111-2222-3333-4444-555555555555"
    );
  });

  it("allows managing facts inside the Edit Education modal under Extended Details", async () => {
    const user = userEvent.setup();
    const handleAddFact = vi.fn();
    const handleDeleteFact = vi.fn();
    render(
      <EducationList
        education={mockEducation}
        onAddEducation={vi.fn()}
        onUpdateEducation={vi.fn()}
        onDeleteEducation={vi.fn()}
        onAddFact={handleAddFact}
        onDeleteFact={handleDeleteFact}
      />
    );

    const editBtn = screen.getByRole("button", {
      name: /Edit education at University of Cambridge/i,
    });
    await user.click(editBtn);

    const extendedToggle = screen.getByRole("button", {
      name: /Extended Details/i,
    });
    if (extendedToggle.getAttribute("aria-expanded") === "false") {
      await user.click(extendedToggle);
    }

    // Modal bullet input
    const modalBulletInput = screen.getByPlaceholderText(
      /Add achievement or bullet point/i
    );
    await user.type(modalBulletInput, "GPA 4.0 Valedictorian");

    const modalAddBulletBtn = screen.getByRole("button", {
      name: /Add Bullet/i,
    });
    await user.click(modalAddBulletBtn);

    expect(handleAddFact).toHaveBeenCalledWith(
      "edu-11111111-2222-3333-4444-555555555555",
      "GPA 4.0 Valedictorian"
    );
  });

  it("submits draft facts when creating a new education entry with draft bullets in modal", async () => {
    const user = userEvent.setup();
    const handleAddEducation = vi.fn();
    render(
      <EducationList
        education={mockEducation}
        onAddEducation={handleAddEducation}
        onUpdateEducation={vi.fn()}
        onDeleteEducation={vi.fn()}
      />
    );

    const addBtn = screen.getByRole("button", { name: /Add Education/i });
    await user.click(addBtn);

    await user.type(screen.getByLabelText(/Institution/i), "MIT");

    // Expand Extended Details
    const extendedToggle = screen.getByRole("button", {
      name: /Extended Details/i,
    });
    await user.click(extendedToggle);

    const modalBulletInput = screen.getByPlaceholderText(
      /Add achievement or bullet point/i
    );
    await user.type(modalBulletInput, "Published robotics paper in IEEE");

    const modalAddBulletBtn = screen.getByRole("button", {
      name: /Add Bullet/i,
    });
    await user.click(modalAddBulletBtn);

    expect(
      screen.getByText("Published robotics paper in IEEE")
    ).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: /Save Education/i });
    await user.click(saveBtn);

    expect(handleAddEducation).toHaveBeenCalledWith(
      expect.objectContaining({
        institution: "MIT",
      }),
      ["Published robotics paper in IEEE"]
    );
  });

  it("clears existing location on Edit and sends empty location object to persist removal", async () => {
    const user = userEvent.setup();
    const handleUpdateEducation = vi.fn();
    render(
      <EducationList
        education={mockEducation}
        onAddEducation={vi.fn()}
        onUpdateEducation={handleUpdateEducation}
        onDeleteEducation={vi.fn()}
      />
    );

    const editBtn = screen.getByRole("button", {
      name: /Edit education at University of Cambridge/i,
    });
    await user.click(editBtn);

    const extendedToggle = screen.getByRole("button", {
      name: /Extended Details/i,
    });
    if (extendedToggle.getAttribute("aria-expanded") === "false") {
      await user.click(extendedToggle);
    }

    const cityInput = screen.getByLabelText(/City/i);
    const regionInput = screen.getByLabelText(/State \/ Region/i);
    await user.clear(cityInput);
    await user.clear(regionInput);

    const saveBtn = screen.getByRole("button", { name: /Save Education/i });
    await user.click(saveBtn);

    expect(handleUpdateEducation).toHaveBeenCalledWith(
      "edu-11111111-2222-3333-4444-555555555555",
      expect.objectContaining({
        institution: "University of Cambridge",
        location: {},
      })
    );
  });

  it("allows deleting existing facts from inside the Edit Education modal under Extended Details", async () => {
    const user = userEvent.setup();
    const handleDeleteFact = vi.fn();
    render(
      <EducationList
        education={mockEducation}
        onAddEducation={vi.fn()}
        onUpdateEducation={vi.fn()}
        onDeleteEducation={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={handleDeleteFact}
      />
    );

    const editBtn = screen.getByRole("button", {
      name: /Edit education at University of Cambridge/i,
    });
    await user.click(editBtn);

    const extendedToggle = screen.getByRole("button", {
      name: /Extended Details/i,
    });
    if (extendedToggle.getAttribute("aria-expanded") === "false") {
      await user.click(extendedToggle);
    }

    // Modal should have the fact with its delete button
    const deleteFactBtns = screen.getAllByRole("button", {
      name: /Delete bullet point fact-11111111-2222-3333-4444-555555555555/i,
    });
    // The button inside the modal dialog
    const lastBtn = deleteFactBtns[deleteFactBtns.length - 1];
    expect(lastBtn).toBeDefined();
    await user.click(lastBtn!);

    expect(handleDeleteFact).toHaveBeenCalledWith(
      "fact-11111111-2222-3333-4444-555555555555"
    );
  });

  it("allows removing draft facts before saving new education entry", async () => {
    const user = userEvent.setup();
    const handleAddEducation = vi.fn();
    render(
      <EducationList
        education={mockEducation}
        onAddEducation={handleAddEducation}
        onUpdateEducation={vi.fn()}
        onDeleteEducation={vi.fn()}
      />
    );

    const addBtn = screen.getByRole("button", { name: /Add Education/i });
    await user.click(addBtn);

    await user.type(screen.getByLabelText(/Institution/i), "MIT");

    // Expand Extended Details
    const extendedToggle = screen.getByRole("button", {
      name: /Extended Details/i,
    });
    await user.click(extendedToggle);

    const modalBulletInput = screen.getByPlaceholderText(
      /Add achievement or bullet point/i
    );
    await user.type(modalBulletInput, "Temporary draft fact");

    const modalAddBulletBtn = screen.getByRole("button", {
      name: /Add Bullet/i,
    });
    await user.click(modalAddBulletBtn);

    expect(screen.getByText("Temporary draft fact")).toBeInTheDocument();

    // Now remove the draft bullet
    const removeBtn = screen.getByRole("button", {
      name: /Remove draft bullet 1/i,
    });
    await user.click(removeBtn);

    expect(screen.queryByText("Temporary draft fact")).not.toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: /Save Education/i });
    await user.click(saveBtn);

    // Should be called with NO draft facts as second argument
    expect(handleAddEducation).toHaveBeenCalledWith(
      expect.objectContaining({
        institution: "MIT",
      })
    );
    expect(handleAddEducation.mock.calls[0]?.[1]).toBeUndefined();
  });

  it("invokes onDeleteEducation callback when delete button is clicked", async () => {
    const user = userEvent.setup();
    const handleDeleteEducation = vi.fn();
    render(
      <EducationList
        education={mockEducation}
        onAddEducation={vi.fn()}
        onUpdateEducation={vi.fn()}
        onDeleteEducation={handleDeleteEducation}
      />
    );

    const deleteBtn = screen.getByRole("button", {
      name: /Delete education at University of Cambridge/i,
    });
    await user.click(deleteBtn);

    expect(handleDeleteEducation).toHaveBeenCalledWith(
      "edu-11111111-2222-3333-4444-555555555555"
    );
  });

  it("passes axe-core accessibility audit with Extended Details and facts rendered", async () => {
    const { container } = render(
      <EducationList
        education={mockEducation}
        onAddEducation={vi.fn()}
        onUpdateEducation={vi.fn()}
        onDeleteEducation={vi.fn()}
        onAddFact={vi.fn()}
        onDeleteFact={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
