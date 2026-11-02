import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { ShortIdBadge } from "./short-id-badge";

describe("ShortIdBadge", () => {
  it("renders compact short ID and contains accessible full UUID info", () => {
    render(
      <ShortIdBadge
        id="exp-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
        shortId="exp-9b1deb4d"
      />
    );

    const badge = screen.getByText("exp-9b1deb4d");
    expect(badge).toBeInTheDocument();

    const accessibleLabel = screen.getByLabelText(
      /Short ID exp-9b1deb4d, full UUID exp-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/i
    );
    expect(accessibleLabel).toBeInTheDocument();
  });

  it("automatically derives short ID when only id is provided", () => {
    render(
      <ShortIdBadge id="fact-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" />
    );

    expect(screen.getByText("fact-9b1deb4d")).toBeInTheDocument();
  });

  it("passes axe-core accessibility audit", async () => {
    const { container } = render(
      <ShortIdBadge
        id="exp-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
        shortId="exp-9b1deb4d"
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
