export type IndicatorKey = "sma" | "ema" | "rsi" | "macd" | "bb";

export type IndicatorPlacement = "overlay" | "oscillator";

export type IndicatorParamType = "number" | "color" | "boolean";

export interface IndicatorParamSchema {
  key: string;
  label: string;
  type: IndicatorParamType;
  min?: number;
  max?: number;
  step?: number;
}

export type IndicatorParams = Record<string, number | string | boolean>;

export interface IndicatorDefinition {
  key: IndicatorKey;
  name: string;
  placement: IndicatorPlacement;
  defaultParams: IndicatorParams;
  paramsSchema: IndicatorParamSchema[];
}

export interface ActiveIndicator {
  instanceId: string;
  key: IndicatorKey;
  name: string;
  placement: IndicatorPlacement;
  visible: boolean;
  params: IndicatorParams;
}

export const INDICATOR_DEFINITIONS: Record<IndicatorKey, IndicatorDefinition> = {
  sma: {
    key: "sma",
    name: "SMA",
    placement: "overlay",
    defaultParams: {
      period: 20,
      color: "#facc15",
      lineWidth: 2,
    },
    paramsSchema: [
      { key: "period", label: "Period", type: "number", min: 1, step: 1 },
      { key: "lineWidth", label: "Line Width", type: "number", min: 1, max: 4, step: 1 },
      { key: "color", label: "Color", type: "color" },
    ],
  },
  ema: {
    key: "ema",
    name: "EMA",
    placement: "overlay",
    defaultParams: {
      period: 20,
      color: "#22d3ee",
      lineWidth: 2,
    },
    paramsSchema: [
      { key: "period", label: "Period", type: "number", min: 1, step: 1 },
      { key: "lineWidth", label: "Line Width", type: "number", min: 1, max: 4, step: 1 },
      { key: "color", label: "Color", type: "color" },
    ],
  },
  rsi: {
    key: "rsi",
    name: "RSI",
    placement: "oscillator",
    defaultParams: {
      period: 14,
      color: "#a78bfa",
      lineWidth: 2,
      overbought: 70,
      oversold: 30,
    },
    paramsSchema: [
      { key: "period", label: "Period", type: "number", min: 2, step: 1 },
      { key: "lineWidth", label: "Line Width", type: "number", min: 1, max: 4, step: 1 },
      { key: "overbought", label: "Overbought", type: "number", min: 50, max: 100, step: 1 },
      { key: "oversold", label: "Oversold", type: "number", min: 0, max: 50, step: 1 },
      { key: "color", label: "Color", type: "color" },
    ],
  },
  macd: {
    key: "macd",
    name: "MACD",
    placement: "oscillator",
    defaultParams: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      macdColor: "#60a5fa",
      signalColor: "#facc15",
      histogramUpColor: "#22c55e",
      histogramDownColor: "#ef4444",
    },
    paramsSchema: [
      { key: "fastPeriod", label: "Fast", type: "number", min: 1, step: 1 },
      { key: "slowPeriod", label: "Slow", type: "number", min: 2, step: 1 },
      { key: "signalPeriod", label: "Signal", type: "number", min: 1, step: 1 },
      { key: "macdColor", label: "MACD Color", type: "color" },
      { key: "signalColor", label: "Signal Color", type: "color" },
      { key: "histogramUpColor", label: "Histogram +", type: "color" },
      { key: "histogramDownColor", label: "Histogram -", type: "color" },
    ],
  },
  bb: {
    key: "bb",
    name: "Bollinger Bands",
    placement: "overlay",
    defaultParams: {
      period: 20,
      stdDev: 2,
      middleColor: "#d1d5db",
      upperColor: "#34d399",
      lowerColor: "#f87171",
      background: "#60a5fa",
      background_enabled: true,
    },
    paramsSchema: [
      { key: "period", label: "Period", type: "number", min: 2, step: 1 },
      { key: "stdDev", label: "Std Dev", type: "number", min: 0.1, step: 0.1 },
      { key: "middleColor", label: "Middle", type: "color" },
      { key: "upperColor", label: "Upper", type: "color" },
      { key: "lowerColor", label: "Lower", type: "color" },
      { key: "background", label: "Fill", type: "color" },
      { key: "background_enabled", label: "Show Fill", type: "boolean" },
    ],
  },
};

export const INDICATOR_ORDER: IndicatorKey[] = ["sma", "ema", "rsi", "macd", "bb"];

const buildInstanceId = () =>
  globalThis.crypto?.randomUUID?.() ?? `indicator_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const createIndicator = (key: IndicatorKey): ActiveIndicator => {
  const definition = INDICATOR_DEFINITIONS[key];

  return {
    instanceId: buildInstanceId(),
    key,
    name: definition.name,
    placement: definition.placement,
    visible: true,
    params: { ...definition.defaultParams },
  };
};

export const isOscillatorIndicator = (indicator: ActiveIndicator) => indicator.placement === "oscillator";

export const isOverlayIndicator = (indicator: ActiveIndicator) => indicator.placement === "overlay";
