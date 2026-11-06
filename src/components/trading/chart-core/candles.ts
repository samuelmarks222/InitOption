/** Price data is supplied by a market-data adapter, never generated here.
 * Times are Unix seconds at the beginning of an interval. */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Provider-reported volume, if available. Tick count is not volume. */
  volume?: number;
}

export interface Tick {
  timestamp: number;
  price: number;
  sequence?: number;
}

function validCandle(c: Candle, seconds: number): boolean {
  return Number.isSafeInteger(c.time) && c.time >= 0 && c.time % seconds === 0 &&
    [c.open, c.high, c.low, c.close].every(p => Number.isFinite(p) && p > 0) &&
    c.high >= Math.max(c.open, c.close) && c.low <= Math.min(c.open, c.close) &&
    c.high >= c.low && (c.volume === undefined || (Number.isFinite(c.volume) && c.volume >= 0));
}

function sameCandle(a: Candle, b: Candle) {
  return a.time === b.time && a.open === b.open && a.high === b.high && a.low === b.low &&
    a.close === b.close && a.volume === b.volume;
}

/** A single source/symbol/interval. Create a separate instance when any changes.
 * History pages must contain closed intervals and not overlap live tick buckets:
 * without a provider's snapshot cursor the overlap cannot be merged accurately. */
export class CandleStore {
  private bars: Candle[] = [];
  private firstLiveBucket: number | undefined;
  private lastTick: Tick | undefined;
  private lastSequence: number | undefined;
  private observedSince: number | undefined;

  constructor(readonly seconds: number) {
    if (!Number.isSafeInteger(seconds) || seconds <= 0) throw new Error('Invalid candle interval');
  }

  snapshot(): Candle[] { return this.bars.map(bar => ({ ...bar })); }

  /** Supply only a provider-backed continuous-delivery boundary, e.g. a
   * synchronized snapshot cursor. Without one, the first partial bucket is
   * skipped until a subsequent boundary. Create a new store after a gap. */
  beginLiveAt(timestamp: number): void {
    if (!Number.isFinite(timestamp) || timestamp < 0 || this.firstLiveBucket !== undefined || this.observedSince !== undefined) throw new Error('Invalid live coverage boundary');
    this.observedSince = timestamp;
  }

  /** Merge an exclusive-before page atomically. Duplicate identical bars are OK;
   * conflicting values fail closed instead of silently choosing a price. */
  mergeHistory(page: readonly Candle[], before: number): void {
    if (!Number.isSafeInteger(before) || before < 0 || before % this.seconds !== 0) throw new Error('Invalid history boundary');
    const merged = new Map(this.bars.map(bar => [bar.time, bar]));
    let previous = -1;
    for (const bar of page) {
      if (!validCandle(bar, this.seconds) || bar.time >= before || bar.time <= previous ||
          (this.firstLiveBucket !== undefined && bar.time >= this.firstLiveBucket)) {
        throw new Error('Invalid or overlapping history page');
      }
      previous = bar.time;
      const existing = merged.get(bar.time);
      if (existing && !sameCandle(existing, bar)) throw new Error('Conflicting historical candle');
      merged.set(bar.time, { ...bar });
    }
    this.bars = [...merged.values()].sort((a, b) => a.time - b.time);
  }

  /** Returns the changed bar, or null for malformed, duplicate or stale ticks. */
  applyTick(tick: Tick): Candle | null {
    if (!Number.isFinite(tick.timestamp) || tick.timestamp < 0 || !Number.isFinite(tick.price) || tick.price <= 0 ||
        (tick.sequence !== undefined && (!Number.isSafeInteger(tick.sequence) || tick.sequence < 0))) return null;
    if (this.lastTick && (tick.timestamp < this.lastTick.timestamp ||
        (tick.sequence === undefined && tick.timestamp === this.lastTick.timestamp && tick.price === this.lastTick.price))) return null;
    if (tick.sequence !== undefined && this.lastSequence !== undefined && tick.sequence <= this.lastSequence) return null;
    const time = Math.floor(tick.timestamp / this.seconds) * this.seconds;
    if (!Number.isSafeInteger(time)) return null;
    const last = this.bars[this.bars.length - 1];
    // An imported history candle has no last-tick cursor: never guess how it
    // relates to an incoming tick in the same or an earlier bucket.
    if (last && this.firstLiveBucket === undefined && time <= last.time) return null;
    if (last && time < last.time) return null;
    if (this.observedSince === undefined) this.observedSince = tick.timestamp;
    // Never label a mid-bucket partial observation as a complete candle.
    if (this.firstLiveBucket === undefined && time < this.observedSince) return null;
    let next: Candle;
    if (last && time === last.time) {
      next = { ...last, high: Math.max(last.high, tick.price), low: Math.min(last.low, tick.price), close: tick.price };
      this.bars[this.bars.length - 1] = next;
    } else {
      next = { time, open: tick.price, high: tick.price, low: tick.price, close: tick.price };
      this.bars.push(next);
    }
    this.firstLiveBucket ??= time;
    this.lastTick = { ...tick };
    if (tick.sequence !== undefined) this.lastSequence = tick.sequence;
    return { ...next };
  }
}

/** The returned candles are display-only. Never use them for trading or indicators. */
export function heikinAshi(candles: readonly Candle[]): Candle[] {
  let previous: Candle | undefined;
  return candles.map(candle => {
    const close = (candle.open + candle.high + candle.low + candle.close) / 4;
    const open = previous ? (previous.open + previous.close) / 2 : (candle.open + candle.close) / 2;
    const transformed: Candle = {
      time: candle.time, open, close,
      high: Math.max(candle.high, open, close),
      low: Math.min(candle.low, open, close),
      ...(candle.volume === undefined ? {} : { volume: candle.volume }),
    };
    previous = transformed;
    return transformed;
  });
}
