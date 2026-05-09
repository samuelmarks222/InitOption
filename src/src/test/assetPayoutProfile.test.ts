import { describe, expect, it } from "vitest";
import { getDynamicAssetPayoutProfile } from "@/lib/assets";

describe("dynamic asset payout profile", () => {
  it("keeps payouts within the configured platform bounds", () => {
    const profile = getDynamicAssetPayoutProfile({
      symbol: "BTC/USD",
      category: "CRYPTO",
      basePayout: 87,
      timestampSec: 1_711_111_111,
      marketBiasPercent: 6.4,
    });

    expect(profile.profit1m).toBeGreaterThanOrEqual(60);
    expect(profile.profit1m).toBeLessThanOrEqual(95);
    expect(profile.profit5m).toBeGreaterThanOrEqual(60);
    expect(profile.profit5m).toBeLessThanOrEqual(95);
  });

  it("creates different payout levels for different assets at the same time", () => {
    const timestampSec = 1_711_111_111;
    const forex = getDynamicAssetPayoutProfile({
      symbol: "EUR/USD",
      category: "OTC",
      basePayout: 85,
      timestampSec,
    });
    const crypto = getDynamicAssetPayoutProfile({
      symbol: "BTC/USD",
      category: "CRYPTO",
      basePayout: 85,
      timestampSec,
    });

    expect(forex.profit1m).not.toBe(crypto.profit1m);
  });

  it("moves payout over time for the same asset instead of staying fixed", () => {
    const initial = getDynamicAssetPayoutProfile({
      symbol: "AUD/CAD",
      category: "OTC",
      basePayout: 85,
      timestampSec: 1_711_111_111,
    });
    const later = getDynamicAssetPayoutProfile({
      symbol: "AUD/CAD",
      category: "OTC",
      basePayout: 85,
      timestampSec: 1_711_111_231,
    });

    expect(initial.profit1m).not.toBe(later.profit1m);
  });
});
