import type { IndicatorConfig } from "./types";

const HEX_6_PATTERN = /^#([0-9a-f]{6})$/i;
const HEX_8_PATTERN = /^#([0-9a-f]{8})$/i;
const RGB_PATTERN = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;

const clampAlpha = (alpha: number) => Math.max(0, Math.min(alpha, 1));

export const toIndicatorFillColor = (value: unknown, alpha = 0.18) => {
  if (typeof value !== "string") {
    return `rgba(52, 152, 219, ${clampAlpha(alpha)})`;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return `rgba(52, 152, 219, ${clampAlpha(alpha)})`;
  }

  if (trimmed.startsWith("rgba(") || trimmed.startsWith("hsla(")) {
    return trimmed;
  }

  const hex8 = trimmed.match(HEX_8_PATTERN);
  if (hex8) {
    const normalized = hex8[1];
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    const a = Number.parseInt(normalized.slice(6, 8), 16) / 255;
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")})`;
  }

  const hex6 = trimmed.match(HEX_6_PATTERN);
  if (hex6) {
    const normalized = hex6[1];
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${clampAlpha(alpha)})`;
  }

  const rgb = trimmed.match(RGB_PATTERN);
  if (rgb) {
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${clampAlpha(alpha)})`;
  }

  return trimmed;
};

export const buildIndicatorDefaultParams = (config: IndicatorConfig) => {
  const defaults: Record<string, unknown> = {};

  config.params.forEach((param) => {
    defaults[param.id] = param.type === "fill" ? toIndicatorFillColor(param.default) : param.default;
    if (param.type === "fill") {
      defaults[`${param.id}_enabled`] = true;
    }
  });

  return defaults;
};
