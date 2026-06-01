import { normalizeAssetCategory, type AssetCategory } from "@/lib/assets";

export interface DeterministicMarketCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketProfile {
  driftAmplitude: number;
  driftScaleSeconds: number;
  swingAmplitude: number;
  swingScaleSeconds: number;
  pulseAmplitude: number;
  pulseScaleSeconds: number;
  microAmplitude: number;
  microScaleSeconds: number;
  cycleAmplitude: number;
  cycleSeconds: number;
  secondaryCycleAmplitude: number;
  secondaryCycleSeconds: number;
  tickAmplitude: number;
  tickScaleSeconds: number;
  volumeBase: number;
}

const TAU = Math.PI * 2;

const CATEGORY_PROFILES: Record<AssetCategory, MarketProfile> = {
  OTC: {
    driftAmplitude: 0.004,
    driftScaleSeconds: 18 * 60 * 60,
    swingAmplitude: 0.0018,
    swingScaleSeconds: 3 * 60 * 60,
    pulseAmplitude: 0.0012,
    pulseScaleSeconds: 8 * 60,
    microAmplitude: 0.0006,
    microScaleSeconds: 20,
    cycleAmplitude: 0.0013,
    cycleSeconds: 6 * 60 * 60,
    secondaryCycleAmplitude: 0.0007,
    secondaryCycleSeconds: 75 * 60,
    tickAmplitude: 0.00045,
    tickScaleSeconds: 1.1,
    volumeBase: 320,
  },
  CRYPTO: {
    driftAmplitude: 0.055,
    driftScaleSeconds: 20 * 60 * 60,
    swingAmplitude: 0.024,
    swingScaleSeconds: 4 * 60 * 60,
    pulseAmplitude: 0.011,
    pulseScaleSeconds: 12 * 60,
    microAmplitude: 0.0045,
    microScaleSeconds: 24,
    cycleAmplitude: 0.014,
    cycleSeconds: 8 * 60 * 60,
    secondaryCycleAmplitude: 0.007,
    secondaryCycleSeconds: 90 * 60,
    tickAmplitude: 0.0021,
    tickScaleSeconds: 1.3,
    volumeBase: 720,
  },
  STOCKS: {
    driftAmplitude: 0.022,
    driftScaleSeconds: 24 * 60 * 60,
    swingAmplitude: 0.009,
    swingScaleSeconds: 5 * 60 * 60,
    pulseAmplitude: 0.0035,
    pulseScaleSeconds: 15 * 60,
    microAmplitude: 0.0016,
    microScaleSeconds: 32,
    cycleAmplitude: 0.0065,
    cycleSeconds: 7 * 60 * 60,
    secondaryCycleAmplitude: 0.003,
    secondaryCycleSeconds: 2 * 60 * 60,
    tickAmplitude: 0.0008,
    tickScaleSeconds: 1.5,
    volumeBase: 460,
  },
  COMMODITIES: {
    driftAmplitude: 0.015,
    driftScaleSeconds: 22 * 60 * 60,
    swingAmplitude: 0.006,
    swingScaleSeconds: 4 * 60 * 60,
    pulseAmplitude: 0.0025,
    pulseScaleSeconds: 12 * 60,
    microAmplitude: 0.0011,
    microScaleSeconds: 30,
    cycleAmplitude: 0.0042,
    cycleSeconds: 6 * 60 * 60,
    secondaryCycleAmplitude: 0.0021,
    secondaryCycleSeconds: 90 * 60,
    tickAmplitude: 0.0005,
    tickScaleSeconds: 1.4,
    volumeBase: 390,
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hashString = (input: string) => {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const hashUnit = (symbol: string, salt: string) => hashString(`${salt}:${symbol}`) / 0xffffffff;

const signedHash = (symbol: string, salt: string) => hashUnit(symbol, salt) * 2 - 1;

const smoothstep = (value: number) => value * value * (3 - 2 * value);

const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

const noiseAt = (symbol: string, salt: string, position: number) => {
  const leftIndex = Math.floor(position);
  const rightIndex = leftIndex + 1;
  const amount = smoothstep(position - leftIndex);
  const leftNoise = signedHash(symbol, `${salt}:${leftIndex}`);
  const rightNoise = signedHash(symbol, `${salt}:${rightIndex}`);

  return lerp(leftNoise, rightNoise, amount);
};

const normalizeUnixSeconds = (timestamp: number) =>
  timestamp > 1_000_000_000_000 ? timestamp / 1000 : timestamp;

const getPricePrecision = (price: number) => {
  if (price > 10000) return 2;
  if (price > 100) return 3;
  if (price > 1) return 5;
  return 6;
};

const roundPrice = (value: number, referencePrice: number) => {
  const precision = getPricePrecision(referencePrice);
  return Number(value.toFixed(precision));
};

const HIGH_TIMEFRAME_PROFESSIONAL_SECONDS = 30 * 60;

const resolveProfile = (symbol: string, category?: string | null) =>
  CATEGORY_PROFILES[normalizeAssetCategory(category, symbol)];

const getHighTimeframeSmoothingWeight = (timeframeSeconds?: number) => {
  if (
    typeof timeframeSeconds !== "number" ||
    !Number.isFinite(timeframeSeconds) ||
    timeframeSeconds < HIGH_TIMEFRAME_PROFESSIONAL_SECONDS
  ) {
    return 0;
  }

  return clamp(
    0.15 + Math.log2(timeframeSeconds / HIGH_TIMEFRAME_PROFESSIONAL_SECONDS) / 5,
    0.15,
    1,
  );
};

const getDeterministicRelativeOffset = (
  normalizedSymbol: string,
  profile: MarketProfile,
  timestampSec: number,
  timeframeSeconds?: number,
) => {
  const primaryPhase = hashUnit(normalizedSymbol, "primary-phase") * TAU;
  const secondaryPhase = hashUnit(normalizedSymbol, "secondary-phase") * TAU;
  const smoothingWeight = getHighTimeframeSmoothingWeight(timeframeSeconds);
  const driftWeight = 1 + smoothingWeight * 0.2;
  const swingWeight = 1 + smoothingWeight * 0.85;
  const pulseWeight = 1 - smoothingWeight * 0.65;
  const microWeight = 1 - smoothingWeight * 0.96;
  const tickWeight = 1 - smoothingWeight;
  const cycleWeight = 1 + smoothingWeight * 0.42;
  const secondaryCycleWeight = 1 + smoothingWeight * 0.28;
  const macroShape =
    smoothingWeight *
    (
      noiseAt(normalizedSymbol, "macro-drift", timestampSec / (profile.driftScaleSeconds * 1.7)) *
        profile.driftAmplitude *
        0.3 +
      Math.sin((timestampSec / (profile.cycleSeconds * 2.35)) * TAU + hashUnit(normalizedSymbol, "macro-phase") * TAU) *
        profile.swingAmplitude *
        0.55
    );

  return (
    noiseAt(normalizedSymbol, "drift", timestampSec / profile.driftScaleSeconds) * profile.driftAmplitude * driftWeight +
    noiseAt(normalizedSymbol, "swing", timestampSec / profile.swingScaleSeconds) * profile.swingAmplitude * swingWeight +
    noiseAt(normalizedSymbol, "pulse", timestampSec / profile.pulseScaleSeconds) * profile.pulseAmplitude * pulseWeight +
    noiseAt(normalizedSymbol, "micro", timestampSec / profile.microScaleSeconds) * profile.microAmplitude * microWeight +
    noiseAt(normalizedSymbol, "tick", timestampSec / profile.tickScaleSeconds) * profile.tickAmplitude * tickWeight +
    Math.sin((timestampSec / profile.cycleSeconds) * TAU + primaryPhase) * profile.cycleAmplitude * cycleWeight +
    Math.sin((timestampSec / profile.secondaryCycleSeconds) * TAU + secondaryPhase) *
      profile.secondaryCycleAmplitude *
      secondaryCycleWeight +
    macroShape
  );
};

const getDeterministicPriceAtForTimeframe = ({
  symbol,
  basePrice,
  timestamp,
  category,
  timeframeSeconds,
}: {
  symbol: string;
  basePrice: number;
  timestamp: number;
  category?: string | null;
  timeframeSeconds?: number;
}) => {
  const safeBasePrice = Number.isFinite(basePrice) && basePrice > 0 ? basePrice : 1;
  const normalizedSymbol = String(symbol || "ASSET").toUpperCase();
  const profile = resolveProfile(normalizedSymbol, category);
  const timestampSec = normalizeUnixSeconds(timestamp);
  const relativeOffset = getDeterministicRelativeOffset(
    normalizedSymbol,
    profile,
    timestampSec,
    timeframeSeconds,
  );

  const price = safeBasePrice * Math.exp(relativeOffset);
  return Math.max(safeBasePrice * 0.25, price);
};

export const getDeterministicPriceAt = (input: {
  symbol: string;
  basePrice: number;
  timestamp: number;
  category?: string | null;
}) => getDeterministicPriceAtForTimeframe(input);

export const getDeterministicChange24h = ({
  symbol,
  basePrice,
  timestamp,
  category,
}: {
  symbol: string;
  basePrice: number;
  timestamp: number;
  category?: string | null;
}) => {
  const currentPrice = getDeterministicPriceAt({ symbol, basePrice, timestamp, category });
  const previousPrice = getDeterministicPriceAt({
    symbol,
    basePrice,
    timestamp: normalizeUnixSeconds(timestamp) - 24 * 60 * 60,
    category,
  });

  if (!Number.isFinite(previousPrice) || previousPrice <= 0) {
    return 0;
  }

  return ((currentPrice - previousPrice) / previousPrice) * 100;
};

const getPriceStep = (price: number) => Number(`1e-${getPricePrecision(price)}`);

const clampPriceToBounds = (price: number, basePrice: number) =>
  clamp(price, basePrice * 0.25, basePrice * 4);

const getSampleStepSeconds = (timeframeSeconds: number) => {
  if (timeframeSeconds <= 1) return 0.1;
  if (timeframeSeconds <= 5) return 1;
  if (timeframeSeconds <= 60) return 5;
  if (timeframeSeconds <= 15 * 60) return 15;
  if (timeframeSeconds < HIGH_TIMEFRAME_PROFESSIONAL_SECONDS) return 60;
  if (timeframeSeconds <= 60 * 60) return 2 * 60;
  if (timeframeSeconds <= 4 * 60 * 60) return 5 * 60;
  if (timeframeSeconds <= 12 * 60 * 60) return 15 * 60;
  if (timeframeSeconds <= 24 * 60 * 60) return 30 * 60;
  return Math.max(60 * 60, Math.floor(timeframeSeconds / 24));
};

const getInteriorProbeCount = (timeframeSeconds: number) => {
  if (timeframeSeconds <= 1) return 2;
  if (timeframeSeconds <= 60) return 1;
  return 0;
};

const getTargetWickDelta = (
  referencePrice: number,
  timeframeSeconds: number,
  targetWickPips?: number,
) => {
  const priceStep = getPriceStep(referencePrice);
  const configuredPips =
    typeof targetWickPips === "number" && Number.isFinite(targetWickPips) && targetWickPips > 0
      ? targetWickPips
      : timeframeSeconds <= 1
        ? 1
        : timeframeSeconds <= 5
          ? 2
          : timeframeSeconds <= 60
            ? 4
            : 6;
  const wickMultiplier =
    timeframeSeconds >= HIGH_TIMEFRAME_PROFESSIONAL_SECONDS
      ? 0.52
      : timeframeSeconds <= 1
        ? 1.18
        : timeframeSeconds <= 60
          ? 0.98
          : 0.86;

  return priceStep * configuredPips * wickMultiplier;
};

const getMaxWickLength = ({
  bodySize,
  priceStep,
  targetWickDelta,
  timeframeSeconds,
}: {
  bodySize: number;
  priceStep: number;
  targetWickDelta: number;
  timeframeSeconds: number;
}) => {
  const bodyFactor =
    timeframeSeconds >= HIGH_TIMEFRAME_PROFESSIONAL_SECONDS
      ? 0.42
      : timeframeSeconds <= 1
        ? 0.34
        : timeframeSeconds <= 60
          ? 0.54
          : 0.72;
  const wickFactor =
    timeframeSeconds >= HIGH_TIMEFRAME_PROFESSIONAL_SECONDS
      ? 0.3
      : timeframeSeconds <= 1
        ? 0.26
        : timeframeSeconds <= 60
          ? 0.42
          : 0.58;
  const minimumWick = priceStep * (timeframeSeconds <= 1 ? 1.1 : 1.6);

  return Math.max(minimumWick, bodySize * bodyFactor + targetWickDelta * wickFactor);
};

const buildInteriorProbePrices = ({
  symbol,
  basePrice,
  timeframeSeconds,
  startTimeSec,
  endTimeSec,
  category,
  targetWickDelta,
}: {
  symbol: string;
  basePrice: number;
  timeframeSeconds: number;
  startTimeSec: number;
  endTimeSec: number;
  category?: string | null;
  targetWickDelta: number;
}) => {
  const probeCount = getInteriorProbeCount(timeframeSeconds);
  if (probeCount === 0 || targetWickDelta <= 0) {
    return [];
  }

  const durationSeconds = Math.max(0.0001, endTimeSec - startTimeSec);
  const wickPhase = hashUnit(symbol, `wick-phase:${startTimeSec}`) * TAU;
  const wickFrequency = 1.6 + hashUnit(symbol, `wick-frequency:${timeframeSeconds}`) * 2.1;

  return Array.from({ length: probeCount }, (_, index) => {
    const fraction = (index + 1) / (probeCount + 1);
    const timestamp = startTimeSec + durationSeconds * fraction;
    const basePriceAtTime = getDeterministicPriceAtForTimeframe({
      symbol,
      basePrice,
      timestamp,
      category,
      timeframeSeconds,
    });
    const oscillation = Math.sin(fraction * TAU * wickFrequency + wickPhase);
    const jitter = noiseAt(symbol, "wick-noise", timestamp / Math.max(0.04, durationSeconds / 5));
    const impulse = noiseAt(symbol, "wick-impulse", (startTimeSec + index) / Math.max(1, timeframeSeconds));
    const displacement = targetWickDelta * (oscillation * 0.28 + jitter * 0.18 + impulse * 0.1);

    return clampPriceToBounds(basePriceAtTime + displacement, basePrice);
  });
};

export const buildDeterministicCandle = ({
  symbol,
  basePrice,
  timeframeSeconds,
  startTimeSec,
  endTimeSec,
  category,
  targetWickPips,
}: {
  symbol: string;
  basePrice: number;
  timeframeSeconds: number;
  startTimeSec: number;
  endTimeSec?: number;
  category?: string | null;
  targetWickPips?: number;
}): DeterministicMarketCandle => {
  const safeEndTimeSec = Math.max(startTimeSec, endTimeSec ?? startTimeSec + timeframeSeconds);
  const sampleStepSeconds = getSampleStepSeconds(timeframeSeconds);
  const sampleTimes = [startTimeSec];

  for (
    let sampleTime = startTimeSec + sampleStepSeconds;
    sampleTime < safeEndTimeSec;
    sampleTime += sampleStepSeconds
  ) {
    sampleTimes.push(sampleTime);
  }

  if (sampleTimes[sampleTimes.length - 1] !== safeEndTimeSec) {
    sampleTimes.push(safeEndTimeSec);
  }

  const prices = sampleTimes.map((timestamp) =>
    getDeterministicPriceAtForTimeframe({ symbol, basePrice, timestamp, category, timeframeSeconds }),
  );
  const rawOpen = prices[0];
  const rawClose = prices[prices.length - 1];
  const referencePrice = Math.max(rawOpen, rawClose, basePrice);
  const priceStep = getPriceStep(referencePrice);
  const targetWickDelta = getTargetWickDelta(referencePrice, timeframeSeconds, targetWickPips);
  const interiorProbePrices = buildInteriorProbePrices({
    symbol,
    basePrice,
    timeframeSeconds,
    startTimeSec,
    endTimeSec: safeEndTimeSec,
    category,
    targetWickDelta,
  });
  const sampledHigh = Math.max(...prices, ...interiorProbePrices);
  const sampledLow = Math.min(...prices, ...interiorProbePrices);
  const upperBody = Math.max(rawOpen, rawClose);
  const lowerBody = Math.min(rawOpen, rawClose);
  const bodySize = Math.abs(rawClose - rawOpen);
  const maxWickLength = getMaxWickLength({
    bodySize,
    priceStep,
    targetWickDelta,
    timeframeSeconds,
  });
  const wickBias = signedHash(symbol, `wick-bias:${startTimeSec}`);
  const upperWickMultiplier = wickBias > 0.72 ? 0.08 : wickBias < -0.08 ? 0.58 : 0.42;
  const lowerWickMultiplier = wickBias < -0.72 ? 0.08 : wickBias > 0.08 ? 0.58 : 0.42;
  const upperWickLength = Math.min(
    maxWickLength,
    Math.max(sampledHigh - upperBody, targetWickDelta * upperWickMultiplier),
  );
  const lowerWickLength = Math.min(
    maxWickLength,
    Math.max(lowerBody - sampledLow, targetWickDelta * lowerWickMultiplier),
  );
  const rawHigh = upperBody + upperWickLength;
  const rawLow = lowerBody - lowerWickLength;
  const profile = resolveProfile(symbol, category);
  const volumeNoise = (noiseAt(symbol, "volume", startTimeSec / Math.max(1, timeframeSeconds)) + 1) / 2;
  const bodyMagnitude = Math.abs(rawClose - rawOpen) / Math.max(rawOpen, 0.000001);
  const volume =
    profile.volumeBase *
    Math.sqrt(Math.max(1, timeframeSeconds / 5)) *
    (0.65 + volumeNoise * 0.85 + bodyMagnitude * 40);

  return {
    time: startTimeSec,
    open: roundPrice(rawOpen, referencePrice),
    high: roundPrice(rawHigh, referencePrice),
    low: roundPrice(rawLow, referencePrice),
    close: roundPrice(rawClose, referencePrice),
    volume: Math.max(1, Math.round(volume)),
  };
};

export const buildDeterministicClosedCandles = ({
  symbol,
  basePrice,
  timeframeSeconds,
  candleCount,
  nowSec,
  category,
  targetWickPips,
}: {
  symbol: string;
  basePrice: number;
  timeframeSeconds: number;
  candleCount: number;
  nowSec?: number;
  category?: string | null;
  targetWickPips?: number;
}) => {
  const currentTimeSec = normalizeUnixSeconds(nowSec ?? Date.now() / 1000);
  const currentBucketStart = Math.floor(currentTimeSec / timeframeSeconds) * timeframeSeconds;
  const firstBucketStart = currentBucketStart - candleCount * timeframeSeconds;
  const candles: DeterministicMarketCandle[] = [];

  for (let index = 0; index < candleCount; index += 1) {
    const candleStart = firstBucketStart + index * timeframeSeconds;
    candles.push(
      buildDeterministicCandle({
        symbol,
        basePrice,
        timeframeSeconds,
        startTimeSec: candleStart,
        endTimeSec: candleStart + timeframeSeconds,
        category,
        targetWickPips,
      }),
    );
  }

  return candles;
};

export const aggregateDeterministicCandles = ({
  candles,
  targetSeconds,
  nowSec,
}: {
  candles: DeterministicMarketCandle[];
  targetSeconds: number;
  nowSec?: number;
}) => {
  if (candles.length === 0) {
    return [];
  }

  const currentTargetStart =
    Math.floor(normalizeUnixSeconds(nowSec ?? Date.now() / 1000) / targetSeconds) * targetSeconds;
  const grouped = new Map<number, DeterministicMarketCandle[]>();

  candles.forEach((candle) => {
    const bucketStart = Math.floor(candle.time / targetSeconds) * targetSeconds;
    if (bucketStart >= currentTargetStart) {
      return;
    }

    const bucket = grouped.get(bucketStart) ?? [];
    bucket.push(candle);
    grouped.set(bucketStart, bucket);
  });

  return Array.from(grouped.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([time, bucket]) => ({
      time,
      open: bucket[0].open,
      high: Math.max(...bucket.map((candle) => candle.high)),
      low: Math.min(...bucket.map((candle) => candle.low)),
      close: bucket[bucket.length - 1].close,
      volume: bucket.reduce((total, candle) => total + candle.volume, 0),
    }));
};

export const getClampedPriceAt = ({
  symbol,
  basePrice,
  timestamp,
  minimumRatio = 0.25,
  maximumRatio = 4,
  category,
  timeframeSeconds,
}: {
  symbol: string;
  basePrice: number;
  timestamp: number;
  minimumRatio?: number;
  maximumRatio?: number;
  category?: string | null;
  timeframeSeconds?: number;
}) => {
  const safeBasePrice = Number.isFinite(basePrice) && basePrice > 0 ? basePrice : 1;
  const rawPrice = getDeterministicPriceAtForTimeframe({
    symbol,
    basePrice: safeBasePrice,
    timestamp,
    category,
    timeframeSeconds,
  });
  return clamp(rawPrice, safeBasePrice * minimumRatio, safeBasePrice * maximumRatio);
};
