import { describe, expect, it } from "vitest";
import { injectPlatformMetadataIntoHtml, renderPlatformHeadMarkup } from "@/lib/serverPlatformMetadata";

describe("serverPlatformMetadata", () => {
  it("renders SEO head tags from platform settings", () => {
    const markup = renderPlatformHeadMarkup(
      {
        platform_name: "Init Option",
        site_title: "Init Option - Binary Options Trading",
        meta_description: "Trade with live and demo access.",
        meta_keywords: "binary options, otc",
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

    expect(markup).toContain("<title>Init Option - Binary Options Trading</title>");
    expect(markup).toContain('meta name="keywords" content="binary options, otc"');
    expect(markup).toContain('meta property="og:image" content="https://cdn.example.com/og.png"');
    expect(markup).toContain('meta name="theme-color" content="#121f27"');
    expect(markup).toContain('link rel="canonical" href="https://initoption.example/trade"');
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
    expect(html).toContain('<meta name="platform-metadata-start" content="true">');
    expect(html).toContain('<meta name="platform-metadata-end" content="true">');
  });
});
