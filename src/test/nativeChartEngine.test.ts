import { describe, it, expect, vi, afterEach } from 'vitest';
import { INTERVALS, bucketStart } from '@/components/trading/engine/native/timeframes';
import { aggregateHistory, heikinAshi, normalizeHistory } from '@/components/trading/engine/native/marketData';
import { TimeCoordinates, PriceCoordinates } from '@/components/trading/engine/native/scales';
import { CandleAggregator } from '@/components/trading/engine/native/realtime';
const bar = (time: number, open = 100, high = 108, low = 95, close = 102) => ({ time,open,high,low,close,volume: 2 });
afterEach(() => vi.useRealTimers());
describe('native chart data and timeframe engine', () => {
  for (const [label,seconds] of Object.entries(INTERVALS)) {
    it(`${label}: aligns and rolls OHLC at exact epoch boundaries`, () => {
      vi.useFakeTimers(); const start = bucketStart(1800000000,seconds); vi.setSystemTime(start*1000);
      const closed = vi.fn(), update = vi.fn(); const engine = new CandleAggregator(seconds,closed,update);
      engine.onTick({ timestamp: start, price: 100 });
      engine.onTick({ timestamp: start+.1, price: 108 });
      engine.onTick({ timestamp: start+.2, price: 95 });
      engine.onTick({ timestamp: start+.3, price: 102 });
      expect(engine.getCurrentCandle()).toMatchObject({time: start,open:100,high:108,low:95,close:102});
      vi.advanceTimersByTime(seconds*1000+20);
      expect(closed).toHaveBeenCalledTimes(1);
      expect(engine.getCurrentCandle()).toMatchObject({time:start+seconds,close:102,volume:0}); engine.destroy();
    });
  }
  it('sorts, replaces duplicate history, and aggregates actual OHLC', () => {
    const input = [bar(10,102,110,98,109),bar(0),bar(0,100,108,95,103)];
    expect(normalizeHistory(input).map(b => b.time)).toEqual([0,10]);
    expect(aggregateHistory(input,30)).toEqual([{time:0,open:100,high:110,low:95,close:109,volume:4}]);
  });
  it('calculates the first HA candle and recursive subsequent opens without mutating source', () => {
    const input = [bar(0),bar(60,102,112,98,110)];
    const result = heikinAshi(input);
    expect(result[0].open).toBe(101); expect(result[0].close).toBe(101.25);
    expect(result[1].open).toBe(101.125); expect(result[1].close).toBe(105.5);
    expect(input[0].open).toBe(100);
  });
  it('keeps time/price coordinates invertible at fractional and offscreen positions', () => {
    const time = new TimeCoordinates(); time.times=[100,160,220]; time.width=800; time.from=-10; time.to=30;
    for (const timestamp of [-20,100,130,220,340]) {
      const logical=time.timeToLogical(timestamp)!;
      expect(time.logicalToTime(time.coordinateToLogical(time.logicalToCoordinate(logical)))).toBeCloseTo(timestamp);
    }
    const price = new PriceCoordinates(); price.height=500; price.fit(90,110);
    expect(price.coordinateToPrice(price.priceToCoordinate(102))).toBeCloseTo(102);
  });
  it('ignores stale ticks and cancels pending frames and boundaries on destroy', () => {
    vi.useFakeTimers(); vi.setSystemTime(600000); const update=vi.fn(),close=vi.fn();
    const engine=new CandleAggregator(60,close,update);
    engine.onTick({timestamp:600,price:100}); engine.onTick({timestamp:601,price:102}); engine.onTick({timestamp:600.5,price:500});
    expect(engine.getCurrentCandle()?.high).toBe(102); engine.destroy(); vi.advanceTimersByTime(120000);
    expect(update).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
  });
});
