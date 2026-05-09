export type ChartLayoutMode = 1 | 2 | 3 | 4;

export const CHART_LAYOUT_STORAGE_KEY = "trade_chart_layout_mode_v1";
export const TRADE_CHART_LAYOUT_SET_EVENT = "trade_chart_layout_set";
export const TRADE_CHART_LAYOUT_MODE_CHANGED_EVENT = "trade_chart_layout_mode_changed";

export const isChartLayoutMode = (value: unknown): value is ChartLayoutMode =>
  value === 1 || value === 2 || value === 3 || value === 4;

export const loadChartLayoutMode = (): ChartLayoutMode => {
  if (typeof window === "undefined") return 1;

  const raw = Number(window.localStorage.getItem(CHART_LAYOUT_STORAGE_KEY));
  return isChartLayoutMode(raw) ? raw : 1;
};
