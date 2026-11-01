/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import "vitest";
import type { AxeMatchers } from "vitest-axe";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
