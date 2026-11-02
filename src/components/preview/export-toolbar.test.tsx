import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ExportToolbar } from "./export-toolbar";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("ExportToolbar Component", () => {
  const defaultProps = {
    plainText: "Jane Doe\nStaff Software Engineer\n\nExperience:\n- Built distributed systems",
    htmlDownloadUrl: "/api/v1/branches/b-1/versions/1/export?format=html",
    branchName: "Stripe - Staff Backend Engineer",
    versionNumber: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWithProviders(ui: React.ReactElement) {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
  }

  it("renders export toolbar with accessible buttons", () => {
    renderWithProviders(<ExportToolbar {...defaultProps} />);

    expect(screen.getByRole("toolbar", { name: /resume export actions/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /print to pdf/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy plain text/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download html/i })).toBeInTheDocument();
  });

  it("triggers window.print when Print to PDF button is clicked", async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    renderWithProviders(<ExportToolbar {...defaultProps} />);

    const printBtn = screen.getByRole("button", { name: /print to pdf/i });
    await user.click(printBtn);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it("copies plain text to system clipboard and displays toast feedback", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      writable: true,
      configurable: true,
    });

    renderWithProviders(<ExportToolbar {...defaultProps} />);

    const copyBtn = screen.getByRole("button", { name: /copy plain text/i });
    await user.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(defaultProps.plainText);

    // Confirmation toast / live region feedback should appear
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/copied to clipboard/i);
    });
  });

  it("provides valid download link and download filename for HTML export", () => {
    renderWithProviders(<ExportToolbar {...defaultProps} />);

    const downloadLink = screen.getByRole("link", { name: /download html/i });
    expect(downloadLink).toHaveAttribute("href", defaultProps.htmlDownloadUrl);
    expect(downloadLink).toHaveAttribute("download", "resume-Stripe---Staff-Backend-Engineer-v1.html");
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = renderWithProviders(<ExportToolbar {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
