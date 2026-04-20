import { BollingerBands, EMA, MACD, RSI, SMA } from "technicalindicators";
import type { OHLCCandle } from "../engine/priceEngine";
import type { ActiveIndicator } from "./types";

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

export type OverlayIndicatorResult =
  | {
      kind: "line";
      points: IndicatorLinePoint[];
    }
  | {
      kind: "bollinger";
      upper: IndicatorLinePoint[];
      middle: IndicatorLinePoint[];
      lower: IndicatorLinePoint[];
    };

export type OscillatorIndicatorResult =
  | {
      kind: "rsi";
      points: IndicatorLinePoint[];
    }
  | {
      kind: "macd";
      macd: IndicatorLinePoint[];
      signal: IndicatorLinePoint[];
      histogram: IndicatorLinePoint[];
    };

const toCloseSeries = (candles: OHLCCandle[]) => candles.map((candle) => candle.close);

const toPositiveInt = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(1, Math.floor(numeric));
};

const toPositiveFloat = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return numeric;
};

const alignToTimes = (candles: OHLCCandle[], values: number[]): IndicatorLinePoint[] => {
  if (candles.length === 0 || values.length === 0) {
    return [];
  }

  const startIndex = Math.max(0, candles.length - values.length);

  return values.reduce<IndicatorLinePoint[]>((acc, value, index) => {
    if (!Number.isFinite(value)) {
      return acc;
    }

    const candle = candles[startIndex + index];
    if (!candle) {
      return acc;
    }

    acc.push({
      time: candle.time,
      value,
    });

    return acc;
  }, []);
};

export const calculateSma = (candles: OHLCCandle[], periodInput: unknown): IndicatorLinePoint[] => {
  const period = toPositiveInt(periodInput, 20);

  const values = SMA.calculate({
    period,
    values: toCloseSeries(candles),
  });

  return alignToTimes(candles, values);
};

export const calculateEma = (candles: OHLCCandle[], periodInput: unknown): IndicatorLinePoint[] => {
  const period = toPositiveInt(periodInput, 20);

  const values = EMA.calculate({
    period,
    values: toCloseSeries(candles),
  });

  return alignToTimes(candles, values);
};

export const calculateRsi = (candles: OHLCCandle[], periodInput: unknown): IndicatorLinePoint[] => {
  const period = toPositiveInt(periodInput, 14);

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
  const fastPeriod = toPositiveInt(fastPeriodInput, 12);
  const slowPeriod = Math.max(fastPeriod + 1, toPositiveInt(slowPeriodInput, 26));
  const signalPeriod = toPositiveInt(signalPeriodInput, 9);

  const output = MACD.calculate({
    values: toCloseSeries(candles),
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  if (candles.length === 0 || output.length === 0) {
    return {
      macd: [],
      signal: [],
      histogram: [],
    };
  }

  const startIndex = Math.max(0, candles.length - output.length);
  const macd: IndicatorLinePoint[] = [];
  const signal: IndicatorLinePoint[] = [];
  const histogram: IndicatorLinePoint[] = [];

  output.forEach((entry, index) => {
    const candle = candles[startIndex + index];
    if (!candle) {
      return;
    }

    if (Number.isFinite(entry.MACD)) {
      macd.push({ time: candle.time, value: entry.MACD as number });
    }

    if (Number.isFinite(entry.signal)) {
      signal.push({ time: candle.time, value: entry.signal as number });
    }

    if (Number.isFinite(entry.histogram)) {
      histogram.push({ time: candle.time, value: entry.histogram as number });
    }
  });

  return {
    macd,
    signal,
    histogram,
  };
};

export const calculateBollingerBands = (
  candles: OHLCCandle[],
  periodInput: unknown,
  stdDevInput: unknown,
): BollingerResult => {
  const period = toPositiveInt(periodInput, 20);
  const stdDev = toPositiveFloat(stdDevInput, 2);

  const output = BollingerBands.calculate({
    period,
    stdDev,
    values: toCloseSeries(candles),
  });

  if (candles.length === 0 || output.length === 0) {
    return {
      upper: [],
      middle: [],
      lower: [],
    };
  }

  const startIndex = Math.max(0, candles.length - output.length);
  const upper: IndicatorLinePoint[] = [];
  const middle: IndicatorLinePoint[] = [];
  const lower: IndicatorLinePoint[] = [];

  output.forEach((entry, index) => {
    const candle = candles[startIndex + index];
    if (!candle) {
      return;
    }

    if (Number.isFinite(entry.upper)) {
      upper.push({ time: candle.time, value: entry.upper });
    }

    if (Number.isFinite(entry.middle)) {
      middle.push({ time: candle.time, value: entry.middle });
    }

    if (Number.isFinite(entry.lower)) {
      lower.push({ time: candle.time, value: entry.lower });
    }
  });

  return {
    upper,
    middle,
    lower,
  };
};

export const calculateOverlayIndicator = (
  indicator: ActiveIndicator,
  candles: OHLCCandle[],
): OverlayIndicatorResult | null => {
  if (indicator.key === "sma") {
    return {
      kind: "line",
      points: calculateSma(candles, indicator.params.period),
    };
  }

  if (indicator.key === "ema") {
    return {
      kind: "line",
      points: calculateEma(candles, indicator.params.period),
    };
  }

  if (indicator.key === "bb") {
    const data = calculateBollingerBands(candles, indicator.params.period, indicator.params.stdDev);

    return {
      kind: "bollinger",
      upper: data.upper,
      middle: data.middle,
      lower: data.lower,
    };
  }

  return null;
};

export const calculateOscillatorIndicator = (
  indicator: ActiveIndicator,
  candles: OHLCCandle[],
): OscillatorIndicatorResult | null => {
  if (indicator.key === "rsi") {
    return {
      kind: "rsi",
      points: calculateRsi(candles, indicator.params.period),
    };
  }

  if (indicator.key === "macd") {
    const data = calculateMacd(
      candles,
      indicator.params.fastPeriod,
      indicator.params.slowPeriod,
      indicator.params.signalPeriod,
    );

    return {
      kind: "macd",
      macd: data.macd,
      signal: data.signal,
      histogram: data.histogram,
    };
  }

  return null;
};
