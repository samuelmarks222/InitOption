import type { OHLCCandle } from "./engine/priceEngine";

export type CandleCloseCallback = (closed: OHLCCandle) => void;
export type CandleUpdateCallback = (live: OHLCCandle) => void;
export type PriceTick = { timestamp: number; price: number };

export class CandleAggregator {
  private timeframeSeconds: number;
  private currentCandle: OHLCCandle | null = null;
  private onClose: CandleCloseCallback;
  private onUpdate: CandleUpdateCallback;
  private pendingCandles: OHLCCandle[] = [];
  private rafScheduled = false;

  constructor(timeframeSeconds: number, onClose: CandleCloseCallback, onUpdate: CandleUpdateCallback) {
    this.timeframeSeconds = timeframeSeconds;
    this.onClose = onClose;
    this.onUpdate = onUpdate;
  }

  setSeedCandle(candle: OHLCCandle) {
    this.currentCandle = { ...candle };
  }

  private getPeriodStart(timestamp: number) {
    return Math.floor(timestamp / this.timeframeSeconds) * this.timeframeSeconds;
  }

  private queueVisualUpdate(candle: OHLCCandle) {
    this.pendingCandles.push({ ...candle });
    if (!this.rafScheduled) {
      this.rafScheduled = true;
      requestAnimationFrame(() => {
        const queued = this.pendingCandles.splice(0, this.pendingCandles.length);
        queued.forEach((queuedCandle) => this.onUpdate(queuedCandle));
        this.rafScheduled = false;
      });
    }
  }

  onTick(tick: PriceTick): OHLCCandle {
    const periodStart = this.getPeriodStart(tick.timestamp);
    const step = this.timeframeSeconds;

    if (!this.currentCandle || this.currentCandle.time !== periodStart) {
      if (this.currentCandle) {
        this.onClose({ ...this.currentCandle });
        this.queueVisualUpdate(this.currentCandle);

        let gapStart = this.currentCandle.time + step;
        while (gapStart < periodStart) {
          const flatCandle: OHLCCandle = {
            time: gapStart,
            open: this.currentCandle.close,
            high: this.currentCandle.close,
            low: this.currentCandle.close,
            close: this.currentCandle.close,
            volume: 0,
          };
          this.onClose(flatCandle);
          this.queueVisualUpdate(flatCandle);
          gapStart += step;
        }
      }

      const open = this.currentCandle ? this.currentCandle.close : tick.price;
      this.currentCandle = {
        time: periodStart,
        open,
        high: Math.max(open, tick.price),
        low: Math.min(open, tick.price),
        close: tick.price,
        volume: 1,
      };
    } else {
      this.currentCandle.close = tick.price;
      this.currentCandle.high = Math.max(this.currentCandle.high, tick.price);
      this.currentCandle.low = Math.min(this.currentCandle.low, tick.price);
      this.currentCandle.volume += 1;
    }

    this.queueVisualUpdate(this.currentCandle);
    return this.currentCandle;
  }

  getCurrentCandle(): OHLCCandle | null {
    return this.currentCandle;
  }

  destroy() {
    this.currentCandle = null;
    this.pendingCandles = [];
    this.rafScheduled = false;
  }
}
