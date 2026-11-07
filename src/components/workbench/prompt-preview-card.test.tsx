import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { api, setAuthToken } from "@/api/client";
import type { Branch } from "@/api/workbench-queries";
import { PromptPreviewCard } from "./prompt-preview-card";

const mockBranch: Branch = {
  id: "b-1",
  user_id: "u-1",
  name: "Master Branch",
  target_role: "Staff Engineer",
  target_company: "Stripe",
  target_requirements: "Go experience",
  branch_instructions: "",
  template_set_id: "standard",
  preset_id: null,
  pinned_entity_ids: [],
  excluded_entity_ids: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, Wrapper };
}

describe("PromptPreviewCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("ADMIN_MODE", "true");
    setAuthToken(null);
  });

  it("renders null and does not mount prompt inspector when isUserAdmin is false", () => {
    vi.stubEnv("ADMIN_MODE", "false");
    vi.stubEnv("VITE_ADMIN_MODE", "false");
    setAuthToken(null);
    const { Wrapper } = createTestWrapper();

    const { container } = render(
      <Wrapper>
        <PromptPreviewCard branch={mockBranch} defaultExpanded={true} />
      </Wrapper>
    );

    expect(container.firstChild).toBeNull();
    expect(
      screen.queryByRole("heading", { name: /llm prompt preview/i })
    ).not.toBeInTheDocument();
  });

  it("renders collapsed by default and expands upon user click", async () => {
    const user = userEvent.setup();
    const { Wrapper } = createTestWrapper();

    vi.spyOn(api, "GET").mockResolvedValue({
      data: {
        system_prompt: "You are Resumeee AI. Anti-Hallucination rules.",
        user_prompt: "Target Role: Staff Engineer. Target Company: Stripe.",
      },
      error: undefined,
      response: new Response(),
    } as never);

    render(
      <Wrapper>
        <PromptPreviewCard branch={mockBranch} />
      </Wrapper>
    );

    expect(
      screen.getByRole("heading", { name: /llm prompt preview/i })
    ).toBeInTheDocument();

    const toggleButton = screen.getByRole("button", {
      name: /inspect llm prompt/i,
    });
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");

    await user.click(toggleButton);

    expect(toggleButton).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => {
      expect(screen.getByText(/anti-hallucination rules/i)).toBeInTheDocument();
      expect(screen.getByText(/target role: staff engineer/i)).toBeInTheDocument();
    });
  });

  it("renders monospaced code blocks and allows copying to clipboard", async () => {
    const user = userEvent.setup();
    const { Wrapper } = createTestWrapper();

    vi.spyOn(api, "GET").mockResolvedValue({
      data: {
        system_prompt: "System Prompt Content",
        user_prompt: "User Prompt Content",
      },
      error: undefined,
      response: new Response(),
    } as never);

    // Mock clipboard API
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(
      <Wrapper>
        <PromptPreviewCard branch={mockBranch} defaultExpanded={true} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("System Prompt Content")).toBeInTheDocument();
    });

    const copySystemBtn = screen.getByRole("button", {
      name: /copy system prompt/i,
    });
    await user.click(copySystemBtn);

    expect(writeTextMock).toHaveBeenCalledWith("System Prompt Content");
    expect(screen.getByText(/copied!/i)).toBeInTheDocument();
  });

  it("updates reactively when draft overrides change", async () => {
    const { Wrapper } = createTestWrapper();

    const postSpy = vi.spyOn(api, "POST").mockResolvedValue({
      data: {
        system_prompt: "System Prompt",
        user_prompt: "Target Role: Principal Architect",
      },
      error: undefined,
      response: new Response(),
    } as never);

    const { rerender } = render(
      <Wrapper>
        <PromptPreviewCard
          branch={mockBranch}
          defaultExpanded={true}
          draftOverrides={null}
        />
      </Wrapper>
    );

    rerender(
      <Wrapper>
        <PromptPreviewCard
          branch={mockBranch}
          defaultExpanded={true}
          draftOverrides={{ target_role: "Principal Architect" }}
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalled();
    });
  });

  it("passes accessibility audit with 0 violations", async () => {
    const { Wrapper } = createTestWrapper();

    vi.spyOn(api, "GET").mockResolvedValue({
      data: {
        system_prompt: "System Prompt Content",
        user_prompt: "User Prompt Content",
      },
      error: undefined,
      response: new Response(),
    } as never);

    const { container } = render(
      <Wrapper>
        <PromptPreviewCard branch={mockBranch} defaultExpanded={true} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("System Prompt Content")).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
