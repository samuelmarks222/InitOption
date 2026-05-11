import { describe, expect, it } from "vitest";
import { createDefaultWebsiteContent, normalizeWebsiteContent } from "@/lib/websiteContent";

describe("websiteContent", () => {
  it("builds branded default landing copy", () => {
    const defaults = createDefaultWebsiteContent("Init Option");

    expect(defaults.hero.description).toContain("Init Option");
    expect(defaults.hero.title).toContain("Init Option");
    expect(defaults.review.title).toContain("Init Option");
    expect(defaults.steps.items).toHaveLength(3);
    expect(defaults.faq.items).toHaveLength(8);
    expect(defaults.publicPages.about.seoTitle).toContain("About Init Option");
    expect(defaults.publicPages.faq.faqItems).toHaveLength(6);
  });

  it("normalizes stored JSON content with defaults", () => {
    const content = normalizeWebsiteContent(
      JSON.stringify({
        hero: {
          title: "Custom Hero",
        },
        footer: {
          pills: ["XAU/USD"],
        },
        publicPages: {
          about: {
            seoTitle: "Custom About Title",
            sections: [
              {
                title: "Custom section title",
              },
            ],
          },
        },
      }),
      "Init Option",
    );

    expect(content.hero.title).toBe("Custom Hero");
    expect(content.hero.badge).toBeTruthy();
    expect(content.footer.pills[0]).toBe("XAU/USD");
    expect(content.footer.pills).toHaveLength(6);
    expect(content.publicPages.about.seoTitle).toBe("Custom About Title");
    expect(content.publicPages.about.sections[0].title).toBe("Custom section title");
    expect(content.publicPages.faq.faqItems).toHaveLength(6);
  });

  it("replaces legacy earn-focused homepage copy with trading defaults", () => {
    const content = normalizeWebsiteContent(
      JSON.stringify({
        hero: {
          title: "The smarter way to trade and earn.",
          description:
            "Start trading in seconds. Practice with demo, learn how the market moves, and place trades with speed and full control.",
          primaryButtonLabel: "Create account",
          secondaryButtonLabel: "Open demo account",
          trustItems: ["Instant demo access", "Responsive mobile terminal", "Secure funding workflow"],
        },
      }),
      "Init Option",
    );

    expect(content.hero.title).toBe("Init Option trading platform for market analysis, demo access, and fast withdrawals.");
    expect(content.hero.description).toContain("real-time charts");
    expect(content.hero.trustItems).toContain("Fast withdrawals and secure funding options");
  });
});
