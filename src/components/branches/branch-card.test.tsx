import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
import { BranchCard } from "./branch-card";
import type { Branch } from "@/api/branch-queries";

describe("BranchCard Component", () => {
  const defaultBranch: Branch = {
    id: "branch-default-u1",
    user_id: "u1",
    name: "Master Profile (Default)",
    template_set_id: "tmpl-standard",
    is_default: true,
    active_version_id: "v1",
    updated_at: "2026-11-01T12:00:00Z",
  };

  const customBranch: Branch = {
    id: "branch-tailored-1",
    user_id: "u1",
    name: "Stripe - Staff Backend Engineer",
    target_company: "Stripe",
    target_role: "Staff Backend Engineer",
    template_set_id: "tmpl-standard",
    is_default: false,
    active_version_id: "v3",
    status: "active",
    updated_at: "2026-11-01T12:00:00Z",
  };

  it("renders default branch with prominent badge and suppresses delete button", () => {
    const onDelete = vi.fn();
    render(
      <MemoryRouter>
        <BranchCard branch={defaultBranch} onDelete={onDelete} />
      </MemoryRouter>
    );

    // Workbench action button linking to /branches/:id
    const link = screen.getByRole("link", {
      name: /open workbench for master profile \(default\)/i,
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/branches/branch-default-u1");

    // Inspect action button linking to /branches/:id/preview
    const inspectLink = screen.getByRole("link", {
      name: /inspect resume for master profile \(default\)/i,
    });
    expect(inspectLink).toBeInTheDocument();
    expect(inspectLink).toHaveAttribute("href", "/branches/branch-default-u1/preview");

    // Title heading
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Master Profile (Default)",
      })
    ).toBeInTheDocument();

    // Prominent badge
    expect(screen.getByText("Default Branch")).toBeInTheDocument();

    // Clarifying description that it mirrors master profile untailored
    expect(
      screen.getByText(/mirrors canonical master data with zero llm tailoring/i)
    ).toBeInTheDocument();

    // Delete button must NOT exist for default branch
    expect(
      screen.queryByRole("button", { name: /delete branch/i })
    ).not.toBeInTheDocument();
  });

  it("calls onInspect when inspect button is clicked if callback is provided", async () => {
    const user = userEvent.setup();
    const onInspect = vi.fn();

    render(
      <MemoryRouter>
        <BranchCard branch={defaultBranch} onInspect={onInspect} />
      </MemoryRouter>
    );

    const inspectBtn = screen.getByRole("button", {
      name: /inspect resume for master profile \(default\)/i,
    });
    expect(inspectBtn).toBeInTheDocument();

    await user.click(inspectBtn);
    expect(onInspect).toHaveBeenCalledWith(defaultBranch);
  });

  it("renders tailored branch with target company, role, status, and functional delete button", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <MemoryRouter>
        <BranchCard branch={customBranch} onDelete={onDelete} />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Stripe - Staff Backend Engineer",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Staff Backend Engineer")).toBeInTheDocument();

    // Status indicator
    expect(screen.getByText(/^active$/i)).toBeInTheDocument();

    // Delete button exists and triggers callback
    const deleteBtn = screen.getByRole("button", {
      name: /delete branch stripe - staff backend engineer/i,
    });
    expect(deleteBtn).toBeInTheDocument();

    await user.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(customBranch);
  });

  it("renders tailoring and error status badges correctly", () => {
    const tailoringBranch: Branch = {
      ...customBranch,
      id: "b-tailoring",
      status: "tailoring",
    };

    const { rerender } = render(
      <MemoryRouter>
        <BranchCard branch={tailoringBranch} />
      </MemoryRouter>
    );
    expect(screen.getByText(/tailoring/i)).toBeInTheDocument();

    const errorBranch: Branch = {
      ...customBranch,
      id: "b-error",
      status: "error",
    };
    rerender(
      <MemoryRouter>
        <BranchCard branch={errorBranch} />
      </MemoryRouter>
    );
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container: defaultContainer } = render(
      <MemoryRouter>
        <BranchCard branch={defaultBranch} />
      </MemoryRouter>
    );
    expect(await axe(defaultContainer)).toHaveNoViolations();

    const { container: customContainer } = render(
      <MemoryRouter>
        <BranchCard branch={customBranch} />
      </MemoryRouter>
    );
    expect(await axe(customContainer)).toHaveNoViolations();
  });
});
