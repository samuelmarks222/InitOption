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

  it("keeps search crawlers on the public landing page during smartphone tests", () => {
    expect(
      shouldStartAtLoginOnMobile(
        () => ({
          matches: true,
        }),
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Google-InspectionTool/1.0",
      ),
    ).toBe(false);
  });
});
