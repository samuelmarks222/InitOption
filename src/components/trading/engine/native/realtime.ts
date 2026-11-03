import { getSynchronizedUnixTimeMs, subscribeClockSync } from "@/lib/serverTimeSync";
import type { OHLCCandle } from '../priceEngine';
import { bucketStart } from './timeframes';
export type PriceTick = { timestamp: number; price: number };
export type CandleCloseCallback = (closed: OHLCCandle) => void;
export type CandleUpdateCallback = (live: OHLCCandle, sourceTimestamp?: number) => void;

/** Tick ingestion is synchronous; visual delivery is coalesced to one update/frame.
 * Empty intervals explicitly have zero volume and carry the last observed price. */
export class CandleAggregator {
  private current: OHLCCandle | null = null;
  private timestamp = -Infinity;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private frame: ReturnType<typeof setTimeout> | number | null = null;
  private pending: { candle: OHLCCandle; timestamp: number } | null = null;
  private disposed = false;
  private readonly seconds: number;
  private readonly unsubscribeClock: () => void;
  constructor(seconds: number, private onClose: CandleCloseCallback, private onUpdate: CandleUpdateCallback) {
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Invalid candle interval');
    this.seconds = Math.max(1, Math.floor(seconds));
    this.unsubscribeClock = subscribeClockSync(() => this.schedule());
  }
  setCallbacks(close: CandleCloseCallback, update: CandleUpdateCallback) { this.onClose = close; this.onUpdate = update; }
  setSeedCandle(candle: OHLCCandle, referenceTimestamp = getSynchronizedUnixTimeMs()/1000) {
    if (this.disposed) return;
    if (![candle.time, candle.open, candle.high, candle.low, candle.close, candle.volume, referenceTimestamp].every(Number.isFinite)
      || candle.low <= 0 || candle.high < Math.max(candle.open, candle.close)
      || candle.low > Math.min(candle.open, candle.close) || candle.volume < 0) throw new Error('Invalid seed candle');
    this.current = { ...candle, time: bucketStart(candle.time, this.seconds) };
    this.timestamp = Math.max(referenceTimestamp, candle.time);
    this.advance(referenceTimestamp); this.schedule();
  }
  onTick(tick: PriceTick): OHLCCandle {
    if (this.disposed || !Number.isFinite(tick.timestamp) || !Number.isFinite(tick.price) || tick.price <= 0 || tick.timestamp < this.timestamp || (this.current && tick.timestamp < this.current.time)) {
      return this.current ? { ...this.current } : this.empty(0, 0);
    }
    this.advance(tick.timestamp);
    const time = bucketStart(tick.timestamp, this.seconds);
    if (!this.current) this.current = this.empty(time,tick.price);
    const c = this.current;
    if (c.volume === 0) { c.open = tick.price; c.high = tick.price; c.low = tick.price; }
    c.high = Math.max(c.high,tick.price); c.low = Math.min(c.low,tick.price); c.close = tick.price; c.volume++;
    this.timestamp = tick.timestamp; this.queue(tick.timestamp); this.schedule(); return { ...c };
  }
  getCurrentCandle() { return this.current ? { ...this.current } : null; }
  private empty(time: number, price: number): OHLCCandle { return { time, open: price, high: price, low: price, close: price, volume: 0 }; }
  private advance(timestamp: number) {
    if (!this.current) return;
    const target = bucketStart(timestamp, this.seconds);
    while (this.current && !this.disposed && this.current.time < target) {
      const closed = { ...this.current };
      this.current = this.empty(closed.time + this.seconds,closed.close);
      this.onClose(closed);
    }
  }
  private queue(timestamp: number) {
    if (!this.current) return;
    this.pending = { candle: { ...this.current }, timestamp };
    if (this.frame !== null) return;
    const flush = () => { this.frame = null; const next = this.pending; this.pending = null; if (next && !this.disposed) this.onUpdate(next.candle,next.timestamp); };
    this.frame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(flush) : setTimeout(flush,16);
  }
  private schedule() {
    if (this.timer !== null) clearTimeout(this.timer);
    if (!this.current || this.disposed) return;
    const delay = Math.max(1,(this.current.time + this.seconds - getSynchronizedUnixTimeMs()/1000)*1000);
    // Historical replay must not race a wall-clock timer while ticks are ingested.
    this.timer = setTimeout(() => {
      const now = getSynchronizedUnixTimeMs()/1000;
      // Wall-clock closes must not move the exchange-tick cursor forward: a
      // slightly delayed tick in the new bucket is still authoritative.
      this.advance(now); this.queue(now); this.schedule();
    },Math.min(2147483647,delay));
  }
  destroy() {
    this.disposed = true;
    this.unsubscribeClock();
    if (this.timer !== null) clearTimeout(this.timer);
    if (this.frame !== null) { if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.frame as number); else clearTimeout(this.frame); }
    this.timer = null; this.frame = null; this.pending = null; this.current = null;
  }
}
