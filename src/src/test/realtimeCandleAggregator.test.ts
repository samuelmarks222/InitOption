import { describe, expect, it } from "vitest";
import { CandleAggregator } from "@/components/trading/CandleAggregator";
import type { OHLCCandle } from "@/components/trading/engine/priceEngine";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("CandleAggregator", () => {
  it("builds OHLC candles from live ticks", async () => {
    const closed: OHLCCandle[] = [];
    const updates: OHLCCandle[] = [];
    const updateTimestamps: number[] = [];
    const baseTime = Math.floor(Date.now() / 1000 / 60) * 60;
    const aggregator = new CandleAggregator(
      60,
      (candle) => closed.push(candle),
      (candle, sourceTimestamp) => {
        updates.push(candle);
        updateTimestamps.push(sourceTimestamp ?? Number.NaN);
      },
    );

    aggregator.onTick({ timestamp: baseTime + 0.1, price: 100 });
    aggregator.onTick({ timestamp: baseTime + 0.2, price: 102 });
    aggregator.onTick({ timestamp: baseTime + 0.3, price: 99 });
    aggregator.onTick({ timestamp: baseTime + 0.4, price: 101 });
    await wait(25);

    expect(closed).toHaveLength(0);
    expect(aggregator.getCurrentCandle()).toMatchObject({
      time: baseTime,
      open: 100,
      high: 102,
      low: 99,
      close: 101,
      volume: 4,
    });
    expect(updates.at(-1)).toMatchObject({
      time: baseTime,
      close: 101,
    });
    expect(updateTimestamps.at(-1)).toBe(baseTime + 0.4);

    aggregator.destroy();
  });

  it("closes candles on the timeframe boundary even without a new tick", async () => {
    const closed: OHLCCandle[] = [];
    const updates: OHLCCandle[] = [];
    const updateTimestamps: number[] = [];
    const nowSeconds = Date.now() / 1000;
    const candleStart = Math.floor(nowSeconds);
    const waitMs = Math.max(0, (candleStart + 1 - nowSeconds) * 1000) + 40;

    const aggregator = new CandleAggregator(
      1,
      (candle) => closed.push(candle),
      (candle, sourceTimestamp) => {
        updates.push(candle);
        updateTimestamps.push(sourceTimestamp ?? Number.NaN);
      },
    );

    aggregator.setSeedCandle(
      {
        time: candleStart,
        open: 1.0842,
        high: 1.0848,
        low: 1.0837,
        close: 1.0845,
        volume: 12,
      },
      nowSeconds,
    );

    await wait(waitMs);

    expect(closed).toHaveLength(1);
    expect(closed[0]).toMatchObject({
      time: candleStart,
      close: 1.0845,
    });
    expect(aggregator.getCurrentCandle()).toMatchObject({
      time: candleStart + 1,
      open: 1.0845,
      high: 1.0845,
      low: 1.0845,
      close: 1.0845,
      volume: 0,
    });
    expect(updates.at(-1)).toMatchObject({
      time: candleStart + 1,
      close: 1.0845,
    });
    expect(updateTimestamps.at(-1)).toBeGreaterThanOrEqual(candleStart + 1);

    aggregator.destroy();
  });

  it("fills missing periods with flat candles before applying a later tick", async () => {
    const closed: OHLCCandle[] = [];
    const currentBucket = Math.floor(Date.now() / 1000 / 60) * 60;
    const firstBucket = currentBucket - 3 * 60;
    const aggregator = new CandleAggregator(
      60,
      (candle) => closed.push(candle),
      () => undefined,
    );

    aggregator.onTick({ timestamp: firstBucket + 0.25, price: 100 });
    aggregator.onTick({ timestamp: currentBucket + 0.25, price: 101 });
    await wait(25);

    expect(closed.map((candle) => candle.time)).toEqual([
      firstBucket,
      firstBucket + 60,
      firstBucket + 120,
    ]);
    expect(closed.map((candle) => candle.close)).toEqual([100, 100, 100]);
    expect(aggregator.getCurrentCandle()).toMatchObject({
      time: currentBucket,
      open: 100,
      high: 101,
      low: 100,
      close: 101,
      volume: 1,
    });

    aggregator.destroy();
  });
});
