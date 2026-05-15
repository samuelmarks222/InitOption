import { getAssetBasePrice, normalizeAssetSymbol } from "@/lib/assets";
import { calculateBollingerBands, calculateEma, calculateMacd, calculateRsi } from "@/components/trading/indicators/calculations";
import { OTCPriceEngine, TIMEFRAMES, type OHLCCandle } from "@/components/trading/engine/priceEngine";

export type SignalDirection = "higher" | "lower" | "neutral";
export type SignalTimeframe = "1m" | "5m" | "15m";

export interface SignalAssetInput {
  symbol?: string | null;
  name?: string | null;
  basePrice?: number | null;
  price?: number | null;
  category?: string | null;
  maxProfit?: number | null;
}

export interface VerifiedSignal {
  id: string;
  time: number;
  direction: Exclude<SignalDirection, "neutral">;
  confidence: number;
  entryPrice: number;
  exitPrice: number;
  result: "won" | "lost";
  movePercent: number;
}

export interface TradingSignalSnapshot {
  symbol: string;
  assetName: string;
  timeframe: SignalTimeframe;
  generatedAt: number;
  currentPrice: number;
  action: SignalDirection;
  confidence: number;
  score: number;
  strengthLabel: string;
  expiryLabel: string;
  support: number;
  resistance: number;
  rsi: number | null;
  macdBias: number | null;
  trendBias: number | null;
  reasons: string[];
  verifiedHistory: VerifiedSignal[];
  verifiedAccuracy: number | null;
  verifiedWins: number;
  verifiedLosses: number;
}

const SIGNAL_THRESHOLD = 22;
const HISTORY_HORIZON_BARS = 3;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const lastValue = <T,>(items: T[]) => items[items.length - 1];

const isUsableNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export const getSignalPricePrecision = (price: number) => {
  if (price > 10000) return 2;
  if (price > 100) return 3;
  if (price > 1) return 5;
  return 6;
};

const formatExpiryLabel = (timeframe: SignalTimeframe) => {
  if (timeframe === "1m") return "next 3 min";
  if (timeframe === "5m") return "next 15 min";
  return "next 45 min";
};

const resolveAsset = (asset?: SignalAssetInput) => {
  const storedSymbol =
    typeof window !== "undefined" ? window.localStorage.getItem("trading_active_tab") : null;
  const symbol = normalizeAssetSymbol(asset?.symbol || storedSymbol || "EUR/USD") || "EUR/USD";
  const category = asset?.category ?? null;
  const basePrice = isUsableNumber(asset?.basePrice) ? asset.basePrice : getAssetBasePrice(symbol, category);
  const currentPrice = isUsableNumber(asset?.price) ? asset.price : null;

  return {
    symbol,
    category,
    basePrice,
    currentPrice,
    name: asset?.name || symbol,
  };
};

const buildSignalCandles = (asset: SignalAssetInput | undefined, timeframe: SignalTimeframe, nowSec: number) => {
  const resolved = resolveAsset(asset);
  const config = TIMEFRAMES[timeframe];
  const engine = new OTCPriceEngine(resolved.symbol, resolved.basePrice, resolved.category);
  const closedCandles = engine.generateHistory(config, nowSec, Math.max(160, config.historical));
  const liveCandle = engine.generateLiveCandle(config, nowSec);

  if (resolved.currentPrice) {
    liveCandle.close = resolved.currentPrice;
    liveCandle.high = Math.max(liveCandle.high, resolved.currentPrice);
    liveCandle.low = Math.min(liveCandle.low, resolved.currentPrice);
  }

  return {
    asset: resolved,
    candles: [...closedCandles, liveCandle],
    closedCandles,
  };
};

const getDirectionalSignal = (score: number): SignalDirection => {
  if (score >= SIGNAL_THRESHOLD) return "higher";
  if (score <= -SIGNAL_THRESHOLD) return "lower";
  return "neutral";
};

const scoreCandles = (candles: OHLCCandle[]) => {
  const latestCandle = lastValue(candles);
  const currentPrice = latestCandle?.close ?? 0;

  if (!latestCandle || candles.length < 40 || !isUsableNumber(currentPrice)) {
    return {
      action: "neutral" as SignalDirection,
      confidence: 50,
      score: 0,
      support: currentPrice,
      resistance: currentPrice,
      rsi: null,
      macdBias: null,
      trendBias: null,
      reasons: ["Waiting for enough candles to build a reliable signal."],
    };
  }

  const emaFast = calculateEma(candles, 9);
  const emaSlow = calculateEma(candles, 21);
  const rsiSeries = calculateRsi(candles, 14);
  const macd = calculateMacd(candles, 12, 26, 9);
  const bollinger = calculateBollingerBands(candles, 20, 2);
  const recentCandles = candles.slice(-36);
  const support = Math.min(...recentCandles.map((candle) => candle.low));
  const resistance = Math.max(...recentCandles.map((candle) => candle.high));
  const fastNow = lastValue(emaFast)?.value;
  const fastPrev = emaFast[emaFast.length - 4]?.value ?? emaFast[emaFast.length - 2]?.value;
  const slowNow = lastValue(emaSlow)?.value;
  const rsiNow = lastValue(rsiSeries)?.value;
  const macdNow = lastValue(macd.macd)?.value;
  const macdSignal = lastValue(macd.signal)?.value;
  const macdHistogram = lastValue(macd.histogram)?.value;
  const upperBand = lastValue(bollinger.upper)?.value;
  const lowerBand = lastValue(bollinger.lower)?.value;
  const middleBand = lastValue(bollinger.middle)?.value;
  let score = 0;
  const reasons: string[] = [];

  if (Number.isFinite(fastNow) && Number.isFinite(slowNow)) {
    const trendSpread = ((fastNow - slowNow) / currentPrice) * 10000;
    const trendScore = clamp(trendSpread * 6, -24, 24);
    score += trendScore;
    reasons.push(
      trendScore >= 0
        ? "Fast EMA is above the slower EMA, showing upward structure."
        : "Fast EMA is below the slower EMA, showing downward structure.",
    );

    if (Number.isFinite(fastPrev)) {
      const slope = ((fastNow - fastPrev) / currentPrice) * 10000;
      const slopeScore = clamp(slope * 5, -12, 12);
      score += slopeScore;
      reasons.push(slopeScore >= 0 ? "Short-term momentum is rising." : "Short-term momentum is fading.");
    }
  }

  if (Number.isFinite(rsiNow)) {
    if (rsiNow <= 32) {
      score += 24;
      reasons.push("RSI is oversold, so a bounce setup is forming.");
    } else if (rsiNow >= 68) {
      score -= 24;
      reasons.push("RSI is overbought, so a pullback setup is forming.");
    } else if (rsiNow >= 55) {
      score += 10;
      reasons.push("RSI is holding above the midpoint.");
    } else if (rsiNow <= 45) {
      score -= 10;
      reasons.push("RSI is holding below the midpoint.");
    } else {
      reasons.push("RSI is neutral, so price action gets more weight.");
    }
  }

  if (Number.isFinite(macdNow) && Number.isFinite(macdSignal) && Number.isFinite(macdHistogram)) {
    const macdScore = macdNow >= macdSignal ? 18 : -18;
    const histogramScore = macdHistogram >= 0 ? 8 : -8;
    score += macdScore + histogramScore;
    reasons.push(macdScore >= 0 ? "MACD is above its signal line." : "MACD is below its signal line.");
  }

  if (Number.isFinite(upperBand) && Number.isFinite(lowerBand) && Number.isFinite(middleBand)) {
    const bandRange = Math.max(upperBand - lowerBand, currentPrice * 0.00001);
    const position = (currentPrice - lowerBand) / bandRange;

    if (position <= 0.14) {
      score += 18;
      reasons.push("Price is pressing the lower Bollinger zone.");
    } else if (position >= 0.86) {
      score -= 18;
      reasons.push("Price is pressing the upper Bollinger zone.");
    } else if (currentPrice >= middleBand) {
      score += 6;
      reasons.push("Price is above the Bollinger midpoint.");
    } else {
      score -= 6;
      reasons.push("Price is below the Bollinger midpoint.");
    }
  }

  const bullishCloses = candles.slice(-5).filter((candle) => candle.close >= candle.open).length;
  if (bullishCloses >= 4) {
    score += 8;
    reasons.push("Recent candles are mostly bullish.");
  } else if (bullishCloses <= 1) {
    score -= 8;
    reasons.push("Recent candles are mostly bearish.");
  }

  const normalizedScore = Math.round(clamp(score, -100, 100));
  const action = getDirectionalSignal(normalizedScore);
  const confidence =
    action === "neutral"
      ? Math.round(50 + Math.min(8, Math.abs(normalizedScore) * 0.2))
      : Math.round(clamp(52 + Math.abs(normalizedScore) * 0.42, 56, 92));

  return {
    action,
    confidence,
    score: normalizedScore,
    support,
    resistance,
    rsi: Number.isFinite(rsiNow) ? rsiNow : null,
    macdBias: Number.isFinite(macdHistogram) ? macdHistogram : null,
    trendBias:
      Number.isFinite(fastNow) && Number.isFinite(slowNow)
        ? ((fastNow - slowNow) / currentPrice) * 10000
        : null,
    reasons: reasons.slice(0, 5),
  };
};

const buildVerifiedHistory = (candles: OHLCCandle[], timeframe: SignalTimeframe) => {
  const history: VerifiedSignal[] = [];

  for (let index = 44; index < candles.length - HISTORY_HORIZON_BARS; index += 1) {
    const candleWindow = candles.slice(0, index + 1);
    const scored = scoreCandles(candleWindow);

    if (scored.action === "neutral" || scored.confidence < 58) {
      continue;
    }

    const entryCandle = candles[index];
    const exitCandle = candles[index + HISTORY_HORIZON_BARS];

    if (!entryCandle || !exitCandle) {
      continue;
    }

    const direction = scored.action;
    const won =
      direction === "higher" ? exitCandle.close > entryCandle.close : exitCandle.close < entryCandle.close;
    const movePercent = ((exitCandle.close - entryCandle.close) / entryCandle.close) * 100;

    history.push({
      id: `${timeframe}-${entryCandle.time}-${direction}`,
      time: entryCandle.time,
      direction,
      confidence: scored.confidence,
      entryPrice: entryCandle.close,
      exitPrice: exitCandle.close,
      result: won ? "won" : "lost",
      movePercent,
    });
  }

  return history.slice(-14).reverse();
};

export const buildTradingSignalSnapshot = (
  assetInput: SignalAssetInput | undefined,
  timeframe: SignalTimeframe,
  nowSec = Date.now() / 1000,
): TradingSignalSnapshot => {
  const { asset, candles, closedCandles } = buildSignalCandles(assetInput, timeframe, nowSec);
  const latestCandle = lastValue(candles);
  const scored = scoreCandles(candles);
  const verifiedHistory = buildVerifiedHistory(closedCandles, timeframe);
  const verifiedWins = verifiedHistory.filter((signal) => signal.result === "won").length;
  const verifiedLosses = verifiedHistory.filter((signal) => signal.result === "lost").length;
  const verificationCount = verifiedWins + verifiedLosses;
  const verifiedAccuracy = verificationCount > 0 ? Math.round((verifiedWins / verificationCount) * 100) : null;
  const currentPrice = latestCandle?.close ?? asset.currentPrice ?? asset.basePrice;
  const absoluteScore = Math.abs(scored.score);

  return {
    symbol: asset.symbol,
    assetName: asset.name,
    timeframe,
    generatedAt: nowSec,
    currentPrice,
    action: scored.action,
    confidence: scored.confidence,
    score: scored.score,
    strengthLabel:
      scored.action === "neutral"
        ? "No trade"
        : absoluteScore >= 70
          ? "Strong"
          : absoluteScore >= 46
            ? "Moderate"
            : "Early",
    expiryLabel: formatExpiryLabel(timeframe),
    support: scored.support,
    resistance: scored.resistance,
    rsi: scored.rsi,
    macdBias: scored.macdBias,
    trendBias: scored.trendBias,
    reasons: scored.reasons,
    verifiedHistory,
    verifiedAccuracy,
    verifiedWins,
    verifiedLosses,
  };
};
