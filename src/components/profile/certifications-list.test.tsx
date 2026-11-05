import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { CertificationsList } from "./certifications-list";
import type { components } from "@/api/schema";

const mockCertifications: components["schemas"]["Certification"][] = [
  {
    id: "cert-11111111-2222-3333-4444-555555555555",
    user_id: "user-1",
    name: "Certified Kubernetes Administrator (CKA)",
    issuer: "Cloud Native Computing Foundation",
    date: "2023-05",
    url: "https://www.cncf.io/certification/cka/",
  },
];

describe("CertificationsList", () => {
  it("renders certifications with ShortID badges and details", () => {
    render(
      <CertificationsList
        certifications={mockCertifications}
        onAddCertification={vi.fn()}
        onUpdateCertification={vi.fn()}
        onDeleteCertification={vi.fn()}
      />
    );

    expect(
      screen.getByText("Certified Kubernetes Administrator (CKA)")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Cloud Native Computing Foundation/i)
    ).toBeInTheDocument();
    expect(screen.getByText("cert-11111111")).toBeInTheDocument();
  });

  it("opens modal dialog to add new certification", async () => {
    const user = userEvent.setup();
    render(
      <CertificationsList
        certifications={mockCertifications}
        onAddCertification={vi.fn()}
        onUpdateCertification={vi.fn()}
        onDeleteCertification={vi.fn()}
      />
    );

    const addBtn = screen.getByRole("button", {
      name: /Add Certification/i,
    });
    await user.click(addBtn);

    expect(
      screen.getByRole("heading", { name: /Add Certification/i })
    ).toBeInTheDocument();
  });

  it("submits modal form and calls onAddCertification with valid fields", async () => {
    const user = userEvent.setup();
    const handleAddCertification = vi.fn();
    render(
      <CertificationsList
        certifications={mockCertifications}
        onAddCertification={handleAddCertification}
        onUpdateCertification={vi.fn()}
        onDeleteCertification={vi.fn()}
      />
    );

    const addBtn = screen.getByRole("button", {
      name: /Add Certification/i,
    });
    await user.click(addBtn);

    const nameInput = screen.getByLabelText(/Certification Name/i);
    const issuerInput = screen.getByLabelText(/Issuing Organization/i);
    const dateInput = screen.getByLabelText(/Issue Date/i);
    const urlInput = screen.getByLabelText(/Credential URL/i);

    await user.type(nameInput, "AWS Solutions Architect Professional");
    await user.type(issuerInput, "Amazon Web Services");
    await user.type(dateInput, "2024-02");
    await user.type(urlInput, "https://aws.amazon.com/verification/12345");

    const saveBtn = screen.getByRole("button", { name: /Save Certification/i });
    await user.click(saveBtn);

    expect(handleAddCertification).toHaveBeenCalledWith({
      name: "AWS Solutions Architect Professional",
      issuer: "Amazon Web Services",
      date: "2024-02",
      url: "https://aws.amazon.com/verification/12345",
    });
  });

  it("rejects invalid or dangerous credential URLs and displays accessible inline error", async () => {
    const user = userEvent.setup();
    const handleAddCertification = vi.fn();
    render(
      <CertificationsList
        certifications={mockCertifications}
        onAddCertification={handleAddCertification}
        onUpdateCertification={vi.fn()}
        onDeleteCertification={vi.fn()}
      />
    );

    const addBtn = screen.getByRole("button", {
      name: /Add Certification/i,
    });
    await user.click(addBtn);

    const nameInput = screen.getByLabelText(/Certification Name/i);
    const urlInput = screen.getByLabelText(/Credential URL/i);

    await user.type(nameInput, "Security Certification");
    await user.type(urlInput, "javascript:alert('pwned')");

    const saveBtn = screen.getByRole("button", { name: /Save Certification/i });
    await user.click(saveBtn);

    expect(handleAddCertification).not.toHaveBeenCalled();
    expect(urlInput).toHaveAttribute("aria-invalid", "true");
    const errorMsg = screen.getByText(/Please enter a valid HTTP or HTTPS URL/i);
    expect(errorMsg).toBeInTheDocument();
    expect(urlInput).toHaveAttribute("aria-describedby", "cert-url-error");
  });

  it("invokes onDeleteCertification callback when delete button is clicked", async () => {
    const user = userEvent.setup();
    const handleDeleteCertification = vi.fn();
    render(
      <CertificationsList
        certifications={mockCertifications}
        onAddCertification={vi.fn()}
        onUpdateCertification={vi.fn()}
        onDeleteCertification={handleDeleteCertification}
      />
    );

    const deleteBtn = screen.getByRole("button", {
      name: /Delete Certified Kubernetes Administrator/i,
    });
    await user.click(deleteBtn);

    expect(handleDeleteCertification).toHaveBeenCalledWith(
      "cert-11111111-2222-3333-4444-555555555555"
    );
  });

  it("does not render link for certifications with dangerous schemes", () => {
    const unsafeCerts: components["schemas"]["Certification"][] = [
      {
        id: "cert-unsafe-1",
        user_id: "user-1",
        name: "Unsafe Cert",
        url: "javascript:alert(1)",
      },
    ];

    render(
      <CertificationsList
        certifications={unsafeCerts}
        onAddCertification={vi.fn()}
        onUpdateCertification={vi.fn()}
        onDeleteCertification={vi.fn()}
      />
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("passes axe-core accessibility audit", async () => {
    const { container } = render(
      <CertificationsList
        certifications={mockCertifications}
        onAddCertification={vi.fn()}
        onUpdateCertification={vi.fn()}
        onDeleteCertification={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders certification modal with at least 720px width and mobile responsive sizing", async () => {
    const user = userEvent.setup();
    render(
      <CertificationsList
        certifications={mockCertifications}
        onAddCertification={vi.fn()}
        onUpdateCertification={vi.fn()}
        onDeleteCertification={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Add Certification/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("sm:max-w-[720px]");
    expect(dialog).not.toHaveClass("max-w-md");
    expect(dialog).toHaveClass("w-full");
    expect(dialog).toHaveClass("max-h-[90vh]");
    expect(dialog).toHaveClass("overflow-y-auto");
  });
});
