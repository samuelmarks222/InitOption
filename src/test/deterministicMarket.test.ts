import { describe, expect, it } from "vitest";
import { getDeterministicPriceAt } from "@/lib/deterministicMarket";
import { OTCPriceEngine, TIMEFRAMES } from "@/components/trading/engine/priceEngine";

describe("deterministic market feed", () => {
  it("returns the same price for the same asset and timestamp", () => {
    const timestamp = 1_711_111_111;
    const firstPrice = getDeterministicPriceAt({
      symbol: "GBP/USD",
      basePrice: 1.2745,
      timestamp,
      category: "OTC",
    });
    const secondPrice = getDeterministicPriceAt({
      symbol: "GBP/USD",
      basePrice: 1.2745,
      timestamp,
      category: "OTC",
    });

    expect(firstPrice).toBe(secondPrice);
  });

  it("keeps 5m candles aligned with the underlying 1m candles", () => {
    const nowSec = 1_711_111_111;
    const engine = new OTCPriceEngine("GBP/USD", 1.2745);
    const minuteHistory = engine.generateHistory(TIMEFRAMES["1m"], nowSec);
    const fiveMinuteHistory = engine.generateHistory(TIMEFRAMES["5m"], nowSec);
    const lastFiveMinuteCandle = fiveMinuteHistory[fiveMinuteHistory.length - 1];
    const sourceMinuteCandles = minuteHistory.filter(
      (candle) => Math.floor(candle.time / TIMEFRAMES["5m"].seconds) * TIMEFRAMES["5m"].seconds === lastFiveMinuteCandle.time,
    );

    expect(sourceMinuteCandles).toHaveLength(5);
    expect(lastFiveMinuteCandle.open).toBe(sourceMinuteCandles[0].open);
    expect(lastFiveMinuteCandle.close).toBe(sourceMinuteCandles[sourceMinuteCandles.length - 1].close);
    expect(lastFiveMinuteCandle.high).toBe(Math.max(...sourceMinuteCandles.map((candle) => candle.high)));
    expect(lastFiveMinuteCandle.low).toBe(Math.min(...sourceMinuteCandles.map((candle) => candle.low)));
  });

  it("keeps 1h candles aligned with the underlying 1m candles", () => {
    const nowSec = 1_711_111_111;
    const engine = new OTCPriceEngine("GBP/USD", 1.2745);
    const minuteHistory = engine.generateHistory(TIMEFRAMES["1m"], nowSec);
    const hourlyHistory = engine.generateHistory(TIMEFRAMES["1h"], nowSec);
    const lastHourlyCandle = hourlyHistory[hourlyHistory.length - 1];
    const sourceMinuteCandles = minuteHistory.filter(
      (candle) => Math.floor(candle.time / TIMEFRAMES["1h"].seconds) * TIMEFRAMES["1h"].seconds === lastHourlyCandle.time,
    );

    expect(sourceMinuteCandles).toHaveLength(60);
    expect(lastHourlyCandle.open).toBe(sourceMinuteCandles[0].open);
    expect(lastHourlyCandle.close).toBe(sourceMinuteCandles[sourceMinuteCandles.length - 1].close);
    expect(lastHourlyCandle.high).toBe(Math.max(...sourceMinuteCandles.map((candle) => candle.high)));
    expect(lastHourlyCandle.low).toBe(Math.min(...sourceMinuteCandles.map((candle) => candle.low)));
  });
});
