import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ContactForm, type ContactFormData } from "./contact-form";

const initialData: ContactFormData = {
  full_name: "Ada Lovelace",
  headline: "Computing Pioneer & Mathematician",
  summary: "Pioneering mathematician recognized for foundational computer science work.",
  email: "ada@example.com",
  phone: "+1-555-0100",
  location: {
    city: "London",
    region: "UK",
  },
  links: [
    { network: "LinkedIn", url: "https://linkedin.com/in/ada-lovelace" },
    { network: "GitHub", url: "https://github.com/ada-lovelace" },
    { network: "Portfolio", url: "https://adalovelace.org" },
  ],
};

describe("ContactForm", () => {
  it("renders all contact inputs with associated labels", () => {
    render(<ContactForm initialData={initialData} onChange={vi.fn()} />);

    expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Ada Lovelace");
    expect(screen.getByLabelText(/Headline/i)).toHaveValue(
      "Computing Pioneer & Mathematician"
    );
    expect(screen.getByLabelText(/Summary Bio/i)).toHaveValue(
      "Pioneering mathematician recognized for foundational computer science work."
    );
    expect(screen.getByLabelText(/Email/i)).toHaveValue("ada@example.com");
    expect(screen.getByLabelText(/Phone/i)).toHaveValue("+1-555-0100");
    expect(screen.getByLabelText(/City/i)).toHaveValue("London");
    expect(screen.getByLabelText(/State\/Country/i)).toHaveValue("UK");
    expect(screen.getByLabelText(/LinkedIn URL/i)).toHaveValue(
      "https://linkedin.com/in/ada-lovelace"
    );
    expect(screen.getByLabelText(/GitHub URL/i)).toHaveValue(
      "https://github.com/ada-lovelace"
    );
    expect(screen.getByLabelText(/Portfolio URL/i)).toHaveValue(
      "https://adalovelace.org"
    );
  });

  it("validates required full name and displays error message with aria-invalid", async () => {
    const user = userEvent.setup();
    render(<ContactForm initialData={initialData} onChange={vi.fn()} />);

    const nameInput = screen.getByLabelText(/Full Name/i);
    await user.clear(nameInput);
    await user.tab();

    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    const errorMsg = screen.getByText(/Full name is required/i);
    expect(errorMsg).toBeInTheDocument();
    expect(nameInput).toHaveAttribute("aria-describedby", errorMsg.id);
  });

  it("validates email format and sets aria-invalid when invalid", async () => {
    const user = userEvent.setup();
    render(<ContactForm initialData={initialData} onChange={vi.fn()} />);

    const emailInput = screen.getByLabelText(/Email/i);
    await user.clear(emailInput);
    await user.type(emailInput, "not-an-email");
    await user.tab();

    expect(emailInput).toHaveAttribute("aria-invalid", "true");
    const errorMsg = screen.getByText(/Please enter a valid email address/i);
    expect(errorMsg).toBeInTheDocument();
  });

  it("validates URL format for links and sets aria-invalid when invalid", async () => {
    const user = userEvent.setup();
    render(<ContactForm initialData={initialData} onChange={vi.fn()} />);

    const linkInput = screen.getByLabelText(/LinkedIn URL/i);
    await user.clear(linkInput);
    await user.type(linkInput, "invalid-url");
    await user.tab();

    expect(linkInput).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText(/Please enter a valid URL/i)
    ).toBeInTheDocument();

    // Verify rejection of dangerous schemes
    await user.clear(linkInput);
    await user.type(linkInput, "javascript:alert(1)");
    await user.tab();

    expect(linkInput).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText(/Please enter a valid URL/i)
    ).toBeInTheDocument();
  });

  it("notifies parent onChange handler with updated data and synchronous validity", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<ContactForm initialData={initialData} onChange={handleChange} />);

    const headlineInput = screen.getByLabelText(/Headline/i);
    await user.clear(headlineInput);
    await user.type(headlineInput, "Senior Software Architect");

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ headline: "Senior Software Architect" }),
      true
    );
  });

  it("notifies parent onChange handler when editing summary bio", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<ContactForm initialData={initialData} onChange={handleChange} />);

    const summaryInput = screen.getByLabelText(/Summary Bio/i);
    await user.clear(summaryInput);
    await user.type(summaryInput, "Architecting robust distributed systems.");

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ summary: "Architecting robust distributed systems." }),
      true
    );
  });

  it("has 0 axe accessibility violations", async () => {
    const { container } = render(
      <ContactForm initialData={initialData} onChange={vi.fn()} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
