import { describe, expect, it } from "vitest";
import {
  getAssetCommodityLogo,
  getAssetFlags,
  getAssetQuoteFlagCode,
  getAssetStockLogo,
  getCryptoLogoUrl,
  getStockLogoSources,
} from "@/lib/assets";

describe("asset logo sources", () => {
  it("returns a dedicated local commodity logo path", () => {
    expect(getAssetCommodityLogo("XAU/USD")).toBe("/asset-logos/commodities/gold.svg");
    expect(getAssetCommodityLogo("NATGAS/USD")).toBe("/asset-logos/commodities/gas.svg");
  });

  it("builds fallback stock logo sources from the company domain", () => {
    const sources = getStockLogoSources("AAPL", "https://logo.clearbit.com/apple.com");

    expect(sources).toContain("https://logo.clearbit.com/apple.com");
    expect(sources).toContain("https://www.google.com/s2/favicons?sz=128&domain_url=apple.com");
    expect(sources).toContain("https://icons.duckduckgo.com/ip3/apple.com.ico");
  });

  it("normalizes forex-style runtime symbols into real flag pairs", () => {
    expect(getAssetFlags("EUR/USD OTC")).toEqual(["EU", "US"]);
    expect(getAssetFlags("EUR/USD (OTC)")).toEqual(["EU", "US"]);
  });

  it("uses the base asset logo for quoted crypto pairs", () => {
    expect(getCryptoLogoUrl("BTC/USD")).toBe("https://assets.coincap.io/assets/icons/btc@2x.png");
    expect(getAssetQuoteFlagCode("BTC/USD")).toBe("US");
  });

  it("resolves stock logos from quoted stock pairs", () => {
    expect(getAssetStockLogo("AAPL/USD")).toBe("https://logo.clearbit.com/apple.com");
  });

  it("keeps local commodity artwork for quoted commodities", () => {
    expect(getAssetCommodityLogo("XAU/USD OTC")).toBe("/asset-logos/commodities/gold.svg");
  });
});
