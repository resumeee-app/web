import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { LoginPage } from "./login-page";
import { AuthProvider, type AuthAdapter } from "@/context/auth-context";

describe("LoginPage Component", () => {
  describe("Unconfigured Auth Adapter State", () => {
    it("renders unconfigured fallback alert with guidance", () => {
      render(
        <AuthProvider initialAdminMode={false}>
          <LoginPage />
        </AuthProvider>
      );

      expect(screen.getByRole("heading", { name: /sign in to resumeee/i })).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText(/authentication provider not configured/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/please inject an authentication adapter/i)
      ).toBeInTheDocument();
    });

    it("passes axe-core accessibility audit in unconfigured state", async () => {
      const { container } = render(
        <AuthProvider initialAdminMode={false}>
          <LoginPage />
        </AuthProvider>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Injected Auth Adapter State", () => {
    const mockAdapter: AuthAdapter = {
      LoginWidget: () => (
        <button type="button">Continue with External SSO</button>
      ),
    };

    it("renders the injected authentication widget inside the region container", () => {
      render(
        <AuthProvider initialAdminMode={false} authAdapter={mockAdapter}>
          <LoginPage />
        </AuthProvider>
      );

      expect(screen.getByRole("heading", { name: /sign in to resumeee/i })).toBeInTheDocument();
      const region = screen.getByRole("region", { name: /authentication widget/i });
      expect(region).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /continue with external sso/i })).toBeInTheDocument();
    });

    it("passes axe-core accessibility audit in configured state", async () => {
      const { container } = render(
        <AuthProvider initialAdminMode={false} authAdapter={mockAdapter}>
          <LoginPage />
        </AuthProvider>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
