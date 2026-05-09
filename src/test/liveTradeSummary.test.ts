import { describe, expect, it } from "vitest";
import type { ActiveTrade } from "@/hooks/useTrading";
import { calculateLiveTradeResult, getLiveAssetTradeSummary } from "@/lib/liveTradeSummary";

const buildTrade = (overrides: Partial<ActiveTrade>): ActiveTrade => ({
  id: "trade-1",
  asset_symbol: "AUD/NZD (OTC)",
  direction: "higher",
  amount: 1,
  entry_price: 1,
  expiry_seconds: 60,
  payout_rate: 0.81,
  opened_at: "2026-03-24T00:00:00.000Z",
  timeLeft: 45,
  ...overrides,
});

describe("liveTradeSummary", () => {
  it("calculates the live result for a winning and losing position", () => {
    expect(calculateLiveTradeResult(buildTrade({ direction: "higher", entry_price: 10 }), 11)).toBe(0.81);
    expect(calculateLiveTradeResult(buildTrade({ direction: "higher", entry_price: 10 }), 9)).toBe(-1);
  });

  it("totals all open trades on the same asset into one live result", () => {
    const summary = getLiveAssetTradeSummary(
      [
        buildTrade({ id: "a", direction: "higher", entry_price: 10, amount: 1, payout_rate: 0.81, timeLeft: 12 }),
        buildTrade({ id: "b", direction: "higher", entry_price: 12, amount: 2, payout_rate: 0.81, timeLeft: 9 }),
        buildTrade({ id: "c", direction: "lower", entry_price: 13, amount: 2, payout_rate: 0.5, timeLeft: 25 }),
      ],
      11,
    );

    expect(summary.totalLiveResult).toBeCloseTo(-0.19, 5);
    expect(summary.netState).toBe("negative");
    expect(summary.tradeCount).toBe(3);
  });

  it("keeps the next expiring trade available for countdown display", () => {
    const summary = getLiveAssetTradeSummary(
      [
        buildTrade({ id: "later", timeLeft: 20 }),
        buildTrade({ id: "soonest", timeLeft: 5 }),
      ],
      2,
    );

    expect(summary.nextExpiringTrade?.id).toBe("soonest");
  });
});
