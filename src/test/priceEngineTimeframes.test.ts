import { describe, expect, it } from "vitest";
import {
  SUPPORTED_CHART_TIMEFRAMES,
  TIMEFRAMES,
} from "@/components/trading/engine/priceEngine";

describe("supported chart timeframes", () => {
  it("matches the trading chart contract", () => {
    expect(SUPPORTED_CHART_TIMEFRAMES).toEqual([
      "1m",
      "2m",
      "3m",
      "4m",
      "5m",
      "10m",
      "15m",
      "30m",
      "1h",
      "2h",
    ]);
  });

  it("keeps timeframe durations accurate in seconds", () => {
    expect(TIMEFRAMES["1m"].seconds).toBe(60);
    expect(TIMEFRAMES["5m"].seconds).toBe(300);
    expect(TIMEFRAMES["10m"].seconds).toBe(600);
    expect(TIMEFRAMES["15m"].seconds).toBe(900);
    expect(TIMEFRAMES["30m"].seconds).toBe(1800);
    expect(TIMEFRAMES["1h"].seconds).toBe(3600);
    expect(TIMEFRAMES["2h"].seconds).toBe(7200);
  });
});
