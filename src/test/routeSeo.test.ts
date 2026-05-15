import { describe, expect, it } from "vitest";
import { buildStructuredData, getRouteSeoOverride, getSitemapEntries } from "@/lib/routeSeo";
import { toTournamentStructuredData } from "@/lib/publicTournaments";
import { resolveSeoMetadata } from "@/lib/platformMetadata";

describe("route SEO", () => {
  it("marks private routes as noindex", () => {
    const override = getRouteSeoOverride("/trade", "Init Option");

    expect(override?.robotsDirective).toBe("noindex, nofollow");
  });

  it("applies public page SEO overrides for indexable content pages", () => {
    const resolved = resolveSeoMetadata(
      {
        platform_name: "Init Option",
        site_title: "",
        meta_description: "",
        canonical_url: "https://initoption.example/",
      },
      "https://initoption.example/about",
    );

    expect(resolved.siteTitle).toBe("About Init Option - Our Story & Mission");
    expect(resolved.metaDescription).toContain("Init Option");
    expect(resolved.robotsDirective).toBe("index, follow");
    expect(resolved.canonicalUrl).toBe("https://initoption.example/about");
  });

  it("applies the homepage SEO plan on the root route", () => {
    const override = getRouteSeoOverride("/", "Init Option");

    expect(override?.siteTitle).toBe("Init Option – Trading Platform: Free Demo, Live Trading & Fast Withdrawals");
    expect(override?.metaDescription).toContain("M-PESA and crypto funding");
    expect(override?.metaKeywords).toContain("Init Option");
  });

  it("marks the customer reviews route indexable", () => {
    const override = getRouteSeoOverride("/reviews", "Init Option");

    expect(override?.robotsDirective).toBe("index, follow");
    expect(override?.siteTitle).toBe("Customer Reviews | Init Option");
    expect(override?.metaDescription).toContain("customer reviews");
  });

  it("builds FAQ structured data for the public FAQ page", () => {
    const structuredData = buildStructuredData({
      currentHref: "https://initoption.example/faq",
      metaDescription: "Frequently asked questions for Init Option.",
      platformName: "Init Option",
      logoUrl: "https://initoption.example/share-icon.png",
      websiteContentRaw: JSON.stringify({
        publicPages: {
          faq: {
            faqItems: [
              {
                question: "Custom FAQ question?",
                answer: "Custom FAQ answer.",
              },
            ],
          },
        },
      }),
    });

    const faqEntry = structuredData.find((entry) => entry["@type"] === "FAQPage");

    expect(faqEntry).toBeTruthy();
    expect(JSON.stringify(faqEntry)).toContain("Custom FAQ question?");
  });

  it("builds a ContactPage schema for the public contact route", () => {
    const structuredData = buildStructuredData({
      currentHref: "https://initoption.example/contact",
      metaDescription: "Contact Init Option support.",
      platformName: "Init Option",
      logoUrl: "https://initoption.example/share-icon.png",
      supportEmail: "support@initoption.example",
      websiteContentRaw: JSON.stringify({
        socialLinks: {
          items: [
            {
              platform: "Telegram",
              url: "https://t.me/initoption",
            },
          ],
        },
      }),
    });

    const contactEntry = structuredData.find((entry) => entry["@type"] === "ContactPage");
    const organizationEntry = structuredData.find((entry) => entry["@type"] === "Organization") as
      | Record<string, unknown>
      | undefined;
    const websiteEntry = structuredData.find((entry) => entry["@type"] === "WebSite") as
      | Record<string, unknown>
      | undefined;

    expect(contactEntry).toBeTruthy();
    expect(organizationEntry?.email).toBe("support@initoption.example");
    expect(organizationEntry?.alternateName).toBe("InitOption");
    expect(websiteEntry?.alternateName).toBe("InitOption");
    expect(JSON.stringify(organizationEntry)).toContain("https://t.me/initoption");
  });

  it("builds Event structured data for tournament detail pages", () => {
    const structuredData = buildStructuredData({
      currentHref: "https://initoption.example/tournaments/monday-momentum-1234abcd",
      metaDescription: "Tournament detail page",
      platformName: "Init Option",
      logoUrl: "https://initoption.example/share-icon.png",
      seoContext: {
        tournament: toTournamentStructuredData({
          id: "1234abcd-0000-0000-0000-000000000000",
          title: "Monday Momentum",
          description: "A fast weekly challenge.",
          entry_fee: 10,
          rebuy_cost: 5,
          prize_pool: 500,
          starting_balance: 100,
          start_date: "2026-03-30T10:00:00.000Z",
          end_date: "2026-03-30T18:00:00.000Z",
          status: "upcoming",
          created_at: "2026-03-20T00:00:00.000Z",
          updated_at: "2026-03-20T00:00:00.000Z",
        }),
      },
    });

    expect(structuredData.some((entry) => entry["@type"] === "Event")).toBe(true);
  });

  it("adds Event structured data to the tournament listing page", () => {
    const tournament = toTournamentStructuredData({
      id: "1234abcd-0000-0000-0000-000000000000",
      title: "Monday Momentum",
      description: "A fast weekly challenge.",
      entry_fee: 10,
      rebuy_cost: 5,
      prize_pool: 500,
      starting_balance: 100,
      start_date: "2026-03-30T10:00:00.000Z",
      end_date: "2026-03-30T18:00:00.000Z",
      status: "upcoming",
      created_at: "2026-03-20T00:00:00.000Z",
      updated_at: "2026-03-20T00:00:00.000Z",
    });

    const structuredData = buildStructuredData({
      currentHref: "https://initoption.example/tournaments",
      metaDescription: "Tournament listing page",
      platformName: "Init Option",
      logoUrl: "https://initoption.example/share-icon.png",
      seoContext: {
        tournaments: [tournament],
      },
    });

    expect(structuredData.filter((entry) => entry["@type"] === "Event")).toHaveLength(1);
    expect(JSON.stringify(structuredData)).toContain("Monday Momentum Tournament");
  });

  it("includes core public pages in the sitemap entries", () => {
    const entries = getSitemapEntries("https://initoption.example", [
      {
        path: "/tournaments/monday-momentum-1234abcd",
        changefreq: "weekly",
        priority: "0.8",
      },
    ]);

    expect(entries.some((entry) => entry.url === "https://initoption.example/")).toBe(true);
    expect(entries.some((entry) => entry.url === "https://initoption.example/tournaments")).toBe(true);
    expect(entries.some((entry) => entry.url === "https://initoption.example/reviews")).toBe(true);
    expect(entries.some((entry) => entry.url === "https://initoption.example/tournaments/monday-momentum-1234abcd")).toBe(true);
    expect(entries.some((entry) => entry.url === "https://initoption.example/features")).toBe(true);
    expect(entries.some((entry) => entry.url === "https://initoption.example/why-choose-init-option")).toBe(true);
    expect(entries.some((entry) => entry.url === "https://initoption.example/trading-guide")).toBe(true);
    expect(entries.some((entry) => entry.url === "https://initoption.example/privacy")).toBe(true);
    expect(entries.some((entry) => entry.url === "https://initoption.example/contact")).toBe(true);
    expect(entries.some((entry) => entry.url === "https://initoption.example/blog")).toBe(true);
    expect(entries.some((entry) => entry.url === "https://initoption.example/delete-account")).toBe(true);
    expect(entries.some((entry) => entry.url === "https://initoption.example/site-map")).toBe(true);
  });
});
