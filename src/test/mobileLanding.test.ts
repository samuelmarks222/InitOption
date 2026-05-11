import { describe, expect, it } from "vitest";
import { shouldStartAtLoginOnMobile } from "@/lib/mobileLanding";

describe("mobile landing behavior", () => {
  it("starts unauthenticated phone visitors at login", () => {
    expect(
      shouldStartAtLoginOnMobile((query) => ({
        matches: query.includes("max-width: 767px"),
      })),
    ).toBe(true);
  });

  it("keeps desktop visitors on the public landing page", () => {
    expect(shouldStartAtLoginOnMobile(() => ({ matches: false }))).toBe(false);
  });
});
