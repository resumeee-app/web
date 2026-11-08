import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
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
  name: "Main Branch",
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

  it("suppresses rendering when isAdmin={false} is explicitly passed even if admin mode is true", () => {
    vi.stubEnv("ADMIN_MODE", "true");
    const { Wrapper } = createTestWrapper();

    const { container } = render(
      <Wrapper>
        <PromptPreviewCard
          branch={mockBranch}
          defaultExpanded={true}
          isAdmin={false}
        />
      </Wrapper>
    );

    expect(container.firstChild).toBeNull();
    expect(
      screen.queryByRole("heading", { name: /llm prompt preview/i })
    ).not.toBeInTheDocument();
  });

  it("renders when isAdmin={true} is explicitly passed even if admin mode is false", () => {
    vi.stubEnv("ADMIN_MODE", "false");
    vi.stubEnv("VITE_ADMIN_MODE", "false");
    setAuthToken(null);
    const { Wrapper } = createTestWrapper();

    render(
      <Wrapper>
        <PromptPreviewCard
          branch={mockBranch}
          defaultExpanded={true}
          isAdmin={true}
        />
      </Wrapper>
    );

    expect(
      screen.getByRole("heading", { name: /llm prompt preview/i })
    ).toBeInTheDocument();
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

  it("renders single combined prompt preview and does not render filter tabs", async () => {
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
        <PromptPreviewCard branch={mockBranch} defaultExpanded={true} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/anti-hallucination rules/i)).toBeInTheDocument();
    });

    // Verify filter tabs are completely removed
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /all prompts/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^system prompt$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^user prompt$/i })).not.toBeInTheDocument();

    // Verify system and user prompt are combined in a single pre block with keyboard focusability
    const preElement = screen.getByLabelText(/compiled prompt preview/i);
    expect(preElement).toBeInTheDocument();
    expect(preElement).toHaveAttribute("tabindex", "0");
    expect(preElement.textContent).toContain("You are Resumeee AI. Anti-Hallucination rules.");
    expect(preElement.textContent).toContain("Target Role: Staff Engineer. Target Company: Stripe.");
    expect(preElement.textContent).toBe(
      "You are Resumeee AI. Anti-Hallucination rules.\n\nTarget Role: Staff Engineer. Target Company: Stripe."
    );
  });

  it("renders monospaced code blocks and allows copying combined prompt to clipboard with dynamic aria-label", async () => {
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
      expect(screen.getByText(/system prompt content/i)).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole("button", {
      name: /copy prompt/i,
    });
    expect(copyBtn).toHaveAttribute("aria-label", "Copy prompt to clipboard");

    await user.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(
      "System Prompt Content\n\nUser Prompt Content"
    );
    expect(screen.getByText(/copied!/i)).toBeInTheDocument();
    expect(copyBtn).toHaveAttribute("aria-label", "Prompt copied to clipboard");
  });

  it("resets copy button state and aria-label after 2000ms timeout", async () => {
    const { Wrapper } = createTestWrapper();

    vi.spyOn(api, "GET").mockResolvedValue({
      data: {
        system_prompt: "System Prompt Content",
        user_prompt: "User Prompt Content",
      },
      error: undefined,
      response: new Response(),
    } as never);

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
      expect(screen.getByText(/system prompt content/i)).toBeInTheDocument();
    });

    vi.useFakeTimers();

    const copyBtn = screen.getByRole("button", {
      name: /copy prompt/i,
    });
    expect(copyBtn).toHaveAttribute("aria-label", "Copy prompt to clipboard");

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(screen.getByText(/copied!/i)).toBeInTheDocument();
    expect(copyBtn).toHaveAttribute("aria-label", "Prompt copied to clipboard");

    // Advance timer past the 2000ms timeout
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText(/copy prompt/i)).toBeInTheDocument();
    expect(copyBtn).toHaveAttribute("aria-label", "Copy prompt to clipboard");

    vi.useRealTimers();
  });

  it("handles combining when only user_prompt is present and system_prompt is empty", async () => {
    const { Wrapper } = createTestWrapper();

    vi.spyOn(api, "GET").mockResolvedValue({
      data: {
        system_prompt: "",
        user_prompt: "Only User Prompt Content",
      },
      error: undefined,
      response: new Response(),
    } as never);

    render(
      <Wrapper>
        <PromptPreviewCard branch={mockBranch} defaultExpanded={true} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Only User Prompt Content")).toBeInTheDocument();
    });

    const preElement = screen.getByLabelText(/compiled prompt preview/i);
    expect(preElement.textContent).toBe("Only User Prompt Content");
  });

  it("handles combining when only system_prompt is present and user_prompt is empty", async () => {
    const { Wrapper } = createTestWrapper();

    vi.spyOn(api, "GET").mockResolvedValue({
      data: {
        system_prompt: "Only System Prompt Content",
        user_prompt: "",
      },
      error: undefined,
      response: new Response(),
    } as never);

    render(
      <Wrapper>
        <PromptPreviewCard branch={mockBranch} defaultExpanded={true} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Only System Prompt Content")).toBeInTheDocument();
    });

    const preElement = screen.getByLabelText(/compiled prompt preview/i);
    expect(preElement.textContent).toBe("Only System Prompt Content");
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
      expect(screen.getByText(/system prompt content/i)).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
