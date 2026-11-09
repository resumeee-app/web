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

const mockFullSnapshot: components["schemas"]["MainProfileSnapshot"] = {
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
    main_revision: 2,
  },
  main_revision: 2,
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

function renderProfilePage(snapshot?: components["schemas"]["MainProfileSnapshot"]) {
  if (snapshot) {
    vi.mocked(api.GET).mockResolvedValueOnce({
      data: snapshot,
      error: undefined,
      response: new Response(),
    } as unknown as Awaited<ReturnType<typeof api.GET>>);
  }

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

  it("renders main profile page heading and loaded contact data", async () => {
    renderProfilePage();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: /Main Profile & Career Graph/i,
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
    const cachedData = queryClient.getQueryData<components["schemas"]["MainProfileSnapshot"]>(
      PROFILE_FULL_QUERY_KEY
    );
    expect(cachedData?.experiences?.[0]?.id).toBe(
      "exp-22222222-3333-4444-5555-666666666666"
    );
    expect(cachedData?.experiences?.[1]?.id).toBe(
      "exp-11111111-2222-3333-4444-555555555555"
    );
  });

  it("adds education with draft facts and persists both education and child facts", async () => {
    const user = userEvent.setup();
    const createdEduId = "edu-new-12345678-0000-0000-0000-000000000000";

    vi.mocked(api.POST).mockImplementation(async (endpoint) => {
      if (endpoint === "/education") {
        return {
          data: {
            id: createdEduId,
            user_id: "user-1",
            institution: "Princeton University",
            degree: "PhD",
            field: "Mathematics",
            location: { city: "Princeton", region: "NJ" },
          },
          error: undefined,
          response: new Response(),
        } as unknown as Awaited<ReturnType<typeof api.POST>>;
      }
      if (endpoint === "/facts") {
        return {
          data: {
            id: "fact-new-1",
            user_id: "user-1",
            owner_id: createdEduId,
            owner_type: "education",
            statement: "Published ordinal logic paper",
          },
          error: undefined,
          response: new Response(),
        } as unknown as Awaited<ReturnType<typeof api.POST>>;
      }
      return {
        data: {},
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.POST>>;
    });

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    });

    // Switch to Education tab
    const eduTab = screen.getByRole("tab", {
      name: /Education & Certifications/i,
    });
    await user.click(eduTab);

    // Click Add Education
    const addEduBtn = screen.getByRole("button", { name: /Add Education/i });
    await user.click(addEduBtn);

    // Type institution
    await user.type(screen.getByLabelText(/Institution/i), "Princeton University");

    // Expand Extended Details
    const extendedToggle = screen.getByRole("button", {
      name: /Extended Details/i,
    });
    await user.click(extendedToggle);

    // Type Location
    await user.type(screen.getByLabelText(/City/i), "Princeton");
    await user.type(screen.getByLabelText(/State \/ Region/i), "NJ");

    // Add draft fact
    const modalBulletInput = screen.getByPlaceholderText(
      /Add achievement or bullet point/i
    );
    await user.type(modalBulletInput, "Published ordinal logic paper");

    const modalAddBulletBtn = screen.getByRole("button", {
      name: /Add Bullet/i,
    });
    await user.click(modalAddBulletBtn);

    expect(
      screen.getByText("Published ordinal logic paper")
    ).toBeInTheDocument();

    // Click Save Education
    const saveBtn = screen.getByRole("button", { name: /Save Education/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith("/education", {
        body: expect.objectContaining({
          institution: "Princeton University",
          location: {
            city: "Princeton",
            region: "NJ",
          },
        }),
      });
      expect(api.POST).toHaveBeenCalledWith("/facts", {
        body: expect.objectContaining({
          owner_id: createdEduId,
          owner_type: "education",
          statement: "Published ordinal logic paper",
        }),
      });
    });
  });

  it("announces error message when creating education fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.POST).mockResolvedValueOnce({
      data: undefined,
      error: { error: { message: "Database connection failed" } },
      response: new Response("", { status: 500 }),
    } as unknown as Awaited<ReturnType<typeof api.POST>>);

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    });

    const eduTab = screen.getByRole("tab", {
      name: /Education & Certifications/i,
    });
    await user.click(eduTab);

    const addEduBtn = screen.getByRole("button", { name: /Add Education/i });
    await user.click(addEduBtn);

    await user.type(screen.getByLabelText(/Institution/i), "Princeton University");
    const saveBtn = screen.getByRole("button", { name: /Save Education/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText("Database connection failed")).toBeInTheDocument();
    });
  });

  it("renders Import PDF Resume button in header actions and opens import dialog", async () => {
    const user = userEvent.setup();
    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    });

    const importPdfBtn = screen.getByRole("button", { name: /import pdf resume/i });
    expect(importPdfBtn).toBeInTheDocument();

    await user.click(importPdfBtn);

    expect(
      screen.getByRole("heading", { name: /import pdf resume/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/select pdf resume file/i)).toBeInTheDocument();
  });

  it("renders onboarding callout when career graph is empty and allows opening PDF import dialog", async () => {
    const user = userEvent.setup();
    const emptySnapshot: components["schemas"]["MainProfileSnapshot"] = {
      profile: {
        id: "profile-new",
        user_id: "user-new",
        full_name: "",
        headline: "",
        default_provider: "gemini",
        default_model: "gemini-3.8-flash",
        main_revision: 0,
      },
      main_revision: 0,
      skills: [],
      experiences: [],
      projects: [],
      education: [],
      certifications: [],
      facts: [],
      exported_at: "2026-11-01T00:00:00Z",
    };

    renderProfilePage(emptySnapshot);

    await waitFor(() => {
      expect(
        screen.getByText(/kickstart your main profile/i)
      ).toBeInTheDocument();
    });

    const onboardingImportBtn = screen.getByRole("button", {
      name: /import from pdf resume/i,
    });
    expect(onboardingImportBtn).toBeInTheDocument();

    await user.click(onboardingImportBtn);

    expect(
      screen.getByRole("heading", { name: /import pdf resume/i })
    ).toBeInTheDocument();
  });

  it("reconciles dirty state and updates contact draft when PDF resume is successfully committed", async () => {
    const user = userEvent.setup();
    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    });

    // Make form dirty
    const nameInput = screen.getByLabelText(/Full Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Alan M. Turing (Draft)");

    expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();

    const mockCommittedProfile: components["schemas"]["MainProfileSnapshot"] = {
      ...mockFullSnapshot,
      profile: {
        ...mockFullSnapshot.profile,
        full_name: "Margaret Hamilton",
        headline: "Apollo Software Engineering Director",
        email: "margaret@mit.edu",
      },
    };

    vi.mocked(api.POST).mockImplementation(async (path) => {
      if (path === "/profile/pdf/parse") {
        return {
          data: {
            basics: {
              name: "Margaret Hamilton",
              label: "Apollo Software Engineering Director",
              email: "margaret@mit.edu",
            },
          } as unknown as Record<string, never>,
          error: undefined,
          response: new Response(),
        };
      }
      if (path === "/profile/pdf/commit") {
        vi.mocked(api.GET).mockResolvedValue({
          data: mockCommittedProfile,
          error: undefined,
          response: new Response(),
        } as unknown as Awaited<ReturnType<typeof api.GET>>);

        return {
          data: mockCommittedProfile as unknown as Record<string, never>,
          error: undefined,
          response: new Response(),
        };
      }
      return { data: undefined, error: undefined, response: new Response() };
    });

    // Click Import PDF Resume
    const importBtn = screen.getByRole("button", { name: /import pdf resume/i });
    await user.click(importBtn);

    // Upload & Parse
    const fileInput = screen.getByLabelText(/select pdf resume file/i);
    const validFile = new File(["%PDF-1.4 mock content"], "margaret.pdf", {
      type: "application/pdf",
    });
    await user.upload(fileInput, validFile);

    await user.click(screen.getByRole("button", { name: /parse & stage with llm/i }));

    await waitFor(() => {
      expect(screen.getByText("Margaret Hamilton")).toBeInTheDocument();
    });

    // Commit
    await user.click(screen.getByRole("button", { name: /commit to main profile/i }));

    // Verify dialog closes and contact draft is updated to committed profile and not dirty
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /review extracted resume draft/i })).not.toBeInTheDocument();
      expect(screen.queryByText("Unsaved Changes")).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Margaret Hamilton");
    });
  });

  it("passes axe-core accessibility audit on full page render", async () => {
    const { container } = renderProfilePage();

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders global skills in Skills tab with origin badge and enables global filtering", async () => {
    const user = userEvent.setup();
    const globalSkillsSample: components["schemas"]["Skill"][] = [
      {
        id: "global-skill-go",
        user_id: "system",
        name: "Go",
        slug: "go",
        is_global: true,
        category: "Languages",
        proficiency: "Proficient",
      },
      {
        id: "global-skill-react",
        user_id: "system",
        name: "React",
        slug: "react",
        is_global: true,
        category: "Web Technologies",
        proficiency: "Proficient",
      },
    ];

    // Snapshot contains overlapping skills: one matching by exact ID, one matching by case-insensitive name
    const overlappingSnapshot: components["schemas"]["MainProfileSnapshot"] = {
      ...mockFullSnapshot,
      skills: [
        {
          id: "skill-11111111-2222-3333-4444-555555555555",
          user_id: "user-1",
          name: "Cryptanalysis",
          category: "Languages",
        },
        {
          id: "global-skill-go",
          user_id: "user-1",
          name: "Go",
          category: "Languages",
        },
        {
          id: "custom-duplicate-react-uuid",
          user_id: "user-1",
          name: "react",
          category: "Web Technologies",
        },
      ],
    };

    vi.mocked(api.GET).mockImplementation(async (path: string) => {
      if (path === "/skills") {
        return {
          data: globalSkillsSample,
          error: undefined,
          response: new Response(),
        } as unknown as Awaited<ReturnType<typeof api.GET>>;
      }
      return {
        data: overlappingSnapshot,
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.GET>>;
    });

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /Main Profile & Career Graph/i })).toBeInTheDocument();
    });

    // Switch to Skills tab
    const skillsTab = screen.getByRole("tab", { name: /Skills/i });
    await user.click(skillsTab);

    // Global skill "React" should be visible in the catalog with "Global" origin badge
    await waitFor(() => {
      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getAllByText("Global").length).toBeGreaterThan(0);
    });

    // Uniqueness & cardinality: ensure deduplication results in exactly 1 element per skill
    expect(screen.getAllByText("React")).toHaveLength(1);
    expect(screen.getAllByText("Go")).toHaveLength(1);

    // Filter by Global origin
    const globalFilterBtn = screen.getByRole("button", { name: /^Global$/i });
    await user.click(globalFilterBtn);

    // React and Go must remain visible under Global filter (exact 1 instance each)
    expect(screen.getAllByText("React")).toHaveLength(1);
    expect(screen.getAllByText("Go")).toHaveLength(1);
    // Custom skill "Cryptanalysis" should not be visible under Global filter
    expect(screen.queryByText("Cryptanalysis")).not.toBeInTheDocument();
  });

  it("provides global skills in Experience and Project skill selection quick-add chips", async () => {
    const user = userEvent.setup();
    const globalSkillsSample: components["schemas"]["Skill"][] = [
      {
        id: "global-skill-go",
        user_id: "system",
        name: "Go",
        slug: "go",
        is_global: true,
        category: "Languages",
        proficiency: "Proficient",
      },
      {
        id: "global-skill-react",
        user_id: "system",
        name: "React",
        slug: "react",
        is_global: true,
        category: "Web Technologies",
        proficiency: "Proficient",
      },
    ];

    // Snapshot contains overlapping Go by ID and React by name
    const overlappingSnapshot: components["schemas"]["MainProfileSnapshot"] = {
      ...mockFullSnapshot,
      skills: [
        {
          id: "global-skill-go",
          user_id: "user-1",
          name: "Go",
          category: "Languages",
        },
        {
          id: "custom-duplicate-react-uuid",
          user_id: "user-1",
          name: "react",
          category: "Web Technologies",
        },
      ],
    };

    vi.mocked(api.GET).mockImplementation(async (path: string) => {
      if (path === "/skills") {
        return {
          data: globalSkillsSample,
          error: undefined,
          response: new Response(),
        } as unknown as Awaited<ReturnType<typeof api.GET>>;
      }
      return {
        data: overlappingSnapshot,
        error: undefined,
        response: new Response(),
      } as unknown as Awaited<ReturnType<typeof api.GET>>;
    });

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /Main Profile & Career Graph/i })).toBeInTheDocument();
    });

    // Switch to Experience tab
    const expTab = screen.getByRole("tab", { name: /Experience & Projects/i });
    await user.click(expTab);

    // Click Add Work Experience
    const addExpBtn = screen.getByRole("button", { name: /add work experience/i });
    await user.click(addExpBtn);

    // Expand extended details to reveal Skills input & quick add chips
    const extendedDetailsBtn = screen.getByRole("button", { name: /extended details/i });
    await user.click(extendedDetailsBtn);

    // Global skills should appear in Quick Add chip group with exact cardinality of 1 each
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^React/i })).toHaveLength(1);
      expect(screen.getAllByRole("button", { name: /^Go/i })).toHaveLength(1);
    });

    // Clicking quick add chip adds skill to input
    await user.click(screen.getByRole("button", { name: /^React/i }));
    const expSkillsInput = screen.getByRole("dialog").querySelector("#exp-skills") as HTMLInputElement;
    expect(expSkillsInput).toHaveValue("React");
  });
});
