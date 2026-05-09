import { describe, expect, it } from "vitest";
import { getClampedPriceAt } from "@/lib/deterministicMarket";
import {
  replayDeterministicTickState,
  simulateDeterministicTickPrice,
} from "@/components/trading/engine/marketDataFeed";
import { OTCPriceEngine, TIMEFRAMES } from "@/components/trading/engine/priceEngine";

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

  it("keeps the same underlying tick path regardless of selected chart timeframe", () => {
    const sharedInput = {
      symbol: "EUR/USD",
      basePrice: 1.08452,
      timestamp: 1_711_111_245.32,
      previousPrice: 1.08464,
      anchorPrice: 1.08459,
      velocity: 0.000012,
    };

    const oneSecondTick = simulateDeterministicTickPrice({
      ...sharedInput,
      timeframeSeconds: 1,
    });
    const fiveSecondTick = simulateDeterministicTickPrice({
      ...sharedInput,
      timeframeSeconds: 5,
    });
    const fifteenSecondTick = simulateDeterministicTickPrice({
      ...sharedInput,
      timeframeSeconds: 15,
    });

    expect(oneSecondTick).toEqual(fiveSecondTick);
    expect(oneSecondTick).toEqual(fifteenSecondTick);
  });

  it("creates readable 1s candles with intrabar wick movement", () => {
    const symbol = "EUR/USD";
    const basePrice = 1.08452;
    const timeframeSeconds = 1;
    const tickIntervalSeconds = 0.04;
    const startTime = 1_711_111_200;
    let price = getClampedPriceAt({
      symbol,
      basePrice,
      timestamp: startTime,
      category: "OTC",
    });
    let velocity = 0;
    const candles = new Map<
      number,
      { open: number; high: number; low: number; close: number }
    >();

    for (let index = 1; index <= 300; index += 1) {
      const timestamp = startTime + index * tickIntervalSeconds;
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
      const bucketStart = Math.floor(timestamp / timeframeSeconds) * timeframeSeconds;
      const existing = candles.get(bucketStart);

      if (existing) {
        existing.high = Math.max(existing.high, nextTick.price);
        existing.low = Math.min(existing.low, nextTick.price);
        existing.close = nextTick.price;
      } else {
        candles.set(bucketStart, {
          open: nextTick.price,
          high: nextTick.price,
          low: nextTick.price,
          close: nextTick.price,
        });
      }

      price = nextTick.price;
      velocity = nextTick.velocity;
    }

    const completedCandles = Array.from(candles.entries())
      .sort((left, right) => left[0] - right[0])
      .slice(0, -1)
      .map(([, candle]) => candle);
    const topWicks = completedCandles.map(
      (candle) => candle.high - Math.max(candle.open, candle.close),
    );
    const bottomWicks = completedCandles.map(
      (candle) => Math.min(candle.open, candle.close) - candle.low,
    );
    const bodies = completedCandles.map((candle) => Math.abs(candle.close - candle.open));
    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
    const priceStep = 0.00001;
    const wickCoverage =
      completedCandles.filter((_, index) => topWicks[index] > 0 || bottomWicks[index] > 0).length /
      completedCandles.length;

    expect(average(topWicks)).toBeGreaterThan(priceStep * 0.2);
    expect(average(bottomWicks)).toBeGreaterThan(priceStep * 0.2);
    expect(wickCoverage).toBeGreaterThanOrEqual(0.3);
    expect(average(topWicks)).toBeLessThan(average(bodies) * 0.58);
    expect(average(bottomWicks)).toBeLessThan(average(bodies) * 0.58);
  });

  it("rebuilds the live candle from the same deterministic tick path used after refresh", () => {
    const symbol = "USD/IDR (OTC)";
    const basePrice = 17039.1;
    const timeframe = TIMEFRAMES["1m"];
    const timestamp = 1_711_111_245.32;
    const engine = new OTCPriceEngine(symbol, basePrice, "OTC");
    const bucketStart = Math.floor(timestamp / timeframe.seconds) * timeframe.seconds;
    const tickIntervalSeconds = Math.max(0.025, Math.max(25, timeframe.updateIntervalMs) / 1000);
    const openingPrice = engine.getCurrentPriceAt(bucketStart);
    const expectedCandle = {
      time: bucketStart,
      open: openingPrice,
      high: openingPrice,
      low: openingPrice,
      close: openingPrice,
      volume: 0,
    };

    let price = openingPrice;
    let velocity = 0;
    let replayTime = bucketStart + tickIntervalSeconds;
    let lastReplayTimestamp = bucketStart;

    while (replayTime < timestamp) {
      const anchorPrice = engine.getCurrentPriceAt(replayTime);
      const nextTick = simulateDeterministicTickPrice({
        symbol,
        basePrice,
        timeframeSeconds: timeframe.seconds,
        timestamp: replayTime,
        previousPrice: price,
        anchorPrice,
        velocity,
      });

      price = nextTick.price;
      velocity = nextTick.velocity;
      expectedCandle.high = Math.max(expectedCandle.high, price);
      expectedCandle.low = Math.min(expectedCandle.low, price);
      expectedCandle.close = price;
      expectedCandle.volume += 1;
      lastReplayTimestamp = replayTime;
      replayTime += tickIntervalSeconds;
    }

    if (timestamp > lastReplayTimestamp) {
      const anchorPrice = engine.getCurrentPriceAt(timestamp);
      const nextTick = simulateDeterministicTickPrice({
        symbol,
        basePrice,
        timeframeSeconds: timeframe.seconds,
        timestamp,
        previousPrice: price,
        anchorPrice,
        velocity,
      });

      price = nextTick.price;
      velocity = nextTick.velocity;
      expectedCandle.high = Math.max(expectedCandle.high, price);
      expectedCandle.low = Math.min(expectedCandle.low, price);
      expectedCandle.close = price;
      expectedCandle.volume += 1;
    }

    const replay = replayDeterministicTickState({
      symbol,
      basePrice,
      timeframe,
      timestamp,
      assetCategory: "OTC",
    });

    expect(replay.candle).toEqual(expectedCandle);
    expect(replay.price).toBe(price);
    expect(replay.velocity).toBe(velocity);
  });
});
