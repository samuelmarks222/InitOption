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
  volumeBase: number;
}

const TAU = Math.PI * 2;

const CATEGORY_PROFILES: Record<AssetCategory, MarketProfile> = {
  OTC: {
    driftAmplitude: 0.006,
    driftScaleSeconds: 18 * 60 * 60,
    swingAmplitude: 0.003,
    swingScaleSeconds: 3 * 60 * 60,
    pulseAmplitude: 0.0015,
    pulseScaleSeconds: 8 * 60,
    microAmplitude: 0.0006,
    microScaleSeconds: 45,
    cycleAmplitude: 0.0022,
    cycleSeconds: 6 * 60 * 60,
    secondaryCycleAmplitude: 0.0012,
    secondaryCycleSeconds: 75 * 60,
    volumeBase: 320,
  },
  CRYPTO: {
    driftAmplitude: 0.07,
    driftScaleSeconds: 20 * 60 * 60,
    swingAmplitude: 0.03,
    swingScaleSeconds: 4 * 60 * 60,
    pulseAmplitude: 0.014,
    pulseScaleSeconds: 12 * 60,
    microAmplitude: 0.006,
    microScaleSeconds: 30,
    cycleAmplitude: 0.018,
    cycleSeconds: 8 * 60 * 60,
    secondaryCycleAmplitude: 0.009,
    secondaryCycleSeconds: 90 * 60,
    volumeBase: 720,
  },
  STOCKS: {
    driftAmplitude: 0.03,
    driftScaleSeconds: 24 * 60 * 60,
    swingAmplitude: 0.012,
    swingScaleSeconds: 5 * 60 * 60,
    pulseAmplitude: 0.005,
    pulseScaleSeconds: 15 * 60,
    microAmplitude: 0.0022,
    microScaleSeconds: 45,
    cycleAmplitude: 0.009,
    cycleSeconds: 7 * 60 * 60,
    secondaryCycleAmplitude: 0.004,
    secondaryCycleSeconds: 2 * 60 * 60,
    volumeBase: 460,
  },
  COMMODITIES: {
    driftAmplitude: 0.02,
    driftScaleSeconds: 22 * 60 * 60,
    swingAmplitude: 0.008,
    swingScaleSeconds: 4 * 60 * 60,
    pulseAmplitude: 0.0035,
    pulseScaleSeconds: 12 * 60,
    microAmplitude: 0.0016,
    microScaleSeconds: 45,
    cycleAmplitude: 0.006,
    cycleSeconds: 6 * 60 * 60,
    secondaryCycleAmplitude: 0.003,
    secondaryCycleSeconds: 90 * 60,
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

const resolveProfile = (symbol: string, category?: string | null) =>
  CATEGORY_PROFILES[normalizeAssetCategory(category, symbol)];

export const getDeterministicPriceAt = ({
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
  const safeBasePrice = Number.isFinite(basePrice) && basePrice > 0 ? basePrice : 1;
  const normalizedSymbol = String(symbol || "ASSET").toUpperCase();
  const profile = resolveProfile(normalizedSymbol, category);
  const timestampSec = normalizeUnixSeconds(timestamp);
  const primaryPhase = hashUnit(normalizedSymbol, "primary-phase") * TAU;
  const secondaryPhase = hashUnit(normalizedSymbol, "secondary-phase") * TAU;

  const relativeOffset =
    noiseAt(normalizedSymbol, "drift", timestampSec / profile.driftScaleSeconds) * profile.driftAmplitude +
    noiseAt(normalizedSymbol, "swing", timestampSec / profile.swingScaleSeconds) * profile.swingAmplitude +
    noiseAt(normalizedSymbol, "pulse", timestampSec / profile.pulseScaleSeconds) * profile.pulseAmplitude +
    noiseAt(normalizedSymbol, "micro", timestampSec / profile.microScaleSeconds) * profile.microAmplitude +
    Math.sin((timestampSec / profile.cycleSeconds) * TAU + primaryPhase) * profile.cycleAmplitude +
    Math.sin((timestampSec / profile.secondaryCycleSeconds) * TAU + secondaryPhase) *
      profile.secondaryCycleAmplitude;

  const price = safeBasePrice * Math.exp(relativeOffset);
  return Math.max(safeBasePrice * 0.25, price);
};

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

const getSampleStepSeconds = (timeframeSeconds: number) => {
  if (timeframeSeconds <= 5) return 1;
  if (timeframeSeconds <= 60) return 5;
  if (timeframeSeconds <= 15 * 60) return 15;
  if (timeframeSeconds <= 60 * 60) return 60;
  if (timeframeSeconds <= 24 * 60 * 60) return 5 * 60;
  return Math.max(60 * 60, Math.floor(timeframeSeconds / 24));
};

export const buildDeterministicCandle = ({
  symbol,
  basePrice,
  timeframeSeconds,
  startTimeSec,
  endTimeSec,
  category,
}: {
  symbol: string;
  basePrice: number;
  timeframeSeconds: number;
  startTimeSec: number;
  endTimeSec?: number;
  category?: string | null;
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
    getDeterministicPriceAt({ symbol, basePrice, timestamp, category }),
  );
  const rawOpen = prices[0];
  const rawClose = prices[prices.length - 1];
  const rawHigh = Math.max(...prices);
  const rawLow = Math.min(...prices);
  const profile = resolveProfile(symbol, category);
  const volumeNoise = (noiseAt(symbol, "volume", startTimeSec / Math.max(1, timeframeSeconds)) + 1) / 2;
  const bodyMagnitude = Math.abs(rawClose - rawOpen) / Math.max(rawOpen, 0.000001);
  const volume =
    profile.volumeBase *
    Math.sqrt(Math.max(1, timeframeSeconds / 5)) *
    (0.65 + volumeNoise * 0.85 + bodyMagnitude * 40);
  const referencePrice = Math.max(rawOpen, rawClose, basePrice);

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
}: {
  symbol: string;
  basePrice: number;
  timeframeSeconds: number;
  candleCount: number;
  nowSec?: number;
  category?: string | null;
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
}: {
  symbol: string;
  basePrice: number;
  timestamp: number;
  minimumRatio?: number;
  maximumRatio?: number;
  category?: string | null;
}) => {
  const safeBasePrice = Number.isFinite(basePrice) && basePrice > 0 ? basePrice : 1;
  const rawPrice = getDeterministicPriceAt({ symbol, basePrice: safeBasePrice, timestamp, category });
  return clamp(rawPrice, safeBasePrice * minimumRatio, safeBasePrice * maximumRatio);
};
