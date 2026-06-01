import {
  aggregateDeterministicCandles,
  buildDeterministicCandle,
  buildDeterministicClosedCandles,
  getClampedPriceAt,
} from "@/lib/deterministicMarket";

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

export const SUPPORTED_CHART_TIMEFRAMES = [
  "5s",
  "15s",
  "30s",
  "1m",
  "2m",
  "3m",
  "4m",
  "5m",
  "10m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "1D",
] as const;

export type SupportedChartTimeframe = (typeof SUPPORTED_CHART_TIMEFRAMES)[number];

export const TIMEFRAMES: Record<string, TimeframeConfig> = {
  "1s": { label: "1s", seconds: 1, updateIntervalMs: 40, historical: 360, bodyPips: 1.5, wickPips: 1 },
  "5s": { label: "5s", seconds: 5, updateIntervalMs: 50, historical: 320, bodyPips: 3, wickPips: 1 },
  "15s": { label: "15s", seconds: 15, updateIntervalMs: 60, historical: 280, bodyPips: 5, wickPips: 1 },
  "30s": { label: "30s", seconds: 30, updateIntervalMs: 80, historical: 260, bodyPips: 6, wickPips: 1 },
  "1m": { label: "1m", seconds: 60, updateIntervalMs: 100, historical: 240, bodyPips: 8, wickPips: 6 },
  "2m": { label: "2m", seconds: 120, updateIntervalMs: 150, historical: 232, bodyPips: 11, wickPips: 8 },
  "3m": { label: "3m", seconds: 180, updateIntervalMs: 190, historical: 228, bodyPips: 13, wickPips: 9 },
  "4m": { label: "4m", seconds: 240, updateIntervalMs: 220, historical: 224, bodyPips: 15, wickPips: 10 },
  "5m": { label: "5m", seconds: 300, updateIntervalMs: 250, historical: 220, bodyPips: 18, wickPips: 12 },
  "10m": { label: "10m", seconds: 600, updateIntervalMs: 350, historical: 200, bodyPips: 24, wickPips: 16 },
  "15m": { label: "15m", seconds: 900, updateIntervalMs: 500, historical: 190, bodyPips: 30, wickPips: 20 },
  "30m": { label: "30m", seconds: 1800, updateIntervalMs: 1000, historical: 180, bodyPips: 34, wickPips: 6 },
  "1h": { label: "1h", seconds: 3600, updateIntervalMs: 1500, historical: 160, bodyPips: 46, wickPips: 6 },
  "2h": { label: "2h", seconds: 7200, updateIntervalMs: 2000, historical: 150, bodyPips: 58, wickPips: 6 },
  "4h": { label: "4h", seconds: 14400, updateIntervalMs: 3000, historical: 140, bodyPips: 74, wickPips: 6 },
  "1D": { label: "1D", seconds: 86400, updateIntervalMs: 5000, historical: 110, bodyPips: 116, wickPips: 6 },
};

const HIGH_TIMEFRAME_DIRECT_SECONDS = 30 * 60;
const HISTORY_CACHE_VERSION = 10;
const HISTORY_MEMORY_CACHE_LIMIT = 48;
const historyMemoryCache = new Map<string, OHLCCandle[]>();

const cloneCandles = (candles: OHLCCandle[]) => candles.map((candle) => ({ ...candle }));

const writeMemoryHistoryCache = (cacheKey: string, candles: OHLCCandle[]) => {
  if (historyMemoryCache.has(cacheKey)) {
    historyMemoryCache.delete(cacheKey);
  }

  historyMemoryCache.set(cacheKey, cloneCandles(candles));

  while (historyMemoryCache.size > HISTORY_MEMORY_CACHE_LIMIT) {
    const oldestKey = historyMemoryCache.keys().next().value;
    if (!oldestKey) break;
    historyMemoryCache.delete(oldestKey);
  }
};

const readMemoryHistoryCache = (cacheKey: string) => {
  const cached = historyMemoryCache.get(cacheKey);
  return cached ? cloneCandles(cached) : null;
};

export class OTCPriceEngine {
  private price: number;
  private readonly basePrice: number;
  private readonly symbol: string;
  private readonly category?: string | null;

  constructor(symbol: string, basePrice: number, category?: string | null) {
    const safePrice =
      typeof basePrice === "number" && Number.isFinite(basePrice) && basePrice > 0 ? basePrice : 1;

    this.symbol = symbol || "EUR/USD";
    this.basePrice = safePrice;
    this.category = category;
    this.price = safePrice;
  }

  private getClosedHistory(tfConfig: TimeframeConfig, candleCount: number, nowSec: number) {
    const currentBucketStart = Math.floor(nowSec / tfConfig.seconds) * tfConfig.seconds;
    const cacheKey =
      `deterministic_history_v${HISTORY_CACHE_VERSION}_` +
      `${this.symbol}_${this.basePrice.toFixed(8)}_${tfConfig.label}_${candleCount}_${currentBucketStart}`;
    const cached = readMemoryHistoryCache(cacheKey);

    if (cached) {
      return cached;
    }

    const candles = buildDeterministicClosedCandles({
      symbol: this.symbol,
      basePrice: this.basePrice,
      timeframeSeconds: tfConfig.seconds,
      candleCount,
      nowSec,
      category: this.category,
      targetWickPips: tfConfig.wickPips,
    }) as OHLCCandle[];

    writeMemoryHistoryCache(cacheKey, candles);
    return candles;
  }

  private aggregateFromBase(
    tfConfig: TimeframeConfig,
    baseConfig: TimeframeConfig,
    nowSec: number,
  ): OHLCCandle[] {
    const requiredBaseCandles = Math.ceil((tfConfig.historical * tfConfig.seconds) / baseConfig.seconds) + 2;
    const baseHistory = this.getClosedHistory(baseConfig, requiredBaseCandles, nowSec);

    if (tfConfig.seconds === baseConfig.seconds) {
      return baseHistory.slice(-tfConfig.historical);
    }

    return aggregateDeterministicCandles({
      candles: baseHistory,
      targetSeconds: tfConfig.seconds,
      nowSec,
    }).slice(-tfConfig.historical) as OHLCCandle[];
  }

  tick(_perTickVol = 0.3, timestampSec = Date.now() / 1000): number {
    return this.getCurrentPriceAt(timestampSec);
  }

  getCurrentPrice(): number {
    return this.price;
  }

  getCurrentPriceAt(timestampSec = Date.now() / 1000, timeframeSeconds?: number): number {
    this.price = getClampedPriceAt({
      symbol: this.symbol,
      basePrice: this.basePrice,
      timestamp: timestampSec,
      category: this.category,
      timeframeSeconds,
    });

    return this.price;
  }

  setPrice(price: number) {
    if (typeof price === "number" && Number.isFinite(price) && price > 0) {
      this.price = price;
    }
  }

  generateLiveCandle(tfConfig: TimeframeConfig, nowSec = Date.now() / 1000): OHLCCandle {
    const currentBucketStart = Math.floor(nowSec / tfConfig.seconds) * tfConfig.seconds;
    const liveCandle = buildDeterministicCandle({
      symbol: this.symbol,
      basePrice: this.basePrice,
      timeframeSeconds: tfConfig.seconds,
      startTimeSec: currentBucketStart,
      endTimeSec: nowSec,
      category: this.category,
      targetWickPips: tfConfig.wickPips,
    }) as OHLCCandle;

    this.price = liveCandle.close;
    return liveCandle;
  }

  generateHistory(
    tfConfig: TimeframeConfig,
    nowSec = Date.now() / 1000,
    candleCount = tfConfig.historical,
  ): OHLCCandle[] {
    const effectiveConfig: TimeframeConfig = {
      ...tfConfig,
      historical: Math.max(1, Math.floor(candleCount)),
    };
    let candles: OHLCCandle[];

    if (effectiveConfig.seconds >= HIGH_TIMEFRAME_DIRECT_SECONDS) {
      candles = this.getClosedHistory(effectiveConfig, effectiveConfig.historical, nowSec);
    } else if (effectiveConfig.seconds >= TIMEFRAMES["5s"].seconds) {
      candles = this.getClosedHistory(effectiveConfig, effectiveConfig.historical, nowSec);
    } else if (effectiveConfig.seconds <= TIMEFRAMES["1h"].seconds) {
      candles = this.aggregateFromBase(effectiveConfig, TIMEFRAMES["1m"], nowSec);
    } else if (effectiveConfig.seconds <= TIMEFRAMES["1D"].seconds) {
      candles = this.aggregateFromBase(effectiveConfig, TIMEFRAMES["1h"], nowSec);
    } else {
      candles = this.getClosedHistory(effectiveConfig, effectiveConfig.historical, nowSec);
    }

    const lastClose = candles[candles.length - 1]?.close;
    if (typeof lastClose === "number" && Number.isFinite(lastClose) && lastClose > 0) {
      this.price = lastClose;
    } else {
      this.price = this.getCurrentPriceAt(nowSec);
    }

    return candles;
  }
}
