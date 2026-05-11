import { useEffect, useState } from "react";

export type TradingTemplate = "light" | "twilight" | "fullNight";

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
  template: "fullNight",
  gridOpacity: 7,
  autoScrolling: true,
  oneClickTrade: true,
  performanceMode: true,
  shortOrderLabel: false,
  upTrendColor: "#23b35f",
  downTrendColor: "#e05d56",
  chartBackgroundImage: null,
};

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const TIMEZONE_PATTERN = /^UTC[+-](0\d|1[0-4]):[03]0$/;

const isTradingTemplate = (value: unknown): value is TradingTemplate =>
  value === "light" || value === "twilight" || value === "fullNight";

const normalizeColor = (value: unknown, fallback: string) =>
  typeof value === "string" && HEX_COLOR_PATTERN.test(value) ? value.toLowerCase() : fallback;

export const normalizeTradingPreferences = (
  value?: Partial<TradingPreferences> | null,
): TradingPreferences => ({
  language: "en",
  timezone:
    typeof value?.timezone === "string" && TIMEZONE_PATTERN.test(value.timezone)
      ? value.timezone
      : DEFAULT_TRADING_PREFERENCES.timezone,
  template: isTradingTemplate(value?.template) ? value.template : DEFAULT_TRADING_PREFERENCES.template,
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
  upTrendColor: normalizeColor(value?.upTrendColor, DEFAULT_TRADING_PREFERENCES.upTrendColor),
  downTrendColor: normalizeColor(value?.downTrendColor, DEFAULT_TRADING_PREFERENCES.downTrendColor),
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
  if (preferences.template === "light") return "#e7edf7";
  if (preferences.template === "twilight") return "#172338";
  return fallback;
};

export const getTradingChartTextColor = (preferences: TradingPreferences) =>
  preferences.template === "light" ? "#152033" : "#eef3fb";

export const getTradingGridColor = (preferences: TradingPreferences) => {
  const alpha = Math.max(0, Math.min(0.18, preferences.gridOpacity * 0.018));
  return preferences.template === "light"
    ? `rgba(21, 32, 51, ${alpha + 0.02})`
    : `rgba(255, 255, 255, ${alpha})`;
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
