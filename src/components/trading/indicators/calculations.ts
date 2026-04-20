import { BollingerBands, EMA, MACD, RSI, SMA } from "technicalindicators";
import type { OHLCCandle } from "../engine/priceEngine";

export interface IndicatorLinePoint {
  time: number;
  value: number;
}

export interface MacdResult {
  macd: IndicatorLinePoint[];
  signal: IndicatorLinePoint[];
  histogram: IndicatorLinePoint[];
}

export interface BollingerResult {
  upper: IndicatorLinePoint[];
  middle: IndicatorLinePoint[];
  lower: IndicatorLinePoint[];
}

const sanitizePeriod = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.max(1, Math.floor(numeric)) : fallback;
};

const sanitizeStdDev = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
};

const toCloseSeries = (candles: OHLCCandle[]) => candles.map((candle) => candle.close);

const alignToTimes = (candles: OHLCCandle[], values: number[]): IndicatorLinePoint[] => {
  if (values.length === 0 || candles.length === 0) {
    return [];
  }

  const startIndex = Math.max(0, candles.length - values.length);
  const points: IndicatorLinePoint[] = [];

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const candle = candles[startIndex + index];

    if (!candle || !Number.isFinite(value)) {
      continue;
    }

    points.push({
      time: candle.time,
      value,
    });
  }

  return points;
};

export const calculateSma = (candles: OHLCCandle[], periodInput: unknown) => {
  const period = sanitizePeriod(periodInput, 20);
  const values = SMA.calculate({
    period,
    values: toCloseSeries(candles),
  });

  return alignToTimes(candles, values);
};

export const calculateEma = (candles: OHLCCandle[], periodInput: unknown) => {
  const period = sanitizePeriod(periodInput, 20);
  const values = EMA.calculate({
    period,
    values: toCloseSeries(candles),
  });

  return alignToTimes(candles, values);
};

export const calculateRsi = (candles: OHLCCandle[], periodInput: unknown) => {
  const period = sanitizePeriod(periodInput, 14);
  const values = RSI.calculate({
    period,
    values: toCloseSeries(candles),
  });

  return alignToTimes(candles, values);
};

export const calculateMacd = (
  candles: OHLCCandle[],
  fastPeriodInput: unknown,
  slowPeriodInput: unknown,
  signalPeriodInput: unknown,
): MacdResult => {
  const fastPeriod = sanitizePeriod(fastPeriodInput, 12);
  const slowPeriod = sanitizePeriod(slowPeriodInput, 26);
  const signalPeriod = sanitizePeriod(signalPeriodInput, 9);

  const output = MACD.calculate({
    values: toCloseSeries(candles),
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  if (output.length === 0 || candles.length === 0) {
    return { macd: [], signal: [], histogram: [] };
  }

  const startIndex = Math.max(0, candles.length - output.length);
  const macd: IndicatorLinePoint[] = [];
  const signal: IndicatorLinePoint[] = [];
  const histogram: IndicatorLinePoint[] = [];

  output.forEach((item, index) => {
    const candle = candles[startIndex + index];
    if (!candle) return;

    if (Number.isFinite(item.MACD)) {
      macd.push({ time: candle.time, value: item.MACD as number });
    }

    if (Number.isFinite(item.signal)) {
      signal.push({ time: candle.time, value: item.signal as number });
    }

    if (Number.isFinite(item.histogram)) {
      histogram.push({ time: candle.time, value: item.histogram as number });
    }
  });

  return { macd, signal, histogram };
};

export const calculateBollingerBands = (
  candles: OHLCCandle[],
  periodInput: unknown,
  stdDevInput: unknown,
): BollingerResult => {
  const period = sanitizePeriod(periodInput, 20);
  const stdDev = sanitizeStdDev(stdDevInput, 2);

  const output = BollingerBands.calculate({
    period,
    stdDev,
    values: toCloseSeries(candles),
  });

  if (output.length === 0 || candles.length === 0) {
    return { upper: [], middle: [], lower: [] };
  }

  const startIndex = Math.max(0, candles.length - output.length);
  const upper: IndicatorLinePoint[] = [];
  const middle: IndicatorLinePoint[] = [];
  const lower: IndicatorLinePoint[] = [];

  output.forEach((item, index) => {
    const candle = candles[startIndex + index];
    if (!candle) return;

    if (Number.isFinite(item.upper)) {
      upper.push({ time: candle.time, value: item.upper });
    }
    if (Number.isFinite(item.middle)) {
      middle.push({ time: candle.time, value: item.middle });
    }
    if (Number.isFinite(item.lower)) {
      lower.push({ time: candle.time, value: item.lower });
    }
  });

  return { upper, middle, lower };
};
