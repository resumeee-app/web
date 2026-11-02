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

// Polyfill pointer capture methods missing in JSDOM for Radix UI primitives
if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
}

// Automatic DOM cleanup after each test
afterEach(() => {
  cleanup();
});
