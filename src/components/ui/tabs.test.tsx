import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

describe("Tabs Primitive Component", () => {
  it("renders tab triggers and displays default active content", () => {
    render(
      <Tabs defaultValue="overview">
        <TabsList aria-label="Project Tabs">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Overview Panel Content</TabsContent>
        <TabsContent value="settings">Settings Panel Content</TabsContent>
      </Tabs>
    );

    expect(screen.getByRole("tab", { name: /overview/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: /settings/i })).toHaveAttribute(
      "aria-selected",
      "false"
    );
    expect(screen.getByText("Overview Panel Content")).toBeInTheDocument();
    expect(screen.queryByText("Settings Panel Content")).not.toBeInTheDocument();
  });

  it("switches active tab and panel on user click", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="overview">
        <TabsList aria-label="Project Tabs">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Overview Panel Content</TabsContent>
        <TabsContent value="settings">Settings Panel Content</TabsContent>
      </Tabs>
    );

    const settingsTab = screen.getByRole("tab", { name: /settings/i });
    await user.click(settingsTab);

    expect(settingsTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Settings Panel Content")).toBeInTheDocument();
    expect(screen.queryByText("Overview Panel Content")).not.toBeInTheDocument();
  });

  it("navigates tabs using keyboard arrow keys", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="tab1">
        <TabsList aria-label="Keyboard Navigation Tabs">
          <TabsTrigger value="tab1">First</TabsTrigger>
          <TabsTrigger value="tab2">Second</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">First Content</TabsContent>
        <TabsContent value="tab2">Second Content</TabsContent>
      </Tabs>
    );

    const firstTab = screen.getByRole("tab", { name: /first/i });
    await user.click(firstTab);

    // Press right arrow to move to second tab
    await user.keyboard("{ArrowRight}");

    const secondTab = screen.getByRole("tab", { name: /second/i });
    expect(secondTab).toHaveFocus();
    expect(secondTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Second Content")).toBeInTheDocument();
  });

  it("has zero accessibility violations according to axe-core", async () => {
    const { container } = render(
      <Tabs defaultValue="active">
        <TabsList aria-label="Accessible View Tabs">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        <TabsContent value="active">Active items list</TabsContent>
        <TabsContent value="archived">Archived items list</TabsContent>
      </Tabs>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
