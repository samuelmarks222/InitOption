import { useEffect, useState } from "react";

export type TradingTemplate = "default" | "graphite" | "amber" | "ivory";

export const TRADING_TEMPLATE_OPTIONS: Array<{
  id: TradingTemplate;
  label: string;
  surface: string;
  panel: string;
  line: string;
  grid: string;
  text: string;
}> = [
  {
    id: "default",
    label: "Default",
    surface: "#17191c",
    panel: "#22242a",
    line: "#ff7a1a",
    grid: "#5a351d",
    text: "#ffffff",
  },
  {
    id: "graphite",
    label: "Graphite",
    surface: "#0d0f12",
    panel: "#17191d",
    line: "#f1f3f5",
    grid: "#545960",
    text: "#f8fafc",
  },
  {
    id: "amber",
    label: "Amber",
    surface: "#1d1100",
    panel: "#2b1b04",
    line: "#ff7a1a",
    grid: "#6e3f0d",
    text: "#fff3e2",
  },
  {
    id: "ivory",
    label: "Ivory",
    surface: "#efe6d6",
    panel: "#fff4df",
    line: "#ff7a1a",
    grid: "#d4b98f",
    text: "#2a2118",
  },
];

export interface TradingPreferences {
  language: "en";
  timezone: string;
  template: TradingTemplate;
  gridOpacity: number;
  autoScrolling: boolean;
  oneClickTrade: boolean;
  performanceMode: boolean;
  shortOrderLabel: boolean;
  upTrendColor: string;
  downTrendColor: string;
  chartBackgroundImage: string | null;
}

export const TRADING_PREFERENCES_STORAGE_KEY = "trading_terminal_preferences_v1";
export const TRADING_PREFERENCES_UPDATED_EVENT = "trading-terminal-preferences-updated";

export const DEFAULT_TRADING_PREFERENCES: TradingPreferences = {
  language: "en",
  timezone: "UTC+03:00",
  template: "default",
  gridOpacity: 7,
  autoScrolling: true,
  oneClickTrade: true,
  performanceMode: true,
  shortOrderLabel: false,
  upTrendColor: "#21a566",
  downTrendColor: "#d96059",
  chartBackgroundImage: null,
};

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const TIMEZONE_PATTERN = /^UTC[+-](0\d|1[0-4]):[03]0$/;

const isTradingTemplate = (value: unknown): value is TradingTemplate =>
  value === "default" || value === "graphite" || value === "amber" || value === "ivory";

const normalizeTemplate = (value: unknown): TradingTemplate => {
  if (isTradingTemplate(value)) return value;
  if (value === "fullNight" || value === "dark") return "default";
  if (value === "twilight" || value === "darker") return "graphite";
  if (value === "dark-orange") return "amber";
  if (value === "light") return "ivory";
  return DEFAULT_TRADING_PREFERENCES.template;
};

const normalizeColor = (value: unknown, fallback: string, legacyDefaults: string[] = []) => {
  if (typeof value !== "string" || !HEX_COLOR_PATTERN.test(value)) return fallback;

  const normalized = value.toLowerCase();
  return legacyDefaults.includes(normalized) ? fallback : normalized;
};

export const normalizeTradingPreferences = (
  value?: Partial<TradingPreferences> | null,
): TradingPreferences => ({
  language: "en",
  timezone:
    typeof value?.timezone === "string" && TIMEZONE_PATTERN.test(value.timezone)
      ? value.timezone
      : DEFAULT_TRADING_PREFERENCES.timezone,
  template: normalizeTemplate(value?.template),
  gridOpacity:
    typeof value?.gridOpacity === "number"
      ? Math.max(0, Math.min(10, Math.round(value.gridOpacity)))
      : DEFAULT_TRADING_PREFERENCES.gridOpacity,
  autoScrolling:
    typeof value?.autoScrolling === "boolean"
      ? value.autoScrolling
      : DEFAULT_TRADING_PREFERENCES.autoScrolling,
  oneClickTrade:
    typeof value?.oneClickTrade === "boolean"
      ? value.oneClickTrade
      : DEFAULT_TRADING_PREFERENCES.oneClickTrade,
  performanceMode:
    typeof value?.performanceMode === "boolean"
      ? value.performanceMode
      : DEFAULT_TRADING_PREFERENCES.performanceMode,
  shortOrderLabel:
    typeof value?.shortOrderLabel === "boolean"
      ? value.shortOrderLabel
      : DEFAULT_TRADING_PREFERENCES.shortOrderLabel,
  upTrendColor: normalizeColor(value?.upTrendColor, DEFAULT_TRADING_PREFERENCES.upTrendColor, [
    "#23b35f",
    "#0fa053",
  ]),
  downTrendColor: normalizeColor(value?.downTrendColor, DEFAULT_TRADING_PREFERENCES.downTrendColor, [
    "#e05d56",
    "#e95951",
  ]),
  chartBackgroundImage:
    typeof value?.chartBackgroundImage === "string" && value.chartBackgroundImage.startsWith("data:image/")
      ? value.chartBackgroundImage
      : null,
});

export const readTradingPreferences = (): TradingPreferences => {
  if (typeof window === "undefined") return DEFAULT_TRADING_PREFERENCES;

  try {
    const raw = window.localStorage.getItem(TRADING_PREFERENCES_STORAGE_KEY);
    return raw ? normalizeTradingPreferences(JSON.parse(raw) as Partial<TradingPreferences>) : DEFAULT_TRADING_PREFERENCES;
  } catch {
    return DEFAULT_TRADING_PREFERENCES;
  }
};

const applyTradingPreferencesToDocument = (preferences: TradingPreferences) => {
  if (typeof document === "undefined") return;

  document.documentElement.lang = preferences.language;
  document.documentElement.dataset.tradingTemplate = preferences.template;
  document.documentElement.dataset.tradingPerformanceMode = preferences.performanceMode ? "on" : "off";
  document.documentElement.style.setProperty("--trading-up-color", preferences.upTrendColor);
  document.documentElement.style.setProperty("--trading-down-color", preferences.downTrendColor);
};

const persistTradingPreferences = (next: TradingPreferences) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TRADING_PREFERENCES_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(TRADING_PREFERENCES_UPDATED_EVENT, { detail: next }));
  }

  applyTradingPreferencesToDocument(next);
  return next;
};

export const writeTradingPreferences = (updates: Partial<TradingPreferences>) =>
  persistTradingPreferences(normalizeTradingPreferences({ ...readTradingPreferences(), ...updates }));

export const resetTradingPreferences = () => persistTradingPreferences(DEFAULT_TRADING_PREFERENCES);

export const getTradingTimezone = (timezone: string) => {
  const offsetHours = Number(timezone.slice(3, 6));
  const sign = timezone.includes("-") ? -1 : 1;
  const offsetMinutes = sign * (Math.abs(offsetHours) * 60 + Number(timezone.slice(7, 9)));
  const timeZone =
    timezone === "UTC+03:00"
      ? "Africa/Nairobi"
      : timezone === "UTC+00:00"
        ? "UTC"
        : undefined;

  return { offsetMinutes, timeZone };
};

export const getTradingChartSurfaceColor = (preferences: TradingPreferences, fallback: string) => {
  if (preferences.chartBackgroundImage) return "rgba(0,0,0,0)";
  if (preferences.template === "ivory") return "#efe6d6";
  if (preferences.template === "graphite") return "#101215";
  if (preferences.template === "amber") return "#1d1100";
  return fallback;
};

export const getTradingChartTextColor = (preferences: TradingPreferences) =>
  preferences.template === "ivory" ? "#2a2118" : "#eef3fb";

export const getTradingGridColor = (preferences: TradingPreferences) => {
  const alpha = Math.max(0, Math.min(0.18, preferences.gridOpacity * 0.018));
  if (preferences.template === "ivory") return `rgba(86, 57, 22, ${alpha + 0.03})`;
  if (preferences.template === "amber") return `rgba(255, 138, 24, ${alpha + 0.02})`;
  if (preferences.template === "graphite") return `rgba(255, 255, 255, ${alpha + 0.02})`;
  return `rgba(255, 255, 255, ${alpha})`;
};

export const useTradingPreferences = () => {
  const [preferences, setPreferences] = useState<TradingPreferences>(readTradingPreferences);

  useEffect(() => {
    applyTradingPreferencesToDocument(preferences);
  }, [preferences]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncPreferences = () => setPreferences(readTradingPreferences());

    window.addEventListener("storage", syncPreferences);
    window.addEventListener(TRADING_PREFERENCES_UPDATED_EVENT, syncPreferences);

    return () => {
      window.removeEventListener("storage", syncPreferences);
      window.removeEventListener(TRADING_PREFERENCES_UPDATED_EVENT, syncPreferences);
    };
  }, []);

  const updatePreferences = (updates: Partial<TradingPreferences>) => {
    setPreferences(writeTradingPreferences(updates));
  };

  const resetPreferences = () => {
    setPreferences(resetTradingPreferences());
  };

  return {
    preferences,
    updatePreferences,
    resetPreferences,
  };
};
