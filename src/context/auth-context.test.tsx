import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth, type AuthAdapter, type AuthUser } from "./auth-context";
import { getAuthToken, setAuthToken } from "@/api/client";

function TestConsumer() {
  const {
    user,
    loading,
    adminMode,
    signOut,
    quotaExceededWarning,
    dismissQuotaWarning,
  } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? "loading" : "idle"}</div>
      <div data-testid="admin-mode">{adminMode ? "admin" : "multi-tenant"}</div>
      <div data-testid="user-email">{user?.email || "anonymous"}</div>
      <div data-testid="quota-warning">
        {quotaExceededWarning ? "warning-active" : "warning-idle"}
      </div>
      <button onClick={() => void signOut()}>Sign Out</button>
      <button onClick={dismissQuotaWarning}>Dismiss Quota</button>
    </div>
  );
}

describe("AuthContext and AuthProvider", () => {
  beforeEach(() => {
    setAuthToken(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    setAuthToken(null);
  });

  it("provides safe fallback defaults when accessed outside of AuthProvider", () => {
    render(<TestConsumer />);

    expect(screen.getByTestId("loading")).toHaveTextContent("idle");
    expect(screen.getByTestId("admin-mode")).toHaveTextContent("admin");
    expect(screen.getByTestId("user-email")).toHaveTextContent("admin@resumeee.local");
    expect(screen.getByTestId("quota-warning")).toHaveTextContent("warning-idle");
  });

  it("respects initialAdminMode and initialUser overrides", () => {
    const mockUser: AuthUser = {
      uid: "tenant-test-user",
      email: "engineer@example.com",
      displayName: "Test Engineer",
    };

    render(
      <AuthProvider initialAdminMode={false} initialUser={mockUser}>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId("admin-mode")).toHaveTextContent("multi-tenant");
    expect(screen.getByTestId("user-email")).toHaveTextContent("engineer@example.com");
  });

  it("handles quota exceeded window event and dismissal", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider initialAdminMode={true}>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId("quota-warning")).toHaveTextContent("warning-idle");

    act(() => {
      window.dispatchEvent(new CustomEvent("resumeee:quota-exceeded"));
    });

    expect(screen.getByTestId("quota-warning")).toHaveTextContent("warning-active");

    const dismissButton = screen.getByRole("button", { name: /dismiss quota/i });
    await user.click(dismissButton);

    expect(screen.getByTestId("quota-warning")).toHaveTextContent("warning-idle");
  });

  it("clears user and auth token when receiving resumeee:unauthorized event in multi-tenant mode", () => {
    const mockUser: AuthUser = {
      uid: "tenant-user-456",
      email: "tenant@example.com",
      displayName: "Tenant User",
    };
    setAuthToken("sample-jwt-token");

    render(
      <AuthProvider initialAdminMode={false} initialUser={mockUser}>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId("user-email")).toHaveTextContent("tenant@example.com");
    expect(getAuthToken()).toBe("sample-jwt-token");

    act(() => {
      window.dispatchEvent(new CustomEvent("resumeee:unauthorized"));
    });

    expect(screen.getByTestId("user-email")).toHaveTextContent("anonymous");
    expect(getAuthToken()).toBeNull();
  });

  it("clears user and auth token upon manual signOut", async () => {
    const user = userEvent.setup();
    const mockUser: AuthUser = {
      uid: "tenant-user-789",
      email: "logout@example.com",
      displayName: "Logout User",
    };
    setAuthToken("active-token");

    render(
      <AuthProvider initialAdminMode={false} initialUser={mockUser}>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId("user-email")).toHaveTextContent("logout@example.com");

    const signOutButton = screen.getByRole("button", { name: /sign out/i });
    await user.click(signOutButton);

    expect(screen.getByTestId("user-email")).toHaveTextContent("anonymous");
    expect(getAuthToken()).toBeNull();
  });

  it("subscribes to injected authAdapter and delegates signOut", async () => {
    const user = userEvent.setup();
    const unsubscribeMock = vi.fn();
    const signOutMock = vi.fn().mockResolvedValue(undefined);
    const adapter: AuthAdapter = {
      subscribe: (onChange) => {
        onChange(
          {
            uid: "adapter-user-1",
            email: "sso@example.com",
            displayName: "SSO User",
          },
          "adapter-jwt-token"
        );
        return unsubscribeMock;
      },
      signOut: signOutMock,
    };

    const { unmount } = render(
      <AuthProvider initialAdminMode={false} authAdapter={adapter}>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("idle");
    expect(screen.getByTestId("user-email")).toHaveTextContent("sso@example.com");
    expect(getAuthToken()).toBe("adapter-jwt-token");

    await user.click(screen.getByRole("button", { name: /sign out/i }));
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("user-email")).toHaveTextContent("anonymous");
    expect(getAuthToken()).toBeNull();

    unmount();
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });
});
