import type { OHLCCandle } from '../priceEngine';
import { aggregateHistory } from './marketData';
import { bucketStart, INTERVALS } from './timeframes';

interface ObservedTick { timestamp: number; price: number; sequence?: number }
interface Stream { bars: OHLCCandle[]; lastTimestamp: number; lastSequence: number }

/** Bounded, source-isolated history built exclusively from received market ticks.
 * Gaps remain gaps: this store never invents trades or fills unavailable history. */
export class ObservedHistory {
  private streams = new Map<string, Stream>();
  constructor(private readonly maxBars = 20000, private readonly maxStreams = 12) {
    if (!Number.isInteger(maxBars) || maxBars < 1 || !Number.isInteger(maxStreams) || maxStreams < 1) throw new Error('Invalid history capacity');
  }
  private key(source: string, symbol: string) { return JSON.stringify([source, symbol]); }
  record(source: string, symbol: string, tick: ObservedTick) {
    if (!Number.isFinite(tick.timestamp) || !Number.isFinite(tick.price) || tick.price <= 0) return false;
    const key = this.key(source, symbol);
    let stream = this.streams.get(key);
    if (stream && (tick.timestamp < stream.lastTimestamp ||
      (Number.isFinite(tick.sequence) && tick.sequence! <= stream.lastSequence))) return false;
    if (!stream) stream = { bars: [], lastTimestamp: -Infinity, lastSequence: -1 };
    // Least recently updated streams are evicted first.
    this.streams.delete(key); this.streams.set(key, stream);
    while (this.streams.size > this.maxStreams) this.streams.delete(this.streams.keys().next().value!);
    const time = bucketStart(tick.timestamp, INTERVALS['5s']);
    const last = stream.bars[stream.bars.length - 1];
    if (last?.time === time) {
      last.high = Math.max(last.high, tick.price); last.low = Math.min(last.low, tick.price);
      last.close = tick.price; last.volume++;
    } else {
      stream.bars.push({ time, open: tick.price, high: tick.price, low: tick.price, close: tick.price, volume: 1 });
      if (stream.bars.length > this.maxBars) stream.bars.splice(0, stream.bars.length - this.maxBars);
    }
    stream.lastTimestamp = tick.timestamp;
    if (Number.isFinite(tick.sequence)) stream.lastSequence = tick.sequence!;
    return true;
  }
  snapshot(source: string, symbol: string, seconds: number, now: number, limit = this.maxBars) {
    if (!Object.values(INTERVALS).some(value => value === seconds)) throw new Error('Unsupported history interval');
    const stream = this.streams.get(this.key(source, symbol));
    const bars = aggregateHistory(stream?.bars ?? [], seconds);
    const currentTime = bucketStart(now, seconds);
    const count = Math.max(0, Math.floor(limit));
    const closed = bars.filter(bar => bar.time < currentTime);
    return {
      history: count ? closed.slice(-count) : [],
      current: bars.find(bar => bar.time === currentTime) ?? null,
      lastTimestamp: stream?.lastTimestamp,
    };
  }
}
export const observedHistory = new ObservedHistory();
