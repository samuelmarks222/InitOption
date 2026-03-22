import { IndicatorConfig } from "./types";

export const INDICATOR_REGISTRY: IndicatorConfig[] = [
  // ─── TREND INDICATORS ───────────────────────────────────────────────────────
  {
    id: "sma",
    name: "Moving Average",
    category: "Trend Indicators",
    pane: "overlay",
    params: [
      { id: "period", name: "Period", type: "number", default: 14, min: 1, max: 200 },
      { id: "method", name: "Method", type: "source", default: "SMA", options: ["SMA", "EMA", "WMA"] },
      { id: "source", name: "Source", type: "source", default: "close", options: ["close", "open", "high", "low"] },
      { id: "color", name: "Color", type: "color", default: "#3498db" },
      { id: "width", name: "Line Width", type: "number", default: 1, min: 1, max: 5 },
    ],
    outputs: [{ id: "line", type: "line" }],
  },
  {
    id: "bollinger",
    name: "Bollinger Bands",
    category: "Trend Indicators",
    pane: "overlay",
    params: [
      { id: "period", name: "Period", type: "number", default: 20, min: 1, max: 200 },
      { id: "stdDev", name: "Deviation", type: "number", default: 2, min: 0.1, max: 10 },
      { id: "colorUpper", name: "top", type: "color", default: "rgba(52, 152, 219, 0.5)" },
      { id: "colorMiddle", name: "middle", type: "color", default: "rgba(52, 152, 219, 0.8)" },
      { id: "colorLower", name: "bottom", type: "color", default: "rgba(52, 152, 219, 0.5)" },
      { id: "background", name: "background", type: "fill", default: "rgba(52, 152, 219, 0.1)" },
    ],
    outputs: [
      { id: "upper", type: "line" },
      { id: "middle", type: "line" },
      { id: "lower", type: "line" },
    ],
  },
  {
    id: "alligator",
    name: "Alligator",
    category: "Trend Indicators",
    pane: "overlay",
    params: [
      { id: "jawPeriod", name: "Jaw Period", type: "number", default: 13, min: 1 },
      { id: "teethPeriod", name: "Teeth Period", type: "number", default: 8, min: 1 },
      { id: "lipsPeriod", name: "Lips Period", type: "number", default: 5, min: 1 },
      { id: "jawColor", name: "Jaw Color", type: "color", default: "#3498db" },
      { id: "teethColor", name: "Teeth Color", type: "color", default: "#e74c3c" },
      { id: "lipsColor", name: "Lips Color", type: "color", default: "#2ecc71" },
    ],
    outputs: [{ id: "jaw", type: "line" }, { id: "teeth", type: "line" }, { id: "lips", type: "line" }],
  },
  {
    id: "envelopes",
    name: "Envelopes",
    category: "Trend Indicators",
    pane: "overlay",
    params: [
      { id: "period", name: "Period", type: "number", default: 14, min: 1 },
      { id: "deviation", name: "Deviation %", type: "number", default: 0.1, min: 0.01, step: 0.01 },
      { id: "colorUpper", name: "top", type: "color", default: "#e74c3c" },
      { id: "colorLower", name: "bottom", type: "color", default: "#2ecc71" },
      { id: "background", name: "background", type: "fill", default: "rgba(155, 89, 182, 0.1)" },
    ],
    outputs: [{ id: "upper", type: "line" }, { id: "lower", type: "line" }],
  },
  {
    id: "fractal",
    name: "Fractal",
    category: "Trend Indicators",
    pane: "overlay",
    params: [
      { id: "period", name: "Period", type: "number", default: 5, min: 3 },
      { id: "color", name: "Color", type: "color", default: "#f1c40f" },
    ],
    outputs: [{ id: "up", type: "line" }, { id: "down", type: "line" }],
  },
  {
    id: "ichimoku",
    name: "Ichimoku Cloud",
    category: "Trend Indicators",
    pane: "overlay",
    params: [
      { id: "conversion", name: "Conversion Line", type: "number", default: 9, min: 1 },
      { id: "base", name: "Base Line", type: "number", default: 26, min: 1 },
      { id: "spanB", name: "Leading Span B", type: "number", default: 52, min: 1 },
      { id: "displacement", name: "Displacement", type: "number", default: 26, min: 1 },
    ],
    outputs: [{ id: "conversion", type: "line" }, { id: "base", type: "line" }, { id: "spanA", type: "line" }, { id: "spanB", type: "line" }, { id: "lagging", type: "line" }],
  },
  {
    id: "keltner",
    name: "Keltner channel",
    category: "Trend Indicators",
    pane: "overlay",
    params: [
      { id: "emaPeriod", name: "EMA Period", type: "number", default: 20, min: 1 },
      { id: "atrPeriod", name: "ATR Period", type: "number", default: 10, min: 1 },
      { id: "multiplier", name: "Multiplier", type: "number", default: 1, min: 0.1, step: 0.1 },
      { id: "colorUpper", name: "top", type: "color", default: "#2ecc71" },
      { id: "colorMiddle", name: "middle", type: "color", default: "#e74c3c" },
      { id: "colorLower", name: "bottom", type: "color", default: "#e74c3c" },
      { id: "background", name: "background", type: "fill", default: "rgba(52, 152, 219, 0.2)" },
    ],
    outputs: [{ id: "upper", type: "line" }, { id: "middle", type: "line" }, { id: "lower", type: "line" }],
  },
  {
    id: "donchian",
    name: "Donchian channel",
    category: "Trend Indicators",
    pane: "overlay",
    params: [
      { id: "colorUpper", name: "top", type: "color", default: "#1abc9c" },
      { id: "colorMiddle", name: "middle", type: "color", default: "#f1c40f" },
      { id: "colorLower", name: "bottom", type: "color", default: "#1abc9c" },
      { id: "background", name: "background", type: "fill", default: "rgba(26, 188, 156, 0.1)" },
    ],
    outputs: [{ id: "upper", type: "line" }, { id: "middle", type: "line" }, { id: "lower", type: "line" }],
  },
  {
    id: "supertrend",
    name: "Supertrend",
    category: "Trend Indicators",
    pane: "overlay",
    params: [
      { id: "period", name: "Period", type: "number", default: 10, min: 1 },
      { id: "multiplier", name: "Multiplier", type: "number", default: 3, min: 0.1 },
      { id: "upColor", name: "Up Tone", type: "color", default: "#2ecc71" },
      { id: "downColor", name: "Down Tone", type: "color", default: "#e74c3c" },
    ],
    outputs: [{ id: "trend", type: "line" }],
  },
  {
    id: "parabolic",
    name: "Parabolic SAR",
    category: "Trend Indicators",
    pane: "overlay",
    params: [
      { id: "step", name: "Step", type: "number", default: 0.02, min: 0.001, step: 0.01 },
      { id: "max", name: "Max Step", type: "number", default: 0.2, min: 0.01, step: 0.01 },
      { id: "color", name: "Color", type: "color", default: "#3498db" },
    ],
    outputs: [{ id: "sar", type: "line" }],
  },
  {
    id: "zigzag",
    name: "Zig Zag",
    category: "Trend Indicators",
    pane: "overlay",
    params: [
      { id: "deviation", name: "Deviation %", type: "number", default: 0.1, min: 0.01, step: 0.01 },
      { id: "color", name: "Color", type: "color", default: "#f1c40f" },
    ],
    outputs: [{ id: "zag", type: "line" }],
  },

  // ─── OSCILLATORS ────────────────────────────────────────────────────────────
  {
    id: "macd",
    name: "MACD",
    category: "Oscillators",
    pane: "separate",
    params: [
      { id: "fast", name: "Fast Period", type: "number", default: 12, min: 1 },
      { id: "slow", name: "Slow Period", type: "number", default: 26, min: 1 },
      { id: "signal", name: "Signal Period", type: "number", default: 9, min: 1 },
      { id: "macdColor", name: "MACD Line", type: "color", default: "#3498db" },
      { id: "signalColor", name: "Signal Line", type: "color", default: "#e74c3c" },
      { id: "histColorUp", name: "Hist Up", type: "color", default: "#2ecc71" },
      { id: "histColorDown", name: "Hist Down", type: "color", default: "#e74c3c" },
    ],
    outputs: [
      { id: "macd", type: "line" },
      { id: "signal", type: "line" },
      { id: "histogram", type: "histogram" },
    ],
  },
  {
    id: "rsi",
    name: "RSI",
    category: "Oscillators",
    pane: "separate",
    params: [
      { id: "period", name: "Period", type: "number", default: 14, min: 1, max: 200 },
      { id: "source", name: "Source", type: "source", default: "close", options: ["close", "open", "high", "low"] },
      { id: "color", name: "Color", type: "color", default: "#9b59b6" },
      { id: "width", name: "Line Width", type: "number", default: 1, min: 1, max: 5 },
    ],
    outputs: [{ id: "line", type: "line" }],
  },
  {
    id: "stochastic",
    name: "Stochastic Oscillator",
    category: "Oscillators",
    pane: "separate",
    params: [
      { id: "kPeriod", name: "%K Period", type: "number", default: 14, min: 1 },
      { id: "dPeriod", name: "%D Period", type: "number", default: 3, min: 1 },
      { id: "slowing", name: "Slowing", type: "number", default: 3, min: 1 },
      { id: "kColor", name: "%K Color", type: "color", default: "#3498db" },
      { id: "dColor", name: "%D Color", type: "color", default: "#e74c3c" },
    ],
    outputs: [{ id: "k", type: "line" }, { id: "d", type: "line" }],
  },
  {
    id: "adx", name: "ADX", category: "Oscillators", pane: "separate",
    params: [ { id: "period", name: "Period", type: "number", default: 14 }, { id: "color", name: "Color", type: "color", default: "#f39c12" } ],
    outputs: [{ id: "adx", type: "line" }, { id: "pdi", type: "line" }, { id: "mdi", type: "line" }]
  },
  {
    id: "aroon", name: "Aroon", category: "Oscillators", pane: "separate",
    params: [ { id: "period", name: "Period", type: "number", default: 14 }, { id: "upColor", name: "Up Color", type: "color", default: "#2ecc71" }, { id: "downColor", name: "Down Color", type: "color", default: "#e74c3c" } ],
    outputs: [{ id: "up", type: "line" }, { id: "down", type: "line" }]
  },
  {
    id: "awesome", name: "Awesome Oscillator", category: "Oscillators", pane: "separate",
    params: [ { id: "fast", name: "Fast", type: "number", default: 5 }, { id: "slow", name: "Slow", type: "number", default: 34 } ],
    outputs: [{ id: "histogram", type: "histogram" }]
  },
  {
    id: "cci", name: "CCI", category: "Oscillators", pane: "separate",
    params: [ { id: "period", name: "Period", type: "number", default: 14 }, { id: "color", name: "Color", type: "color", default: "#1abc9c" } ],
    outputs: [{ id: "line", type: "line" }]
  },
  {
    id: "momentum", name: "Momentum", category: "Oscillators", pane: "separate",
    params: [ { id: "period", name: "Period", type: "number", default: 14 }, { id: "color", name: "Color", type: "color", default: "#3498db" } ],
    outputs: [{ id: "line", type: "line" }]
  },

  // ─── VOLATILITY & VOLUME ────────────────────────────────────────────────────
  {
    id: "atr", name: "ATR", category: "Volatility", pane: "separate",
    params: [ { id: "period", name: "Period", type: "number", default: 14 }, { id: "color", name: "Color", type: "color", default: "#e67e22" } ],
    outputs: [{ id: "line", type: "line" }]
  },
  {
    id: "volumeOsc", name: "Volume Oscillator", category: "Volume", pane: "separate",
    params: [ { id: "fast", name: "Fast", type: "number", default: 5 }, { id: "slow", name: "Slow", type: "number", default: 14 }, { id: "color", name: "Color", type: "color", default: "#9b59b6" } ],
    outputs: [{ id: "line", type: "line" }]
  }
];
