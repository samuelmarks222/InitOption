import { describe, expect, it } from "vitest";
import { getCandleStartTime, resolveFreshTradeMarkerTime } from "@/lib/tradeMarkerTime";

describe("resolveFreshTradeMarkerTime", () => {
  it("keeps a fresh chart marker time when it matches the trade open moment", () => {
    const openedAt = "2026-03-28T15:35:18.000Z";
    const result = resolveFreshTradeMarkerTime(1_774_712_118, openedAt);

    expect(result).toBe(1_774_712_118);
  });

  it("normalizes marker time to integer seconds", () => {
    const openedAt = "2026-03-28T15:35:18.420Z";
    const result = resolveFreshTradeMarkerTime(1_774_712_118.42, openedAt);

    expect(result).toBe(1_774_712_118);
  });

  it("keeps a candle-start marker when it is within the active timeframe window", () => {
    const openedAt = "2026-03-28T15:35:59.000Z";
    const result = resolveFreshTradeMarkerTime(1_774_712_100, openedAt, 60);

    expect(result).toBe(1_774_712_100);
  });

  it("falls back to opened_at when the chart marker time is stale", () => {
    const openedAt = "2026-03-28T15:35:18.000Z";
    const result = resolveFreshTradeMarkerTime(1_774_173_300, openedAt);

    expect(result).toBe(Math.floor(Date.parse(openedAt) / 1000));
  });

  it("falls back to the trade open time when no chart marker is available", () => {
    const openedAt = "2026-03-28T15:35:18.000Z";
    const result = resolveFreshTradeMarkerTime(null, openedAt);

    expect(result).toBe(Math.floor(Date.parse(openedAt) / 1000));
  });
});

describe("getCandleStartTime", () => {
  it("snaps a short-timeframe trade to the active candle start", () => {
    expect(getCandleStartTime(1_774_712_123, 30)).toBe(1_774_712_100);
    expect(getCandleStartTime(1_774_712_159, 60)).toBe(1_774_712_100);
  });
});
