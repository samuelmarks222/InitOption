/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PLATFORM_NAME,
  SITE_PLATFORM_NAME_STORAGE_KEY,
  applyPlatformSettingsToDocument,
  resolveSeoMetadata,
} from "@/lib/platformMetadata";

describe("platform metadata", () => {
  beforeEach(() => {
    const storage = (() => {
      let values: Record<string, string> = {};

      return {
        getItem: (key: string) => values[key] ?? null,
        setItem: (key: string, value: string) => {
          values[key] = value;
        },
        removeItem: (key: string) => {
          delete values[key];
        },
        clear: () => {
          values = {};
        },
      };
    })();

    Object.defineProperty(window, "localStorage", {
      value: storage,
      configurable: true,
    });

    document.head.innerHTML = '<meta name="description" content=""><link rel="icon" href="/favicon.ico">';
    document.documentElement.removeAttribute("data-platform-name");
    document.title = DEFAULT_PLATFORM_NAME;
    window.localStorage.clear();
  });

  it("resolves SEO fallbacks from the platform name", () => {
    const resolved = resolveSeoMetadata(
      {
        platform_name: "Init Option",
        site_title: "",
        meta_description: "",
        twitter_card_type: "summary",
      },
      "https://initoption.example/trade?asset=eurusd#chart",
    );

    expect(resolved.siteTitle).toBe("Init Option");
    expect(resolved.metaDescription).toContain("Init Option");
    expect(resolved.canonicalUrl).toBe("https://initoption.example/trade");
    expect(resolved.twitterCardType).toBe("summary");
  });

  it("keeps indexable public routes self-canonical when a global canonical points elsewhere", () => {
    const resolved = resolveSeoMetadata(
      {
        platform_name: "Init Option",
        canonical_url: "https://initoption.example/login",
        robots_directive: "noindex, follow",
      },
      "https://initoption.example/",
    );

    expect(resolved.canonicalUrl).toBe("https://initoption.example/");
    expect(resolved.robotsDirective).toBe("index, follow");
  });

  it("applies head tags, branding state, and custom meta tags", () => {
    applyPlatformSettingsToDocument(
      {
        platform_name: "Init Option",
        site_title: "Init Option - Trading Platform",
        meta_description: "Trade financial markets with a demo balance and live market access.",
        meta_keywords: "trading, financial markets",
        og_title: "Init Option Social",
        og_description: "Social preview description",
        og_image_url: "https://cdn.example.com/og.png",
        twitter_card_type: "summary_large_image",
        twitter_title: "Init Option on X",
        twitter_description: "Twitter description",
        twitter_image_url: "https://cdn.example.com/twitter.png",
        canonical_url: "https://initoption.example/",
        robots_directive: "index, follow",
        custom_meta_tags: '[{"name":"theme-color","content":"#121f27"}]',
      },
      "https://initoption.example/",
    );

    expect(document.title).toBe("Init Option - Trading Platform");
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
      "Trade financial markets with a demo balance and live market access.",
    );
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe("Init Option Social");
    expect(document.querySelector('meta[property="og:locale"]')?.getAttribute("content")).toBe("en_US");
    expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute("content")).toBe(
      "https://cdn.example.com/twitter.png",
    );
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#121f27");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://initoption.example/");
    expect(document.querySelector('link[rel="sitemap"]')?.getAttribute("href")).toBe("/sitemap.xml");
    expect(window.localStorage.getItem(SITE_PLATFORM_NAME_STORAGE_KEY)).toBe("Init Option");
  });
});
