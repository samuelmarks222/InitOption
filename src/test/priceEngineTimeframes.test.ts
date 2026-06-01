import { describe, expect, it } from "vitest";
import {
  SUPPORTED_CHART_TIMEFRAMES,
  TIMEFRAMES,
} from "@/components/trading/engine/priceEngine";

describe("supported chart timeframes", () => {
  it("matches the trading chart contract", () => {
    expect(SUPPORTED_CHART_TIMEFRAMES).toEqual([
      "5s",
      "10s",
      "15s",
      "30s",
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
      "3h",
      "4h",
      "12h",
      "1D",
    ]);
  });

  it("keeps timeframe durations accurate in seconds", () => {
    expect(TIMEFRAMES["1s"].seconds).toBe(1);
    expect(TIMEFRAMES["5s"].seconds).toBe(5);
    expect(TIMEFRAMES["10s"].seconds).toBe(10);
    expect(TIMEFRAMES["15s"].seconds).toBe(15);
    expect(TIMEFRAMES["30s"].seconds).toBe(30);
    expect(TIMEFRAMES["1m"].seconds).toBe(60);
    expect(TIMEFRAMES["5m"].seconds).toBe(300);
    expect(TIMEFRAMES["10m"].seconds).toBe(600);
    expect(TIMEFRAMES["15m"].seconds).toBe(900);
    expect(TIMEFRAMES["30m"].seconds).toBe(1800);
    expect(TIMEFRAMES["1h"].seconds).toBe(3600);
    expect(TIMEFRAMES["2h"].seconds).toBe(7200);
    expect(TIMEFRAMES["3h"].seconds).toBe(10800);
    expect(TIMEFRAMES["4h"].seconds).toBe(14400);
    expect(TIMEFRAMES["12h"].seconds).toBe(43200);
    expect(TIMEFRAMES["1D"].seconds).toBe(86400);
  });
});
