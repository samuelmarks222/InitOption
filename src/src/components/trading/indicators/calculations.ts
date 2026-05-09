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
    }
  | {
      kind: "volumeOscillator";
      points: IndicatorLinePoint[];
    };

export interface IndicatorCalculationBundle {
  overlayById: Record<string, OverlayIndicatorResult>;
  oscillatorById: Record<string, OscillatorIndicatorResult>;
  indicatorDataMap: Record<string, IndicatorLinePoint[]>;
  errorsById: Record<string, string | undefined>;
}

const EMPTY_MACD_RESULT: MacdResult = {
  macd: [],
  signal: [],
  histogram: [],
};

const EMPTY_BOLLINGER_RESULT: BollingerResult = {
  upper: [],
  middle: [],
  lower: [],
};

const toCloseSeries = (candles: OHLCCandle[]) => candles.map((candle) => candle.close);
const toVolumeSeries = (candles: OHLCCandle[]) => candles.map((candle) => candle.volume);

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

const resolveMacdPeriods = (fastPeriodInput: unknown, slowPeriodInput: unknown, signalPeriodInput: unknown) => {
  const fastPeriod = toPositiveInt(fastPeriodInput, 12);
  const slowPeriod = Math.max(fastPeriod + 1, toPositiveInt(slowPeriodInput, 26));
  const signalPeriod = toPositiveInt(signalPeriodInput, 9);

  return {
    fastPeriod,
    slowPeriod,
    signalPeriod,
  };
};

export const getMinimumCandlesForIndicator = (indicator: ActiveIndicator): number => {
  if (indicator.key === "sma" || indicator.key === "ema" || indicator.key === "bb") {
    return toPositiveInt(indicator.params.period, 20);
  }

  if (indicator.key === "rsi") {
    return toPositiveInt(indicator.params.period, 14) + 1;
  }

  if (indicator.key === "macd") {
    const periods = resolveMacdPeriods(
      indicator.params.fastPeriod,
      indicator.params.slowPeriod,
      indicator.params.signalPeriod,
    );

    return periods.slowPeriod + periods.signalPeriod;
  }

  if (indicator.key === "volumeOscillator") {
    const shortPeriod = toPositiveInt(indicator.params.shortPeriod, 5);
    const longPeriod = Math.max(shortPeriod + 1, toPositiveInt(indicator.params.longPeriod, 14));
    return longPeriod;
  }

  return 1;
};

const buildInsufficientDataMessage = (indicatorName: string, availableCandles: number, minimumCandles: number) => {
  const remaining = Math.max(0, minimumCandles - availableCandles);
  if (remaining === 0) {
    return undefined;
  }

  return `${indicatorName} needs ${minimumCandles} candles (currently ${availableCandles}).`;
};

export const calculateSma = (candles: OHLCCandle[], periodInput: unknown): IndicatorLinePoint[] => {
  const period = toPositiveInt(periodInput, 20);

  if (candles.length < period) {
    return [];
  }

  const values = SMA.calculate({
    period,
    values: toCloseSeries(candles),
  });

  return alignToTimes(candles, values);
};

export const calculateEma = (candles: OHLCCandle[], periodInput: unknown): IndicatorLinePoint[] => {
  const period = toPositiveInt(periodInput, 20);

  if (candles.length < period) {
    return [];
  }

  const values = EMA.calculate({
    period,
    values: toCloseSeries(candles),
  });

  return alignToTimes(candles, values);
};

export const calculateRsi = (candles: OHLCCandle[], periodInput: unknown): IndicatorLinePoint[] => {
  const period = toPositiveInt(periodInput, 14);

  if (candles.length < period + 1) {
    return [];
  }

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
  const { fastPeriod, slowPeriod, signalPeriod } = resolveMacdPeriods(
    fastPeriodInput,
    slowPeriodInput,
    signalPeriodInput,
  );

  if (candles.length < slowPeriod + signalPeriod) {
    return EMPTY_MACD_RESULT;
  }

  const output = MACD.calculate({
    values: toCloseSeries(candles),
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  if (candles.length === 0 || output.length === 0) {
    return EMPTY_MACD_RESULT;
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

export const calculateVolumeOscillator = (
  candles: OHLCCandle[],
  shortPeriodInput: unknown,
  longPeriodInput: unknown,
): IndicatorLinePoint[] => {
  const shortPeriod = toPositiveInt(shortPeriodInput, 5);
  const longPeriod = Math.max(shortPeriod + 1, toPositiveInt(longPeriodInput, 14));

  if (candles.length < longPeriod) {
    return [];
  }

  const volumes = toVolumeSeries(candles);
  const shortEma = EMA.calculate({
    period: shortPeriod,
    values: volumes,
  });
  const longEma = EMA.calculate({
    period: longPeriod,
    values: volumes,
  });

  if (shortEma.length === 0 || longEma.length === 0) {
    return [];
  }

  const longStartIndex = candles.length - longEma.length;
  const shortOffset = shortEma.length - longEma.length;

  return longEma.reduce<IndicatorLinePoint[]>((acc, longValue, index) => {
    const shortValue = shortEma[index + shortOffset];
    const candle = candles[longStartIndex + index];

    if (!candle || !Number.isFinite(longValue) || !Number.isFinite(shortValue) || longValue === 0) {
      return acc;
    }

    acc.push({
      time: candle.time,
      value: ((shortValue - longValue) / longValue) * 100,
    });

    return acc;
  }, []);
};

export const calculateBollingerBands = (
  candles: OHLCCandle[],
  periodInput: unknown,
  stdDevInput: unknown,
): BollingerResult => {
  const period = toPositiveInt(periodInput, 20);
  const stdDev = toPositiveFloat(stdDevInput, 2);

  if (candles.length < period) {
    return EMPTY_BOLLINGER_RESULT;
  }

  const output = BollingerBands.calculate({
    period,
    stdDev,
    values: toCloseSeries(candles),
  });

  if (candles.length === 0 || output.length === 0) {
    return EMPTY_BOLLINGER_RESULT;
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

  if (indicator.key === "volumeOscillator") {
    return {
      kind: "volumeOscillator",
      points: calculateVolumeOscillator(candles, indicator.params.shortPeriod, indicator.params.longPeriod),
    };
  }

  return null;
};

export const calculateIndicatorBundle = (
  indicators: ActiveIndicator[],
  candles: OHLCCandle[],
): IndicatorCalculationBundle => {
  const overlayById: Record<string, OverlayIndicatorResult> = {};
  const oscillatorById: Record<string, OscillatorIndicatorResult> = {};
  const indicatorDataMap: Record<string, IndicatorLinePoint[]> = {};
  const errorsById: Record<string, string | undefined> = {};

  indicators.forEach((indicator) => {
    if (!indicator.visible) {
      return;
    }

    const minimumCandles = getMinimumCandlesForIndicator(indicator);
    errorsById[indicator.instanceId] = buildInsufficientDataMessage(indicator.name, candles.length, minimumCandles);

    if (indicator.placement === "overlay") {
      const overlayData = calculateOverlayIndicator(indicator, candles);
      if (!overlayData) {
        return;
      }

      overlayById[indicator.instanceId] = overlayData;

      if (overlayData.kind === "line") {
        indicatorDataMap[indicator.instanceId] = overlayData.points;
        return;
      }

      indicatorDataMap[indicator.instanceId] = overlayData.middle;
      indicatorDataMap[`${indicator.instanceId}-upper`] = overlayData.upper;
      indicatorDataMap[`${indicator.instanceId}-lower`] = overlayData.lower;
      return;
    }

    const oscillatorData = calculateOscillatorIndicator(indicator, candles);
    if (!oscillatorData) {
      return;
    }

    oscillatorById[indicator.instanceId] = oscillatorData;

    if (oscillatorData.kind === "rsi") {
      indicatorDataMap[indicator.instanceId] = oscillatorData.points;
      return;
    }

    if (oscillatorData.kind === "volumeOscillator") {
      indicatorDataMap[indicator.instanceId] = oscillatorData.points;
      return;
    }

    indicatorDataMap[indicator.instanceId] = oscillatorData.macd;
    indicatorDataMap[`${indicator.instanceId}-signal`] = oscillatorData.signal;
    indicatorDataMap[`${indicator.instanceId}-histogram`] = oscillatorData.histogram;
  });

  return {
    overlayById,
    oscillatorById,
    indicatorDataMap,
    errorsById,
  };
};
