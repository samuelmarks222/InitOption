import { describe, expect, it } from "vitest";
import {
  calculateCopyAmount,
  computeTraderAverageReturn,
  computeTraderWinRate,
} from "@/lib/social";

describe("social helpers", () => {
  it("calculates ratio-based copy amounts and respects max per trade", () => {
    expect(
      calculateCopyAmount(100, {
        amount_type: "ratio",
        fixed_amount: null,
        ratio: 0.5,
        max_per_trade: 40,
      }),
    ).toBe(40);
  });

  it("calculates fixed copy amounts and enforces a minimum of one dollar", () => {
    expect(
      calculateCopyAmount(100, {
        amount_type: "fixed",
        fixed_amount: 0,
        ratio: null,
        max_per_trade: null,
      }),
    ).toBe(1);
  });

  it("derives trader stats safely when totals are missing", () => {
    expect(computeTraderWinRate(undefined, undefined)).toBe(0);
    expect(computeTraderAverageReturn(undefined, undefined)).toBe(0);
    expect(computeTraderWinRate(18, 24)).toBe(75);
    expect(computeTraderAverageReturn(240, 12)).toBe(20);
  });
});
