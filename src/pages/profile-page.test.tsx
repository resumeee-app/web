import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ProfilePage } from "./profile-page";
import { api } from "@/api/client";
import { PROFILE_FULL_QUERY_KEY } from "@/api/profile-queries";
import type { components } from "@/api/schema";

vi.mock("@/api/client", () => ({
  api: {
    GET: vi.fn(),
    PUT: vi.fn(),
    POST: vi.fn(),
    DELETE: vi.fn(),
  },
}));

const mockFullSnapshot: components["schemas"]["MasterProfileSnapshot"] = {
  profile: {
    id: "profile-1",
    user_id: "user-1",
    full_name: "Alan Turing",
    headline: "Cryptanalyst & Computer Scientist",
    summary: "Father of theoretical computer science and artificial intelligence.",
    email: "alan@bletchley.org",
    phone: "+44-1908-000000",
    location: { city: "Bletchley", region: "UK" },
    profiles: [
      { network: "GitHub", url: "https://github.com/alan-turing" },
    ],
    default_provider: "gemini",
    default_model: "gemini-3.8-flash",
    master_revision: 2,
  },
  master_revision: 2,
  skills: [
    {
      id: "skill-11111111-2222-3333-4444-555555555555",
      user_id: "user-1",
      name: "Cryptanalysis",
      category: "Languages",
    },
  ],
  experiences: [
    {
      id: "exp-11111111-2222-3333-4444-555555555555",
      user_id: "user-1",
      company: "Government Code & Cypher School",
      role_title: "Lead Cryptanalyst",
      start_date: "1939-09",
      end_date: "1945-05",
      is_current: false,
      facts: [
        {
          id: "fact-11111111-2222-3333-4444-555555555555",
          user_id: "user-1",
          owner_id: "exp-11111111-2222-3333-4444-555555555555",
          owner_type: "work_experience",
          statement: "Broke Enigma cypher saving millions of lives.",
        },
      ],
    },
    {
      id: "exp-22222222-3333-4444-5555-666666666666",
      user_id: "user-1",
      company: "National Physical Laboratory",
      role_title: "Reader in Mathematics",
      start_date: "1945-10",
      end_date: "1948-09",
      is_current: false,
      facts: [],
    },
  ],
  projects: [
    {
      id: "proj-11111111-2222-3333-4444-555555555555",
      user_id: "user-1",
      name: "Bombe Machine",
      role: "Designer",
      url: "https://en.wikipedia.org/wiki/Bombe",
      facts: [],
    },
  ],
  education: [
    {
      id: "edu-11111111-2222-3333-4444-555555555555",
      user_id: "user-1",
      institution: "King's College, Cambridge",
      degree: "PhD",
      field: "Mathematical Logic",
      start_date: "1931-10",
      end_date: "1938-06",
    },
  ],
  certifications: [],
  facts: [],
  exported_at: "2026-11-01T00:00:00Z",
};

function renderProfilePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const renderResult = render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage />
    </QueryClientProvider>
  );

  return { ...renderResult, queryClient };
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.GET).mockResolvedValue({
      data: mockFullSnapshot,
      error: undefined,
      response: new Response(),
    } as unknown as Awaited<ReturnType<typeof api.GET>>);
  });

  it("renders master profile page heading and loaded contact data", async () => {
    renderProfilePage();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: /Master Profile & Career Graph/i,
        })
      ).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Alan Turing");
  });

  it("switches tabs between contact, experience, skills, and education", async () => {
    const user = userEvent.setup();
    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    });

    // Switch to Experience tab
    const expTab = screen.getByRole("tab", { name: /Experience & Projects/i });
    await user.click(expTab);
    expect(screen.getByText("Government Code & Cypher School")).toBeInTheDocument();

    // Switch to Skills tab
    const skillsTab = screen.getByRole("tab", { name: /Skills/i });
    await user.click(skillsTab);
    expect(screen.getByText("Cryptanalysis")).toBeInTheDocument();

    // Switch to Education tab
    const eduTab = screen.getByRole("tab", { name: /Education & Certifications/i });
    await user.click(eduTab);
    expect(screen.getByText("King's College, Cambridge")).toBeInTheDocument();
  });

  it("tracks dirty state when contact fields are modified and saves changes", async () => {
    const user = userEvent.setup();
    vi.mocked(api.PUT).mockResolvedValueOnce({
      data: {
        ...mockFullSnapshot.profile,
        full_name: "Sir Alan Turing",
      },
      error: undefined,
      response: new Response(),
    } as unknown as Awaited<ReturnType<typeof api.PUT>>);

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Alan Turing");
    });

    // Modify full name
    const nameInput = screen.getByLabelText(/Full Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Sir Alan Turing");

    // Dirty indicator should be visible
    expect(screen.getByText(/Unsaved Changes/i)).toBeInTheDocument();

    // Save changes
    const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(api.PUT).toHaveBeenCalledWith("/profile", {
        body: expect.objectContaining({
          full_name: "Sir Alan Turing",
        }),
      });
    });
  });

  it("warns user via dialog when discarding unsaved changes", async () => {
    const user = userEvent.setup();
    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Alan Turing");
    });

    const nameInput = screen.getByLabelText(/Full Name/i);
    await user.type(nameInput, " Modified");

    const discardBtn = screen.getByRole("button", { name: /Discard/i });
    await user.click(discardBtn);

    expect(
      screen.getByRole("alertdialog", { name: /Unsaved Changes/i })
    ).toBeInTheDocument();
  });

  it("resets dirty form inputs back to authoritative snapshot values upon confirming discard", async () => {
    const user = userEvent.setup();
    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Alan Turing");
      expect(screen.getByLabelText(/Summary Bio/i)).toHaveValue(
        "Father of theoretical computer science and artificial intelligence."
      );
    });

    // Modify fields
    const nameInput = screen.getByLabelText(/Full Name/i);
    const summaryInput = screen.getByLabelText(/Summary Bio/i);

    await user.clear(nameInput);
    await user.type(nameInput, "Dr. Alan Mathison Turing");

    await user.clear(summaryInput);
    await user.type(summaryInput, "Draft summary bio that should be discarded.");

    expect(screen.getByText(/Unsaved Changes/i)).toBeInTheDocument();

    // Click Discard
    const discardBtn = screen.getByRole("button", { name: /Discard/i });
    await user.click(discardBtn);

    // Confirm Discard in alert dialog
    const confirmBtn = screen.getByRole("button", { name: /Discard Changes/i });
    await user.click(confirmBtn);

    // Inputs should reset back to snapshot values
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Alan Turing");
    expect(screen.getByLabelText(/Summary Bio/i)).toHaveValue(
      "Father of theoretical computer science and artificial intelligence."
    );

    // Unsaved Changes badge should disappear
    expect(screen.queryByText("Unsaved Changes")).not.toBeInTheDocument();
  });

  it("attaches beforeunload window listener when dirty and removes it when clean", async () => {
    const user = userEvent.setup();
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Alan Turing");
    });

    const nameInput = screen.getByLabelText(/Full Name/i);
    await user.type(nameInput, " OBE");

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function)
    );

    // Discard changes
    const discardBtn = screen.getByRole("button", { name: /Discard/i });
    await user.click(discardBtn);
    const confirmBtn = screen.getByRole("button", { name: /Discard Changes/i });
    await user.click(confirmBtn);

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function)
    );

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("guards against in-app navigation when dirty and displays unsaved changes dialog", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const testRoutes = [
      {
        path: "/",
        element: (
          <QueryClientProvider client={queryClient}>
            <ProfilePage />
          </QueryClientProvider>
        ),
      },
      {
        path: "/target",
        element: <div>Target Destination Page</div>,
      },
    ];

    const router = createMemoryRouter(testRoutes, { initialEntries: ["/"] });

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Alan Turing");
    });

    // Make dirty
    const nameInput = screen.getByLabelText(/Full Name/i);
    await act(async () => {
      await user.type(nameInput, " FRS");
    });
    expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();

    // Attempt navigation away
    await act(async () => {
      await router.navigate("/target");
    });

    // Dialog should block navigation and show warning
    await waitFor(() => {
      expect(
        screen.getByRole("alertdialog", { name: /Unsaved Changes/i })
      ).toBeInTheDocument();
    });
    expect(router.state.location.pathname).toBe("/");

    // Cancel navigation
    const stayOnPageBtn = screen.getByRole("button", { name: /Stay on Page/i });
    await user.click(stayOnPageBtn);
    expect(router.state.location.pathname).toBe("/");

    // Attempt navigation again and confirm discard
    await act(async () => {
      await router.navigate("/target");
    });

    await waitFor(() => {
      expect(
        screen.getByRole("alertdialog", { name: /Unsaved Changes/i })
      ).toBeInTheDocument();
    });

    const confirmDiscardBtn = screen.getByRole("button", { name: /Discard Changes/i });
    await user.click(confirmDiscardBtn);

    await waitFor(() => {
      expect(screen.getByText("Target Destination Page")).toBeInTheDocument();
    });
  });

  it("updates TanStack Query cache with reordered experiences", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderProfilePage();

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    });

    // Switch to Experience tab
    const expTab = screen.getByRole("tab", { name: /Experience & Projects/i });
    await user.click(expTab);

    // Reorder experiences: move first item down
    const moveDownBtn = screen.getByRole("button", {
      name: /move lead cryptanalyst at government code & cypher school down/i,
    });
    await user.click(moveDownBtn);

    // Query cache should be updated with new order
    const cachedData = queryClient.getQueryData<components["schemas"]["MasterProfileSnapshot"]>(
      PROFILE_FULL_QUERY_KEY
    );
    expect(cachedData?.experiences?.[0]?.id).toBe(
      "exp-22222222-3333-4444-5555-666666666666"
    );
    expect(cachedData?.experiences?.[1]?.id).toBe(
      "exp-11111111-2222-3333-4444-555555555555"
    );
  });

  it("passes axe-core accessibility audit on full page render", async () => {
    const { container } = renderProfilePage();

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
