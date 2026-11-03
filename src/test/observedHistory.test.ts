import { describe, it, expect } from 'vitest';
import { ObservedHistory } from '@/components/trading/engine/native/observedHistory';
import { INTERVALS } from '@/components/trading/engine/native/timeframes';

describe('real market history isolation', () => {
  it('has no candles until actual ticks arrive and leaves unavailable intervals empty', () => {
    const store = new ObservedHistory();
    expect(store.snapshot('ws-feed','EUR/USD',60,600).history).toEqual([]);
    expect(store.snapshot('ws-feed','EUR/USD',60,600).current).toBeNull();
    store.record('ws-feed','EUR/USD',{timestamp:600,price:100});
    store.record('ws-feed','EUR/USD',{timestamp:720,price:110});
    expect(store.snapshot('ws-feed','EUR/USD',60,780).history.map(bar=>bar.time)).toEqual([600,720]);
    expect(store.snapshot('another-feed','EUR/USD',60,780).history).toEqual([]);
    expect(store.snapshot('ws-feed','GBP/USD',60,780).history).toEqual([]);
  });
  for (const [label,seconds] of Object.entries(INTERVALS)) {
    it(`rebuilds ${label} from the same observed OHLC without mutating the cache`, () => {
      const store = new ObservedHistory();
      store.record('feed','A',{timestamp:0,price:100});
      store.record('feed','A',{timestamp:1,price:110});
      store.record('feed','A',{timestamp:2,price:95});
      store.record('feed','A',{timestamp:3,price:105});
      const result=store.snapshot('feed','A',seconds,seconds);
      expect(result.history).toEqual([{time:0,open:100,high:110,low:95,close:105,volume:4}]);
      result.history[0].close=999;
      expect(store.snapshot('feed','A',seconds,seconds).history[0].close).toBe(105);
    });
  }
  it('rejects repeated sequences, including after a new feed instance replays ticks', () => {
    const store=new ObservedHistory();
    expect(store.record('feed','A',{timestamp:60,price:100,sequence:8})).toBe(true);
    expect(store.record('feed','A',{timestamp:60,price:100,sequence:8})).toBe(false);
    expect(store.record('feed','A',{timestamp:59,price:500,sequence:9})).toBe(false);
    expect(store.record('feed','A',{timestamp:60,price:105,sequence:9})).toBe(true);
    expect(store.snapshot('feed','A',60,61).current?.volume).toBe(2);
  });
  it('bounds stored bars and streams and retains the newest observations', () => {
    const store=new ObservedHistory(2,2);
    for (const timestamp of [0,5,10]) store.record('f','A',{timestamp,price:100});
    expect(store.snapshot('f','A',5,20).history.map(bar=>bar.time)).toEqual([5,10]);
    store.record('f','B',{timestamp:0,price:10}); store.record('f','C',{timestamp:0,price:20});
    expect(store.snapshot('f','A',5,20).history).toEqual([]);
  });
});
