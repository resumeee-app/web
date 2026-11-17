import * as React from "react";
import { cn } from "@/lib/utils";
import { isValidHttpUrl } from "@/lib/url";
import type { components } from "@/api/schema";

/**
 * Contact Information Editor Data Shape.
 */
export interface ContactFormData {
  /** Full name of the candidate (required) */
  full_name: string;
  /** Professional headline or title */
  headline?: string;
  /** Professional summary or executive bio */
  summary?: string;
  /** Primary contact email */
  email?: string;
  /** Contact phone number */
  phone?: string;
  /** Geographic location details */
  location?: components["schemas"]["Location"];
  /** Verified external social and portfolio links */
  links?: components["schemas"]["SocialLink"][];
}

/**
 * Props for the ContactForm component.
 */
export interface ContactFormProps {
  /** Initial contact information from server snapshot */
  initialData: ContactFormData;
  /** Callback fired whenever any contact field changes, including validity status */
  onChange: (data: ContactFormData, isValid: boolean) => void;
  /** Optional container class name */
  className?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates candidate contact information and returns field error messages.
 * Synchronous and pure to prevent stale closure validation bypass.
 *
 * @param data - Candidate contact form data to evaluate.
 * @returns Map of field name to localized validation error string.
 */
export function validateContact(data: ContactFormData): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!data.full_name || data.full_name.trim() === "") {
    errs.full_name = "Full name is required.";
  }
  if (data.email && data.email.trim() !== "" && !EMAIL_REGEX.test(data.email.trim())) {
    errs.email = "Please enter a valid email address.";
  }

  const linkedIn = data.links?.find((l) => l.network.toLowerCase() === "linkedin")?.url;
  if (linkedIn && linkedIn.trim() !== "" && !isValidHttpUrl(linkedIn)) {
    errs.linkedin = "Please enter a valid URL.";
  }

  const github = data.links?.find((l) => l.network.toLowerCase() === "github")?.url;
  if (github && github.trim() !== "" && !isValidHttpUrl(github)) {
    errs.github = "Please enter a valid URL.";
  }

  const portfolio = data.links?.find((l) => l.network.toLowerCase() === "portfolio")?.url;
  if (portfolio && portfolio.trim() !== "" && !isValidHttpUrl(portfolio)) {
    errs.portfolio = "Please enter a valid URL.";
  }

  return errs;
}

/**
 * Accessible Contact Information Editor form component.
 *
 * Provides fields for candidate name, headline, summary bio, email, phone, location, and social links.
 * Implements accessible form labeling with `<label htmlFor="...">`, real-time validation,
 * `aria-invalid` attributes, and `aria-describedby` error linkages conforming to WCAG 2.1 AA.
 *
 * @param props - ContactFormProps including initialData and onChange handler.
 * @returns Accessible form card element.
 */
export const ContactForm: React.FC<ContactFormProps> = ({
  initialData,
  onChange,
  className,
}) => {
  const [formData, setFormData] = React.useState<ContactFormData>(initialData);
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  // Ensure formData stays in sync if initialData changes externally
  React.useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const errors = React.useMemo(() => validateContact(formData), [formData]);

  const updateField = (
    field: keyof ContactFormData,
    value: string
  ) => {
    const next = { ...formData, [field]: value };
    const nextErrors = validateContact(next);
    const nextValid = Object.keys(nextErrors).length === 0;
    setFormData(next);
    onChange(next, nextValid);
  };

  const updateLocation = (
    field: keyof NonNullable<ContactFormData["location"]>,
    value: string
  ) => {
    const nextLocation = { ...(formData.location || {}), [field]: value };
    const next = { ...formData, location: nextLocation };
    const nextErrors = validateContact(next);
    const nextValid = Object.keys(nextErrors).length === 0;
    setFormData(next);
    onChange(next, nextValid);
  };

  const updateLink = (network: string, url: string) => {
    const existing = formData.links || [];
    const index = existing.findIndex(
      (l) => l.network.toLowerCase() === network.toLowerCase()
    );
    let updatedLinks: components["schemas"]["SocialLink"][];
    if (index >= 0) {
      const target = existing[index];
      updatedLinks = [...existing];
      if (target) {
        updatedLinks[index] = { ...target, network: target.network || network, url };
      } else {
        updatedLinks[index] = { network, url };
      }
    } else {
      updatedLinks = [...existing, { network, url }];
    }
    const next = { ...formData, links: updatedLinks };
    const nextErrors = validateContact(next);
    const nextValid = Object.keys(nextErrors).length === 0;
    setFormData(next);
    onChange(next, nextValid);
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const getLinkUrl = (network: string): string => {
    return (
      formData.links?.find(
        (l) => l.network.toLowerCase() === network.toLowerCase()
      )?.url || ""
    );
  };

  return (
    <div className={cn("space-y-6 bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm", className)}>
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Contact Information</h2>
        <p className="text-sm text-slate-500 dark:text-slate-300">
          Personal contact details and social links displayed across your resumes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-2">
        {/* Full Name */}
        <div className="sm:col-span-1">
          <label
            htmlFor="contact-full-name"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Full Name <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <div className="mt-1">
            <input
              id="contact-full-name"
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => updateField("full_name", e.target.value)}
              onBlur={() => handleBlur("full_name")}
              aria-invalid={touched.full_name && Boolean(errors.full_name) ? "true" : "false"}
              aria-describedby={
                touched.full_name && errors.full_name ? "contact-full-name-error" : undefined
              }
              className={cn(
                "block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                touched.full_name && errors.full_name
                  ? "border-red-300 dark:border-red-500/70 bg-white dark:bg-slate-900 text-red-900 dark:text-red-200 placeholder-red-300 dark:placeholder-red-400/60 focus-visible:ring-red-500"
                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              )}
            />
          </div>
          {touched.full_name && errors.full_name && (
            <p id="contact-full-name-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.full_name}
            </p>
          )}
        </div>

        {/* Headline */}
        <div className="sm:col-span-1">
          <label
            htmlFor="contact-headline"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Headline
          </label>
          <div className="mt-1">
            <input
              id="contact-headline"
              type="text"
              value={formData.headline || ""}
              onChange={(e) => updateField("headline", e.target.value)}
              placeholder="e.g. Senior Software Architect"
              className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>
        </div>

        {/* Summary Bio */}
        <div className="sm:col-span-2">
          <label
            htmlFor="contact-summary"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Summary Bio
          </label>
          <div className="mt-1">
            <textarea
              id="contact-summary"
              rows={3}
              value={formData.summary || ""}
              onChange={(e) => updateField("summary", e.target.value)}
              placeholder="Brief professional summary or executive bio..."
              className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>
        </div>

        {/* Email */}
        <div className="sm:col-span-1">
          <label
            htmlFor="contact-email"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Email
          </label>
          <div className="mt-1">
            <input
              id="contact-email"
              type="email"
              value={formData.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              aria-invalid={touched.email && Boolean(errors.email) ? "true" : "false"}
              aria-describedby={
                touched.email && errors.email ? "contact-email-error" : undefined
              }
              className={cn(
                "block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                touched.email && errors.email
                  ? "border-red-300 dark:border-red-500/70 bg-white dark:bg-slate-900 text-red-900 dark:text-red-200 placeholder-red-300 dark:placeholder-red-400/60 focus-visible:ring-red-500"
                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              )}
            />
          </div>
          {touched.email && errors.email && (
            <p id="contact-email-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.email}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="sm:col-span-1">
          <label
            htmlFor="contact-phone"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Phone
          </label>
          <div className="mt-1">
            <input
              id="contact-phone"
              type="tel"
              value={formData.phone || ""}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+1-555-0100"
              className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>
        </div>

        {/* City */}
        <div className="sm:col-span-1">
          <label
            htmlFor="contact-city"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            City
          </label>
          <div className="mt-1">
            <input
              id="contact-city"
              type="text"
              value={formData.location?.city || ""}
              onChange={(e) => updateLocation("city", e.target.value)}
              placeholder="e.g. San Francisco"
              className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>
        </div>

        {/* State / Country */}
        <div className="sm:col-span-1">
          <label
            htmlFor="contact-region"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            State/Country
          </label>
          <div className="mt-1">
            <input
              id="contact-region"
              type="text"
              value={formData.location?.region || ""}
              onChange={(e) => updateLocation("region", e.target.value)}
              placeholder="e.g. California, US"
              className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>
        </div>

        {/* Links: LinkedIn */}
        <div className="sm:col-span-2">
          <label
            htmlFor="contact-link-linkedin"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            LinkedIn URL
          </label>
          <div className="mt-1">
            <input
              id="contact-link-linkedin"
              type="url"
              value={getLinkUrl("LinkedIn")}
              onChange={(e) => updateLink("LinkedIn", e.target.value)}
              onBlur={() => handleBlur("linkedin")}
              placeholder="https://linkedin.com/in/username"
              aria-invalid={touched.linkedin && Boolean(errors.linkedin) ? "true" : "false"}
              aria-describedby={
                touched.linkedin && errors.linkedin ? "contact-linkedin-error" : undefined
              }
              className={cn(
                "block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                touched.linkedin && errors.linkedin
                  ? "border-red-300 dark:border-red-500/70 bg-white dark:bg-slate-900 text-red-900 dark:text-red-200 placeholder-slate-400 dark:placeholder-slate-500 focus-visible:ring-red-500"
                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              )}
            />
          </div>
          {touched.linkedin && errors.linkedin && (
            <p id="contact-linkedin-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.linkedin}
            </p>
          )}
        </div>

        {/* Links: GitHub */}
        <div className="sm:col-span-2">
          <label
            htmlFor="contact-link-github"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            GitHub URL
          </label>
          <div className="mt-1">
            <input
              id="contact-link-github"
              type="url"
              value={getLinkUrl("GitHub")}
              onChange={(e) => updateLink("GitHub", e.target.value)}
              onBlur={() => handleBlur("github")}
              placeholder="https://github.com/username"
              aria-invalid={touched.github && Boolean(errors.github) ? "true" : "false"}
              aria-describedby={
                touched.github && errors.github ? "contact-github-error" : undefined
              }
              className={cn(
                "block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                touched.github && errors.github
                  ? "border-red-300 dark:border-red-500/70 bg-white dark:bg-slate-900 text-red-900 dark:text-red-200 placeholder-slate-400 dark:placeholder-slate-500 focus-visible:ring-red-500"
                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              )}
            />
          </div>
          {touched.github && errors.github && (
            <p id="contact-github-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.github}
            </p>
          )}
        </div>

        {/* Links: Portfolio */}
        <div className="sm:col-span-2">
          <label
            htmlFor="contact-link-portfolio"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Portfolio URL
          </label>
          <div className="mt-1">
            <input
              id="contact-link-portfolio"
              type="url"
              value={getLinkUrl("Portfolio")}
              onChange={(e) => updateLink("Portfolio", e.target.value)}
              onBlur={() => handleBlur("portfolio")}
              placeholder="https://yourportfolio.com"
              aria-invalid={touched.portfolio && Boolean(errors.portfolio) ? "true" : "false"}
              aria-describedby={
                touched.portfolio && errors.portfolio ? "contact-portfolio-error" : undefined
              }
              className={cn(
                "block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                touched.portfolio && errors.portfolio
                  ? "border-red-300 dark:border-red-500/70 bg-white dark:bg-slate-900 text-red-900 dark:text-red-200 placeholder-slate-400 dark:placeholder-slate-500 focus-visible:ring-red-500"
                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              )}
            />
          </div>
          {touched.portfolio && errors.portfolio && (
            <p id="contact-portfolio-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.portfolio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
