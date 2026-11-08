import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { LoginPage } from "./login-page";

describe("LoginPage Component", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("Unconfigured Firebase State", () => {
    beforeEach(() => {
      vi.stubEnv("FIREBASE_API_KEY", "");
      vi.stubEnv("FIREBASE_PROJECT_ID", "");
      vi.stubEnv("VITE_FIREBASE_API_KEY", "");
      vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "");
    });

    it("renders unconfigured fallback alert with guidance", () => {
      render(<LoginPage />);

      expect(screen.getByRole("heading", { name: /sign in to resumeee/i })).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText(/firebase authentication not configured/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/please configure/i)
      ).toBeInTheDocument();
    });

    it("passes axe-core accessibility audit in unconfigured state", async () => {
      const { container } = render(<LoginPage />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Configured Firebase State", () => {
    beforeEach(() => {
      vi.stubEnv("FIREBASE_API_KEY", "test-api-key");
      vi.stubEnv("FIREBASE_PROJECT_ID", "test-project-id");
    });

    it("renders the FirebaseUI mount container element", () => {
      render(<LoginPage />);

      expect(screen.getByRole("heading", { name: /sign in to resumeee/i })).toBeInTheDocument();
      const container = screen.getByLabelText("Firebase Authentication Widget");
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute("id", "firebaseui-auth-container");
    });

    it("passes axe-core accessibility audit in configured state", async () => {
      const { container } = render(<LoginPage />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
