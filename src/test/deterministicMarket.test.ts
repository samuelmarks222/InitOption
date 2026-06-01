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

  it("renders 30m and higher candles from their own smoother professional range", () => {
    const nowSec = 1_711_111_111;
    const engine = new OTCPriceEngine("GBP/USD", 1.2745);
    const thirtyMinuteHistory = engine.generateHistory(TIMEFRAMES["30m"], nowSec);
    const hourlyHistory = engine.generateHistory(TIMEFRAMES["1h"], nowSec);
    const dailyHistory = engine.generateHistory(TIMEFRAMES["1D"], nowSec);
    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
    const averageRange = (candles: typeof hourlyHistory) =>
      average(candles.slice(-40).map((candle) => candle.high - candle.low));
    const averageBody = (candles: typeof hourlyHistory) =>
      average(candles.slice(-40).map((candle) => Math.abs(candle.close - candle.open)));
    const lastHourlyCandle = hourlyHistory[hourlyHistory.length - 1];

    expect(thirtyMinuteHistory[thirtyMinuteHistory.length - 1].time % TIMEFRAMES["30m"].seconds).toBe(0);
    expect(lastHourlyCandle.time % TIMEFRAMES["1h"].seconds).toBe(0);
    expect(dailyHistory[dailyHistory.length - 1].time % TIMEFRAMES["1D"].seconds).toBe(0);
    expect(averageRange(hourlyHistory)).toBeLessThan(averageRange(thirtyMinuteHistory) * 2.2);
    expect(averageRange(dailyHistory)).toBeLessThan(1.2745 * 0.09);
    expect(averageRange(hourlyHistory)).toBeGreaterThan(averageBody(hourlyHistory));
  });

  it("gives OTC histories enough vertical travel to fill the visible chart", () => {
    const nowSec = 1_711_111_111;
    const basePrice = 1.08452;
    const engine = new OTCPriceEngine("EUR/JPY", basePrice, "OTC");
    const history = engine.generateHistory(TIMEFRAMES["30m"], nowSec, 200);
    const high = Math.max(...history.map((candle) => candle.high));
    const low = Math.min(...history.map((candle) => candle.low));

    expect(high - low).toBeGreaterThan(basePrice * 0.16);
  });

  it("keeps requested chart timeframes visibly ranged", () => {
    const nowSec = 1_711_111_111;
    const basePrice = 1.08452;
    const requestedTimeframes = ["5s", "10s", "15s", "30s", "1m", "5m", "15m", "30m", "1h", "4h", "1D"];
    const minimumRangeRatioForSeconds = (seconds: number) => {
      if (seconds <= 15) return 0.004;
      if (seconds <= 60) return 0.008;
      if (seconds <= 5 * 60) return 0.018;
      if (seconds <= 15 * 60) return 0.035;
      return 0.06;
    };

    requestedTimeframes.forEach((timeframe) => {
      const config = TIMEFRAMES[timeframe];
      const engine = new OTCPriceEngine("EUR/JPY", basePrice, "OTC");
      const history = engine.generateHistory(config, nowSec);
      const high = Math.max(...history.map((candle) => candle.high));
      const low = Math.min(...history.map((candle) => candle.low));

      expect(high - low).toBeGreaterThan(basePrice * minimumRangeRatioForSeconds(config.seconds));
    });
  });

  it("keeps 1m OTC candles textured instead of a smooth staircase", () => {
    const nowSec = 1_711_111_111;
    const basePrice = 1.08452;
    const engine = new OTCPriceEngine("EUR/JPY", basePrice, "OTC");
    const candles = engine.generateHistory(TIMEFRAMES["1m"], nowSec).slice(-160);
    const bodies = candles.map((candle) => Math.abs(candle.close - candle.open));
    const topWicks = candles.map((candle) => candle.high - Math.max(candle.open, candle.close));
    const bottomWicks = candles.map((candle) => Math.min(candle.open, candle.close) - candle.low);
    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
    const directionalCandles = candles
      .map((candle) => {
        const body = candle.close - candle.open;
        if (Math.abs(body) <= basePrice * 0.00003) return 0;
        return body > 0 ? 1 : -1;
      })
      .filter((direction) => direction !== 0);
    const directionChanges = directionalCandles.slice(1).filter(
      (direction, index) => direction !== directionalCandles[index],
    ).length;
    const longestRun = directionalCandles.reduce(
      (state, direction) => {
        const current = direction === state.previous ? state.current + 1 : 1;
        return {
          previous: direction,
          current,
          longest: Math.max(state.longest, current),
        };
      },
      { previous: 0, current: 0, longest: 0 },
    ).longest;

    expect(directionChanges / Math.max(1, directionalCandles.length - 1)).toBeGreaterThan(0.18);
    expect(longestRun).toBeLessThan(26);
    expect((average(topWicks) + average(bottomWicks)) / Math.max(average(bodies), 0.000001)).toBeGreaterThan(0.18);
  });

  it("keeps 1s candles readable with visible wicks", () => {
    const nowSec = 1_711_111_111;
    const engine = new OTCPriceEngine("EUR/USD", 1.08452, "OTC");
    const candles = engine.generateHistory(TIMEFRAMES["1s"], nowSec).slice(-80);
    const bodies = candles.map((candle) => Math.abs(candle.close - candle.open));
    const topWicks = candles.map((candle) => candle.high - Math.max(candle.open, candle.close));
    const bottomWicks = candles.map((candle) => Math.min(candle.open, candle.close) - candle.low);
    const avg = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
    const priceStep = 0.00001;
    const topWickCoverage = topWicks.filter((value) => value > 0).length / candles.length;
    const bottomWickCoverage = bottomWicks.filter((value) => value > 0).length / candles.length;

    expect(avg(topWicks)).toBeGreaterThan(priceStep * 0.22);
    expect(avg(bottomWicks)).toBeGreaterThan(priceStep * 0.22);
    expect(topWickCoverage).toBeGreaterThan(0.4);
    expect(bottomWickCoverage).toBeGreaterThan(0.4);
    expect(avg(topWicks)).toBeLessThan(avg(bodies) * 0.42);
    expect(avg(bottomWicks)).toBeLessThan(avg(bodies) * 0.42);
  });

  it("can extend historical candles further back without changing the latest chart section", () => {
    const nowSec = 1_711_111_111;
    const engine = new OTCPriceEngine("EUR/USD", 1.08452, "OTC");
    const defaultHistory = engine.generateHistory(TIMEFRAMES["1m"], nowSec);
    const extendedHistory = engine.generateHistory(TIMEFRAMES["1m"], nowSec, defaultHistory.length + 180);

    expect(extendedHistory.length).toBe(defaultHistory.length + 180);
    expect(extendedHistory.slice(-defaultHistory.length)).toEqual(defaultHistory);
  });
});
