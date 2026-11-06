import { describe, expect, it } from 'vitest';
import { CandleStore, heikinAshi, type Candle } from '@/components/trading/chart-core/candles';

// Explicit fixtures for mathematical verification, not production market data.
const bars: Candle[] = [
  { time: 0, open: 10, high: 14, low: 8, close: 12, volume: 20 },
  { time: 5, open: 12, high: 13, low: 7, close: 8, volume: 10 },
  { time: 10, open: 8, high: 9, low: 8, close: 8 },
];

describe('independent candle store', () => {
  it('merges closed history in chronological order, deduplicates and does not fill gaps', () => {
    const store = new CandleStore(5);
    store.mergeHistory([bars[1]], 10);
    store.mergeHistory([bars[0], bars[1]], 10);
    store.mergeHistory([{ ...bars[2], time: 20 }], 25);
    expect(store.snapshot().map(x => x.time)).toEqual([0, 5, 20]);
    const clone = store.snapshot(); clone[0].close = 999;
    expect(store.snapshot()[0].close).toBe(12);
  });
  it('rejects malformed and conflicting pages atomically', () => {
    const store = new CandleStore(5); store.mergeHistory([bars[0]], 5);
    expect(() => store.mergeHistory([bars[0], { ...bars[1], high: 9 }], 10)).toThrow();
    expect(() => store.mergeHistory([{ ...bars[0], close: 11 }], 5)).toThrow();
    expect(() => store.mergeHistory([bars[1], bars[0]], 10)).toThrow();
    expect(() => store.mergeHistory([bars[0]], 0)).toThrow();
    expect(store.snapshot()).toEqual([bars[0]]);
  });
  it('updates OHLC from monotonic ticks, skips empty intervals, rejects duplicates and stale prices', () => {
    const store = new CandleStore(5);
    store.mergeHistory([bars[0]], 5);
    expect(store.applyTick({timestamp: 4, price: 100})).toBeNull();
    store.beginLiveAt(5);
    expect(store.applyTick({timestamp: 5.1, price: 10, sequence: 1})).toEqual({time: 5, open: 10, high: 10, low: 10, close: 10});
    store.applyTick({timestamp: 6, price: 13, sequence: 2});
    store.applyTick({timestamp: 7, price: 8, sequence: 3});
    expect(store.applyTick({timestamp: 8, price: 11, sequence: 4})).toEqual({time: 5, open: 10, high: 13, low: 8, close: 11});
    expect(store.applyTick({timestamp: 8, price: 11, sequence: 4})).toBeNull();
    expect(store.applyTick({timestamp: 7, price: 100, sequence: 5})).toBeNull();
    store.applyTick({timestamp: 20, price: 15, sequence: 5});
    expect(store.snapshot().map(x => x.time)).toEqual([0, 5, 20]);
    expect(() => store.mergeHistory([bars[1]], 10)).toThrow();
  });
  it('does not pretend the first partially observed interval is complete', () => {
    const store = new CandleStore(5);
    expect(store.applyTick({timestamp: 6, price: 12})).toBeNull();
    expect(store.applyTick({timestamp: 9, price: 14})).toBeNull();
    expect(store.applyTick({timestamp: 10.1, price: 13})).toEqual({time:10,open:13,high:13,low:13,close:13});
    expect(store.snapshot()).toHaveLength(1);
  });
  it('rejects bad ticks and same-bucket history without an authoritative cursor', () => {
    const store = new CandleStore(5); store.mergeHistory([bars[0]], 5);
    for (const tick of [{timestamp: 3,price: 20}, {timestamp: NaN,price: 10}, {timestamp: 5,price: 0}, {timestamp: 5,price: 1,sequence: -1}]) {
      expect(store.applyTick(tick)).toBeNull();
    }
    expect(store.snapshot()).toEqual([bars[0]]);
  });
});

describe('Heikin Ashi display transform', () => {
  it('calculates recursive Heikin Ashi without mutating source values', () => {
    const original = structuredClone(bars);
    const transformed = heikinAshi(bars);
    expect(transformed).toEqual([
      { time: 0, open: 11, close: 11, high: 14, low: 8, volume: 20 },
      { time: 5, open: 11, close: 10, high: 13, low: 7, volume: 10 },
      { time: 10, open: 10.5, close: 8.25, high: 10.5, low: 8 },
    ]);
    expect(bars).toEqual(original);
    expect(heikinAshi([])).toEqual([]);
  });
});
