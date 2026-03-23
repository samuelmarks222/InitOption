import { describe, expect, it } from "vitest";
import { getClampedPriceAt } from "@/lib/deterministicMarket";
import { simulateDeterministicTickPrice } from "@/components/trading/engine/marketDataFeed";

describe("simulateDeterministicTickPrice", () => {
  it("keeps the fallback feed two-sided while tracking the anchor trend", () => {
    const symbol = "GBP/USD";
    const basePrice = 1.2745;
    const timeframeSeconds = 1;
    const startTime = 1_711_111_100;
    let price = getClampedPriceAt({
      symbol,
      basePrice,
      timestamp: startTime,
      category: "OTC",
    });
    let velocity = 0;
    let upMoves = 0;
    let downMoves = 0;

    for (let index = 1; index <= 180; index += 1) {
      const timestamp = startTime + index * 0.04;
      const anchorPrice = getClampedPriceAt({
        symbol,
        basePrice,
        timestamp,
        category: "OTC",
      });
      const nextTick = simulateDeterministicTickPrice({
        symbol,
        basePrice,
        timeframeSeconds,
        timestamp,
        previousPrice: price,
        anchorPrice,
        velocity,
      });

      if (nextTick.price > price) upMoves += 1;
      if (nextTick.price < price) downMoves += 1;

      price = nextTick.price;
      velocity = nextTick.velocity;
    }

    const endingAnchor = getClampedPriceAt({
      symbol,
      basePrice,
      timestamp: startTime + 180 * 0.04,
      category: "OTC",
    });

    expect(upMoves).toBeGreaterThan(20);
    expect(downMoves).toBeGreaterThan(20);
    expect(Math.abs(price - endingAnchor)).toBeLessThan(basePrice * 0.0015);
  });
});
