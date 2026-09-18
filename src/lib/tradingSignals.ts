import { getAssetBasePrice, normalizeAssetSymbol } from "@/lib/assets";
import { calculateBollingerBands, calculateEma, calculateMacd, calculateRsi } from "@/components/trading/indicators/calculations";
import { OTCPriceEngine, TIMEFRAMES, type OHLCCandle } from "@/components/trading/engine/priceEngine";
import { Stochastic, ADX, ATR } from "technicalindicators";

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
  stochasticK: number | null;
  stochasticD: number | null;
  adx: number | null;
  atr: number | null;
  volatilityLabel: string;
  mtfConfirmation: SignalDirection | null;
  mtfConfidence: number;
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
      stochasticK: null,
      stochasticD: null,
      adx: null,
      atr: null,
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

  // --- Stochastic Oscillator (14,3,3) ---
  let stochasticK: number | null = null;
  let stochasticD: number | null = null;
  try {
    const stochInput = candles.slice(-20).map((c) => ({ high: c.high, low: c.low, close: c.close }));
    if (stochInput.length >= 17) {
      const stochResult = Stochastic.calculate({ high: stochInput.map(c => c.high), low: stochInput.map(c => c.low), close: stochInput.map(c => c.close), period: 14, signalPeriod: 3 });
      if (stochResult.length > 0) {
        const lastStoch = lastValue(stochResult);
        stochasticK = lastStoch?.k ?? null;
        stochasticD = lastStoch?.d ?? null;
      }
    }
  } catch { /* Stochastic needs enough data */ }

  // --- ADX (14-period) ---
  let adx: number | null = null;
  try {
    const adxInput = candles.slice(-30).map((c) => ({ high: c.high, low: c.low, close: c.close }));
    if (adxInput.length >= 28) {
      const adxResult = ADX.calculate({ high: adxInput.map(c => c.high), low: adxInput.map(c => c.low), close: adxInput.map(c => c.close), period: 14 });
      if (adxResult.length > 0) {
        adx = lastValue(adxResult)?.adx ?? null;
      }
    }
  } catch { /* ADX needs enough data */ }

  // --- ATR (14-period) for volatility ---
  let atr: number | null = null;
  try {
    const atrInput = candles.slice(-20).map((c) => ({ high: c.high, low: c.low, close: c.close }));
    if (atrInput.length >= 15) {
      const atrResult = ATR.calculate({ high: atrInput.map(c => c.high), low: atrInput.map(c => c.low), close: atrInput.map(c => c.close), period: 14 });
      if (atrResult.length > 0) {
        atr = lastValue(atrResult);
      }
    }
  } catch { /* ATR needs enough data */ }

  let score = 0;
  const reasons: string[] = [];

  // --- EMA Trend & Slope (max +/-36) ---
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

  // --- RSI (max +/-24) ---
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

  // --- MACD (max +/-26) ---
  if (Number.isFinite(macdNow) && Number.isFinite(macdSignal) && Number.isFinite(macdHistogram)) {
    const macdScore = macdNow >= macdSignal ? 18 : -18;
    const histogramScore = macdHistogram >= 0 ? 8 : -8;
    score += macdScore + histogramScore;
    reasons.push(macdScore >= 0 ? "MACD is above its signal line." : "MACD is below its signal line.");
  }

  // --- Bollinger Bands (max +/-18) ---
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

  // --- Stochastic Oscillator (max +/-18) ---
  if (Number.isFinite(stochasticK) && Number.isFinite(stochasticD)) {
    if (stochasticK <= 20) {
      score += 18;
      reasons.push("Stochastic is oversold with a potential bullish crossover.");
    } else if (stochasticK >= 80) {
      score -= 18;
      reasons.push("Stochastic is overbought with a potential bearish crossover.");
    } else if (stochasticK > stochasticD) {
      score += 8;
      reasons.push("Stochastic K is above D, showing bullish momentum.");
    } else {
      score -= 8;
      reasons.push("Stochastic K is below D, showing bearish momentum.");
    }
  }

  // --- ADX trend strength filter (max +/-10) ---
  if (Number.isFinite(adx)) {
    if (adx < 18) {
      // Weak trend — reduce confidence, neutral signal
      const penalty = Math.min(10, Math.round((18 - adx) * 0.8));
      score = Math.round(score * (1 - penalty / 100));
      reasons.push(`ADX at ${adx.toFixed(1)} shows a weak trend — signals may be less reliable.`);
    } else if (adx >= 30) {
      // Strong trend — amplify the existing direction
      const boost = Math.min(10, Math.round((adx - 30) * 0.5));
      score = score >= 0 ? score + boost : score - boost;
      reasons.push(`ADX at ${adx.toFixed(1)} confirms a strong trending market.`);
    } else {
      reasons.push(`ADX at ${adx.toFixed(1)} shows moderate trend strength.`);
    }
  }

  // --- ATR volatility context ---
  // ATR is informational, not scored directly but used for volatility label

  // --- Recent candle sentiment (max +/-8) ---
  const bullishCloses = candles.slice(-5).filter((candle) => candle.close >= candle.open).length;
  if (bullishCloses >= 4) {
    score += 8;
    reasons.push("Recent candles are mostly bullish.");
  } else if (bullishCloses <= 1) {
    score -= 8;
    reasons.push("Recent candles are mostly bearish.");
  }

  // --- Price action near support/resistance (max +/-6) ---
  const rangeSize = resistance - support;
  if (rangeSize > 0) {
    const pricePosition = (currentPrice - support) / rangeSize;
    if (pricePosition <= 0.15) {
      score += 6;
      reasons.push("Price is near support — potential bounce zone.");
    } else if (pricePosition >= 0.85) {
      score -= 6;
      reasons.push("Price is near resistance — potential reversal zone.");
    }
  }

  const normalizedScore = Math.round(clamp(score, -100, 100));
  const action = getDirectionalSignal(normalizedScore);

  // --- Improved confidence calculation ---
  // Base confidence from score magnitude, adjusted by indicator agreement
  const absScore = Math.abs(normalizedScore);
  let confidence: number;

  if (action === "neutral") {
    confidence = Math.round(50 + Math.min(8, absScore * 0.2));
  } else {
    // Count how many indicators agree with the signal direction
    let agreementCount = 0;
    let totalIndicators = 0;

    if (Number.isFinite(fastNow) && Number.isFinite(slowNow)) {
      totalIndicators++;
      if ((fastNow > slowNow) === (action === "higher")) agreementCount++;
    }
    if (Number.isFinite(rsiNow)) {
      totalIndicators++;
      if (action === "higher" ? rsiNow < 55 : rsiNow > 45) agreementCount++;
      else if (action === "higher" ? rsiNow <= 32 : rsiNow >= 68) agreementCount++; // oversold/overbought reversal
    }
    if (Number.isFinite(macdNow) && Number.isFinite(macdSignal)) {
      totalIndicators++;
      if ((macdNow >= macdSignal) === (action === "higher")) agreementCount++;
    }
    if (Number.isFinite(stochasticK) && Number.isFinite(stochasticD)) {
      totalIndicators++;
      if ((stochasticK > stochasticD) === (action === "higher")) agreementCount++;
      else if (action === "higher" ? stochasticK <= 20 : stochasticK >= 80) agreementCount++;
    }
    if (Number.isFinite(adx) && adx >= 20) {
      totalIndicators++;
      agreementCount++; // strong trend always supports the direction
    }

    const agreementRatio = totalIndicators > 0 ? agreementCount / totalIndicators : 0.5;
    const baseConfidence = 52 + absScore * 0.38;
    const agreementBonus = agreementRatio * 12;
    confidence = Math.round(clamp(baseConfidence + agreementBonus, 56, 95));
  }

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
    stochasticK: Number.isFinite(stochasticK) ? stochasticK : null,
    stochasticD: Number.isFinite(stochasticD) ? stochasticD : null,
    adx: Number.isFinite(adx) ? adx : null,
    atr: Number.isFinite(atr) ? atr : null,
    reasons: reasons.slice(0, 6),
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

/**
 * Multi-timeframe confirmation: checks if adjacent timeframes agree on direction.
 * Higher TF confirmation boosts confidence; disagreement reduces it.
 */
const buildMtfConfirmation = (
  assetInput: SignalAssetInput | undefined,
  primaryTimeframe: SignalTimeframe,
  nowSec: number,
): { direction: SignalDirection | null; confidence: number } => {
  const tfOrder: SignalTimeframe[] = ["1m", "5m", "15m"];
  const idx = tfOrder.indexOf(primaryTimeframe);
  const adjacentTFs = tfOrder.filter((_, i) => i !== idx);

  let agreeCount = 0;
  let totalAdjacent = 0;
  let detectedDirection: SignalDirection | null = null;

  for (const tf of adjacentTFs) {
    const { candles } = buildSignalCandles(assetInput, tf, nowSec);
    const scored = scoreCandles(candles);
    if (scored.action === "neutral") continue;

    totalAdjacent++;
    if (detectedDirection === null) {
      detectedDirection = scored.action;
    }
    if (scored.action === detectedDirection) {
      agreeCount++;
    }
  }

  if (totalAdjacent === 0) return { direction: null, confidence: 0 };

  const ratio = agreeCount / totalAdjacent;
  const confirmed = ratio >= 0.5;
  const confidence = Math.round(ratio * 100);

  return {
    direction: confirmed ? detectedDirection : null,
    confidence,
  };
};

const getVolatilityLabel = (atr: number | null, currentPrice: number): string => {
  if (!atr || !currentPrice || !Number.isFinite(atr) || !Number.isFinite(currentPrice)) return "Normal";
  const atrPercent = (atr / currentPrice) * 100;
  if (atrPercent > 1.5) return "High";
  if (atrPercent > 0.8) return "Normal";
  if (atrPercent > 0.3) return "Low";
  return "Very Low";
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

  // Multi-timeframe confirmation
  const mtf = buildMtfConfirmation(assetInput, timeframe, nowSec);

  // Apply MTF boost/penalty to final score
  let finalScore = scored.score;
  let finalConfidence = scored.confidence;

  if (mtf.direction !== null && mtf.direction === scored.action) {
    // Agreement: boost confidence
    finalConfidence = Math.round(clamp(finalConfidence + mtf.confidence * 0.08, 56, 96));
    finalScore = Math.round(clamp(finalScore + Math.sign(finalScore) * 4, -100, 100));
  } else if (mtf.direction !== null && mtf.direction !== scored.action) {
    // Disagreement: reduce confidence
    finalConfidence = Math.round(clamp(finalConfidence - mtf.confidence * 0.06, 50, 95));
    finalScore = Math.round(clamp(finalScore * 0.85, -100, 100));
  }

  const absoluteScore = Math.abs(finalScore);
  const action = getDirectionalSignal(finalScore);

  return {
    symbol: asset.symbol,
    assetName: asset.name,
    timeframe,
    generatedAt: nowSec,
    currentPrice,
    action,
    confidence: finalConfidence,
    score: finalScore,
    strengthLabel:
      action === "neutral"
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
    stochasticK: scored.stochasticK,
    stochasticD: scored.stochasticD,
    adx: scored.adx,
    atr: scored.atr,
    volatilityLabel: getVolatilityLabel(scored.atr, currentPrice),
    mtfConfirmation: mtf.direction,
    mtfConfidence: mtf.confidence,
    reasons: scored.reasons,
    verifiedHistory,
    verifiedAccuracy,
    verifiedWins,
    verifiedLosses,
  };
};
