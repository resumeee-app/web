import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import {
  SkillSelector,
  parseSkillTokens,
  toggleSkillToken,
  resolveSkillIds,
  isSkillSelected,
} from "./skill-selector";
import type { components } from "@/api/schema";

describe("parseSkillTokens", () => {
  it("returns an empty array for empty or whitespace-only strings", () => {
    expect(parseSkillTokens("")).toEqual([]);
    expect(parseSkillTokens("   ")).toEqual([]);
    expect(parseSkillTokens(",,,")).toEqual([]);
    expect(parseSkillTokens(" , , , ")).toEqual([]);
  });

  it("trims whitespace and filters empty tokens", () => {
    expect(parseSkillTokens(" Go , TypeScript ,  Docker ")).toEqual([
      "Go",
      "TypeScript",
      "Docker",
    ]);
  });

  it("deduplicates tokens case-insensitively preserving first casing", () => {
    expect(parseSkillTokens("TypeScript, typescript, TYPESCRIPT, Go")).toEqual([
      "TypeScript",
      "Go",
    ]);
  });
});

describe("isSkillSelected", () => {
  const activeSet = new Set(["go", "skill-rust", "docker"]);

  it("matches string tokens case-insensitively", () => {
    expect(isSkillSelected("Go", activeSet)).toBe(true);
    expect(isSkillSelected("go", activeSet)).toBe(true);
    expect(isSkillSelected("GO", activeSet)).toBe(true);
    expect(isSkillSelected("Python", activeSet)).toBe(false);
  });

  it("matches skill entities by name or id case-insensitively", () => {
    const goSkill: components["schemas"]["Skill"] = {
      id: "uuid-1",
      user_id: "u1",
      name: "Go",
    };
    const rustSkill: components["schemas"]["Skill"] = {
      id: "skill-rust",
      user_id: "u1",
      name: "Rust",
    };
    const pythonSkill: components["schemas"]["Skill"] = {
      id: "uuid-3",
      user_id: "u1",
      name: "Python",
    };

    expect(isSkillSelected(goSkill, activeSet)).toBe(true);
    expect(isSkillSelected(rustSkill, activeSet)).toBe(true);
    expect(isSkillSelected(pythonSkill, activeSet)).toBe(false);
  });

  it("safely handles undefined or empty names and ids", () => {
    const emptySkill = {} as components["schemas"]["Skill"];
    expect(isSkillSelected(emptySkill, activeSet)).toBe(false);
  });
});

describe("toggleSkillToken", () => {
  it("appends a string token if not present", () => {
    expect(toggleSkillToken([], "Go")).toEqual(["Go"]);
    expect(toggleSkillToken(["Rust"], "Go")).toEqual(["Rust", "Go"]);
  });

  it("removes a string token if present case-insensitively", () => {
    expect(toggleSkillToken(["Rust", "Go", "Docker"], "go")).toEqual([
      "Rust",
      "Docker",
    ]);
    expect(toggleSkillToken(["Rust", "Go"], "Rust")).toEqual(["Go"]);
    expect(toggleSkillToken(["Rust"], "rust")).toEqual([]);
  });

  it("toggles skill objects matching by name or id", () => {
    const goSkill: components["schemas"]["Skill"] = {
      id: "skill-go",
      user_id: "user-1",
      name: "Go",
    };

    // Append when absent
    expect(toggleSkillToken([], goSkill)).toEqual(["Go"]);
    expect(toggleSkillToken(["Rust"], goSkill)).toEqual(["Rust", "Go"]);

    // Remove when present by name
    expect(toggleSkillToken(["Rust", "Go"], goSkill)).toEqual(["Rust"]);
    expect(toggleSkillToken(["Rust", "go"], goSkill)).toEqual(["Rust"]);

    // Remove when present by id
    expect(toggleSkillToken(["Rust", "skill-go"], goSkill)).toEqual(["Rust"]);
    expect(toggleSkillToken(["Rust", "SKILL-GO"], goSkill)).toEqual(["Rust"]);
  });
});

describe("resolveSkillIds", () => {
  const pool: components["schemas"]["Skill"][] = [
    { id: "uuid-go", user_id: "user-1", name: "Go" },
    { id: "uuid-ts", user_id: "user-1", name: "TypeScript" },
  ];

  it("resolves tokens matching pool name or id to skill id", () => {
    expect(resolveSkillIds(["go", "TypeScript"], pool)).toEqual([
      "uuid-go",
      "uuid-ts",
    ]);
    expect(resolveSkillIds(["uuid-go"], pool)).toEqual(["uuid-go"]);
  });

  it("preserves unrecognised tokens as raw ids and deduplicates", () => {
    expect(
      resolveSkillIds(["Go", "custom-skill", "go", "custom-skill"], pool)
    ).toEqual(["uuid-go", "custom-skill"]);
  });

  it("defensively handles skills with undefined or missing name or id", () => {
    const dirtyPool = [
      { id: undefined as unknown as string, user_id: "u1", name: undefined as unknown as string },
      { id: "valid-id", user_id: "u1", name: "Valid" },
    ];
    expect(resolveSkillIds(["Valid"], dirtyPool)).toEqual(["valid-id"]);
    expect(resolveSkillIds(["Unknown"], dirtyPool)).toEqual(["Unknown"]);
  });
});

describe("SkillSelector Component", () => {
  const mockSkills: components["schemas"]["Skill"][] = [
    {
      id: "skill-go",
      user_id: "user-1",
      name: "Go",
      category: "Languages",
    },
    {
      id: "skill-rust",
      user_id: "user-1",
      name: "Rust",
      category: "Languages",
    },
    {
      id: "skill-docker",
      user_id: "user-1",
      name: "Docker",
      category: "Tools",
    },
  ];

  it("renders input with custom label, id, and placeholder", () => {
    render(
      <SkillSelector
        id="test-skills-id"
        label="Custom Skills Label"
        placeholder="Custom placeholder..."
        value=""
        onChange={vi.fn()}
      />
    );

    const input = screen.getByLabelText("Custom Skills Label");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("id", "test-skills-id");
    expect(input).toHaveAttribute("placeholder", "Custom placeholder...");
  });

  it("associates helperText with input via aria-describedby", () => {
    const { rerender } = render(
      <SkillSelector
        id="test-skills-helper"
        label="Skills"
        helperText="Enter skills separated by commas."
        value=""
        onChange={vi.fn()}
      />
    );

    const input = screen.getByLabelText(/^Skills$/i);
    const helper = screen.getByText("Enter skills separated by commas.");

    expect(helper).toHaveAttribute("id", "test-skills-helper-helper");
    expect(input).toHaveAttribute("aria-describedby", "test-skills-helper-helper");

    // When helperText is omitted, aria-describedby is not set
    rerender(
      <SkillSelector
        id="test-skills-helper"
        label="Skills"
        value=""
        onChange={vi.fn()}
      />
    );
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("does not render Quick add section when availableSkills is not provided or empty", () => {
    const { rerender } = render(
      <SkillSelector value="" onChange={vi.fn()} />
    );
    expect(screen.queryByText(/Quick add:/i)).not.toBeInTheDocument();

    rerender(<SkillSelector value="" onChange={vi.fn()} availableSkills={[]} />);
    expect(screen.queryByText(/Quick add:/i)).not.toBeInTheDocument();
  });

  it("renders quick-add chips with visual indicators (+ for unselected, ✓ for selected)", () => {
    render(
      <SkillSelector
        value="Go"
        onChange={vi.fn()}
        availableSkills={mockSkills}
      />
    );

    expect(screen.getByText(/Quick add:/i)).toBeInTheDocument();

    const goChip = screen.getByRole("button", { name: /Go/i });
    const rustChip = screen.getByRole("button", { name: /Rust/i });
    const dockerChip = screen.getByRole("button", { name: /Docker/i });

    // Selected chip (Go)
    expect(goChip).toHaveAttribute("aria-pressed", "true");
    expect(goChip.textContent).toContain("✓");
    expect(goChip.textContent).not.toContain("+");

    // Unselected chips (Rust, Docker)
    expect(rustChip).toHaveAttribute("aria-pressed", "false");
    expect(rustChip.textContent).toContain("+");
    expect(rustChip.textContent).not.toContain("✓");

    expect(dockerChip).toHaveAttribute("aria-pressed", "false");
    expect(dockerChip.textContent).toContain("+");
    expect(dockerChip.textContent).not.toContain("✓");
  });

  it("calls onChange with updated comma-separated string when toggling chips", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    const { rerender } = render(
      <SkillSelector
        value="Go"
        onChange={handleChange}
        availableSkills={mockSkills}
      />
    );

    // Click Rust (unselected) -> appends Rust
    const rustChip = screen.getByRole("button", { name: /Rust/i });
    await user.click(rustChip);
    expect(handleChange).toHaveBeenCalledWith("Go, Rust");

    // Re-render with new value
    rerender(
      <SkillSelector
        value="Go, Rust"
        onChange={handleChange}
        availableSkills={mockSkills}
      />
    );

    // Click Go (selected) -> removes Go
    const goChip = screen.getByRole("button", { name: /Go/i });
    await user.click(goChip);
    expect(handleChange).toHaveBeenCalledWith("Rust");
  });

  it("matches and removes chips when value contains skill IDs instead of display names", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    const { rerender } = render(
      <SkillSelector
        value="skill-go, Docker"
        onChange={handleChange}
        availableSkills={mockSkills}
      />
    );

    const goChip = screen.getByRole("button", { name: /Go/i });
    const dockerChip = screen.getByRole("button", { name: /Docker/i });
    const rustChip = screen.getByRole("button", { name: /Rust/i });

    // Both Go (via skill-go ID) and Docker (via name) should be selected
    expect(goChip).toHaveAttribute("aria-pressed", "true");
    expect(goChip.textContent).toContain("✓");

    expect(dockerChip).toHaveAttribute("aria-pressed", "true");
    expect(dockerChip.textContent).toContain("✓");

    expect(rustChip).toHaveAttribute("aria-pressed", "false");
    expect(rustChip.textContent).toContain("+");

    // Clicking Go chip removes skill-go
    await user.click(goChip);
    expect(handleChange).toHaveBeenCalledWith("Docker");

    // Re-render with Docker remaining
    rerender(
      <SkillSelector
        value="Docker"
        onChange={handleChange}
        availableSkills={mockSkills}
      />
    );
    expect(goChip).toHaveAttribute("aria-pressed", "false");
    expect(goChip.textContent).toContain("+");
  });

  it("handles direct typing in text input with a controlled harness", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    const Harness = () => {
      const [val, setVal] = React.useState("");
      return (
        <SkillSelector
          value={val}
          onChange={(newVal) => {
            setVal(newVal);
            handleChange(newVal);
          }}
          availableSkills={mockSkills}
        />
      );
    };

    render(<Harness />);

    const input = screen.getByLabelText(/^Skills$/i);
    await user.type(input, "Python");
    expect(input).toHaveValue("Python");
    expect(handleChange).toHaveBeenLastCalledWith("Python");
  });

  it("respects disabled state on both text input and chips", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <SkillSelector
        value="Go"
        onChange={handleChange}
        availableSkills={mockSkills}
        disabled={true}
      />
    );

    const input = screen.getByLabelText(/^Skills$/i);
    expect(input).toBeDisabled();

    const rustChip = screen.getByRole("button", { name: /Rust/i });
    expect(rustChip).toBeDisabled();

    await user.click(rustChip);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("passes axe-core accessibility audit", async () => {
    const { container } = render(
      <SkillSelector
        value="Go"
        helperText="Enter technical skills separated by commas."
        onChange={vi.fn()}
        availableSkills={mockSkills}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
