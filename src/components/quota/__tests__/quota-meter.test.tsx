import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import { QuotaMeter } from "../quota-meter";
import * as quotaQueries from "@/api/quota-queries";
import type { TenantQuota } from "@/api/quota-queries";

const mockQuotaNormal: TenantQuota = {
  user_id: "test-user-1",
  daily_requests_used: 5,
  daily_request_limit: 50,
  daily_requests_remaining: 45,
  daily_window_start: "2026-11-07T00:00:00Z",
  daily_reset_at: "2026-11-08T00:00:00Z",
  monthly_tokens_used: 25000,
  monthly_token_limit: 1000000,
  monthly_tokens_remaining: 975000,
  monthly_window_start: "2026-11-01T00:00:00Z",
  monthly_reset_at: "2026-12-01T00:00:00Z",
  updated_at: "2026-11-07T12:00:00Z",
};

const mockQuotaWarning: TenantQuota = {
  ...mockQuotaNormal,
  daily_requests_used: 42,
  daily_requests_remaining: 8,
};

const mockQuotaExceeded: TenantQuota = {
  ...mockQuotaNormal,
  daily_requests_used: 50,
  daily_requests_remaining: 0,
};

function renderQuotaMeter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <QuotaMeter />
    </QueryClientProvider>
  );
}

describe("QuotaMeter Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders accessible loading skeleton when query is loading", () => {
    vi.spyOn(quotaQueries, "useQuota").mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof quotaQueries.useQuota>);

    renderQuotaMeter();

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("--/--")).toBeInTheDocument();
  });

  it("renders graceful fallback when quota query fails", () => {
    vi.spyOn(quotaQueries, "useQuota").mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof quotaQueries.useQuota>);

    renderQuotaMeter();

    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry fetching quota/i })).toBeInTheDocument();
  });

  it("renders compact trigger with daily usage and opens popover on click", async () => {
    const user = userEvent.setup();
    vi.spyOn(quotaQueries, "useQuota").mockReturnValue({
      data: mockQuotaNormal,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof quotaQueries.useQuota>);

    renderQuotaMeter();

    const trigger = screen.getByRole("button", {
      name: /llm quota: 5 of 50 daily requests used/i,
    });
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText("5/50")).toBeInTheDocument();

    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /llm quota & limits/i })).toBeInTheDocument();
    });

    expect(screen.getByText("45 remaining")).toBeInTheDocument();
    expect(screen.getByText("975,000 remaining")).toBeInTheDocument();

    const progressbars = screen.getAllByRole("progressbar");
    expect(progressbars.length).toBe(2);
    expect(progressbars[0]).toHaveAttribute("aria-valuenow", "5");
    expect(progressbars[0]).toHaveAttribute("aria-valuemax", "50");
    expect(progressbars[1]).toHaveAttribute("aria-valuenow", "25000");
    expect(progressbars[1]).toHaveAttribute("aria-valuemax", "1000000");
  });

  it("renders warning indicator when daily request usage reaches 80%", () => {
    vi.spyOn(quotaQueries, "useQuota").mockReturnValue({
      data: mockQuotaWarning,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof quotaQueries.useQuota>);

    renderQuotaMeter();

    const trigger = screen.getByRole("button", {
      name: /llm quota: 42 of 50 daily requests used/i,
    });
    expect(trigger).toHaveClass("bg-amber-50");
  });

  it("renders exceeded alert when quota is exhausted (100%)", async () => {
    const user = userEvent.setup();
    vi.spyOn(quotaQueries, "useQuota").mockReturnValue({
      data: mockQuotaExceeded,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof quotaQueries.useQuota>);

    renderQuotaMeter();

    const trigger = screen.getByRole("button", {
      name: /llm quota: 50 of 50 daily requests used/i,
    });
    expect(trigger).toHaveClass("bg-red-50");

    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/quota ceiling exceeded/i)).toBeInTheDocument();
    });
  });

  it("passes automated axe accessibility check", async () => {
    vi.spyOn(quotaQueries, "useQuota").mockReturnValue({
      data: mockQuotaNormal,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof quotaQueries.useQuota>);

    const { container } = renderQuotaMeter();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
