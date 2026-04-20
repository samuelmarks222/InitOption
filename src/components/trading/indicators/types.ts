export type IndicatorKey = "sma" | "ema" | "rsi" | "macd" | "bb";

export type IndicatorPlacement = "overlay" | "oscillator";

export type IndicatorParamType = "number" | "color" | "boolean";

interface IndicatorParamSchemaBase {
  key: string;
  label: string;
  type: IndicatorParamType;
}

export interface IndicatorNumberParamSchema extends IndicatorParamSchemaBase {
  type: "number";
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface IndicatorColorParamSchema extends IndicatorParamSchemaBase {
  type: "color";
  defaultValue: string;
}

export interface IndicatorBooleanParamSchema extends IndicatorParamSchemaBase {
  type: "boolean";
  defaultValue: boolean;
}

export type IndicatorParamSchema =
  | IndicatorNumberParamSchema
  | IndicatorColorParamSchema
  | IndicatorBooleanParamSchema;

export type IndicatorParamValue = number | string | boolean;

export type IndicatorParams = Record<string, IndicatorParamValue>;

export interface IndicatorDefinition {
  key: IndicatorKey;
  name: string;
  description: string;
  placement: IndicatorPlacement;
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

const createNumberParam = (
  key: string,
  label: string,
  defaultValue: number,
  min?: number,
  max?: number,
  step?: number,
): IndicatorNumberParamSchema => ({
  key,
  label,
  type: "number",
  defaultValue,
  min,
  max,
  step,
});

const createColorParam = (key: string, label: string, defaultValue: string): IndicatorColorParamSchema => ({
  key,
  label,
  type: "color",
  defaultValue,
});

const createBooleanParam = (key: string, label: string, defaultValue: boolean): IndicatorBooleanParamSchema => ({
  key,
  label,
  type: "boolean",
  defaultValue,
});

export const INDICATOR_DEFINITIONS: Record<IndicatorKey, IndicatorDefinition> = {
  sma: {
    key: "sma",
    name: "SMA",
    description: "Simple Moving Average",
    placement: "overlay",
    paramsSchema: [
      createNumberParam("period", "Period", 20, 1, 500, 1),
      createNumberParam("lineWidth", "Line Width", 2, 1, 4, 1),
      createColorParam("color", "Color", "#facc15"),
    ],
  },
  ema: {
    key: "ema",
    name: "EMA",
    description: "Exponential Moving Average",
    placement: "overlay",
    paramsSchema: [
      createNumberParam("period", "Period", 20, 1, 500, 1),
      createNumberParam("lineWidth", "Line Width", 2, 1, 4, 1),
      createColorParam("color", "Color", "#22d3ee"),
    ],
  },
  rsi: {
    key: "rsi",
    name: "RSI",
    description: "Relative Strength Index",
    placement: "oscillator",
    paramsSchema: [
      createNumberParam("period", "Period", 14, 2, 200, 1),
      createNumberParam("lineWidth", "Line Width", 2, 1, 4, 1),
      createNumberParam("overbought", "Overbought", 70, 50, 100, 1),
      createNumberParam("oversold", "Oversold", 30, 0, 50, 1),
      createColorParam("color", "Color", "#a78bfa"),
    ],
  },
  macd: {
    key: "macd",
    name: "MACD",
    description: "Moving Average Convergence Divergence",
    placement: "oscillator",
    paramsSchema: [
      createNumberParam("fastPeriod", "Fast", 12, 1, 200, 1),
      createNumberParam("slowPeriod", "Slow", 26, 2, 300, 1),
      createNumberParam("signalPeriod", "Signal", 9, 1, 200, 1),
      createNumberParam("lineWidth", "Line Width", 2, 1, 4, 1),
      createColorParam("macdColor", "MACD Color", "#60a5fa"),
      createColorParam("signalColor", "Signal Color", "#facc15"),
      createColorParam("histogramUpColor", "Histogram +", "#22c55e"),
      createColorParam("histogramDownColor", "Histogram -", "#ef4444"),
    ],
  },
  bb: {
    key: "bb",
    name: "Bollinger Bands",
    description: "Price volatility bands",
    placement: "overlay",
    paramsSchema: [
      createNumberParam("period", "Period", 20, 2, 500, 1),
      createNumberParam("stdDev", "Std Dev", 2, 0.1, 10, 0.1),
      createNumberParam("middleLineWidth", "Middle Width", 2, 1, 4, 1),
      createNumberParam("bandLineWidth", "Band Width", 1, 1, 4, 1),
      createColorParam("middleColor", "Middle", "#d1d5db"),
      createColorParam("upperColor", "Upper", "#34d399"),
      createColorParam("lowerColor", "Lower", "#f87171"),
      createColorParam("background", "Fill", "#60a5fa"),
      createBooleanParam("background_enabled", "Show Fill", true),
    ],
  },
};

export const INDICATOR_ORDER: IndicatorKey[] = ["sma", "ema", "rsi", "macd", "bb"];

const buildInstanceId = () =>
  globalThis.crypto?.randomUUID?.() ?? `indicator_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const getIndicatorDefaults = (key: IndicatorKey): IndicatorParams => {
  const definition = INDICATOR_DEFINITIONS[key];

  return definition.paramsSchema.reduce<IndicatorParams>((acc, param) => {
    acc[param.key] = param.defaultValue;
    return acc;
  }, {});
};

export const createIndicator = (key: IndicatorKey): ActiveIndicator => {
  const definition = INDICATOR_DEFINITIONS[key];

  return {
    instanceId: buildInstanceId(),
    key,
    name: definition.name,
    placement: definition.placement,
    visible: true,
    params: getIndicatorDefaults(key),
  };
};

export const coerceIndicatorParamValue = (
  indicatorKey: IndicatorKey,
  paramKey: string,
  rawValue: number | string | boolean,
): IndicatorParamValue => {
  const schema = INDICATOR_DEFINITIONS[indicatorKey].paramsSchema.find((param) => param.key === paramKey);
  if (!schema) {
    return rawValue;
  }

  if (schema.type === "boolean") {
    return Boolean(rawValue);
  }

  if (schema.type === "color") {
    return typeof rawValue === "string" && rawValue.length > 0 ? rawValue : schema.defaultValue;
  }

  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) {
    return schema.defaultValue;
  }

  const minBound = typeof schema.min === "number" ? schema.min : Number.NEGATIVE_INFINITY;
  const maxBound = typeof schema.max === "number" ? schema.max : Number.POSITIVE_INFINITY;
  const clamped = Math.min(maxBound, Math.max(minBound, numeric));

  return clamped;
};

export const resetIndicatorParams = (indicator: ActiveIndicator): ActiveIndicator => ({
  ...indicator,
  params: getIndicatorDefaults(indicator.key),
});

export const isOscillatorIndicator = (indicator: ActiveIndicator) => indicator.placement === "oscillator";

export const isOverlayIndicator = (indicator: ActiveIndicator) => indicator.placement === "overlay";
