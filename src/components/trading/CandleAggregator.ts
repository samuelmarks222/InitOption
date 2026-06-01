import type { OHLCCandle } from "./engine/priceEngine";

export type CandleCloseCallback = (closed: OHLCCandle) => void;
export type CandleUpdateCallback = (live: OHLCCandle, sourceTimestamp?: number) => void;
export type PriceTick = { timestamp: number; price: number };

type PendingVisualUpdate = {
  candle: OHLCCandle;
  sourceTimestamp: number;
};

type TimerHandle = ReturnType<typeof setTimeout>;
const HIGH_TIMEFRAME_PROFESSIONAL_SECONDS = 30 * 60;

const getAnimationFrameScheduler = () => {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return {
      schedule: (callback: () => void) => window.requestAnimationFrame(callback),
      cancel: (handle: number) => window.cancelAnimationFrame(handle),
    };
  }

  return {
    schedule: (callback: () => void) => setTimeout(callback, 16) as unknown as number,
    cancel: (handle: number) => clearTimeout(handle as unknown as TimerHandle),
  };
};

export class CandleAggregator {
  private readonly timeframeSeconds: number;
  private readonly onClose: CandleCloseCallback;
  private readonly onUpdate: CandleUpdateCallback;
  private currentCandle: OHLCCandle | null = null;
  private lastTradePrice: number | null = null;
  private lastProcessedTimestamp = 0;
  private rafScheduled = false;
  private pendingVisualUpdate: PendingVisualUpdate | null = null;
  private rafHandle: number | null = null;
  private boundaryTimer: TimerHandle | null = null;
  private readonly frameScheduler = getAnimationFrameScheduler();

  constructor(timeframeSeconds: number, onClose: CandleCloseCallback, onUpdate: CandleUpdateCallback) {
    this.timeframeSeconds = Math.max(1, Math.floor(timeframeSeconds));
    this.onClose = onClose;
    this.onUpdate = onUpdate;
  }

  setSeedCandle(candle: OHLCCandle, referenceTimestamp = Date.now() / 1000) {
    this.currentCandle = { ...candle };
    this.lastTradePrice = candle.close;
    this.lastProcessedTimestamp = Math.max(referenceTimestamp, candle.time);

    if (referenceTimestamp >= candle.time + this.timeframeSeconds) {
      this.advanceTo(referenceTimestamp, true);
    }

    this.scheduleBoundary();
  }

  onTick(tick: PriceTick): OHLCCandle {
    if (!Number.isFinite(tick.price) || tick.price <= 0 || !Number.isFinite(tick.timestamp)) {
      return this.currentCandle ?? this.createFlatCandle(this.getPeriodStart(Date.now() / 1000), 1);
    }

    if (tick.timestamp < this.lastProcessedTimestamp) {
      return this.currentCandle ?? this.createFlatCandle(this.getPeriodStart(tick.timestamp), tick.price);
    }

    this.lastProcessedTimestamp = tick.timestamp;
    this.advanceTo(tick.timestamp, false);

    const periodStart = this.getPeriodStart(tick.timestamp);
    const openingPrice = this.lastTradePrice ?? tick.price;

    if (!this.currentCandle || this.currentCandle.time !== periodStart) {
      this.currentCandle = this.createFlatCandle(periodStart, openingPrice);
    }

    this.currentCandle.close = tick.price;
    this.currentCandle.high = Math.max(this.currentCandle.high, tick.price);
    this.currentCandle.low = Math.min(this.currentCandle.low, tick.price);
    this.currentCandle.volume += 1;
    this.lastTradePrice = tick.price;

    this.queueVisualUpdate(this.normalizeCandleForDisplay(this.currentCandle), tick.timestamp);
    this.scheduleBoundary();
    return this.normalizeCandleForDisplay(this.currentCandle);
  }

  getCurrentCandle(): OHLCCandle | null {
    return this.currentCandle ? this.normalizeCandleForDisplay(this.currentCandle) : null;
  }

  destroy() {
    if (this.boundaryTimer !== null) {
      clearTimeout(this.boundaryTimer);
      this.boundaryTimer = null;
    }

    if (this.rafHandle !== null) {
      this.frameScheduler.cancel(this.rafHandle);
      this.rafHandle = null;
    }

    this.currentCandle = null;
    this.pendingVisualUpdate = null;
    this.rafScheduled = false;
    this.lastTradePrice = null;
    this.lastProcessedTimestamp = 0;
  }

  private readonly handleBoundary = () => {
    if (!this.currentCandle) return;

    const nowSeconds = Date.now() / 1000;
    this.lastProcessedTimestamp = Math.max(this.lastProcessedTimestamp, nowSeconds);
    this.advanceTo(nowSeconds, true);
    this.scheduleBoundary();
  };

  private getPeriodStart(timestamp: number) {
    return Math.floor(timestamp / this.timeframeSeconds) * this.timeframeSeconds;
  }

  private createFlatCandle(time: number, price: number): OHLCCandle {
    return {
      time,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 0,
    };
  }

  private advanceTo(timestamp: number, emitPlaceholder: boolean) {
    if (!this.currentCandle) return;

    let advanced = false;

    while (timestamp >= this.currentCandle.time + this.timeframeSeconds) {
      const closed = this.normalizeCandleForDisplay(this.currentCandle);
      this.onClose(closed);
      this.lastTradePrice = closed.close;
      this.currentCandle = this.createFlatCandle(
        closed.time + this.timeframeSeconds,
        this.lastTradePrice,
      );
      advanced = true;
    }

    if (advanced && emitPlaceholder && this.currentCandle) {
      this.queueVisualUpdate(this.normalizeCandleForDisplay(this.currentCandle), timestamp);
    }
  }

  private getPriceStep(price: number) {
    if (price > 10000) return 0.01;
    if (price > 100) return 0.001;
    if (price > 1) return 0.00001;
    return 0.000001;
  }

  private normalizeCandleForDisplay(candle: OHLCCandle): OHLCCandle {
    if (this.timeframeSeconds < HIGH_TIMEFRAME_PROFESSIONAL_SECONDS) {
      return { ...candle };
    }

    const upperBody = Math.max(candle.open, candle.close);
    const lowerBody = Math.min(candle.open, candle.close);
    const referencePrice = Math.max(upperBody, 0.000001);
    const priceStep = this.getPriceStep(referencePrice);
    const bodySize = Math.abs(candle.close - candle.open);
    const timeframeWeight = Math.min(1, Math.log2(this.timeframeSeconds / HIGH_TIMEFRAME_PROFESSIONAL_SECONDS + 1) / 5);
    const maxWick = Math.max(
      priceStep * 2,
      bodySize * 4 + referencePrice * (0.0005 + timeframeWeight * 0.0003),
    );

    return {
      ...candle,
      high: Math.max(upperBody, Math.min(candle.high, upperBody + maxWick)),
      low: Math.min(lowerBody, Math.max(candle.low, lowerBody - maxWick)),
    };
  }

  private queueVisualUpdate(candle: OHLCCandle, sourceTimestamp = candle.time) {
    this.pendingVisualUpdate = {
      candle: { ...candle },
      sourceTimestamp,
    };

    if (this.rafScheduled) return;

    this.rafScheduled = true;
    this.rafHandle = this.frameScheduler.schedule(() => {
      const nextVisualUpdate = this.pendingVisualUpdate;
      this.pendingVisualUpdate = null;
      this.rafScheduled = false;
      this.rafHandle = null;

      if (nextVisualUpdate) {
        this.onUpdate(nextVisualUpdate.candle, nextVisualUpdate.sourceTimestamp);
      }
    });
  }

  private scheduleBoundary() {
    if (!this.currentCandle) return;

    if (this.boundaryTimer !== null) {
      clearTimeout(this.boundaryTimer);
    }

    const nextBoundarySeconds = this.currentCandle.time + this.timeframeSeconds;
    const delayMs = Math.max(0, (nextBoundarySeconds - Date.now() / 1000) * 1000);
    this.boundaryTimer = setTimeout(this.handleBoundary, delayMs);
  }
}
