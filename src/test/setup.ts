import "@testing-library/jest-dom/vitest";
import "vitest-axe/extend-expect";
import * as axeMatchers from "vitest-axe/matchers";
import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Extend Vitest's expect with axe accessibility matchers
expect.extend(axeMatchers);

// Mock HTMLCanvasElement getContext for jsdom axe-core color contrast evaluation
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = () => null;
}

// Automatic DOM cleanup after each test
afterEach(() => {
  cleanup();
});
