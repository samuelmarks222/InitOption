import type { OHLCCandle } from '../priceEngine';
import { bucketStart } from './timeframes';

/** Canonical OHLC history. No prices are generated, interpolated, or randomized. */
export function normalizeHistory(input: readonly OHLCCandle[]): OHLCCandle[] {
  const byTime = new Map<number, OHLCCandle>();
  for (const bar of input) {
    if (![bar.time, bar.open, bar.high, bar.low, bar.close].every(Number.isFinite)) continue;
    if (bar.low > Math.min(bar.open, bar.close) || bar.high < Math.max(bar.open, bar.close) || bar.low > bar.high) continue;
    byTime.set(bar.time, { ...bar });
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}
export function aggregateHistory(input: readonly OHLCCandle[], seconds: number): OHLCCandle[] {
  const result: OHLCCandle[] = [];
  for (const bar of normalizeHistory(input)) {
    const time = bucketStart(bar.time, seconds);
    const previous = result[result.length - 1];
    if (!previous || previous.time !== time) result.push({ ...bar, time });
    else {
      previous.high = Math.max(previous.high, bar.high);
      previous.low = Math.min(previous.low, bar.low);
      previous.close = bar.close;
      previous.volume += bar.volume;
    }
  }
  return result;
}
