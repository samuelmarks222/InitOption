import { describe, expect, it } from "vitest";
import {
  getTradeDisplayTimes,
  getTradeMarkerCoordinate,
  getTradeMarkerLogicalTime,
  getTradeProgress,
} from "@/components/trading/TradeMarkersOverlay";

describe("getTradeDisplayTimes", () => {
  it("anchors active trade lines to the captured chart marker time before opened_at", () => {
    const result = getTradeDisplayTimes(
      {
        marker_time: 1_710_000_123,
        opened_at: "2026-03-27T14:00:00.000Z",
        expiry_seconds: 60,
      },
      1_710_000_150,
    );

    expect(result.entryTime).toBe(1_710_000_123);
    expect(result.expiryTime).toBe(result.entryTime + 60);
    expect(result.activeLineEndTime).toBe(1_710_000_150);
  });

  it("falls back to opened_at and stops the active line at expiry", () => {
    const result = getTradeDisplayTimes(
      {
        opened_at: "2026-03-27T14:00:00.000Z",
        expiry_seconds: 45,
      },
      1_775_000_000,
    );

    expect(result.entryTime).toBe(Math.floor(Date.parse("2026-03-27T14:00:00.000Z") / 1000));
    expect(result.activeLineEndTime).toBe(result.expiryTime);
  });

  it("grows the active marker width progressively until expiry", () => {
    expect(getTradeProgress(100, 160, 100)).toBe(0);
    expect(getTradeProgress(100, 160, 130)).toBeCloseTo(0.5, 5);
    expect(getTradeProgress(100, 160, 160)).toBe(1);
    expect(getTradeProgress(100, 160, 200)).toBe(1);
  });
});

describe("getTradeMarkerLogicalTime", () => {
  it("interpolates higher timeframes inside the containing candle so markers keep the real entry time", () => {
    const logical = getTradeMarkerLogicalTime(
      [
        { time: 3_600, logical: 0 },
        { time: 7_200, logical: 1 },
        { time: 10_800, logical: 2 },
      ],
      10_980,
      3_600,
    );

    expect(logical).not.toBeNull();
    expect(logical!).toBeGreaterThan(2);
    expect(logical!).toBeLessThan(2.1);
  });

  it("keeps minute charts inside the live candle instead of jumping into the next candle gap", () => {
    const logical = getTradeMarkerLogicalTime(
      [
        { time: 1_000, logical: 10 },
        { time: 1_060, logical: 11 },
        { time: 1_120, logical: 12 },
      ],
      1_045,
      60,
    );

    expect(logical).not.toBeNull();
    expect(logical!).toBeGreaterThan(10);
    expect(logical!).toBeLessThan(10.5);
  });

  it("anchors short timeframes to the correct candle bucket even when using the live candle", () => {
    const logical = getTradeMarkerLogicalTime(
      [
        { time: 1_000, logical: 10 },
        { time: 1_060, logical: 11 },
        { time: 1_120, logical: 12 },
      ],
      1_123,
      60,
    );

    expect(logical).not.toBeNull();
    expect(logical!).toBeGreaterThan(11.45);
    expect(logical!).toBeLessThan(12.1);
  });

  it("places short-timeframe entries in the previous candle when the trade opened before the live bucket", () => {
    const logical = getTradeMarkerLogicalTime(
      [
        { time: 1_000, logical: 10 },
        { time: 1_060, logical: 11 },
        { time: 1_120, logical: 12 },
      ],
      1_095,
      60,
    );

    expect(logical).not.toBeNull();
    expect(logical!).toBeGreaterThan(10.8);
    expect(logical!).toBeLessThan(11.3);
  });

  it("locks an exact candle-start trade to that candle instead of shifting it left", () => {
    const logical = getTradeMarkerLogicalTime(
      [
        { time: 1_020, logical: 10 },
        { time: 1_080, logical: 11 },
        { time: 1_140, logical: 12 },
      ],
      1_080,
      60,
    );

    expect(logical).toBe(11);
  });
});

describe("getTradeMarkerCoordinate", () => {
  it("prefers logical intrabar placement on short timeframes even if direct time coordinates are misleading", () => {
    const chart = {
      timeScale: () => ({
        timeToCoordinate: () => 0,
        logicalToCoordinate: (logical: number) => logical * 100,
      }),
    } as never;

    const coordinate = getTradeMarkerCoordinate(
      chart,
      [
        { time: 1_000, logical: 10 },
        { time: 1_060, logical: 11 },
        { time: 1_120, logical: 12 },
      ],
      1_123,
      60,
    );

    expect(coordinate).not.toBeNull();
    expect(coordinate!).toBeGreaterThan(1_100);
  });
});
