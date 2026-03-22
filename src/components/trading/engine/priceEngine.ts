/**
 * OTC Synthetic Price Engine
 * Produces bounded, mean-reverting OHLCV candles for the trading chart.
 */

export interface OHLCCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TimeframeConfig {
  label: string;
  seconds: number;
  updateIntervalMs: number;
  historical: number;
  bodyPips: number;
  wickPips: number;
}

export const TIMEFRAMES: Record<string, TimeframeConfig> = {
  "5s": { label: "5s", seconds: 5, updateIntervalMs: 50, historical: 240, bodyPips: 3, wickPips: 2 },
  "10s": { label: "10s", seconds: 10, updateIntervalMs: 50, historical: 240, bodyPips: 4, wickPips: 3 },
  "15s": { label: "15s", seconds: 15, updateIntervalMs: 60, historical: 220, bodyPips: 5, wickPips: 4 },
  "30s": { label: "30s", seconds: 30, updateIntervalMs: 80, historical: 220, bodyPips: 6, wickPips: 5 },
  "1m": { label: "1m", seconds: 60, updateIntervalMs: 100, historical: 200, bodyPips: 8, wickPips: 6 },
  "5m": { label: "5m", seconds: 300, updateIntervalMs: 250, historical: 180, bodyPips: 18, wickPips: 12 },
  "15m": { label: "15m", seconds: 900, updateIntervalMs: 1000, historical: 160, bodyPips: 30, wickPips: 20 },
  "30m": { label: "30m", seconds: 1800, updateIntervalMs: 1000, historical: 150, bodyPips: 45, wickPips: 30 },
  "1h": { label: "1h", seconds: 3600, updateIntervalMs: 2000, historical: 140, bodyPips: 70, wickPips: 50 },
  "4h": { label: "4h", seconds: 14400, updateIntervalMs: 5000, historical: 120, bodyPips: 140, wickPips: 100 },
  "1D": { label: "1D", seconds: 86400, updateIntervalMs: 5000, historical: 100, bodyPips: 300, wickPips: 200 },
  "1W": { label: "1W", seconds: 604800, updateIntervalMs: 10000, historical: 80, bodyPips: 700, wickPips: 400 },
  "1M": { label: "1M", seconds: 2592000, updateIntervalMs: 10000, historical: 60, bodyPips: 1500, wickPips: 800 },
};

const BODY_SIGMA_CAP = 2.4;
const WICK_SIGMA_CAP = 2.1;
const PIN_BAR_SIGMA_CAP = 1.35;
const BODY_LIMIT_MULTIPLIER = 2.75;
const WICK_LIMIT_MULTIPLIER = 3.25;
const OPEN_GAP_LIMIT_MULTIPLIER = 3.0;
const HISTORY_CACHE_VERSION = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function randn(): number {
  const u = Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u + 1e-12)) * Math.cos(2 * Math.PI * v);
}

function boundedHalfNormal(maxSigma: number): number {
  return Math.min(Math.abs(randn()), maxSigma);
}

export class OTCPriceEngine {
  private price: number;
  private basePrice: number;
  private symbol: string;
  private velocity = 0;

  constructor(symbol: string, basePrice: number) {
    this.symbol = symbol || "EUR/USD";
    const validPrice =
      typeof basePrice === "number" && !Number.isNaN(basePrice) && basePrice > 0 ? basePrice : 1.0;
    this.basePrice = validPrice;
    this.price = validPrice;
    this.velocity = randn() * 0.5;
  }

  private getPipForPrice(price: number): number {
    if (price > 10000) return 1.0;
    if (price > 100) return 0.01;
    if (price > 1) return 0.0001;
    return 0.000001;
  }

  private getPip(): number {
    return this.getPipForPrice(this.price);
  }

  private getCandleLimits(tfConfig: TimeframeConfig, referencePrice: number) {
    const pip = this.getPipForPrice(referencePrice);
    return {
      pip,
      maxBody: tfConfig.bodyPips * pip * BODY_LIMIT_MULTIPLIER,
      maxWick: tfConfig.wickPips * pip * WICK_LIMIT_MULTIPLIER,
      maxOpenGap: tfConfig.bodyPips * pip * OPEN_GAP_LIMIT_MULTIPLIER,
    };
  }

  private isPlausibleCandle(
    candle: OHLCCandle,
    tfConfig: TimeframeConfig,
    previousClose?: number,
  ): boolean {
    const referencePrice = previousClose ?? candle.open;
    const limits = this.getCandleLimits(tfConfig, referencePrice);
    const bodyHigh = Math.max(candle.open, candle.close);
    const bodyLow = Math.min(candle.open, candle.close);
    const bodySize = Math.abs(candle.close - candle.open);
    const upperWick = candle.high - bodyHigh;
    const lowerWick = bodyLow - candle.low;
    const openGap = previousClose === undefined ? 0 : Math.abs(candle.open - previousClose);

    if (![bodySize, upperWick, lowerWick, openGap].every(Number.isFinite)) {
      return false;
    }

    if (upperWick < 0 || lowerWick < 0) {
      return false;
    }

    return (
      bodySize <= limits.maxBody &&
      upperWick <= limits.maxWick &&
      lowerWick <= limits.maxWick &&
      openGap <= limits.maxOpenGap
    );
  }

  /**
   * Single live price tick used for real-time chart updates.
   */
  tick(perTickVol = 0.3): number {
    const pip = this.getPip();
    const v = Math.max(0.001, perTickVol);
    const maxVelocity = v * 5;

    this.velocity *= 0.92;
    this.velocity += randn() * v;
    this.velocity = clamp(this.velocity, -maxVelocity, maxVelocity);

    const drift = this.basePrice > 0 ? clamp((this.price - this.basePrice) / this.basePrice, -0.08, 0.08) : 0;
    this.velocity -= drift * v * 1.2;
    this.velocity = clamp(this.velocity, -maxVelocity, maxVelocity);

    this.price = Math.max(this.price + this.velocity * pip, this.basePrice * 0.1);
    return this.price;
  }

  /**
   * Generate one completed historical candle using bounded randomness so a single
   * outlier cannot flatten the whole chart when the user zooms out.
   */
  generateCandle(timestamp: number, tfConfig: TimeframeConfig): OHLCCandle {
    const pip = this.getPip();
    const open = this.price;
    const limits = this.getCandleLimits(tfConfig, open);

    this.velocity *= 0.6;
    this.velocity += randn() * 1.5;
    this.velocity = Math.max(-3, Math.min(3, this.velocity));

    const drift = (open - this.basePrice) / this.basePrice;
    if (Math.abs(drift) > 0.03) {
      this.velocity -= drift * 6;
    }

    const dirSign = this.velocity + randn() * 0.6 >= 0 ? 1 : -1;
    const bodyMove = Math.min(boundedHalfNormal(BODY_SIGMA_CAP) * tfConfig.bodyPips * pip, limits.maxBody);
    const close = open + dirSign * bodyMove;

    const bodyHigh = Math.max(open, close);
    const bodyLow = Math.min(open, close);

    const upperWick = Math.min(
      boundedHalfNormal(WICK_SIGMA_CAP) * tfConfig.wickPips * pip,
      limits.maxWick,
    );
    const lowerWick = Math.min(
      boundedHalfNormal(WICK_SIGMA_CAP) * tfConfig.wickPips * pip,
      limits.maxWick,
    );

    let high = bodyHigh + upperWick;
    let low = bodyLow - lowerWick;

    if (Math.random() < 0.08) {
      high += Math.min(
        boundedHalfNormal(PIN_BAR_SIGMA_CAP) * tfConfig.wickPips * pip,
        limits.maxWick * 0.6,
      );
    }
    if (Math.random() < 0.08) {
      low -= Math.min(
        boundedHalfNormal(PIN_BAR_SIGMA_CAP) * tfConfig.wickPips * pip,
        limits.maxWick * 0.6,
      );
    }

    if (Math.random() < 0.1) high = bodyHigh;
    if (Math.random() < 0.1) low = bodyLow;

    high = Math.min(high, bodyHigh + limits.maxWick);
    low = Math.max(low, bodyLow - limits.maxWick);

    this.price = close;

    const dec = this.getDecimals();
    return {
      time: timestamp,
      open: parseFloat(open.toFixed(dec)),
      high: parseFloat(Math.max(high, open, close).toFixed(dec)),
      low: parseFloat(Math.min(low, open, close).toFixed(dec)),
      close: parseFloat(close.toFixed(dec)),
      volume: Math.floor(Math.random() * 800 + 150),
    };
  }

  private getDecimals(): number {
    if (this.price > 10000) return 2;
    if (this.price > 100) return 3;
    if (this.price > 1) return 5;
    return 6;
  }

  getCurrentPrice(): number {
    return this.price;
  }

  setPrice(price: number) {
    this.price = price;
    this.basePrice = price;
    this.velocity = 0;
  }

  private sanitizeCachedHistory(raw: unknown, tfConfig: TimeframeConfig, currentCandleStart: number): OHLCCandle[] {
    if (!Array.isArray(raw)) return [];

    const deduped = new Map<number, OHLCCandle>();

    raw.forEach((item) => {
      if (!item || typeof item !== "object") return;

      const candle = item as Partial<OHLCCandle>;
      const rawTime = Number(candle.time);
      const open = Number(candle.open);
      const high = Number(candle.high);
      const low = Number(candle.low);
      const close = Number(candle.close);
      const volume = Number(candle.volume ?? 0);

      if (![rawTime, open, high, low, close].every(Number.isFinite)) return;

      const seconds = rawTime > 1_000_000_000_000 ? Math.floor(rawTime / 1000) : Math.floor(rawTime);
      const time = Math.floor(seconds / tfConfig.seconds) * tfConfig.seconds;

      if (!Number.isFinite(time) || time <= 0 || time >= currentCandleStart) return;

      deduped.set(time, {
        time,
        open,
        high: Math.max(high, open, close),
        low: Math.min(low, open, close),
        close,
        volume: Number.isFinite(volume) ? volume : 0,
      });
    });

    const sorted = Array.from(deduped.values()).sort((a, b) => a.time - b.time);
    const sanitized: OHLCCandle[] = [];

    sorted.forEach((candle) => {
      const previousClose = sanitized.length > 0 ? sanitized[sanitized.length - 1].close : undefined;
      if (!this.isPlausibleCandle(candle, tfConfig, previousClose)) {
        return;
      }

      sanitized.push(candle);
    });

    return sanitized;
  }

  generateHistory(tfConfig: TimeframeConfig): OHLCCandle[] {
    const cacheKey = `chart_history_v${HISTORY_CACHE_VERSION}_${this.symbol}_${tfConfig.label}`;
    const now = Math.floor(Date.now() / 1000);
    const currentCandleStart = Math.floor(now / tfConfig.seconds) * tfConfig.seconds;
    const targetLastTime = currentCandleStart - tfConfig.seconds;

    const buildFreshHistory = () => {
      const candles: OHLCCandle[] = [];
      const startTime = currentCandleStart - tfConfig.historical * tfConfig.seconds;

      for (let index = 0; index < tfConfig.historical; index += 1) {
        candles.push(this.generateCandle(startTime + index * tfConfig.seconds, tfConfig));
      }

      if (candles.length > 0) {
        const lastClose = candles[candles.length - 1].close;
        this.price = lastClose;
        this.basePrice = lastClose;
        this.velocity = 0;
      }

      sessionStorage.setItem(cacheKey, JSON.stringify(candles));
      return candles;
    };

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const sanitized = this.sanitizeCachedHistory(parsed, tfConfig, currentCandleStart);

        if (sanitized.length > 0) {
          const stitched = sanitized.slice();
          const lastCandle = stitched[stitched.length - 1];
          this.price = lastCandle.close;
          this.basePrice = lastCandle.close;
          this.velocity = 0;

          let nextTime = lastCandle.time + tfConfig.seconds;
          while (nextTime <= targetLastTime) {
            stitched.push(this.generateCandle(nextTime, tfConfig));
            nextTime += tfConfig.seconds;
          }

          const trimmed = stitched.slice(-tfConfig.historical);
          const expectedStart = currentCandleStart - tfConfig.historical * tfConfig.seconds;
          const isContiguous =
            trimmed.length === tfConfig.historical &&
            trimmed.every((candle, index) => candle.time === expectedStart + index * tfConfig.seconds);

          if (isContiguous) {
            const finalClose = trimmed[trimmed.length - 1].close;
            this.price = finalClose;
            this.basePrice = finalClose;
            this.velocity = 0;
            sessionStorage.setItem(cacheKey, JSON.stringify(trimmed));
            return trimmed;
          }
        }
      }
    } catch (error) {
      console.warn("Failed to parse chart history cache", error);
    }

    return buildFreshHistory();
  }
}
