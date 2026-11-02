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
  },
];

describe("EducationList", () => {
  it("renders education entries with ShortID badges and details", () => {
    render(
      <EducationList
        education={mockEducation}
        onAddEducation={vi.fn()}
        onUpdateEducation={vi.fn()}
        onDeleteEducation={vi.fn()}
      />
    );

    expect(screen.getByText("University of Cambridge")).toBeInTheDocument();
    expect(screen.getByText(/Bachelor of Arts/i)).toBeInTheDocument();
    expect(screen.getByText(/Mathematics/i)).toBeInTheDocument();
    expect(screen.getByText("First Class Honours")).toBeInTheDocument();
    expect(screen.getByText("edu-11111111")).toBeInTheDocument();
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

  it("passes axe-core accessibility audit", async () => {
    const { container } = render(
      <EducationList
        education={mockEducation}
        onAddEducation={vi.fn()}
        onUpdateEducation={vi.fn()}
        onDeleteEducation={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
