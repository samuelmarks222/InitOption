import type { OHLCCandle } from '../priceEngine';
import { heikinAshi } from './marketData';
// Authoritative history is replaced on close/backfill, not mutated during frames.
// Cache its recursive prefix so Heikin-Ashi tick updates does not recalculate every
// historical candle 60 times per second. Weak keys release superseded histories.
const haPrefixCache = new WeakMap<readonly OHLCCandle[], { before: number; previous?: OHLCCandle }>();
/** Exclude the current candle from the recursive prefix, including on final close. */
export function heikinAshiCandle(candle: OHLCCandle, history: readonly OHLCCandle[]): OHLCCandle {
  let cached = haPrefixCache.get(history);
  if (!cached || cached.before !== candle.time) {
    const prefix = heikinAshi(history.filter(bar => bar.time < candle.time));
    cached = { before: candle.time, previous: prefix[prefix.length - 1] };
    haPrefixCache.set(history, cached);
  }
  const previous = cached.previous;
  const open = previous ? (previous.open + previous.close) / 2 : (candle.open + candle.close) / 2;
  const close = (candle.open + candle.high + candle.low + candle.close) / 4;
  return { ...candle, open, close, high: Math.max(candle.high, open, close), low: Math.min(candle.low, open, close) };
}
