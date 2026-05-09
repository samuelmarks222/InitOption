import { describe, expect, it } from "vitest";
import { calcEnvelopes, calcFractal } from "@/components/trading/indicators/customIndicators";
import { calculateIndicator } from "@/components/trading/indicators/engine";
import type { OHLCCandle } from "@/components/trading/engine/priceEngine";
import type { ActiveIndicator } from "@/components/trading/indicators/types";

const buildOverlayIndicator = (
  configId: ActiveIndicator["configId"],
  params: ActiveIndicator["params"],
): ActiveIndicator => ({
  instanceId: `${configId}-test`,
  configId,
  name: configId,
  pane: "overlay",
  params,
  visible: true,
});

describe("indicator math alignment", () => {
  it("treats envelopes deviation as a Quotex-style percent input", () => {
    const result = calcEnvelopes([100, 100, 100], 1, 0.11, "SMA");

    expect(result[0]?.upper).toBeCloseTo(100.11, 5);
    expect(result[0]?.middle).toBeCloseTo(100, 5);
    expect(result[0]?.lower).toBeCloseTo(99.89, 5);
  });

  it("uses the selected source series when calculating envelopes", () => {
    const history: OHLCCandle[] = [
      { time: 1, open: 10.1, high: 10.5, low: 9.7, close: 10.2, volume: 100 },
      { time: 2, open: 10.2, high: 10.6, low: 9.8, close: 10.3, volume: 110 },
    ];
    const indicator = buildOverlayIndicator("envelopes", {
      period: 1,
      deviation: 0.11,
      method: "SMA",
      source: "low",
    });

    const outputs = calculateIndicator(indicator, history);
    const upper = outputs.find((output) => output.id === "upper")?.data ?? [];
    const lower = outputs.find((output) => output.id === "lower")?.data ?? [];

    expect(upper[0]?.value).toBeCloseTo(9.71067, 5);
    expect(lower[0]?.value).toBeCloseTo(9.68933, 5);
  });

  it("keeps fractal turning points as sparse swing markers", () => {
    const highs = [1, 2, 5, 2, 1, 2, 4, 2, 1];
    const lows = [2, 1.8, 1.6, 1.7, 0.5, 1.6, 1.7, 1.8, 2];
    const result = calcFractal(highs, lows, 2);

    expect(result.up.filter((value) => value !== null)).toEqual([5, 4]);
    expect(result.down.filter((value) => value !== null)).toEqual([0.5]);
  });

  it("builds zig zag pivots from high and low swings, not flat closes", () => {
    const history: OHLCCandle[] = [
      { time: 1, open: 1.0001, high: 1.0002, low: 0.9999, close: 1.0000, volume: 120 },
      { time: 2, open: 1.0000, high: 1.00035, low: 1.0000, close: 1.0000, volume: 120 },
      { time: 3, open: 1.0000, high: 1.0006, low: 1.00015, close: 1.0000, volume: 120 },
      { time: 4, open: 1.0000, high: 1.00032, low: 0.9997, close: 1.0000, volume: 120 },
      { time: 5, open: 1.0000, high: 1.0002, low: 0.9994, close: 1.0000, volume: 120 },
      { time: 6, open: 1.0000, high: 1.00052, low: 0.99982, close: 1.0000, volume: 120 },
      { time: 7, open: 1.0000, high: 1.00082, low: 1.0001, close: 1.0000, volume: 120 },
      { time: 8, open: 1.0000, high: 1.0003, low: 0.9995, close: 1.0000, volume: 120 },
      { time: 9, open: 1.0000, high: 1.00012, low: 0.9993, close: 1.0000, volume: 120 },
    ];
    const indicator = buildOverlayIndicator("zigzag", {
      deviation: 5,
      depth: 3,
      backstep: 2,
    });

    const output = calculateIndicator(indicator, history).find((entry) => entry.id === "zag");
    const pivotValues = (output?.data ?? []).map((point) => point.value);

    expect(pivotValues.length).toBeGreaterThanOrEqual(2);
    expect(pivotValues).toContain(1.00082);
    expect(Math.min(...pivotValues)).toBeLessThan(0.9995);
  });
});
