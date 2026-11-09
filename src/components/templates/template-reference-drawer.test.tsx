import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { TemplateReferenceDrawer } from "./template-reference-drawer";
import { GO_TEMPLATE_DOCS_URL } from "./template-placeholders-data";

describe("TemplateReferenceDrawer Component", () => {
  const onOpenChangeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render content when open is false", () => {
    render(<TemplateReferenceDrawer open={false} onOpenChange={onOpenChangeMock} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders drawer heading, search input, docs link, and category filter buttons when open", () => {
    render(<TemplateReferenceDrawer open={true} onOpenChange={onOpenChangeMock} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /template placeholder reference/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search domain fields, properties, or types/i)).toBeInTheDocument();

    // Verify documentation link
    const docsLink = screen.getByRole("link", { name: /view official go template syntax documentation/i });
    expect(docsLink).toBeInTheDocument();
    expect(docsLink).toHaveAttribute("href", GO_TEMPLATE_DOCS_URL);
    expect(docsLink).toHaveAttribute("target", "_blank");
    expect(docsLink).toHaveAttribute("rel", "noopener noreferrer");

    // Verify category filter buttons inside filter group
    const filterGroup = screen.getByRole("group", { name: /filter placeholders by category/i });
    expect(within(filterGroup).getByRole("button", { name: /all fields/i })).toBeInTheDocument();
    expect(within(filterGroup).getByRole("button", { name: /profile & contact/i })).toBeInTheDocument();
    expect(within(filterGroup).getByRole("button", { name: /work experience/i })).toBeInTheDocument();
    expect(within(filterGroup).getByRole("button", { name: /projects/i })).toBeInTheDocument();
    expect(within(filterGroup).getByRole("button", { name: /skills/i })).toBeInTheDocument();
    expect(within(filterGroup).getByRole("button", { name: /education & certs/i })).toBeInTheDocument();
  });

  it("displays application domain fields with syntax snippets and types", () => {
    render(<TemplateReferenceDrawer open={true} onOpenChange={onOpenChangeMock} />);

    expect(screen.getByText("{{.FullName}}")).toBeInTheDocument();
    expect(screen.getByText("{{.Headline}}")).toBeInTheDocument();
    expect(screen.getAllByText("{{.Summary}}").length).toBeGreaterThan(0);
    expect(screen.getByText("{{range .Experiences}}...{{end}}")).toBeInTheDocument();

    // Extended domain fields
    expect(screen.getByText(".CompanyContact")).toBeInTheDocument();
    expect(screen.getByText(".SupervisorContact")).toBeInTheDocument();
  });

  it("filters placeholder items dynamically based on search query", async () => {
    const user = userEvent.setup();
    render(<TemplateReferenceDrawer open={true} onOpenChange={onOpenChangeMock} />);

    const searchInput = screen.getByPlaceholderText(/search domain fields, properties, or types/i);
    await user.type(searchInput, "SupervisorContact");

    expect(screen.getByText("{{.SupervisorContact}}")).toBeInTheDocument();
    expect(screen.queryByText("{{.FullName}}")).not.toBeInTheDocument();
  });

  it("resets search query when clear button is clicked", async () => {
    const user = userEvent.setup();
    render(<TemplateReferenceDrawer open={true} onOpenChange={onOpenChangeMock} />);

    const searchInput = screen.getByPlaceholderText(/search domain fields, properties, or types/i);
    await user.type(searchInput, "SupervisorContact");
    expect(screen.queryByText("{{.FullName}}")).not.toBeInTheDocument();

    const clearBtn = screen.getByRole("button", { name: /clear search query/i });
    expect(clearBtn).toBeInTheDocument();
    await user.click(clearBtn);

    expect(searchInput).toHaveValue("");
    expect(screen.getByText("{{.FullName}}")).toBeInTheDocument();
  });

  it("renders zero-state empty alert when search yields no matches", async () => {
    const user = userEvent.setup();
    render(<TemplateReferenceDrawer open={true} onOpenChange={onOpenChangeMock} />);

    const searchInput = screen.getByPlaceholderText(/search domain fields, properties, or types/i);
    await user.type(searchInput, "xyzNonexistentField123");

    expect(screen.getByText(/no matching placeholders found/i)).toBeInTheDocument();
    expect(screen.getByText(/try adjusting your search query/i)).toBeInTheDocument();
  });

  it("filters items by category filter button", async () => {
    const user = userEvent.setup();
    render(<TemplateReferenceDrawer open={true} onOpenChange={onOpenChangeMock} />);

    const filterGroup = screen.getByRole("group", { name: /filter placeholders by category/i });
    const skillsBtn = within(filterGroup).getByRole("button", { name: /skills/i });
    await user.click(skillsBtn);

    expect(skillsBtn).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(".SkillGroups")).toBeInTheDocument();
    expect(screen.queryByText("{{.FullName}}")).not.toBeInTheDocument();
  });

  it("copies snippet to clipboard and updates dynamic aria-label and reverts on timer expiration", async () => {
    vi.useFakeTimers();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(<TemplateReferenceDrawer open={true} onOpenChange={onOpenChangeMock} />);

    const copyBtn = screen.getByRole("button", { name: "Copy {{.FullName}}" });

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith("{{.FullName}}");
    expect(screen.getByRole("button", { name: "Copied {{.FullName}} to clipboard" })).toBeInTheDocument();
    expect(screen.getByText(/copied!/i)).toBeInTheDocument();

    // Advance timer past the 1600ms reset threshold
    act(() => {
      vi.advanceTimersByTime(1700);
    });

    expect(screen.getByRole("button", { name: "Copy {{.FullName}}" })).toBeInTheDocument();
    expect(screen.queryByText(/copied!/i)).not.toBeInTheDocument();
  });

  it("calls onOpenChange(false) when close button is clicked", async () => {
    const user = userEvent.setup();
    render(<TemplateReferenceDrawer open={true} onOpenChange={onOpenChangeMock} />);

    const closeBtn = screen.getByRole("button", { name: /close reference drawer/i });
    await user.click(closeBtn);

    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });

  it("passes automated axe accessibility check with zero violations", async () => {
    const { container } = render(<TemplateReferenceDrawer open={true} onOpenChange={onOpenChangeMock} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
