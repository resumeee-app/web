import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./page-header";
import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

describe("PageHeader", () => {
  it("renders title as h1 with standardized typography classes", () => {
    render(<PageHeader title="Test Title" />);

    const heading = screen.getByRole("heading", { level: 1, name: "Test Title" });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass("text-2xl", "sm:text-3xl", "font-bold", "tracking-tight");
  });

  it("renders description when provided", () => {
    render(
      <PageHeader
        title="Test Title"
        description="This is an accessible description text."
      />
    );

    expect(
      screen.getByText("This is an accessible description text.")
    ).toBeInTheDocument();
  });

  it("renders icon in standardized badge container", () => {
    render(
      <PageHeader
        title="Dashboard"
        icon={LayoutDashboard}
      />
    );

    const iconContainer = screen.getByTestId("page-header-icon");
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer).toHaveClass("h-10", "w-10", "rounded-lg");
  });

  it("renders badge adjacent to title when provided", () => {
    render(
      <PageHeader
        title="Profile"
        badge={<span data-testid="status-badge">Unsaved</span>}
      />
    );

    expect(screen.getByTestId("status-badge")).toBeInTheDocument();
  });

  it("renders action buttons in actions slot", () => {
    render(
      <PageHeader
        title="Branches"
        actions={<Button>Create Branch</Button>}
      />
    );

    const actionContainer = screen.getByTestId("page-header-actions");
    expect(actionContainer).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Branch" })).toBeInTheDocument();
  });

  it("renders children as fallback in action container", () => {
    render(
      <PageHeader title="Templates">
        <Button>New Template</Button>
      </PageHeader>
    );

    const actionContainer = screen.getByTestId("page-header-actions");
    expect(actionContainer).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
  });

  it("includes standard container layout and border classes", () => {
    const { container } = render(<PageHeader title="Overview" />);

    const headerRoot = container.firstElementChild;
    expect(headerRoot).toHaveClass(
      "flex",
      "flex-col",
      "sm:flex-row",
      "sm:items-start",
      "sm:justify-between",
      "border-b",
      "pb-5"
    );
  });

  it("enables wrapping on the actions container when multiple action buttons are provided", () => {
    render(
      <PageHeader
        title="Main Profile"
        actions={
          <>
            <Button>Import PDF Resume</Button>
            <Button>Import JSON Resume</Button>
            <Button>Save Changes</Button>
          </>
        }
      />
    );

    const actionContainer = screen.getByRole("button", {
      name: "Import JSON Resume",
    }).parentElement;
    expect(actionContainer).toHaveClass("flex", "flex-wrap");
  });
});
