import { describe, expect, it } from "vitest";
import { injectPlatformMetadataIntoHtml, renderPlatformHeadMarkup } from "@/lib/serverPlatformMetadata";
import { toTournamentStructuredData } from "@/lib/publicTournaments";

describe("serverPlatformMetadata", () => {
  it("renders SEO head tags from platform settings", () => {
    const markup = renderPlatformHeadMarkup(
      {
        platform_name: "Init Option",
        site_title: "Init Option - Trading Platform",
        meta_description: "Trade with live and demo access.",
        meta_keywords: "trading, financial markets",
        og_title: "Init Option Social",
        og_description: "Social description",
        og_image_url: "https://cdn.example.com/og.png",
        twitter_card_type: "summary_large_image",
        twitter_title: "Init Option on X",
        twitter_description: "Twitter description",
        twitter_image_url: "https://cdn.example.com/twitter.png",
        canonical_url: "",
        favicon_url: "https://cdn.example.com/favicon.ico",
        custom_meta_tags: '[{"name":"theme-color","content":"#121f27"}]',
      },
      "https://initoption.example/trade?asset=eurusd#chart",
    );

    expect(markup).toContain("<title>Init Option - Trading Platform</title>");
    expect(markup).toContain('meta name="keywords" content="trading, financial markets"');
    expect(markup).toContain('meta property="og:image" content="https://cdn.example.com/og.png"');
    expect(markup).toContain('meta name="theme-color" content="#121f27"');
    expect(markup).toContain('meta property="og:locale" content="en_US"');
    expect(markup).toContain('link rel="canonical" href="https://initoption.example/trade"');
    expect(markup).toContain('link rel="icon" type="image/png" href="https://cdn.example.com/favicon.ico"');
    expect(markup).toContain('link rel="apple-touch-icon" href="https://cdn.example.com/favicon.ico"');
    expect(markup).toContain('link rel="alternate" hreflang="en" href="https://initoption.example/trade"');
    expect(markup).toContain('link rel="sitemap" type="application/xml" href="/sitemap.xml"');
  });

  it("injects server-rendered metadata into the template marker block", () => {
    const template = `<!doctype html><html><head><meta charset="UTF-8"><meta name="platform-metadata-start" content="true"><title>Init Option</title><meta name="platform-metadata-end" content="true"></head><body><div id="root"></div></body></html>`;
    const html = injectPlatformMetadataIntoHtml(
      template,
      {
        platform_name: "Init Option",
        site_title: "Init Option - Trading",
        meta_description: "Trade the OTC market.",
      },
      "https://initoption.example/",
    );

    expect(html).toContain("<title>Init Option - Trading</title>");
    expect(html).toContain('meta name="description" content="Trade the OTC market."');
    expect(html).toContain('meta property="og:image" content="https://initoption.example/apple-touch-icon.png"');
    expect(html).toContain('link rel="icon" type="image/png" href="https://initoption.example/favicon.ico"');
    expect(html).toContain('<meta name="platform-metadata-start" content="true">');
    expect(html).toContain('<meta name="platform-metadata-end" content="true">');
  });

  it("renders tournament Event schema when route context is provided", () => {
    const markup = renderPlatformHeadMarkup(
      {
        platform_name: "Init Option",
        site_title: "Init Option",
        meta_description: "Trade the OTC market.",
      },
      "https://initoption.example/tournaments/monday-momentum-1234abcd",
      {
        routeOverride: {
          siteTitle: "Monday Momentum Tournament | Init Option",
          metaDescription: "Tournament detail page",
          robotsDirective: "index, follow",
        },
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
    );

    expect(markup).toContain("Monday Momentum Tournament | Init Option");
    expect(markup).toContain('"@type":"Event"');
  });
});
