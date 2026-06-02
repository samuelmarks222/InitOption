import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  AreaSeries,
  BaselineSeries,
  LineSeries,
  BarSeries,
  HistogramSeries,
  type BarData,
  type CandlestickData,
  type HistogramData,
  type IPriceLine,
  type LineData,
  type LineWidth,
  type SeriesType,
  type Time,
} from "lightweight-charts";
import {
  OTCPriceEngine,
  SUPPORTED_CHART_TIMEFRAMES,
  TIMEFRAMES,
  type OHLCCandle,
  type SupportedChartTimeframe,
} from "./engine/priceEngine";
import {
  createMarketDataFeed,
  replayDeterministicTickState,
  type MarketDataFeed,
} from "./engine/marketDataFeed";
import { CandleAggregator } from "./CandleAggregator";
import ChartToolbar, { ChartType, CandleIcon } from "./ChartToolbar";
import { TradeMarkersOverlay } from "./TradeMarkersOverlay";
import { LiveChartBeacon } from "./LiveChartBeacon";
import { TRADING_DOWN_COLOR, TRADING_UP_COLOR } from "./tradingPalette";
import { ActiveIndicator } from "./indicators/types";
import { calculateIndicator } from "./indicators/engine";
import { INDICATOR_REGISTRY } from "./indicators/config";
import { toIndicatorFillColor } from "./indicators/fillColors";
import IndicatorSettingsModal from "./indicators/IndicatorSettingsModal";
import { DrawingOverlay } from "./drawings/DrawingOverlay";
import { dispatchTradeDeskDirectionSubmit, type TradeDeskDirection } from "./tradeDeskEvents";
import { useDrawings } from "@/contexts/DrawingContext";
import { supabase } from "@/integrations/supabase/client";
import { type Tables } from "@/integrations/supabase/types";
import {
  Briefcase,
  X,
  Activity,
  BarChart,
  Bell,
  BellRing,
  Compass,
  PenTool,
  MoreHorizontal,
  Eye,
  EyeOff,
  Info,
  SlidersHorizontal,
  ArrowRight,
  Plus,
  Minus,
  CheckCheck,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActiveTrade, TradeDirection } from "@/hooks/useTrading";
import { cn } from "@/lib/utils";
import AssetSymbolMark from "./AssetSymbolMark";
import { toast } from "sonner";
import {
  getTradingChartSurfaceColor,
  getTradingChartTextColor,
  getTradingGridColor,
  getTradingTimezone,
  useTradingPreferences,
} from "@/lib/tradingPreferences";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useTranslation } from "react-i18next";

interface TradingChartProps {
  asset: { symbol: string; name?: string; price: number; basePrice?: number; type?: string; change?: number; maxProfit?: number; available?: boolean };
  onPriceUpdate?: (
    price: number,
    markerTime?: number,
    timeframeSeconds?: number,
    markerLogical?: number,
  ) => void;
  activeIndicators: ActiveIndicator[];
  activeTrades?: ActiveTrade[];
  onToggleIndicatorsPanel: () => void;
  onToggleDrawingsPanel: () => void;
  onRemoveIndicator?: (id: string) => void;
  onUpdateIndicator?: (id: string, updates: Partial<ActiveIndicator>) => void;
  onOpenIndicatorSettings?: (id: string) => void;
  overlayUiSuppressed?: boolean;
  onToggleMobileHistory?: () => void;
  mobileHistoryOpen?: boolean;
  compactPane?: boolean;
  miniOverlay?: boolean;
  liveEdgeRequestKey?: number | string;
  settlementAnnouncement?: ChartSettlementAnnouncement | null;
}

export interface ChartSettlementAnnouncement {
  id: string;
  assetSymbol: string;
  direction: TradeDirection;
  amount: number;
  expirySeconds: number;
  profit: number;
  status: "won" | "lost";
}

const PROFESSIONAL_CHART_BG = "#1e2131";
const PROFESSIONAL_CHART_PANEL = "#23283b";
const PROFESSIONAL_CHART_TEXT = "#eef3fb";
const PROFESSIONAL_CHART_MUTED_TEXT = "#96a4b9";
const PROFESSIONAL_CHART_GRID = "rgba(143, 164, 210, 0.08)";
const PROFESSIONAL_CHART_BORDER = "rgba(143, 164, 210, 0.14)";
const PROFESSIONAL_UP_COLOR = "#10a055";
const PROFESSIONAL_DOWN_COLOR = "#e85b4e";
const LEGACY_INIT_UP_COLOR = "#147648";
const LEGACY_INIT_DOWN_COLOR = "#ea5d51";
const LEGACY_PROFESSIONAL_UP_COLOR = "#21a566";
const LEGACY_PROFESSIONAL_DOWN_COLOR = "#d96059";
const LEGACY_CHART_BG = "#0E1217";
const LEGACY_PLATFORM_UP = "#00C076";
const LEGACY_PLATFORM_DOWN = "#F6465D";
const DESKTOP_SENTIMENT_RAIL_WIDTH = 40;
const DESKTOP_TOOLBAR_GAP_FROM_RAIL = 12;
const DESKTOP_TOOLBAR_MAIN_LEFT_OFFSET = DESKTOP_SENTIMENT_RAIL_WIDTH + DESKTOP_TOOLBAR_GAP_FROM_RAIL;
const DESKTOP_TOOLBAR_MAIN_BOTTOM_OFFSET = 16;
const DESKTOP_PANE_HEADER_LEFT_OFFSET = DESKTOP_SENTIMENT_RAIL_WIDTH + 8;

const THEME = {
  bg: PROFESSIONAL_CHART_BG,
  panel: PROFESSIONAL_CHART_PANEL,
  text: PROFESSIONAL_CHART_TEXT,
  mutedText: PROFESSIONAL_CHART_MUTED_TEXT,
  grid: PROFESSIONAL_CHART_GRID,
  border: PROFESSIONAL_CHART_BORDER,
  up: PROFESSIONAL_UP_COLOR,
  down: PROFESSIONAL_DOWN_COLOR,
  line: "#4da3ff",
  areaLine: "#8fa4d2",
  areaTop: "rgba(143,164,210,0.28)",
  areaBottom: "rgba(143,164,210,0.03)",
};

const DEFAULT_VISIBLE_BARS = 80;
const MAX_CANDLES_IN_MEMORY = 2400;
const DEFAULT_CHART_TYPE: ChartType = "candles";
const SYNCED_PRICE_SCALE_MIN_WIDTH = 58;
type ChartSeriesApi = ISeriesApi<SeriesType>;
type OverlayIndicatorPoint = LineData<Time> | HistogramData<Time>;
type MainChartPoint = LineData<Time> | BarData<Time> | CandlestickData<Time>;
type PlatformThemeRow = Pick<Tables<"platform_settings">, "chart_bg_color" | "chart_up_color" | "chart_down_color">;
const toChartTime = (time: number) => time as Time;
const INTRABAR_LOGICAL_SPAN = 0.72;
const getIntrabarLogicalOffset = (fraction: number) =>
  (Math.min(1, Math.max(0, fraction)) - 0.5) * INTRABAR_LOGICAL_SPAN;

const clampLineWidth = (value: number): LineWidth => {
  if (value >= 4) return 4;
  if (value >= 3) return 3;
  if (value >= 2) return 2;
  return 1;
};

type PriceAlert = {
  id: string;
  price: number;
  triggered: boolean;
};

type LivePriceBeaconState = {
  price: number;
  time: number;
  logical: number | null;
};

const toLineChartData = (candles: OHLCCandle[]): LineData<Time>[] =>
  candles.map((candle) => ({ time: toChartTime(candle.time), value: candle.close }));

const toOhlcChartData = (candles: OHLCCandle[]): Array<BarData<Time> | CandlestickData<Time>> =>
  candles.map((candle) => ({
    time: toChartTime(candle.time),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }));

const colorizeHistogramData = (
  data: OverlayIndicatorPoint[],
  upColor: string,
  downColor: string,
): OverlayIndicatorPoint[] =>
  data.map((point) => ({
    ...point,
    color: point.value >= 0 ? upColor : downColor,
  }));

const getHorizontalLineValue = (data: OverlayIndicatorPoint[]) => {
  const values = data
    .map((point) => point.value)
    .filter((value) => Number.isFinite(value));

  if (values.length < 2) return null;

  const reference = values[0];
  return values.every((value) => Math.abs(value - reference) < 0.0000001) ? reference : null;
};

const isSvgOnlyOverlayOutput = (indicatorConfigId: string, outputId: string) =>
  indicatorConfigId === "fractal" && (outputId === "up" || outputId === "down");

const INDICATOR_VALUE_COLORS = ["#34d399", "#f8fafc", "#f87171", "#fbbf24"];

const formatIndicatorQuickValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Number.isInteger(value)) return `${value}`;
    return value.toFixed(value < 1 ? 2 : 1).replace(/\.0$/, "").replace(/(\.\d*?[1-9])0+$/, "$1");
  }

  if (typeof value === "string") {
    return value.toUpperCase();
  }

  return null;
};

const getIndicatorQuickValues = (indicator: ActiveIndicator) => {
  const config = INDICATOR_REGISTRY.find((entry) => entry.id === indicator.configId);
  if (!config) return [];

  const numericDefs = config.params.filter(
    (param) => param.type === "number" && !["width", "lineWidth"].includes(param.id),
  );
  const sourceDefs = config.params.filter((param) => param.type === "source");

  return [...numericDefs, ...sourceDefs]
    .map((param) => formatIndicatorQuickValue(indicator.params[param.id] ?? param.default))
    .filter((value): value is string => Boolean(value))
    .slice(0, 4);
};

const IndicatorControlStrip = ({
  indicator,
  onOpenSettings,
  onToggleVisibility,
  onRemove,
  variant = "overlay",
}: {
  indicator: ActiveIndicator;
  onOpenSettings?: () => void;
  onToggleVisibility?: () => void;
  onRemove?: () => void;
  variant?: "overlay" | "pane";
}) => {
  const quickValues = getIndicatorQuickValues(indicator);
  const isPaneVariant = variant === "pane";
  const stripClass = `pointer-events-auto inline-flex max-w-full items-center gap-1.5 rounded-[4px] border border-white/6 bg-[#232a38]/94 px-2 py-1 text-[11px] ${
    indicator.visible ? "" : "opacity-75"
  }`;

  return (
    <div className={stripClass}>
      {onToggleVisibility && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
          className={
            `flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm transition-colors ${
              indicator.visible
                ? "text-slate-300 hover:text-white"
                : "text-slate-500 hover:text-slate-300"
            }`
          }
          title={indicator.visible ? `Hide ${indicator.name}` : `Show ${indicator.name}`}
          aria-label={indicator.visible ? `Hide ${indicator.name}` : `Show ${indicator.name}`}
        >
          {indicator.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </button>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenSettings?.();
        }}
        className="flex min-w-0 items-center gap-1.5 text-left"
        title={onOpenSettings ? `Edit ${indicator.name}` : indicator.name}
        aria-label={onOpenSettings ? `Edit ${indicator.name}` : indicator.name}
      >
        <span className={`truncate text-[11px] font-black uppercase tracking-[0.12em] ${indicator.visible ? "text-white" : "text-slate-500"}`}>
          {indicator.name}
        </span>
        {quickValues.map((value, index) => (
          <span
            key={`${indicator.instanceId}-${value}-${index}`}
            className={`flex-shrink-0 text-[11px] font-bold ${indicator.visible ? "" : "opacity-60"}`}
            style={{ color: INDICATOR_VALUE_COLORS[index % INDICATOR_VALUE_COLORS.length] }}
          >
            {value}
          </span>
        ))}
      </button>

      {onOpenSettings && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSettings();
          }}
          className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm text-slate-300 transition-colors hover:text-white"
          title={`Edit ${indicator.name} settings`}
          aria-label={`Edit ${indicator.name} settings`}
        >
          <PenTool className="h-3 w-3" />
        </button>
      )}

      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className={
            variant === "overlay" || isPaneVariant
              ? "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm text-[#f27a72] transition-colors hover:text-[#ff9a92]"
              : "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-red-500/14 text-rose-300 transition-colors hover:bg-red-500/24"
          }
          title={`Delete ${indicator.name}`}
          aria-label={`Delete ${indicator.name}`}
        >
          <X className={variant === "overlay" || isPaneVariant ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={3} />
        </button>
      )}
    </div>
  );
};

const BAR_SPACING_MAP: Record<string, number> = {
  "1s": 15.4,
  "5s": 15.8,
  "15s": 16.1,
  "30s": 16.3,
  "1m": 16.5,
  "2m": 14.8,
  "3m": 13.8,
  "4m": 12.9,
  "5m": 12.2,
  "10m": 8.9,
  "15m": 9.3,
  "30m": 9.8,
  "1h": 10.3,
  "2h": 10.8,
  "4h": 11.6,
  "1D": 13.2,
};

const MIN_VISIBLE_BAR_COUNT_MAP: Record<string, number> = {
  "1s": 78,
  "5s": 78,
  "15s": 80,
  "30s": 82,
  "1m": 84,
  "2m": 90,
  "3m": 94,
  "4m": 96,
  "5m": 98,
  "10m": 98,
  "15m": 92,
  "30m": 86,
  "1h": 80,
  "2h": 74,
  "4h": 66,
  "1D": 46,
};

const MAX_VISIBLE_BAR_COUNT_MAP: Partial<Record<SupportedChartTimeframe, number>> = {
  "1s": 128,
  "5s": 126,
  "15s": 124,
  "30s": 122,
  "1m": 120,
  "2m": 136,
  "3m": 148,
  "4m": 158,
  "5m": 168,
  "10m": 176,
  "15m": 166,
  "30m": 156,
  "1h": 146,
  "2h": 136,
  "4h": 122,
  "1D": 92,
};

const MAX_READABLE_ZOOM_BAR_COUNT_MAP: Partial<Record<SupportedChartTimeframe, number>> = {
  "1s": 180,
  "5s": 176,
  "15s": 172,
  "30s": 168,
  "1m": 164,
  "2m": 184,
  "3m": 198,
  "4m": 210,
  "5m": 220,
  "10m": 214,
  "15m": 202,
  "30m": 188,
  "1h": 174,
  "2h": 160,
  "4h": 140,
  "1D": 106,
};

const MIN_BAR_SPACING_MAP: Record<string, number> = {
  "1s": 7.8,
  "5s": 8,
  "15s": 8.2,
  "30s": 8.4,
  "1m": 8.6,
  "2m": 7.4,
  "3m": 6.8,
  "4m": 6.2,
  "5m": 5.8,
  "10m": 2.38,
  "15m": 2.52,
  "30m": 2.68,
  "1h": 2.88,
  "2h": 3.08,
  "4h": 3.38,
  "1D": 3.95,
};

const PROFESSIONAL_HIGH_TIMEFRAME_SECONDS = 30 * 60;

const getMainPriceScaleMargins = (timeframe: SupportedChartTimeframe) => {
  const seconds = TIMEFRAMES[timeframe]?.seconds ?? TIMEFRAMES["1m"].seconds;

  if (seconds >= PROFESSIONAL_HIGH_TIMEFRAME_SECONDS) {
    return { top: 0.16, bottom: 0.17 };
  }

  return { top: 0.14, bottom: 0.15 };
};

const getZoomResponsivePriceScaleMargins = (
  timeframe: SupportedChartTimeframe,
  visibleSpan: number | null | undefined,
  containerWidth: number,
) => {
  const baseMargins = getMainPriceScaleMargins(timeframe);
  const targetVisibleBars = getTargetVisibleBars(containerWidth, timeframe);
  const seconds = TIMEFRAMES[timeframe]?.seconds ?? TIMEFRAMES["1m"].seconds;

  if (!Number.isFinite(visibleSpan) || !visibleSpan || visibleSpan <= 0 || targetVisibleBars <= 0) {
    return baseMargins;
  }

  const zoomRatio = visibleSpan / targetVisibleBars;
  const zoomPadding = Math.max(-0.08, Math.min(0.2, (zoomRatio - 1) * 0.11));
  const maxMargin = seconds >= PROFESSIONAL_HIGH_TIMEFRAME_SECONDS ? 0.32 : 0.34;
  const minMargin = seconds >= PROFESSIONAL_HIGH_TIMEFRAME_SECONDS ? 0.055 : 0.06;
  const margin = Math.max(minMargin, Math.min(maxMargin, baseMargins.top + zoomPadding));

  return { top: margin, bottom: margin };
};

const getMainPriceScaleOptions = (
  timeframe: SupportedChartTimeframe,
  visibleSpan?: number | null,
  containerWidth = 960,
) => ({
  borderColor: THEME.border,
  scaleMargins: getZoomResponsivePriceScaleMargins(timeframe, visibleSpan, containerWidth),
  minimumWidth: SYNCED_PRICE_SCALE_MIN_WIDTH,
  entireTextOnly: true,
  ticksVisible: true,
  borderVisible: true,
});

const getTargetVisibleBars = (containerWidth: number, timeframe: SupportedChartTimeframe) => {
  const safeWidth = Math.max(320, containerWidth);
  const targetSpacing = BAR_SPACING_MAP[timeframe] ?? BAR_SPACING_MAP["1m"];
  const minimumBars = MIN_VISIBLE_BAR_COUNT_MAP[timeframe] ?? DEFAULT_VISIBLE_BARS;
  const maximumBars = MAX_VISIBLE_BAR_COUNT_MAP[timeframe];
  const widthBasedBars = Math.floor(safeWidth / Math.max(1, targetSpacing));
  const cappedBars =
    typeof maximumBars === "number" ? Math.min(widthBasedBars, maximumBars) : widthBasedBars;

  return Math.max(minimumBars, cappedBars);
};

const getMaxReadableZoomBars = (
  containerWidth: number,
  timeframe: SupportedChartTimeframe,
  availableBars = Number.POSITIVE_INFINITY,
) => {
  const targetVisibleBars = getTargetVisibleBars(containerWidth, timeframe);
  const configuredMaximum = MAX_READABLE_ZOOM_BAR_COUNT_MAP[timeframe];
  const spacingMaximum = Math.floor(
    Math.max(320, containerWidth) / Math.max(1, MIN_BAR_SPACING_MAP[timeframe] ?? MIN_BAR_SPACING_MAP["1m"]),
  );
  const readableMaximum =
    typeof configuredMaximum === "number" ? Math.min(configuredMaximum, spacingMaximum) : spacingMaximum;

  return Math.max(targetVisibleBars, Math.min(availableBars, readableMaximum));
};

const getTrendContextMultiplier = (containerWidth: number, timeframe: SupportedChartTimeframe) => {
  const seconds = TIMEFRAMES[timeframe]?.seconds ?? TIMEFRAMES["1m"].seconds;

  if (seconds >= PROFESSIONAL_HIGH_TIMEFRAME_SECONDS) {
    if (containerWidth >= 1440) return 1.22;
    if (containerWidth >= 1024) return 1.18;
    if (containerWidth >= 768) return 1.14;
    return 1.1;
  }

  if (containerWidth >= 1440) return 1.62;
  if (containerWidth >= 1024) return 1.52;
  if (containerWidth >= 768) return 1.4;
  return 1.28;
};

const getTrendContextBarCount = (
  containerWidth: number,
  timeframe: SupportedChartTimeframe,
  availableBars = Number.POSITIVE_INFINITY,
) => {
  const targetVisibleBars = getTargetVisibleBars(containerWidth, timeframe);
  const expandedBarCount = Math.round(targetVisibleBars * getTrendContextMultiplier(containerWidth, timeframe));

  return Math.max(
    targetVisibleBars,
    Math.min(availableBars, expandedBarCount),
  );
};

const getHistoryBackfillThreshold = (containerWidth: number, timeframe: SupportedChartTimeframe) =>
  Math.max(18, Math.round(getTrendContextBarCount(containerWidth, timeframe) * 0.18));

const getHistoryBackfillIncrement = (containerWidth: number, timeframe: SupportedChartTimeframe) => {
  const trendContextBars = getTrendContextBarCount(containerWidth, timeframe);
  const historicalBaseline = TIMEFRAMES[timeframe]?.historical ?? DEFAULT_VISIBLE_BARS;

  return Math.max(trendContextBars, Math.round(historicalBaseline * 0.55));
};

const getChartRightOffset = (visibleBars: number) => Math.max(18, Math.min(58, Math.round(visibleBars * 0.18)));

const getDefaultVisibleBars = (
  containerWidth: number,
  timeframe: SupportedChartTimeframe,
  availableBars = Number.POSITIVE_INFINITY,
) => {
  const targetVisibleBars = getTargetVisibleBars(containerWidth, timeframe);
  return Math.max(1, Math.min(availableBars, targetVisibleBars));
};

const getInitialVisibleBars = (
  containerWidth: number,
  timeframe: SupportedChartTimeframe,
  availableBars = Number.POSITIVE_INFINITY,
) => {
  const defaultVisibleBars = getDefaultVisibleBars(containerWidth, timeframe, availableBars);
  const seconds = TIMEFRAMES[timeframe]?.seconds ?? TIMEFRAMES["1m"].seconds;
  const pocketStyleContextMultiplier =
    seconds < 60
      ? 1.02
      : seconds < 5 * 60
        ? 1.04
        : seconds < 30 * 60
          ? 1.14
          : seconds < 4 * 60 * 60
            ? 1.18
            : 1.22;
  const pocketStyleContextBars = Math.round(defaultVisibleBars * pocketStyleContextMultiplier);

  return Math.max(defaultVisibleBars, Math.min(availableBars, pocketStyleContextBars));
};

const getUnixTime = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
  }

  if (typeof value === "string") {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return numericValue > 1_000_000_000_000 ? Math.floor(numericValue / 1000) : Math.floor(numericValue);
    }

    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return Math.floor(parsed / 1000);
    }
  }

  return null;
};

const resolveLogicalTime = (
  targetTime: number,
  seriesPoints: Array<{ time: number; logical: number }>,
  timeframeSeconds: number,
) => {
  if (seriesPoints.length === 0) return null;

  const firstPoint = seriesPoints[0];
  const lastPoint = seriesPoints[seriesPoints.length - 1];

  if (targetTime <= firstPoint.time) {
    return firstPoint.logical;
  }

  for (let index = 0; index < seriesPoints.length - 1; index += 1) {
    const currentPoint = seriesPoints[index];
    const nextPoint = seriesPoints[index + 1];

    if (targetTime === currentPoint.time) {
      return currentPoint.logical;
    }

    if (targetTime > currentPoint.time && targetTime < nextPoint.time) {
      const span = Math.max(1, nextPoint.time - currentPoint.time);
      const fraction = (targetTime - currentPoint.time) / span;
      return currentPoint.logical + fraction;
    }
  }

  if (targetTime === lastPoint.time) {
    return lastPoint.logical;
  }

  const safeTimeframe = Math.max(1, Math.floor(timeframeSeconds || 60));
  const trailingFraction = Math.min(1, Math.max(0, (targetTime - lastPoint.time) / safeTimeframe));
  return lastPoint.logical + trailingFraction;
};

const calcHeikinAshi = (candles: OHLCCandle[]): OHLCCandle[] => {
  if (candles.length === 0) return [];
  const ha: OHLCCandle[] = [];
  ha.push({ ...candles[0] });
  for (let i = 1; i < candles.length; i++) {
    const prev = ha[i - 1];
    const curr = candles[i];
    const close = (curr.open + curr.high + curr.low + curr.close) / 4;
    const open = (prev.open + prev.close) / 2;
    const high = Math.max(curr.high, open, close);
    const low = Math.min(curr.low, open, close);
    ha.push({ ...curr, open, high, low, close });
  }
  return ha;
};

const getMainSeriesData = (chartType: ChartType, candles: OHLCCandle[]) => {
  const candlesToRender = chartType === "heikinAshi" ? calcHeikinAshi(candles) : candles;
  return chartType === "line" ? toLineChartData(candlesToRender) : toOhlcChartData(candlesToRender);
};

const buildMainSeriesUpdatePayload = (
  chartType: ChartType,
  candle: OHLCCandle,
  history: OHLCCandle[],
): MainChartPoint => {
  if (chartType === "heikinAshi" && history.length > 0) {
    const hist = calcHeikinAshi(history);
    const prev = hist[hist.length - 1];
    const haOpen = (prev.open + prev.close) / 2;
    const haClose = (candle.open + candle.high + candle.low + candle.close) / 4;

    return {
      time: toChartTime(candle.time),
      open: haOpen,
      high: Math.max(candle.high, haOpen, haClose),
      low: Math.min(candle.low, haOpen, haClose),
      close: haClose,
    };
  }

  if (chartType === "line") {
    return { time: toChartTime(candle.time), value: candle.close };
  }

  return {
    time: toChartTime(candle.time),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  };
};

const getLiveBeaconPrice = (chartType: ChartType, candle: OHLCCandle, history: OHLCCandle[]) => {
  if (chartType === "heikinAshi" && history.length > 0) {
    const hist = calcHeikinAshi(history);
    const prev = hist[hist.length - 1];
    const haOpen = (prev.open + prev.close) / 2;
    const haClose = (candle.open + candle.high + candle.low + candle.close) / 4;
    return Math.max(Math.min(haClose, Math.max(candle.high, haOpen, haClose)), Math.min(candle.low, haOpen, haClose));
  }

  return candle.close;
};

const getPricePrecision = (price: number) => {
  if (price > 10000) return 2;
  if (price > 100) return 3;
  if (price > 1) return 5;
  return 6;
};

const formatSettlementProfit = (amount: number) =>
  `${amount >= 0 ? "+" : "-"}${Math.abs(amount).toFixed(2)} $`;

const formatSettlementClock = (seconds: number) => {
  const normalized = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor((normalized % 3600) / 60);
  const remainderSeconds = normalized % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainderSeconds).padStart(2, "0")}`;
};

const SettlementCloneOverlay = ({
  announcement,
  compact,
}: {
  announcement: ChartSettlementAnnouncement;
  compact: boolean;
}) => {
  const won = announcement.status === "won";
  const accent = won ? "#33cd77" : "#ff7b72";
  const leftOffset = 100;
  const bottomOffset = 100;

  return (
    <div className="pointer-events-none absolute inset-0 z-[66] overflow-visible">
      <div
        className="absolute flex items-center gap-3 rounded-[14px] px-5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
        style={{ left: leftOffset, bottom: bottomOffset, background: "var(--trading-panel-soft-bg)" }}
      >
        {won ? (
          <CheckCheck className="h-5 w-5" style={{ color: "#33cd77" }} strokeWidth={2.5} />
        ) : (
          <X className="h-5 w-5" style={{ color: "#ff7b72" }} strokeWidth={2.5} />
        )}
        <AssetSymbolMark symbol={announcement.assetSymbol} size={20} />
        <span className="h-4 w-px bg-white/15" />
        <span className="text-[14px] font-black uppercase tracking-[0.14em]" style={{ color: accent }}>
          {won ? t("tradingChart.settlementWin") : t("tradingChart.settlementLoss")}
        </span>
        <span className="text-[14px] font-bold tabular-nums text-white">
          {formatSettlementProfit(announcement.profit)}
        </span>
      </div>
    </div>
  );
};

const getSeriesPriceFormat = (price: number) => {
  const precision = getPricePrecision(price);

  return {
    type: "price" as const,
    precision,
    minMove: Number(`1e-${precision}`),
  };
};

const formatTimeScaleTick = (time: number, timeframeSeconds: number) => {
  const date = new Date(time * 1000);

  if (timeframeSeconds < 60) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  if (timeframeSeconds < 12 * 60 * 60) {
    if (timeframeSeconds >= 4 * 60 * 60) {
      return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  if (timeframeSeconds < 24 * 60 * 60) {
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
};

type ChartDisplayPreset = "primary" | "secondary";

type ChartStylePreferences = {
  areaLineColor: string;
  areaFillColor: string;
  areaFillEnabled: boolean;
  areaLineWidth: number;
  candleUpColor: string;
  candleDownColor: string;
  barUpColor: string;
  barDownColor: string;
  heikinUpColor: string;
  heikinDownColor: string;
  bodyScale: number;
  displayPreset: ChartDisplayPreset;
  priceLineVisible: boolean;
};

type PairInfoTrendPoint = {
  index: number;
  normalized: number;
};

type MainSeriesKind = "area" | "bar" | "candlestick";

const CHART_STYLE_STORAGE_KEY = "trade_chart_style_preferences_v4";
const SELECTED_TIMEFRAME_STORAGE_KEY = "trade_selected_timeframe_v1";
const TRANSPARENT_COLOR = "rgba(0,0,0,0)";

const DEFAULT_CHART_STYLE: ChartStylePreferences = {
  areaLineColor: PROFESSIONAL_UP_COLOR,
  areaFillColor: PROFESSIONAL_UP_COLOR,
  areaFillEnabled: true,
  areaLineWidth: 3,
  candleUpColor: PROFESSIONAL_UP_COLOR,
  candleDownColor: PROFESSIONAL_DOWN_COLOR,
  barUpColor: PROFESSIONAL_UP_COLOR,
  barDownColor: PROFESSIONAL_DOWN_COLOR,
  heikinUpColor: PROFESSIONAL_UP_COLOR,
  heikinDownColor: PROFESSIONAL_DOWN_COLOR,
  bodyScale: 1.08,
  displayPreset: "primary",
  priceLineVisible: true,
};

const CANDLE_COLOR_PRESETS = [
  { id: "init", label: "Init", up: PROFESSIONAL_UP_COLOR, down: PROFESSIONAL_DOWN_COLOR },
  { id: "soft", label: "Soft", up: LEGACY_PROFESSIONAL_UP_COLOR, down: LEGACY_PROFESSIONAL_DOWN_COLOR },
  { id: "bright", label: "Bright", up: LEGACY_PLATFORM_UP, down: LEGACY_PLATFORM_DOWN },
  { id: "classic", label: "Classic", up: "#29c76c", down: "#ea6860" },
] as const;

const isValidHexColor = (value: unknown): value is string =>
  typeof value === "string" && /^#([0-9a-fA-F]{6})$/.test(value);

const toRgba = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace("#", "");
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
};

const mixHexColors = (sourceHex: string, targetHex: string, weight: number) => {
  if (!isValidHexColor(sourceHex) || !isValidHexColor(targetHex)) {
    return sourceHex;
  }

  const normalizedWeight = Math.max(0, Math.min(1, weight));
  const source = sourceHex.replace("#", "");
  const target = targetHex.replace("#", "");
  const mixChannel = (index: number) => {
    const sourceValue = parseInt(source.slice(index, index + 2), 16);
    const targetValue = parseInt(target.slice(index, index + 2), 16);
    return Math.round(sourceValue + (targetValue - sourceValue) * normalizedWeight)
      .toString(16)
      .padStart(2, "0");
  };

  return `#${mixChannel(0)}${mixChannel(2)}${mixChannel(4)}`;
};

const matchesHexColor = (value: string, target: string) => value.trim().toLowerCase() === target.trim().toLowerCase();

const resolveChartSurfaceColor = (value: string | null | undefined) => {
  if (!isValidHexColor(value)) {
    return PROFESSIONAL_CHART_BG;
  }

  return matchesHexColor(value, LEGACY_CHART_BG) ? PROFESSIONAL_CHART_BG : value;
};

const resolveChartCandleColor = (
  value: string | null | undefined,
  legacyColor: string | string[],
  professionalColor: string,
) => {
  if (!isValidHexColor(value)) {
    return professionalColor;
  }

  const legacyColors = Array.isArray(legacyColor) ? legacyColor : [legacyColor];
  return legacyColors.some((color) => matchesHexColor(value, color)) ? professionalColor : value;
};

const clampBodyScale = (value: number) => Math.max(0.9, Math.min(1.5, value));
const clampAreaWidth = (value: number) => Math.max(1, Math.min(4, value));

const isChartDisplayPreset = (value: unknown): value is ChartDisplayPreset =>
  value === "primary" || value === "secondary";

const isSupportedChartTimeframeValue = (value: unknown): value is SupportedChartTimeframe =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(TIMEFRAMES, value);

const loadSelectedTimeframePreference = (): SupportedChartTimeframe => {
  if (typeof window === "undefined") return "1m";

  try {
    const storedValue = window.localStorage.getItem(SELECTED_TIMEFRAME_STORAGE_KEY);
    return isSupportedChartTimeframeValue(storedValue) ? storedValue : "1m";
  } catch {
    return "1m";
  }
};

const getAreaDisplaySettings = (styles: ChartStylePreferences) => {
  const fillEnabled = styles.areaFillEnabled && styles.displayPreset === "primary";
  const lineWidth =
    styles.displayPreset === "secondary"
      ? clampAreaWidth(styles.areaLineWidth - 1)
      : clampAreaWidth(styles.areaLineWidth);

  return {
    lineColor: styles.areaLineColor,
    topColor: fillEnabled ? toRgba(styles.areaFillColor, 0.38) : TRANSPARENT_COLOR,
    bottomColor: fillEnabled ? toRgba(styles.areaFillColor, 0.04) : TRANSPARENT_COLOR,
    lineWidth,
    crosshairMarkerBorderColor: styles.areaLineColor,
    crosshairMarkerBackgroundColor: "#182131",
    crosshairMarkerRadius: 3,
    priceLineVisible: styles.priceLineVisible,
    lastValueVisible: true,
    autoScale: true,
  };
};

const getBarDisplaySettings = (
  styles: ChartStylePreferences,
  globalTheme: { up: string; down: string },
) => ({
  upColor: styles.barUpColor || globalTheme.up,
  downColor: styles.barDownColor || globalTheme.down,
  openVisible: true,
  thinBars: styles.displayPreset === "secondary",
  priceLineVisible: styles.priceLineVisible,
  autoScale: true,
});

const getCandlestickDisplaySettings = (
  chartType: ChartType,
  styles: ChartStylePreferences,
  globalTheme: { up: string; down: string },
) => {
  const baseUpColor = getCandleUpColor(chartType, styles, globalTheme.up);
  const baseDownColor = getCandleDownColor(chartType, styles, globalTheme.down);
  const minimalPreset = styles.displayPreset === "secondary";
  const upColor = minimalPreset ? toRgba(baseUpColor, 0.85) : mixHexColors(baseUpColor, "#ffffff", 0.02);
  const downColor = minimalPreset ? toRgba(baseDownColor, 0.85) : mixHexColors(baseDownColor, "#ffffff", 0.02);
  const wickUpColor = toRgba(mixHexColors(baseUpColor, "#ffffff", minimalPreset ? 0.02 : 0.04), 0.88);
  const wickDownColor = toRgba(mixHexColors(baseDownColor, "#ffffff", minimalPreset ? 0.02 : 0.04), 0.88);

  return {
    upColor,
    downColor,
    borderUpColor: baseUpColor,
    borderDownColor: baseDownColor,
    wickUpColor,
    wickDownColor,
    borderVisible: true,
    wickVisible: true,
    priceLineVisible: styles.priceLineVisible,
    autoScale: true,
  };
};

const getCandlestickPreviewPalette = (color: string, variant: ChartDisplayPreset) => ({
  bodyColor: variant === "secondary" ? toRgba(color, 0.92) : color,
  borderColor: variant === "secondary" ? toRgba(color, 0.92) : color,
  wickColor: variant === "secondary" ? toRgba(color, 0.92) : mixHexColors(color, "#ffffff", 0.08),
});

const getMainSeriesKind = (chartType: ChartType): MainSeriesKind =>
  chartType === "line" ? "area" : chartType === "bars" ? "bar" : "candlestick";

const createMainSeries = (
  chart: IChartApi,
  chartType: ChartType,
  priceFormat: ReturnType<typeof getSeriesPriceFormat>,
  styles: ChartStylePreferences,
  globalTheme: { up: string; down: string },
) => {
  if (chartType === "line") {
    return {
      kind: "area" as const,
      series: chart.addSeries(AreaSeries, {
        priceFormat,
        ...getAreaDisplaySettings(styles),
      }),
    };
  }

  if (chartType === "bars") {
    return {
      kind: "bar" as const,
      series: chart.addSeries(BarSeries, {
        priceFormat,
        ...getBarDisplaySettings(styles, globalTheme),
      }),
    };
  }

  return {
    kind: "candlestick" as const,
    series: chart.addSeries(CandlestickSeries, {
      priceFormat,
      ...getCandlestickDisplaySettings(chartType, styles, globalTheme),
    }),
  };
};

const applyMainSeriesOptions = (
  series: ChartSeriesApi,
  chartType: ChartType,
  priceFormat: ReturnType<typeof getSeriesPriceFormat>,
  styles: ChartStylePreferences,
  globalTheme: { up: string; down: string },
) => {
  if (chartType === "line") {
    series.applyOptions({
      priceFormat,
      ...getAreaDisplaySettings(styles),
    });
    return;
  }

  if (chartType === "bars") {
    series.applyOptions({
      priceFormat,
      ...getBarDisplaySettings(styles, globalTheme),
    });
    return;
  }

  series.applyOptions({
    priceFormat,
    ...getCandlestickDisplaySettings(chartType, styles, globalTheme),
  });
};

const loadChartStylePreferences = (): ChartStylePreferences => {
  if (typeof window === "undefined") return DEFAULT_CHART_STYLE;

  try {
    const raw = window.localStorage.getItem(CHART_STYLE_STORAGE_KEY);
    if (!raw) return DEFAULT_CHART_STYLE;
    const parsed = JSON.parse(raw) as Partial<ChartStylePreferences>;
    return {
      areaLineColor: resolveChartCandleColor(parsed.areaLineColor, ["#f59e0b"], DEFAULT_CHART_STYLE.areaLineColor),
      areaFillColor: resolveChartCandleColor(parsed.areaFillColor, ["#f59e0b"], DEFAULT_CHART_STYLE.areaFillColor),
      areaFillEnabled: typeof parsed.areaFillEnabled === "boolean" ? parsed.areaFillEnabled : DEFAULT_CHART_STYLE.areaFillEnabled,
      areaLineWidth:
        typeof parsed.areaLineWidth === "number" ? clampAreaWidth(parsed.areaLineWidth) : DEFAULT_CHART_STYLE.areaLineWidth,
      candleUpColor: resolveChartCandleColor(
        parsed.candleUpColor,
        [LEGACY_PLATFORM_UP, LEGACY_INIT_UP_COLOR, LEGACY_PROFESSIONAL_UP_COLOR, "#0faf59"],
        DEFAULT_CHART_STYLE.candleUpColor,
      ),
      candleDownColor: resolveChartCandleColor(
        parsed.candleDownColor,
        [LEGACY_PLATFORM_DOWN, LEGACY_INIT_DOWN_COLOR, LEGACY_PROFESSIONAL_DOWN_COLOR, "#db4635"],
        DEFAULT_CHART_STYLE.candleDownColor,
      ),
      barUpColor: resolveChartCandleColor(
        parsed.barUpColor,
        [LEGACY_PLATFORM_UP, LEGACY_INIT_UP_COLOR, LEGACY_PROFESSIONAL_UP_COLOR, "#0faf59"],
        DEFAULT_CHART_STYLE.barUpColor,
      ),
      barDownColor: resolveChartCandleColor(
        parsed.barDownColor,
        [LEGACY_PLATFORM_DOWN, LEGACY_INIT_DOWN_COLOR, LEGACY_PROFESSIONAL_DOWN_COLOR, "#db4635"],
        DEFAULT_CHART_STYLE.barDownColor,
      ),
      heikinUpColor: resolveChartCandleColor(
        parsed.heikinUpColor,
        ["#29c76c", LEGACY_INIT_UP_COLOR, LEGACY_PROFESSIONAL_UP_COLOR, "#0faf59"],
        DEFAULT_CHART_STYLE.heikinUpColor,
      ),
      heikinDownColor: resolveChartCandleColor(
        parsed.heikinDownColor,
        ["#ea6860", LEGACY_INIT_DOWN_COLOR, LEGACY_PROFESSIONAL_DOWN_COLOR, "#db4635"],
        DEFAULT_CHART_STYLE.heikinDownColor,
      ),
      bodyScale: typeof parsed.bodyScale === "number" ? clampBodyScale(parsed.bodyScale) : DEFAULT_CHART_STYLE.bodyScale,
      displayPreset: isChartDisplayPreset(parsed.displayPreset) ? parsed.displayPreset : DEFAULT_CHART_STYLE.displayPreset,
      priceLineVisible:
        typeof parsed.priceLineVisible === "boolean" ? parsed.priceLineVisible : DEFAULT_CHART_STYLE.priceLineVisible,
    };
  } catch {
    return DEFAULT_CHART_STYLE;
  }
};

const getCandleUpColor = (chartType: ChartType, styles: ChartStylePreferences, fallback: string) =>
  chartType === "heikinAshi" ? styles.heikinUpColor || fallback : styles.candleUpColor || fallback;

const getCandleDownColor = (chartType: ChartType, styles: ChartStylePreferences, fallback: string) =>
  chartType === "heikinAshi" ? styles.heikinDownColor || fallback : styles.candleDownColor || fallback;

const getBarSpacingForScale = (timeframe: SupportedChartTimeframe, bodyScale: number) =>
  (BAR_SPACING_MAP[timeframe] ?? BAR_SPACING_MAP["1m"]) * clampBodyScale(bodyScale);

const getMinBarSpacingForScale = (timeframe: SupportedChartTimeframe, bodyScale: number) =>
  Math.max(1, (MIN_BAR_SPACING_MAP[timeframe] ?? MIN_BAR_SPACING_MAP["1m"]) * Math.max(0.95, bodyScale * 0.96));

const buildPairInfoTrend = (candles: OHLCCandle[]): PairInfoTrendPoint[] => {
  const closes = candles.slice(-72).map((candle) => candle.close);
  if (closes.length === 0) return [];

  const minClose = Math.min(...closes);
  const maxClose = Math.max(...closes);
  const span = Math.max(0.0000001, maxClose - minClose);

  return closes.map((close, index) => ({
    index,
    normalized: (close - minClose) / span,
  }));
};

const formatScheduleDate = (date: Date) =>
  date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });

const buildTradingSchedule = () => {
  const rows: Array<{ dateLabel: string; weekday: string; session: string }> = [];
  const now = new Date();

  for (let i = 0; i < 7; i += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;
    rows.push({
      dateLabel: formatScheduleDate(date),
      weekday: date.toLocaleDateString("en-GB", { weekday: "long" }),
      session: isWeekend ? "Market Closed" : "05:00 - 23:00",
    });
  }

  return rows;
};

const formatSignedPercent = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
const formatChangeCardPercent = (value: number) => {
  if (Math.abs(value) < 0.005) return "0%";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};

const buildPairChangeCards = (candles: OHLCCandle[], timeframeSeconds: number, t: (key: string) => string) => {
  const safeSeconds = Math.max(1, timeframeSeconds);
  const specs = [
    { label: t("tradingChart.change5min"), seconds: 300 },
    { label: t("tradingChart.change60min"), seconds: 3600 },
    { label: t("tradingChart.change1day"), seconds: 86400 },
  ];

  const latestClose = candles[candles.length - 1]?.close ?? 0;

  return specs.map((spec) => {
    const lookback = Math.max(1, Math.round(spec.seconds / safeSeconds));
    const referenceIndex = Math.max(0, candles.length - 1 - lookback);
    const referenceClose = candles[referenceIndex]?.close ?? latestClose;
    const change =
      referenceClose > 0 ? ((latestClose - referenceClose) / referenceClose) * 100 : 0;

    return {
      label: spec.label,
      value: Number.isFinite(change) ? change : 0,
    };
  });
};

const buildPairLongChangeCards = (candles: OHLCCandle[], timeframeSeconds: number, t: (key: string) => string) => {
  const safeSeconds = Math.max(1, timeframeSeconds);
  const specs = [
    { id: "month" as const, label: t("tradingChart.change1month"), seconds: 30 * 86400 },
    { id: "year" as const, label: t("tradingChart.change1year"), seconds: 365 * 86400 },
    { id: "ytd" as const, label: t("tradingChart.changeYtd"), seconds: 365 * 86400 },
  ];

  const latestClose = candles[candles.length - 1]?.close ?? 0;
  const firstClose = candles[0]?.open ?? latestClose;

  return specs.map((spec) => {
    const lookback = Math.max(1, Math.round(spec.seconds / safeSeconds));
    const referenceIndex = spec.id === "ytd"
      ? 0
      : Math.max(0, candles.length - 1 - lookback);
    const referenceClose = candles[referenceIndex]?.close ?? firstClose;
    const change =
      referenceClose > 0 ? ((latestClose - referenceClose) / referenceClose) * 100 : 0;

    return {
      label: spec.label,
      value: Number.isFinite(change) ? change : 0,
    };
  });
};

const buildPairTrendGeometry = (trend: PairInfoTrendPoint[]) => {
  if (trend.length === 0) {
    return {
      linePoints: "0,70 100,70",
      areaPoints: "0,100 0,70 100,70 100,100",
    };
  }

  const linePoints = trend
    .map((point, index) => {
      const x = trend.length <= 1 ? 0 : (index / Math.max(1, trend.length - 1)) * 100;
      const y = 86 - point.normalized * 62;
      return `${x},${y}`;
    })
    .join(" ");

  return {
    linePoints,
    areaPoints: `0,100 ${linePoints} 100,100`,
  };
};

const getPairSessionState = (t: (key: string) => string, now = new Date()) => {
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const isWeekend = day === 0 || day === 6;
  const openMinutes = 5 * 60;
  const closeMinutes = 23 * 60;

  if (isWeekend) {
    return {
      isOpen: false,
      label: t("tradingChart.closedNow"),
      detail: day === 6 ? "Opens Monday at 05:00" : "Weekend session pause",
    };
  }

  if (minutes < openMinutes) {
    return {
      isOpen: false,
      label: t("tradingChart.opensAt"),
      detail: "Session has not started yet",
    };
  }

  if (minutes >= closeMinutes) {
    return {
      isOpen: false,
      label: t("tradingChart.closedNow"),
      detail: day === 5 ? "Reopens Monday at 05:00" : "Reopens tomorrow at 05:00",
    };
  }

  return {
    isOpen: true,
    label: t("tradingChart.openNow"),
    detail: t("tradingChart.closesTodayAt"),
  };
};

const ChartStylePreview = ({
  chartType,
  variant,
  styles,
}: {
  chartType: ChartType;
  variant: ChartDisplayPreset;
  styles: ChartStylePreferences;
}) => {
  const backgroundClass =
    variant === "primary"
      ? "border-[#10a055] bg-[#20283a]"
      : "border-white/8 bg-[#252d3d]";

  if (chartType === "line") {
    const stroke = styles.areaLineColor;
    const fill = variant === "primary" && styles.areaFillEnabled ? toRgba(styles.areaFillColor, 0.28) : "transparent";

    return (
      <div className={`flex h-[62px] w-full items-center justify-center rounded-[6px] border ${backgroundClass}`}>
        <svg viewBox="0 0 100 48" className="h-[48px] w-[92px]">
          <polyline points="2,41 18,26 31,30 46,12 60,18 73,16 86,29 98,26" fill={fill} stroke="none" />
          <polyline
            points="2,41 18,26 31,30 46,12 60,18 73,16 86,29 98,26"
            fill="none"
            stroke={stroke}
            strokeWidth={variant === "primary" ? 2.4 : 1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  const upColor =
    chartType === "bars"
      ? styles.barUpColor
      : chartType === "heikinAshi"
        ? styles.heikinUpColor
        : styles.candleUpColor;
  const downColor =
    chartType === "bars"
      ? styles.barDownColor
      : chartType === "heikinAshi"
        ? styles.heikinDownColor
        : styles.candleDownColor;
  const upPalette = getCandlestickPreviewPalette(upColor, variant);
  const downPalette = getCandlestickPreviewPalette(downColor, variant);
  const borderVisible = variant === "primary";
  const thinBars = chartType === "bars" && variant === "secondary";

  return (
    <div className={`flex h-[62px] w-full items-center justify-center rounded-[6px] border ${backgroundClass}`}>
      <svg viewBox="0 0 100 48" className="h-[48px] w-[92px]">
        {[14, 29, 44, 59, 74, 89].map((x, index) => {
          const isUp = index % 2 === 0;
          const color = isUp ? upColor : downColor;
          const bodyTop = isUp ? 20 - (index % 3) * 2 : 12 + (index % 3) * 4;
          const bodyBottom = isUp ? 34 - (index % 2) * 4 : 32 + (index % 2) * 3;

          if (chartType === "bars") {
            return (
              <g key={`${variant}-${x}`}>
                <line x1={x} y1="8" x2={x} y2="40" stroke={color} strokeWidth="1.4" />
                <line x1={x - (thinBars ? 3 : 5)} y1={bodyTop} x2={x} y2={bodyTop} stroke={color} strokeWidth="1.8" />
                <line x1={x} y1={bodyBottom} x2={x + (thinBars ? 3 : 5)} y2={bodyBottom} stroke={color} strokeWidth="1.8" />
              </g>
            );
          }

          return (
            <g key={`${variant}-${x}`}>
              <line
                x1={x}
                y1="8"
                x2={x}
                y2="40"
                stroke={isUp ? upPalette.wickColor : downPalette.wickColor}
                strokeWidth="1.2"
              />
              <rect
                x={x - 4}
                y={Math.min(bodyTop, bodyBottom)}
                width="8"
                height={Math.max(8, Math.abs(bodyBottom - bodyTop))}
                fill={isUp ? upPalette.bodyColor : downPalette.bodyColor}
                stroke={isUp ? upPalette.borderColor : downPalette.borderColor}
                strokeWidth={borderVisible ? 1 : 0}
                rx="1"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const getSentimentSplit = (candles: OHLCCandle[], currentPrice: number) => {
  if (candles.length < 4) {
    return { sell: 50, buy: 50 };
  }

  const recent = candles.slice(-Math.min(36, candles.length));
  const highs = recent.map((candle) => candle.high);
  const lows = recent.map((candle) => candle.low);
  const low = Math.min(...lows);
  const high = Math.max(...highs);
  const range = Math.max(0.000001, high - low);
  const startPrice = recent[0]?.open ?? currentPrice;
  const endPrice = recent[recent.length - 1]?.close ?? currentPrice;
  const lastCandle = recent[recent.length - 1];
  const positionScore = ((currentPrice - low) / range) * 2 - 1;
  const netMoveScore = Math.max(-1, Math.min(1, (endPrice - startPrice) / range));
  const candleBodyScore = lastCandle
    ? Math.max(-1, Math.min(1, (lastCandle.close - lastCandle.open) / Math.max(range * 0.34, 0.000001)))
    : 0;

  let upSteps = 0;
  let downSteps = 0;
  for (let index = 1; index < recent.length; index += 1) {
    const previousClose = recent[index - 1].close;
    const currentClose = recent[index].close;
    if (currentClose > previousClose) upSteps += 1;
    if (currentClose < previousClose) downSteps += 1;
  }

  const directionalPressure =
    upSteps + downSteps > 0 ? (upSteps - downSteps) / (upSteps + downSteps) : 0;
  const buy = Math.max(
    35,
    Math.min(
      65,
      Math.round(
        50 +
          positionScore * 11 +
          netMoveScore * 8 +
          directionalPressure * 7 +
          candleBodyScore * 4,
      ),
    ),
  );

  return {
    buy,
    sell: 100 - buy,
  };
};

const TradeSentimentRail = ({
  higherPercent,
  lowerPercent,
  onSelectDirection,
}: {
  higherPercent: number;
  lowerPercent: number;
  onSelectDirection: (direction: TradeDeskDirection) => void;
}) => {
  const clampedHigher = Math.max(0, Math.min(100, Math.round(higherPercent)));
  const clampedLower = Math.max(0, Math.min(100, Math.round(lowerPercent)));

  return (
    <div className="relative h-full w-[40px]">
      <button
        type="button"
        onClick={() => onSelectDirection("lower")}
        aria-label={`Trade lower at ${clampedLower}%`}
        className="absolute inset-x-0 top-0 z-20 h-[45%] rounded-[6px] pointer-events-auto transition-colors hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6f6f]/60"
      >
        <span className="sr-only">{t("tradingChart.lower")}</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectDirection("higher")}
        aria-label={`Trade higher at ${clampedHigher}%`}
        className="absolute inset-x-0 bottom-0 z-20 h-[45%] rounded-[6px] pointer-events-auto transition-colors hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#35d07f]/60"
      >
        <span className="sr-only">{t("tradingChart.higher")}</span>
      </button>

      <div className="pointer-events-none relative z-10 flex h-full w-full flex-col justify-between">
        <div className="flex w-full items-center justify-between px-1 pt-2">
          <span className="text-[11px] font-semibold text-white">{clampedLower}%</span>
        </div>

        <div className="relative flex h-full w-full items-stretch py-4">
          <div className="absolute left-1/2 top-4 bottom-4 w-[5px] -translate-x-1/2 rounded-full bg-white/10" />
          <div className="relative mx-auto h-full w-[5px] rounded-full bg-[#1a1e2b]">
            <div className="absolute left-0 top-0 w-full rounded-full bg-[#ff6a5f]" style={{ height: `${clampedLower}%` }} />
            <div className="absolute left-0 bottom-0 w-full rounded-full bg-[#20c96b]" style={{ height: `${clampedHigher}%` }} />
          </div>
        </div>

        <div className="flex w-full items-center justify-between px-1 pb-2">
          <span className="text-[11px] font-semibold text-white">{clampedHigher}%</span>
        </div>
      </div>
    </div>
  );
};

const PAIR_INFO_NOTIONAL_VOL = [
  "8.2M",
  "11.4M",
  "6.7M",
  "9.3M",
  "10.1M",
  "7.8M",
  "12.6M",
] as const;

// Sub-component to seamlessly manage separate panes (Oscillators)
const OscillatorPane = ({
  indicator,
  getHistory,
  syncMainChart,
  selectedTf,
  bodyScale,
  renderKey,
  liveSignal,
  controlStripLeftInset = 8,
  onOpenSettings,
  onToggleVisibility,
  onRemove,
}: {
  indicator: ActiveIndicator;
  getHistory: () => OHLCCandle[];
  syncMainChart: IChartApi | null;
  selectedTf: SupportedChartTimeframe;
  bodyScale: number;
  renderKey: number;
  liveSignal: number;
  controlStripLeftInset?: number;
  onOpenSettings?: () => void;
  onToggleVisibility?: () => void;
  onRemove?: () => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const timeAnchorSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const seriesRefs = useRef<Record<string, ChartSeriesApi>>({});
  const guideLineRefs = useRef<Record<string, IPriceLine>>({});
  const prevParamsRef = useRef<string>("");

  // 1. Mount Chart
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: THEME.panel }, textColor: THEME.mutedText, fontSize: 10 },
      grid: { vertLines: { color: THEME.grid }, horzLines: { color: THEME.grid } },
      handleScroll: { mouseWheel: false, pressedMouseMove: false, horzTouchDrag: false, vertTouchDrag: false },
      handleScale: { mouseWheel: false, pinch: false, axisPressedMouseMove: false, axisDoubleClickReset: false },
      animation: { enabled: true, duration: 800 },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { visible: false, labelVisible: false },
        horzLine: { visible: false, labelVisible: false },
      },
      rightPriceScale: {
        borderColor: THEME.border,
        scaleMargins: { top: 0.1, bottom: 0.1 },
        textColor: THEME.mutedText,
        minimumWidth: SYNCED_PRICE_SCALE_MIN_WIDTH,
      },
      timeScale: {
        borderColor: THEME.border,
        visible: false,
        timeVisible: true,
        secondsVisible: true,
      },
    });
    chartRef.current = chart;
    timeAnchorSeriesRef.current = chart.addSeries(LineSeries, {
      color: "rgba(0,0,0,0)",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      pointMarkersVisible: false,
    });

    if (syncMainChart) {
      const mainTs = syncMainChart.timeScale();
      const paneTs = chart.timeScale();
      const syncToPane = () => {
        try {
          const visibleRange = mainTs.getVisibleLogicalRange();
          if (visibleRange) {
            paneTs.setVisibleLogicalRange(visibleRange);
          }
        } catch (e) {}
      };

      syncToPane();
      mainTs.subscribeVisibleLogicalRangeChange(syncToPane);

      const obs = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: containerRef.current.clientWidth, height: 90 });
          syncToPane();
        }
      });
      obs.observe(containerRef.current);

      return () => {
        mainTs.unsubscribeVisibleLogicalRangeChange(syncToPane);
        obs.disconnect();
        chart.remove();
        chartRef.current = null;
        timeAnchorSeriesRef.current = null;
      };
    }

    const obs = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current)
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth, height: 90 });
    });
    obs.observe(containerRef.current);
    return () => {
      obs.disconnect();
      chart.remove();
      chartRef.current = null;
      timeAnchorSeriesRef.current = null;
    };
  }, [syncMainChart]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const tf = TIMEFRAMES[selectedTf];
    const historyCount = Math.max(1, getHistory().length);
    const containerWidth = containerRef.current?.clientWidth ?? 960;
    const rightOffset = getChartRightOffset(
      getTrendContextBarCount(containerWidth, selectedTf, historyCount),
    );

    chart.applyOptions({
      rightPriceScale: {
        borderColor: THEME.border,
        scaleMargins: { top: 0.1, bottom: 0.1 },
        textColor: THEME.mutedText,
        minimumWidth: SYNCED_PRICE_SCALE_MIN_WIDTH,
      },
      timeScale: {
        borderColor: THEME.border,
        visible: false,
        timeVisible: true,
        secondsVisible: tf.seconds < 60,
        rightOffset,
        barSpacing: getBarSpacingForScale(selectedTf, bodyScale),
        minBarSpacing: getMinBarSpacingForScale(selectedTf, bodyScale),
        fixLeftEdge: false,
        fixRightEdge: false,
        rightBarStaysOnScroll: false,
        shiftVisibleRangeOnNewBar: false,
        allowShiftVisibleRangeOnWhitespaceReplacement: false,
        lockVisibleTimeRangeOnResize: true,
      },
    });

    if (syncMainChart) {
      const visibleRange = syncMainChart.timeScale().getVisibleLogicalRange();
      if (visibleRange) {
        chart.timeScale().setVisibleLogicalRange(visibleRange);
      }
    }
  }, [bodyScale, getHistory, selectedTf, syncMainChart]);

  // 2. Data + Param Update — fires on indicator change OR renderKey tick
  useEffect(() => {
    if (!chartRef.current || !indicator.visible) return;
    const history = getHistory();
    if (history.length === 0) return;

    const conf = INDICATOR_REGISTRY.find(c => c.id === indicator.configId);
    if (!conf) return;

    const paramsStr = JSON.stringify(indicator.params);
    const paramsChanged = prevParamsRef.current !== paramsStr;
    prevParamsRef.current = paramsStr;

    // When params changed, destroy all series so they get recreated with fresh options
    if (paramsChanged && Object.keys(seriesRefs.current).length > 0) {
      Object.values(seriesRefs.current).forEach(s => { try { chartRef.current!.removeSeries(s); } catch(e) {} });
      seriesRefs.current = {};
      guideLineRefs.current = {};
    }

    const outputs = calculateIndicator(indicator, history);
    timeAnchorSeriesRef.current?.setData(history.map((candle) => ({ time: toChartTime(candle.time) })));

    outputs.forEach(out => {
      const outConf = conf.outputs.find(o => o.id === out.id);
      if (!outConf) return;

      const fillSeriesKey = `${out.id}__fill`;
      const rawBackground = indicator.params.background;
      const shouldRenderBackground =
        out.id === "line" &&
        outConf.type === "line" &&
        !!rawBackground &&
        indicator.params.background_enabled !== false;

      if (shouldRenderBackground && !seriesRefs.current[fillSeriesKey]) {
        const fillColor = toIndicatorFillColor(rawBackground, 0.2);
        seriesRefs.current[fillSeriesKey] = chartRef.current!.addSeries(BaselineSeries, {
          baseValue: { type: "price", price: 0 },
          relativeGradient: true,
          topFillColor1: fillColor,
          topFillColor2: fillColor,
          topLineColor: "rgba(0, 0, 0, 0)",
          bottomFillColor1: fillColor,
          bottomFillColor2: fillColor,
          bottomLineColor: "rgba(0, 0, 0, 0)",
          lineWidth: 1,
          lineVisible: false,
          pointMarkersVisible: false,
          crosshairMarkerVisible: false,
          priceLineVisible: false,
          lastValueVisible: false,
        });
      } else if (!shouldRenderBackground && seriesRefs.current[fillSeriesKey]) {
        try { chartRef.current!.removeSeries(seriesRefs.current[fillSeriesKey]); } catch (e) {}
        delete seriesRefs.current[fillSeriesKey];
      }

      // Resolve color: try outId-specific (e.g. macdColor, kColor), camelCase (colorUpper), generic color
      const color =
        indicator.params[`${out.id}Color`] ||
        indicator.params[`color${out.id.charAt(0).toUpperCase()}${out.id.slice(1)}`] ||
        indicator.params.color ||
        outConf.defaultColor || THEME.line;
      const lineWidth = clampLineWidth(Number(indicator.params.width || indicator.params.lineWidth || 1));

      if (!seriesRefs.current[out.id]) {
        if (outConf.type === "histogram") {
          seriesRefs.current[out.id] = chartRef.current!.addSeries(HistogramSeries, { color, priceLineVisible: false });
        } else {
          seriesRefs.current[out.id] = chartRef.current!.addSeries(LineSeries, {
            color,
            lineWidth,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false
          });
        }
      }

      if (out.data.length > 0) {
        try { 
          let finalData = out.data;
          if (outConf.type === "histogram") {
            const upColor = indicator.params.histColorUp || indicator.params.upColor || THEME.up;
            const downColor = indicator.params.histColorDown || indicator.params.downColor || THEME.down;
            finalData = colorizeHistogramData(out.data as OverlayIndicatorPoint[], upColor, downColor);
          } else if (outConf.type === "line") {
            const horizontalValue = getHorizontalLineValue(out.data as OverlayIndicatorPoint[]);
            seriesRefs.current[out.id].applyOptions({
              color: horizontalValue === null ? color : "rgba(0,0,0,0)",
              lineWidth,
              lastValueVisible: false,
              priceLineVisible: false,
            });

            if (horizontalValue === null) {
              if (guideLineRefs.current[out.id]) {
                try { seriesRefs.current[out.id].removePriceLine(guideLineRefs.current[out.id]); } catch (_e) {}
                delete guideLineRefs.current[out.id];
              }
            } else if (!guideLineRefs.current[out.id]) {
              guideLineRefs.current[out.id] = seriesRefs.current[out.id].createPriceLine({
                price: horizontalValue,
                color,
                lineStyle: LineStyle.Solid,
                lineWidth,
                axisLabelVisible: false,
                title: "",
              });
            } else {
              guideLineRefs.current[out.id].applyOptions({
                price: horizontalValue,
                color,
                lineStyle: LineStyle.Solid,
                lineWidth,
              });
            }
          }
          if (shouldRenderBackground) {
            seriesRefs.current[fillSeriesKey]?.setData(out.data as LineData<Time>[]);
          }
          seriesRefs.current[out.id].setData(finalData); 
        } catch(e) {
          // Safely retry after recreating series
          if (seriesRefs.current[fillSeriesKey]) {
            try { chartRef.current!.removeSeries(seriesRefs.current[fillSeriesKey]); } catch(_e) {}
            delete seriesRefs.current[fillSeriesKey];
          }
          try { chartRef.current!.removeSeries(seriesRefs.current[out.id]); } catch(_e) {}
          delete seriesRefs.current[out.id];
        }
      }
    });

    if (syncMainChart) {
      const visibleRange = syncMainChart.timeScale().getVisibleLogicalRange();
      if (visibleRange) {
        chartRef.current.timeScale().setVisibleLogicalRange(visibleRange);
      }
    }
  }, [getHistory, indicator, liveSignal, renderKey, syncMainChart]);

  if (!indicator.visible) return null;

  return (
    <div className="shrink-0 relative overflow-hidden" style={{ height: "115px", borderTop: `1px solid ${THEME.border}`, background: THEME.bg }}>
      <div
        className="pointer-events-none absolute right-2 top-1.5 z-40"
        style={{ left: controlStripLeftInset }}
      >
        <IndicatorControlStrip
          indicator={indicator}
          onOpenSettings={onOpenSettings}
          onToggleVisibility={onToggleVisibility}
          onRemove={onRemove}
          variant="pane"
        />
      </div>
      <div ref={containerRef} style={{ height: "110px", width: "100%" }} />
    </div>
  );
};

/**
 * Calculates dynamic animation duration based on market conditions
 * Larger price movements and high volatility trigger shorter, more responsive animations
 * Stable periods use longer animations for smooth, natural movement
 * This creates organic market feel similar to TradingView
 */
const calculateAdaptiveAnimationDuration = (
  current: { open: number; high: number; low: number; close: number },
  previous: { open: number; high: number; low: number; close: number } | null,
  basePrice: number,
): number => {
  if (!previous || basePrice <= 0) return 600; // Default smooth duration

  // Calculate price metrics
  const priceChange = Math.abs(current.close - previous.close);
  const candleRange = current.high - current.low;
  const prevCandleRange = previous.high - previous.low;
  const volatility = (candleRange + prevCandleRange) / 2 / basePrice;
  const changePercent = (priceChange / basePrice) * 100;

  // Velocity: how fast is price changing relative to candle size
  const velocity = candleRange > 0 ? priceChange / candleRange : 0;

  // Base duration: responsive to velocity
  // High velocity (rapid price movement) = 300ms (responsive)
  // Low velocity (stable price) = 800ms (smooth)
  // Medium velocity = adaptive between them
  const velocityFactor = Math.min(velocity, 2.0); // Clamp to 0-2
  let duration = 800 - velocityFactor * 300; // Range: 500-800ms

  // Volatility adjustment: high volatility = shorter duration for responsiveness
  if (volatility > 0.01) {
    duration *= 0.8; // 20% faster for high volatility
  }

  // Stability bonus: if price barely moved, extend for extra smoothness
  if (priceChange < basePrice * 0.0005) {
    // Less than 0.05% movement
    duration *= 1.2; // 20% longer for silky smooth stability
  }

  // Clamp to realistic range
  return Math.max(200, Math.min(duration, 900));
};

/**
 * Enhanced SmoothUpdateScheduler with market-responsive animation
 * Batches rapid updates and applies dynamic animation duration based on price action
 */
class SmoothUpdateScheduler {
  constructor(series) {
    this.series = series;
    this.pendingUpdate = null;
    this.animationDuration = 600;
    this.rafId = null;
    this.previousCandle = null;
  }

  update(updateData, currentCandle = null, previousCandle = null, basePrice = 1, timeframeSeconds = 60) {
    this.pendingUpdate = updateData;

    // Calculate adaptive animation duration if candle data provided
    if (currentCandle && basePrice > 0) {
      this.animationDuration = calculateAdaptiveAnimationDuration(
        currentCandle,
        previousCandle || this.previousCandle,
        basePrice,
      );
      this.previousCandle = { ...currentCandle };
    }

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this.flush());
    }
  }

  flush() {
    if (this.pendingUpdate && this.series) {
      try {
        this.series.update(this.pendingUpdate);
      } catch (_) {}
      this.pendingUpdate = null;
    }
    this.rafId = null;
  }

  cleanup() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.previousCandle = null;
  }
}

const TradingChart = ({
  asset,
  onPriceUpdate,
  activeIndicators,
  activeTrades = [],
  onToggleIndicatorsPanel,
  onToggleDrawingsPanel,
  onRemoveIndicator,
  onUpdateIndicator,
  onOpenIndicatorSettings,
  overlayUiSuppressed = false,
  onToggleMobileHistory,
  mobileHistoryOpen = false,
  compactPane = false,
  miniOverlay = false,
  liveEdgeRequestKey,
  settlementAnnouncement = null,
}: TradingChartProps) => {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ChartSeriesApi | null>(null);
  const mainUpdateSchedulerRef = useRef<SmoothUpdateScheduler | null>(null);
  // Overlay Indicators Refs Map
  const overlaySeriesMap = useRef<Record<string, ChartSeriesApi>>({});
  const indicatorDataMap = useRef<Record<string, OverlayIndicatorPoint[]>>({});
  
  const marketFeedRef = useRef<MarketDataFeed | null>(null);
  const engineRef = useRef<OTCPriceEngine | null>(null);
  const historyRef = useRef<OHLCCandle[]>([]);
  const liveRef = useRef<OHLCCandle | null>(null);
  const previousCandleRef = useRef<OHLCCandle | null>(null);
  const loadedHistoryCountRef = useRef(0);
  const isBackfillingHistoryRef = useRef(false);
  const isNormalizingVisibleRangeRef = useRef(false);
  const priceScaleMarginKeyRef = useRef("");
  const aggregatorRef = useRef<CandleAggregator | null>(null);
  // Always-fresh ref for activeIndicators so stale closures see latest value
  const activeIndicatorsRef = useRef<ActiveIndicator[]>(activeIndicators);
  const assetSnapshotRef = useRef({ price: asset.price, change: asset.change ?? 0 });
  const onPriceUpdateRef = useRef(onPriceUpdate);

  const separateIndicators = activeIndicators.filter(i => {
    const conf = INDICATOR_REGISTRY.find(c => c.id === i.configId);
    return conf && conf.pane === "separate";
  });
  const mainChartIndicators = activeIndicators.filter(i => {
    const conf = INDICATOR_REGISTRY.find(c => c.id === i.configId);
    return conf && conf.pane === "overlay";
  });
  const activeAssetTrades = activeTrades.filter((trade) => trade.asset_symbol === asset.symbol);
  const [selectedTf, setSelectedTf] = useState<SupportedChartTimeframe>(() => loadSelectedTimeframePreference());
  const [currentPrice, setCurrentPrice] = useState(asset.price);
  const [priceChange, setPriceChange] = useState(asset.change || 0);
  const [chartType, setChartType] = useState<ChartType>(DEFAULT_CHART_TYPE);
  const [chartStyles, setChartStyles] = useState<ChartStylePreferences>(() => loadChartStylePreferences());
  const [pairInfoOpen, setPairInfoOpen] = useState(false);
  const [styleEditorOpen, setStyleEditorOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [activeMobileMenu, setActiveMobileMenu] = useState<"time" | "type" | null>(null);
  const [mobileMenuStyle, setMobileMenuStyle] = useState<React.CSSProperties | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [hideMobileQuickActions, setHideMobileQuickActions] = useState(false);
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);
  const [marketClockMs, setMarketClockMs] = useState(() => Date.now());
  const [globalTheme, setGlobalTheme] = useState({
    bg: PROFESSIONAL_CHART_BG,
    up: PROFESSIONAL_UP_COLOR,
    down: PROFESSIONAL_DOWN_COLOR,
  });
  const { preferences: tradingPreferences } = useTradingPreferences();
  const { data: websiteContent } = useWebsiteContent();
  const defaultChartBackgroundImage = websiteContent.tradingDefaults.chartBackgroundImage.trim();
  const activeChartBackgroundImage = tradingPreferences.chartBackgroundImage || defaultChartBackgroundImage || null;
  const activeChartBackgroundOpacity = tradingPreferences.chartBackgroundImage
    ? tradingPreferences.chartBackgroundOpacity
    : websiteContent.tradingDefaults.chartBackgroundOpacity;
  const effectiveChartTheme = useMemo(() => ({
    bg: activeChartBackgroundImage ? "rgba(0,0,0,0)" : getTradingChartSurfaceColor(tradingPreferences, globalTheme.bg),
    up: globalTheme.up,
    down: globalTheme.down,
  }), [activeChartBackgroundImage, globalTheme.bg, globalTheme.down, globalTheme.up, tradingPreferences]);
  const chartTextColor = useMemo(() => getTradingChartTextColor(tradingPreferences), [tradingPreferences]);
  const chartGridColor = useMemo(() => getTradingGridColor(tradingPreferences), [tradingPreferences]);
  const chartViewportStyle = useMemo<React.CSSProperties>(() => {
    const mobileTouchSurface: React.CSSProperties = {
      touchAction: "pan-y",
      overscrollBehavior: "contain",
      WebkitUserSelect: "none",
      userSelect: "none",
    };

    if (!activeChartBackgroundImage) {
      return {
        ...mobileTouchSurface,
        background: effectiveChartTheme.bg,
      };
    }

    const imageBaseColor =
      tradingPreferences.template === "white"
        ? "#ffffff"
        : tradingPreferences.template === "amber"
          ? "#1e2131"
          : tradingPreferences.template === "graphite"
            ? "#101215"
            : "#1e2131";
    const imageOpacity = Math.max(0, Math.min(100, activeChartBackgroundOpacity)) / 100;
    const overlayAlpha = Math.max(0.08, Math.min(0.94, 1 - imageOpacity));
    const imageOverlay =
      tradingPreferences.template === "white"
        ? `rgba(255,255,255,${overlayAlpha}), rgba(255,255,255,${overlayAlpha})`
        : `rgba(11,16,24,${overlayAlpha}), rgba(11,16,24,${overlayAlpha})`;

    return {
      ...mobileTouchSurface,
      ...shadow,
      backgroundColor: imageBaseColor,
      backgroundImage: `linear-gradient(${imageOverlay}), url("${activeChartBackgroundImage}")`,
      backgroundPosition: "center",
      backgroundSize: "cover",
    };
  }, [activeChartBackgroundImage, activeChartBackgroundOpacity, effectiveChartTheme.bg, tradingPreferences]);
  const globalThemeRef = useRef(effectiveChartTheme);
  const chartStylesRef = useRef(chartStyles);
  const tradingSchedule = useMemo(() => buildTradingSchedule(), []);
  const pairNotionalVol = useMemo(
    () =>
      PAIR_INFO_NOTIONAL_VOL[
        asset.symbol.split("").reduce((hash, char) => (hash * 37 + char.charCodeAt(0)) % PAIR_INFO_NOTIONAL_VOL.length, 0)
      ],
    [asset.symbol],
  );
  
  const { activeTool, setActiveTool, setDrawings } = useDrawings();
  const editingIndicator = activeIndicators.find((indicator) => indicator.instanceId === editingIndicatorId) ?? null;
  const showDesktopChartTools = !compactPane && !miniOverlay && !mobileHistoryOpen;
  const overlayStripLeftInset = showDesktopChartTools ? DESKTOP_PANE_HEADER_LEFT_OFFSET : 8;
  const oscillatorStripLeftInset = showDesktopChartTools ? DESKTOP_PANE_HEADER_LEFT_OFFSET : 8;
  const handleOpenIndicatorSettings = useCallback((instanceId: string) => {
    if (onOpenIndicatorSettings) {
      onOpenIndicatorSettings(instanceId);
      return;
    }
    setEditingIndicatorId(instanceId);
  }, [onOpenIndicatorSettings]);

  const [syncChart, setSyncChart] = useState<IChartApi | null>(null);

  useEffect(() => {
    if (editingIndicatorId && !editingIndicator) {
      setEditingIndicatorId(null);
    }
  }, [editingIndicator, editingIndicatorId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setMarketClockMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SELECTED_TIMEFRAME_STORAGE_KEY, selectedTf);
    } catch {
      // Storage can be unavailable in private or restricted browsing modes.
    }
  }, [selectedTf]);

  const [syncSeries, setSyncSeries] = useState<ChartSeriesApi | null>(null);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [livePriceBeacon, setLivePriceBeacon] = useState<LivePriceBeaconState | null>(null);
  const [hoverPriceData, setHoverPriceData] = useState<{ price: number; top: number } | null>(null);
  const alertLineRefs = useRef<Record<string, IPriceLine>>({});
  const alertSeriesRef = useRef<ChartSeriesApi | null>(null);
  const previousPriceRef = useRef<number>(asset.price);
  // Force react render when history strictly ticks candles for Oscillators
  const [forceOscillatorRender, setForceOscillatorRender] = useState(0);
  const dismissMobileMenu = useCallback(() => {
    setActiveMobileMenu(null);
    setMobileMenuStyle(null);
  }, []);
  const PRICE_ALERT_HOVER_ZONE = 88;

  const roundAlertPrice = useCallback((price: number) => {
    const precision = mainSeriesPrecisionRef.current ?? 2;
    return Number(price.toFixed(Math.max(0, precision)));
  }, []);

  const formatAlertPrice = useCallback((price: number) => {
    const precision = mainSeriesPrecisionRef.current ?? 2;
    return price.toFixed(Math.max(0, precision));
  }, []);

  const playAlertTone = useCallback(() => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const startAt = context.currentTime;

      [0, 0.17, 0.34].forEach((delay, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(index === 1 ? 1120 : 880, startAt + delay);
        gain.gain.setValueAtTime(0.0001, startAt + delay);
        gain.gain.exponentialRampToValueAtTime(0.22, startAt + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + delay + 0.14);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt + delay);
        oscillator.stop(startAt + delay + 0.15);
      });

      window.setTimeout(() => {
        void context.close();
      }, 700);
    } catch {
      // Audio may be blocked by browser policies; ignore silently.
    }
  }, []);

  const addPriceAlert = useCallback(
    (price: number) => {
      const normalized = roundAlertPrice(price);
      if (priceAlerts.some((alert) => Math.abs(alert.price - normalized) < 0.0000001)) {
        toast.info(t("tradingChart.alertAlreadyExists"), {
          description: `${asset.symbol} already has an alert at ${formatAlertPrice(normalized)}.`,
        });
        return;
      }

      setPriceAlerts((current) => [
        ...current,
        {
          id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `price-alert-${Date.now()}`,
          price: normalized,
          triggered: false,
        },
      ]);

      toast.success(t("tradingChart.alertSet"), {
        description: `${asset.symbol} will ring when price crosses ${formatAlertPrice(normalized)}.`,
      });
    },
    [asset.symbol, formatAlertPrice, priceAlerts, roundAlertPrice],
  );

  const removePriceAlert = useCallback(
    (id: string) => {
      const alert = priceAlerts.find((item) => item.id === id);
      setPriceAlerts((current) => current.filter((item) => item.id !== id));

      if (alert) {
        toast.info(t("tradingChart.alertRemoved"), {
          description: `${asset.symbol} alert at ${formatAlertPrice(alert.price)} was deleted.`,
        });
      }
    },
    [asset.symbol, formatAlertPrice, priceAlerts],
  );

  const handleChartMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!mainRef.current || !mainSeriesRef.current) {
        setHoverPriceData(null);
        return;
      }

      const rect = mainRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < rect.width - PRICE_ALERT_HOVER_ZONE || y < 0 || y > rect.height) {
        setHoverPriceData(null);
        return;
      }

      const hoveredPrice = mainSeriesRef.current.coordinateToPrice(y);
      if (!Number.isFinite(hoveredPrice)) {
        setHoverPriceData(null);
        return;
      }

      setHoverPriceData({ price: roundAlertPrice(hoveredPrice), top: Math.min(Math.max(4, y), rect.height - 4) });
    },
    [roundAlertPrice],
  );

  const handleChartMouseLeave = useCallback(() => {
    setHoverPriceData(null);
  }, []);

  const handleChartClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!hoverPriceData) return;
      event.stopPropagation();
      addPriceAlert(hoverPriceData.price);
    },
    [addPriceAlert, hoverPriceData],
  );

  useEffect(() => {
    if (priceAlerts.length === 0) {
      previousPriceRef.current = currentPrice;
      return;
    }

    const prevPrice = previousPriceRef.current;
    const triggeredAlerts = priceAlerts.filter((alert) => {
      const crossedUp = prevPrice < alert.price && currentPrice >= alert.price;
      const crossedDown = prevPrice > alert.price && currentPrice <= alert.price;
      return crossedUp || crossedDown || currentPrice === alert.price;
    });

    if (triggeredAlerts.length > 0) {
      const triggeredIds = new Set(triggeredAlerts.map((alert) => alert.id));
      setPriceAlerts((currentAlerts) => currentAlerts.filter((alert) => !triggeredIds.has(alert.id)));
      playAlertTone();
      triggeredAlerts.forEach((alert) => {
        toast.success(t("tradingChart.alertReached"), {
          description: `${asset.symbol} crossed ${formatAlertPrice(alert.price)}. The alert was removed automatically.`,
        });
      });
    }

    previousPriceRef.current = currentPrice;
  }, [asset.symbol, currentPrice, formatAlertPrice, playAlertTone, priceAlerts]);

  useEffect(() => {
    setPriceAlerts([]);
    setHoverPriceData(null);
    previousPriceRef.current = asset.price;
  }, [asset.symbol]);

  useEffect(() => {
    if (!mainSeriesRef.current) return;

    const series = mainSeriesRef.current;
    if (alertSeriesRef.current && alertSeriesRef.current !== series) {
      const previousSeries = alertSeriesRef.current;
      Object.keys(alertLineRefs.current).forEach((id) => {
        try {
          previousSeries.removePriceLine(alertLineRefs.current[id]);
        } catch {
          // The previous series may already be removed when chart type changes.
        }
      });
      alertLineRefs.current = {};
    }

    alertSeriesRef.current = series;
    const existing = alertLineRefs.current;

    priceAlerts.forEach((alert) => {
      const options = {
        price: alert.price,
        color: "#fbbf24",
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        axisLabelVisible: true,
        axisLabelColor: "#fbbf24",
        axisLabelTextColor: "#111827",
        title: `Alert ${formatAlertPrice(alert.price)}`,
      } as const;

      if (!existing[alert.id]) {
        try {
          existing[alert.id] = series.createPriceLine(options);
        } catch {
          existing[alert.id] = series.createPriceLine(options);
        }
      } else {
        try {
          existing[alert.id].applyOptions(options);
        } catch {
          try {
            existing[alert.id] = series.createPriceLine(options);
          } catch {
            delete existing[alert.id];
          }
        }
      }
    });

    Object.keys(existing).forEach((id) => {
      if (!priceAlerts.some((alert) => alert.id === id)) {
        try {
          series.removePriceLine(existing[id]);
        } catch {
          // Ignore invalid lines
        }
        delete existing[id];
      }
    });
  }, [formatAlertPrice, priceAlerts]);

  useEffect(() => {
    return () => {
      const series = alertSeriesRef.current;
      Object.keys(alertLineRefs.current).forEach((id) => {
        try {
          series?.removePriceLine(alertLineRefs.current[id]);
        } catch {
          // ignore
        }
      });
      alertLineRefs.current = {};
      alertSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!overlayUiSuppressed) return;
    setPairInfoOpen(false);
    setStyleEditorOpen(false);
    dismissMobileMenu();
    setMobileToolsOpen(false);
  }, [dismissMobileMenu, overlayUiSuppressed]);

  const closeMobileTools = useCallback(() => {
    dismissMobileMenu();
    setMobileToolsOpen(false);
  }, [dismissMobileMenu]);

  const toggleMobileMenu = useCallback(
    (menu: "time" | "type", anchor: HTMLButtonElement) => {
      if (activeMobileMenu === menu) {
        dismissMobileMenu();
        return;
      }

      const menuWidth = 228;
      const estimatedHeight = menu === "time" ? 216 : 248;
      const gap = 12;
      const rect = anchor.getBoundingClientRect();
      const nextLeft = Math.min(
        Math.max(12, window.innerWidth - menuWidth - 12),
        Math.max(12, rect.right + gap),
      );
      const nextTop = Math.min(
        Math.max(12, window.innerHeight - estimatedHeight - 12),
        Math.max(12, rect.top - 6),
      );

      setMobileMenuStyle({
        left: nextLeft,
        top: nextTop,
        width: menuWidth,
        maxHeight: "calc(100vh - 24px)",
      });
      setActiveMobileMenu(menu);
    },
    [activeMobileMenu, dismissMobileMenu],
  );

  const adjustChartZoom = useCallback((direction: "in" | "out") => {
    const chart = chartRef.current;
    if (!chart) return;

    const timeScale = chart.timeScale();
    const containerWidth = mainRef.current?.clientWidth ?? 960;
    const dataPointCount = mainSeriesRef.current?.data()?.length ?? historyRef.current.length;
    const trendContextBars = getTrendContextBarCount(
      containerWidth,
      selectedTf,
      Math.max(1, dataPointCount),
    );
    const defaultVisibleBars = getInitialVisibleBars(
      containerWidth,
      selectedTf,
      Math.max(1, dataPointCount),
    );
    const rightOffset = getChartRightOffset(trendContextBars);
    const defaultSpan = defaultVisibleBars + rightOffset;
    const currentRange = timeScale.getVisibleLogicalRange();
    const currentSpan = currentRange
      ? Math.max(12, currentRange.to - currentRange.from)
      : defaultSpan;
    const nextSpan = direction === "in"
      ? currentSpan * 0.88
      : currentSpan * 1.15;
    const minSpan = Math.max(12 + Math.min(rightOffset, 18), Math.round(defaultVisibleBars * 0.22) + Math.min(rightOffset, 18));
    const maxVisibleBySpacing = Math.max(
      defaultSpan,
      Math.floor(containerWidth / getMinBarSpacingForScale(selectedTf, chartStylesRef.current.bodyScale)) + rightOffset,
    );
    const maxReadableBars = getMaxReadableZoomBars(
      containerWidth,
      selectedTf,
      Math.max(1, dataPointCount),
    );
    const maxReadableSpan = maxReadableBars + getChartRightOffset(maxReadableBars);
    const maxSpan = Math.max(defaultSpan, Math.min(maxReadableSpan, maxVisibleBySpacing));
    const clampedSpan = Math.max(minSpan, Math.min(nextSpan, maxSpan));
    const maxFutureWhitespace = Math.max(
      rightOffset,
      Math.min(Math.round(clampedSpan * 0.52), trendContextBars),
    );
    const maxTo = dataPointCount + maxFutureWhitespace;
    const currentCenter = currentRange
      ? (currentRange.from + currentRange.to) / 2
      : Math.max(clampedSpan / 2, dataPointCount + rightOffset - defaultSpan / 2);
    let nextFrom = currentCenter - clampedSpan / 2;
    let nextTo = currentCenter + clampedSpan / 2;

    if (nextFrom < 0) {
      nextTo -= nextFrom;
      nextFrom = 0;
    }

    if (nextTo > maxTo) {
      nextFrom = Math.max(0, nextFrom - (nextTo - maxTo));
      nextTo = maxTo;
    }

    timeScale.setVisibleLogicalRange({
      from: nextFrom,
      to: nextTo,
    });
  }, [selectedTf]);

  const adjustChartZoomRef = useRef(adjustChartZoom);

  useEffect(() => {
    adjustChartZoomRef.current = adjustChartZoom;
  }, [adjustChartZoom]);

  const applyResponsivePriceScale = useCallback(
    (visibleSpan?: number | null, force = false) => {
      const chart = chartRef.current;
      if (!chart) return;

      const containerWidth = mainRef.current?.clientWidth ?? 960;
      const options = getMainPriceScaleOptions(selectedTf, visibleSpan, containerWidth);
      const marginKey = `${selectedTf}:${options.scaleMargins.top.toFixed(3)}:${options.scaleMargins.bottom.toFixed(3)}`;

      if (!force && priceScaleMarginKeyRef.current === marginKey) {
        return;
      }

      priceScaleMarginKeyRef.current = marginKey;
      chart.applyOptions({ rightPriceScale: options });
    },
    [selectedTf],
  );

  const scrollChartToLiveEdge = useCallback(
    (historyCountOverride?: number) => {
      const chart = chartRef.current;
      if (!chart) return;

      const dataPointCount = Math.max(
        1,
        historyCountOverride ??
          mainSeriesRef.current?.data()?.length ??
          historyRef.current.length,
      );
      const containerWidth = mainRef.current?.clientWidth ?? 960;
      const trendContextBars = getTrendContextBarCount(containerWidth, selectedTf, dataPointCount);
      const initialVisibleBars = getInitialVisibleBars(containerWidth, selectedTf, dataPointCount);
      const rightOffset = getChartRightOffset(trendContextBars);
      const visibleSpan = initialVisibleBars + rightOffset;
      const targetTo = dataPointCount + rightOffset;

      chart.timeScale().applyOptions({
        rightOffset,
        rightBarStaysOnScroll: false,
        shiftVisibleRangeOnNewBar: false,
        allowShiftVisibleRangeOnWhitespaceReplacement: false,
      });
      applyResponsivePriceScale(visibleSpan, true);
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(0, targetTo - visibleSpan),
        to: targetTo,
      });
    },
    [applyResponsivePriceScale, selectedTf],
  );

  // ─── FETCH THEME GLOBALS ──────────────────────────────────────────
  useEffect(() => {
    async function fetchTheme() {
      const { data } = await supabase.from('platform_settings').select('chart_bg_color, chart_up_color, chart_down_color').limit(1).maybeSingle();
      if (data) {
        const payload: PlatformThemeRow = data;
        const newTheme = {
          bg: resolveChartSurfaceColor(payload.chart_bg_color),
          up: resolveChartCandleColor(
            payload.chart_up_color,
            [LEGACY_PLATFORM_UP, LEGACY_INIT_UP_COLOR, LEGACY_PROFESSIONAL_UP_COLOR, "#0faf59"],
            PROFESSIONAL_UP_COLOR,
          ),
          down: resolveChartCandleColor(
            payload.chart_down_color,
            [LEGACY_PLATFORM_DOWN, LEGACY_INIT_DOWN_COLOR, LEGACY_PROFESSIONAL_DOWN_COLOR, "#db4635"],
            PROFESSIONAL_DOWN_COLOR,
          ),
        };
        setGlobalTheme(newTheme);
      }
    }
    fetchTheme();
  }, []);

  useEffect(() => {
    const handleDropdown = (event: Event) => {
      const customEvent = event as CustomEvent<{ open?: boolean }>;
      setHideMobileQuickActions(!!customEvent.detail?.open);
      if (customEvent.detail?.open) {
        closeMobileTools();
      }
    };

    window.addEventListener("mobile_account_dropdown", handleDropdown as EventListener);
    return () => window.removeEventListener("mobile_account_dropdown", handleDropdown as EventListener);
  }, [closeMobileTools]);

  useEffect(() => {
    if (!mobileHistoryOpen) return;
    closeMobileTools();
    setStyleEditorOpen(false);
    setPairInfoOpen(false);
  }, [closeMobileTools, mobileHistoryOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      dismissMobileMenu();
      setStyleEditorOpen(false);
      setPairInfoOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dismissMobileMenu]);

  useEffect(() => {
    assetSnapshotRef.current = {
      price: asset.price,
      change: asset.change ?? 0,
    };
  }, [asset.change, asset.price]);

  useEffect(() => {
    onPriceUpdateRef.current = onPriceUpdate;
  }, [onPriceUpdate]);

  useEffect(() => {
    setChartType(DEFAULT_CHART_TYPE);
  }, []);

  useEffect(() => {
    chartStylesRef.current = chartStyles;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CHART_STYLE_STORAGE_KEY, JSON.stringify(chartStyles));
  }, [chartStyles]);

  useEffect(() => {
    if (compactPane) {
      setPairInfoOpen(false);
      setStyleEditorOpen(false);
    }
  }, [compactPane]);

  useEffect(() => {
    globalThemeRef.current = effectiveChartTheme;
    if (!chartRef.current) return;
    
    // Apply background colors reactively
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: effectiveChartTheme.bg },
        textColor: chartTextColor,
      },
      grid: {
        vertLines: { color: chartGridColor },
        horzLines: { color: chartGridColor },
      },
    });
    
    // Apply series colors reactively
    if (mainSeriesRef.current) {
        if (chartTypeRef.current === "bars") {
            mainSeriesRef.current.applyOptions({
              ...getBarDisplaySettings(chartStylesRef.current, effectiveChartTheme),
            });
        } else if (chartTypeRef.current !== "line") {
            mainSeriesRef.current.applyOptions({
              ...getCandlestickDisplaySettings(chartTypeRef.current, chartStylesRef.current, effectiveChartTheme),
            });
        } else {
            mainSeriesRef.current.applyOptions({
              ...getAreaDisplaySettings(chartStylesRef.current),
            });
        }
    }
  }, [chartGridColor, chartTextColor, effectiveChartTheme]);

  // ─── INIT MASTER CHART ───────────────────────────────────────────
  useEffect(() => {
    if (!mainRef.current) return;
    let chart: IChartApi;
    try {
      chart = createChart(mainRef.current, {
        width: mainRef.current.clientWidth,
        height: mainRef.current.clientHeight,
        layout: { 
          background: { type: ColorType.Solid, color: globalThemeRef.current.bg }, 
          textColor: chartTextColor,
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: 12 
        },
        grid: { 
          vertLines: { color: chartGridColor },
          horzLines: { color: chartGridColor }
        },
        animation: { enabled: true, duration: 800 },
        handleScroll: {
          mouseWheel: false,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          mouseWheel: false,
          pinch: true,
          axisPressedMouseMove: true,
          axisDoubleClickReset: true,
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            visible: true,
            labelVisible: true,
            color: "rgba(255,255,255,0.14)",
            width: 1,
            style: LineStyle.Dashed,
          },
          horzLine: {
            visible: true,
            labelVisible: true,
            color: "rgba(255,255,255,0.14)",
            width: 1,
            style: LineStyle.Dashed,
          },
        },
        rightPriceScale: getMainPriceScaleOptions("1m", DEFAULT_VISIBLE_BARS, 960),
        timeScale: { 
          borderColor: THEME.border, 
          timeVisible: true, 
          secondsVisible: true,
          tickMarkFormatter: (time: number) => formatTimeScaleTick(time, TIMEFRAMES["1m"].seconds),
          rightOffset: 6,
          barSpacing: getBarSpacingForScale("1m", chartStylesRef.current.bodyScale),
          minBarSpacing: getMinBarSpacingForScale("1m", chartStylesRef.current.bodyScale),
          fixLeftEdge: false,
          fixRightEdge: false,
          rightBarStaysOnScroll: false,
          shiftVisibleRangeOnNewBar: false,
          allowShiftVisibleRangeOnWhitespaceReplacement: false,
          lockVisibleTimeRangeOnResize: true,
        },
      });
      setChartError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Trading chart init failed:", error);
      setChartError(message);
      return;
    }
    chartRef.current = chart;
    setSyncChart(chart);
    const chartContainer = mainRef.current;
    if (!chartContainer) {
      chart.remove();
      return;
    }
    const handleChartWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

      event.preventDefault();
      adjustChartZoomRef.current(event.deltaY < 0 ? "in" : "out");
    };

    chartContainer.addEventListener("wheel", handleChartWheel, { capture: true, passive: false });

    const obs = new ResizeObserver(() => {
      if (mainRef.current && chartRef.current) chartRef.current.applyOptions({ width: mainRef.current.clientWidth, height: mainRef.current.clientHeight });
    });
    obs.observe(chartContainer);

    return () => {
      chartContainer.removeEventListener("wheel", handleChartWheel, true);
      obs.disconnect();
      chart.remove();
    };
  }, []);

  const chartTypeRef = useRef(chartType);
  const mainSeriesKindRef = useRef<MainSeriesKind | null>(null);
  const mainSeriesPrecisionRef = useRef<number | null>(null);

  useEffect(() => {
    chartTypeRef.current = chartType;
    if (!chartRef.current) return;
    const referencePrice =
      (typeof asset.basePrice === "number" && Number.isFinite(asset.basePrice) && asset.basePrice > 0
        ? asset.basePrice
        : assetSnapshotRef.current.price) || 1;
    const priceFormat = getSeriesPriceFormat(referencePrice);
    mainSeriesPrecisionRef.current = priceFormat.precision;
    const nextSeriesKind = getMainSeriesKind(chartType);

    try {
      const shouldRecreateSeries =
        !mainSeriesRef.current || mainSeriesKindRef.current !== nextSeriesKind;

      if (shouldRecreateSeries && mainSeriesRef.current) {
        mainUpdateSchedulerRef.current?.cleanup();
        chartRef.current.removeSeries(mainSeriesRef.current);
        mainSeriesRef.current = null;
        mainUpdateSchedulerRef.current = null;
        mainSeriesKindRef.current = null;
      }

      if (!mainSeriesRef.current) {
        const { series, kind } = createMainSeries(
          chartRef.current,
          chartType,
          priceFormat,
          chartStyles,
          globalThemeRef.current,
        );
        mainSeriesRef.current = series;
        mainUpdateSchedulerRef.current = new SmoothUpdateScheduler(series);
        mainSeriesKindRef.current = kind;
        setSyncSeries(series);
      } else {
        applyMainSeriesOptions(
          mainSeriesRef.current,
          chartType,
          priceFormat,
          chartStyles,
          globalThemeRef.current,
        );
      }
      setChartError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Trading chart series init failed:", error);
      setChartError(message);
      return;
    }

    if (historyRef.current.length > 0 && mainSeriesRef.current) {
      mainSeriesRef.current.setData(getMainSeriesData(chartType, historyRef.current));
      if (liveRef.current) {
        const tf = TIMEFRAMES[selectedTf] || { seconds: 60 };
        if (mainUpdateSchedulerRef.current) {
          mainUpdateSchedulerRef.current.update(
            buildMainSeriesUpdatePayload(chartType, liveRef.current, historyRef.current),
            liveRef.current,
            previousCandleRef.current,
            referencePrice,
            tf.seconds,
          );
        } else {
          try {
            mainSeriesRef.current.update(buildMainSeriesUpdatePayload(chartType, liveRef.current, historyRef.current));
          } catch (_) {}
        }
        setLivePriceBeacon((current) => ({
          price: getLiveBeaconPrice(chartType, liveRef.current, historyRef.current),
          time: liveRef.current.time,
          logical: current?.logical ?? historyRef.current.length,
        }));
      }
    }
    scrollChartToLiveEdge();
  }, [asset.basePrice, asset.symbol, chartStyles, chartType, scrollChartToLiveEdge]);

  useEffect(() => {
    if (!mainSeriesRef.current) return;

    const referencePrice =
      (typeof asset.basePrice === "number" && Number.isFinite(asset.basePrice) && asset.basePrice > 0
        ? asset.basePrice
        : currentPrice) || 1;
    const nextPrecision = getPricePrecision(referencePrice);

    if (mainSeriesPrecisionRef.current === nextPrecision) {
      return;
    }

    mainSeriesPrecisionRef.current = nextPrecision;
    mainSeriesRef.current.applyOptions({
      priceFormat: getSeriesPriceFormat(referencePrice),
    });
  }, [asset.basePrice, asset.symbol, currentPrice]);

  // ─── ENGINE & CALCULATION LOOP ──────────────────────────────────────────────
  // Track previous indicator params to detect changes
  const prevIndicatorParamsRef = useRef<Record<string, string>>({});

  // Keep activeIndicatorsRef in sync on every render
  activeIndicatorsRef.current = activeIndicators;

  const renderOverlayIndicators = useCallback((hist: OHLCCandle[]) => {
    if (!chartRef.current) return;
    const inds = activeIndicatorsRef.current;  // Always latest!
    const overList = inds.filter(i => i.pane === "overlay");
    
    // Remove stale series (for removed indicators or hidden ones)
    const currentKeys = overList.filter(i => i.visible).map(i => i.instanceId);
    Object.keys(overlaySeriesMap.current).forEach(k => {
      const parentId = k.split("-")[0];
      if (!currentKeys.includes(parentId)) {
        try { chartRef.current!.removeSeries(overlaySeriesMap.current[k]); } catch (e) {}
        delete overlaySeriesMap.current[k];
      }
    });
    Object.keys(indicatorDataMap.current).forEach(k => {
      const parentId = k.split("-")[0];
      if (!currentKeys.includes(parentId)) {
        delete indicatorDataMap.current[k];
      }
    });

    // Force-evict series for indicators whose params changed (so color/width get re-applied)
    overList.forEach(ind => {
      const paramsStr = JSON.stringify(ind.params);
      if (prevIndicatorParamsRef.current[ind.instanceId] !== undefined &&
          prevIndicatorParamsRef.current[ind.instanceId] !== paramsStr) {
        // Params changed: remove all series for this indicator so they get recreated with new color/width
        Object.keys(overlaySeriesMap.current)
          .filter(k => k.startsWith(ind.instanceId + "-"))
          .forEach(k => {
            try { chartRef.current!.removeSeries(overlaySeriesMap.current[k]); } catch (e) {}
            delete overlaySeriesMap.current[k];
          });
        Object.keys(indicatorDataMap.current)
          .filter(k => k.startsWith(ind.instanceId + "-"))
          .forEach(k => {
            delete indicatorDataMap.current[k];
          });
      }
      prevIndicatorParamsRef.current[ind.instanceId] = paramsStr;
    });

    // Calc and inject
    overList.forEach(ind => {
      if (!ind.visible) return;
      try {
        const outputs = calculateIndicator(ind, hist);
        const conf = INDICATOR_REGISTRY.find(c => c.id === ind.configId);
        
        outputs.forEach(out => {
          const mapKey = `${ind.instanceId}-${out.id}`;
          const outConf = conf?.outputs.find(o => o.id === out.id);
          const svgOnlyOutput = !!conf && isSvgOnlyOverlayOutput(conf.id, out.id);

          if (svgOnlyOutput && overlaySeriesMap.current[mapKey]) {
            try { chartRef.current!.removeSeries(overlaySeriesMap.current[mapKey]); } catch (e) {}
            delete overlaySeriesMap.current[mapKey];
          }

          if (!svgOnlyOutput && !overlaySeriesMap.current[mapKey]) {
            // Resolve color: try outId-specific param, then generic "color" param, then config default
            const color = ind.params[`${out.id}Color`] || 
                          ind.params[`color${out.id.charAt(0).toUpperCase()}${out.id.slice(1)}`] ||
                          ind.params.color ||
                          outConf?.defaultColor || THEME.line;
            const lineWidth = clampLineWidth(Number(ind.params.width || ind.params.lineWidth || 1));
             
            if (outConf?.type === "histogram") {
               overlaySeriesMap.current[mapKey] = chartRef.current!.addSeries(HistogramSeries, { color, priceLineVisible: false });
            } else {
               overlaySeriesMap.current[mapKey] = chartRef.current!.addSeries(LineSeries, { color, lineWidth, priceLineVisible: false, crosshairMarkerVisible: false });
            }
          }

          indicatorDataMap.current[mapKey] = out.data as OverlayIndicatorPoint[];

          if (!svgOnlyOutput && overlaySeriesMap.current[mapKey]) {
            try {
              let finalData = out.data;
              if (outConf?.type === "histogram") {
                const upColor = ind.params.histColorUp || ind.params.upColor || THEME.up;
                const downColor = ind.params.histColorDown || ind.params.downColor || THEME.down;
                finalData = colorizeHistogramData(out.data as OverlayIndicatorPoint[], upColor, downColor);
              }
              overlaySeriesMap.current[mapKey].setData(finalData);
            } catch (e) {
              console.warn("Failed setting data for", ind.name, e);
            }
          }
        });
      } catch (e) {
        console.warn("Failed to render overlay indicator", ind.name, e);
      }
    });
  }, []);

  const getIndicatorHistory = useCallback(() => {
    const history = historyRef.current;
    const liveCandle = liveRef.current;

    if (!liveCandle) {
      return history;
    }

    const lastClosedTime = history[history.length - 1]?.time ?? -Infinity;
    if (liveCandle.time <= lastClosedTime) {
      return history;
    }

    return [...history, liveCandle].slice(-MAX_CANDLES_IN_MEMORY);
  }, []);

  const reloadHistoricalCandles = useCallback(
    (requestedCount: number, preserveRange?: { from: number; to: number }) => {
      const tf = TIMEFRAMES[selectedTf];
      const chart = chartRef.current;
      const mainSeries = mainSeriesRef.current;
      const engine = engineRef.current;

      if (!tf || !chart || !mainSeries || !engine) return;

      const nextCount = Math.min(MAX_CANDLES_IN_MEMORY, Math.max(requestedCount, loadedHistoryCountRef.current));
      if (nextCount <= loadedHistoryCountRef.current) return;

      const previousCount = historyRef.current.length;
      const nextHistory = engine.generateHistory(tf, Date.now() / 1000, nextCount);

      loadedHistoryCountRef.current = nextHistory.length;
      historyRef.current = nextHistory;
      mainSeries.setData(getMainSeriesData(chartTypeRef.current, historyRef.current));

      if (liveRef.current) {
        try {
          if (mainUpdateSchedulerRef.current) {
            mainUpdateSchedulerRef.current.update(
              buildMainSeriesUpdatePayload(chartTypeRef.current, liveRef.current, historyRef.current),
              liveRef.current,
              previousCandleRef.current,
              assetSnapshotRef.current.price > 0 ? assetSnapshotRef.current.price : liveRef.current.close,
              tf.seconds,
            );
            if (previousCandleRef.current) {
              // Don't update previousCandleRef here as it's already tracking in handleCandleUpdate
            }
          } else {
            mainSeries.update(buildMainSeriesUpdatePayload(chartTypeRef.current, liveRef.current, historyRef.current));
          }
        } catch (_) {
          // Ignore transient redraw issues while the chart prepends older candles.
        }
      }

      renderOverlayIndicators(getIndicatorHistory());
      setForceOscillatorRender((current) => current + 1);

      if (preserveRange) {
        const addedBars = nextHistory.length - previousCount;
        if (addedBars > 0) {
          chart.timeScale().setVisibleLogicalRange({
            from: preserveRange.from + addedBars,
            to: preserveRange.to + addedBars,
          });
        }
      }
    },
    [getIndicatorHistory, renderOverlayIndicators, selectedTf],
  );

  useEffect(() => {
    const tf = TIMEFRAMES[selectedTf];
    if (!tf || !mainSeriesRef.current || !chartRef.current) return;
    const websocketUrl = import.meta.env.VITE_MARKET_DATA_WS_URL;

    marketFeedRef.current?.disconnect();
    marketFeedRef.current = null;
    if (aggregatorRef.current) aggregatorRef.current.destroy();

    const nowSec = Date.now() / 1000;
    const engineBasePrice =
      typeof asset.basePrice === "number" && Number.isFinite(asset.basePrice) && asset.basePrice > 0
        ? asset.basePrice
        : assetSnapshotRef.current.price;
    const engine = new OTCPriceEngine(asset.symbol, engineBasePrice, asset.type);
    engineRef.current = engine;

    const history = engine.generateHistory(tf, nowSec);
    historyRef.current = history;
    loadedHistoryCountRef.current = history.length;

    mainSeriesRef.current?.setData(getMainSeriesData(chartTypeRef.current, historyRef.current));

    const step = tf.seconds;
    const seedReplay = replayDeterministicTickState({
      symbol: asset.symbol,
      basePrice: engineBasePrice,
      timeframe: tf,
      timestamp: nowSec,
      assetCategory: asset.type,
    });
    const seedCandle = seedReplay.candle;
    liveRef.current = seedCandle;
    const startPrice = seedCandle.open;

    // Freeze trades to the visible live candle anchor shown on the chart.
    setCurrentPrice(seedCandle.close);
    setPriceChange(((seedCandle.close - seedCandle.open) / Math.max(seedCandle.open, 0.000001)) * 100);
    setLivePriceBeacon({
      price: getLiveBeaconPrice(chartTypeRef.current, seedCandle, historyRef.current),
      time: seedCandle.time,
      logical: history.length,
    });

    // Apply timeframe-appropriate bar spacing so candles look correct at each interval
    const containerWidth = mainRef.current?.clientWidth ?? 960;
    const trendContextBars = getTrendContextBarCount(containerWidth, selectedTf, history.length);
    const initialVisibleBars = getInitialVisibleBars(containerWidth, selectedTf, history.length);
    const rightOffset = getChartRightOffset(trendContextBars);
    chartRef.current.timeScale().applyOptions({
      barSpacing: getBarSpacingForScale(selectedTf, chartStylesRef.current.bodyScale),
      minBarSpacing: getMinBarSpacingForScale(selectedTf, chartStylesRef.current.bodyScale),
      rightOffset,
      timeVisible: true,
      secondsVisible: tf.seconds < 60,
      tickMarkFormatter: (time: number) => formatTimeScaleTick(time, tf.seconds),
      fixLeftEdge: false,
      fixRightEdge: false,
      rightBarStaysOnScroll: false,
      shiftVisibleRangeOnNewBar: false,
      allowShiftVisibleRangeOnWhitespaceReplacement: false,
    });
    scrollChartToLiveEdge(history.length);

    renderOverlayIndicators(getIndicatorHistory());
    setForceOscillatorRender((current) => current + 1);

    // ── CandleAggregator setup ─────────────────────────────────────────────
    // Destroy previous aggregator and create a new one

    // onClose: called synchronously when a period ends — push the closed candle to history
    const handleCandleClose = (closed: OHLCCandle) => {
      historyRef.current = [...historyRef.current, closed].slice(-MAX_CANDLES_IN_MEMORY);
      renderOverlayIndicators(getIndicatorHistory());
      setForceOscillatorRender((current) => current + 1);
    };

    // onUpdate: called via RAF — update the live candle in the chart
    const handleCandleUpdate = (candle: OHLCCandle, sourceTimestamp?: number) => {
      if (!mainSeriesRef.current) return;
      liveRef.current = candle;
      setCurrentPrice(candle.close);
      setPriceChange(((candle.close - startPrice) / Math.max(startPrice, 0.000001)) * 100);
      const effectiveMarkerTime =
        typeof sourceTimestamp === "number" && Number.isFinite(sourceTimestamp) ? sourceTimestamp : candle.time;
      const intrabarFraction =
        tf.seconds > 0 ? (effectiveMarkerTime - candle.time) / tf.seconds : 0;
      const markerLogical =
        historyRef.current.length + getIntrabarLogicalOffset(intrabarFraction);
      setLivePriceBeacon({
        price: getLiveBeaconPrice(chartTypeRef.current, candle, historyRef.current),
        time: candle.time,
        logical: markerLogical,
      });
      onPriceUpdateRef.current?.(
        candle.close,
        effectiveMarkerTime,
        tf.seconds,
        markerLogical,
      );

      const updatePayload = buildMainSeriesUpdatePayload(chartTypeRef.current, candle, historyRef.current);

      if (mainUpdateSchedulerRef.current) {
        // Pass candle data for market-responsive animation duration
        mainUpdateSchedulerRef.current.update(
          updatePayload,
          candle,
          previousCandleRef.current,
          startPrice,
          tf.seconds,
        );
        previousCandleRef.current = { ...candle };
      }
      renderOverlayIndicators(getIndicatorHistory());
    };

    aggregatorRef.current = new CandleAggregator(step, handleCandleClose, handleCandleUpdate);
    aggregatorRef.current.setSeedCandle(seedCandle, nowSec);
    handleCandleUpdate(aggregatorRef.current.getCurrentCandle() ?? seedCandle, nowSec);

    // ── Tick loop (drives price engine + feeds aggregator) ─────────────────
    marketFeedRef.current = createMarketDataFeed({
      websocketUrl,
      subscription: {
        symbol: asset.symbol,
        basePrice: engineBasePrice,
        timeframe: tf,
        assetCategory: asset.type,
      },
      callbacks: {
        onTick: (tick) => {
          aggregatorRef.current?.onTick({
            timestamp: tick.timestamp,
            price: tick.price,
          });
        },
        onError: (error) => {
          console.warn(`Market feed error for ${asset.symbol}:`, error);
        },
      },
    });
    marketFeedRef.current.connect();

    // ── Dedicated overlay indicator refresh every 3s ────────────────────────
    return () => {
      mainUpdateSchedulerRef.current?.cleanup();
      marketFeedRef.current?.disconnect();
      marketFeedRef.current = null;
      engineRef.current = null;
      if (aggregatorRef.current) { aggregatorRef.current.destroy(); aggregatorRef.current = null; }
    };
  }, [
    applyResponsivePriceScale,
    asset.basePrice,
    asset.symbol,
    getIndicatorHistory,
    renderOverlayIndicators,
    scrollChartToLiveEdge,
    selectedTf,
    setCurrentPrice,
  ]);

  useEffect(() => {
    if (liveEdgeRequestKey === undefined || liveEdgeRequestKey === null) return;

    const frame = window.requestAnimationFrame(() => {
      scrollChartToLiveEdge();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [asset.symbol, liveEdgeRequestKey, scrollChartToLiveEdge]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const timeScale = chart.timeScale();
    const handleVisibleRangeChange = (range: { from: number; to: number } | null) => {
      if (!range) {
        return;
      }

      applyResponsivePriceScale(range.to - range.from);

      if (isNormalizingVisibleRangeRef.current) {
        return;
      }

      const containerWidth = mainRef.current?.clientWidth ?? 960;
      const dataPointCount = mainSeriesRef.current?.data()?.length ?? historyRef.current.length;
      const maxReadableBars = getMaxReadableZoomBars(
        containerWidth,
        selectedTf,
        Math.max(1, dataPointCount),
      );
      const maxReadableRightOffset = getChartRightOffset(maxReadableBars);
      const maxReadableSpan = maxReadableBars + maxReadableRightOffset;
      const visibleSpan = range.to - range.from;

      if (range.from < -0.5 || visibleSpan > maxReadableSpan + 0.5) {
        const targetSpan = Math.max(1, Math.min(visibleSpan, maxReadableSpan));
        const center = range.from < -0.5 ? targetSpan / 2 : (Math.max(0, range.from) + Math.min(dataPointCount, range.to)) / 2;
        const maxTo = dataPointCount + maxReadableRightOffset;
        let nextFrom = Math.max(0, center - targetSpan / 2);
        let nextTo = nextFrom + targetSpan;

        if (nextTo > maxTo) {
          nextFrom = Math.max(0, nextFrom - (nextTo - maxTo));
          nextTo = maxTo;
        }

        if (Math.abs(range.from - nextFrom) > 0.01 || Math.abs(range.to - nextTo) > 0.01) {
          isNormalizingVisibleRangeRef.current = true;
          timeScale.setVisibleLogicalRange({
            from: nextFrom,
            to: nextTo,
          });
          window.requestAnimationFrame(() => {
            isNormalizingVisibleRangeRef.current = false;
          });
        }
        return;
      }

      if (isBackfillingHistoryRef.current || !engineRef.current) {
        return;
      }

      const threshold = getHistoryBackfillThreshold(containerWidth, selectedTf);

      if (range.from > threshold) {
        return;
      }

      const nextHistoryCount = Math.min(
        MAX_CANDLES_IN_MEMORY,
        loadedHistoryCountRef.current + getHistoryBackfillIncrement(containerWidth, selectedTf),
      );

      if (nextHistoryCount <= loadedHistoryCountRef.current) {
        return;
      }

      isBackfillingHistoryRef.current = true;
      reloadHistoricalCandles(nextHistoryCount, { from: range.from, to: range.to });
      window.requestAnimationFrame(() => {
        isBackfillingHistoryRef.current = false;
      });
    };

    timeScale.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    return () => timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
  }, [applyResponsivePriceScale, reloadHistoricalCandles, selectedTf]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const tf = TIMEFRAMES[selectedTf];
    if (!tf) return;

    const containerWidth = mainRef.current?.clientWidth ?? 960;
    const trendContextBars = getTrendContextBarCount(
      containerWidth,
      selectedTf,
      Math.max(1, historyRef.current.length),
    );
    const initialVisibleBars = getInitialVisibleBars(
      containerWidth,
      selectedTf,
      Math.max(1, historyRef.current.length),
    );
    const rightOffset = getChartRightOffset(trendContextBars);
    const timeScale = chart.timeScale();
    const dataPointCount = mainSeriesRef.current?.data()?.length ?? historyRef.current.length;
    const currentRange = timeScale.getVisibleLogicalRange();
    const wasNearLiveEdge =
      !currentRange ||
      currentRange.to >= dataPointCount - Math.max(4, rightOffset * 0.7);

    timeScale.applyOptions({
      barSpacing: getBarSpacingForScale(selectedTf, chartStylesRef.current.bodyScale),
      minBarSpacing: getMinBarSpacingForScale(selectedTf, chartStylesRef.current.bodyScale),
      rightOffset,
      timeVisible: true,
      secondsVisible: tf.seconds < 60,
      tickMarkFormatter: (time: number) => formatTimeScaleTick(time, tf.seconds),
      fixLeftEdge: false,
      fixRightEdge: false,
      rightBarStaysOnScroll: false,
      shiftVisibleRangeOnNewBar: false,
      allowShiftVisibleRangeOnWhitespaceReplacement: false,
    });
    applyResponsivePriceScale(currentRange ? currentRange.to - currentRange.from : initialVisibleBars + rightOffset, true);

    if (dataPointCount <= 0) {
      return;
    }

    if (!currentRange) {
      const targetTo = dataPointCount + rightOffset;
      timeScale.setVisibleLogicalRange({
        from: Math.max(0, targetTo - (initialVisibleBars + rightOffset)),
        to: targetTo,
      });
      return;
    }

    if (!tradingPreferences.autoScrolling) {
      timeScale.setVisibleLogicalRange(currentRange);
      return;
    }

    if (!wasNearLiveEdge) {
      timeScale.setVisibleLogicalRange(currentRange);
      return;
    }

    const visibleSpan = Math.min(
      Math.max(initialVisibleBars + rightOffset, currentRange.to - currentRange.from),
      trendContextBars + rightOffset,
    );
    const targetTo = dataPointCount + rightOffset;
    const targetFrom = Math.max(0, targetTo - visibleSpan);

    if (Math.abs(currentRange.from - targetFrom) < 0.01 && Math.abs(currentRange.to - targetTo) < 0.01) {
      return;
    }

    timeScale.setVisibleLogicalRange({
      from: targetFrom,
      to: targetTo,
    });
  }, [
    asset.symbol,
    applyResponsivePriceScale,
    chartStyles.bodyScale,
    selectedTf,
    tradingPreferences.autoScrolling,
  ]);

  // Immediately re-render overlays when activeIndicators changes (add / remove / update)
  useEffect(() => {
    // Run now
    if (historyRef.current.length > 0) {
      renderOverlayIndicators(getIndicatorHistory());
      setForceOscillatorRender((current) => current + 1);
    }
    // Run again after 500ms to ensure updates propagate through React batching
    const t = window.setTimeout(() => {
      if (historyRef.current.length > 0) {
        renderOverlayIndicators(getIndicatorHistory());
        setForceOscillatorRender((current) => current + 1);
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [activeIndicators, getIndicatorHistory, renderOverlayIndicators]);

  const pairHistory = useMemo(
    () => {
      void asset.symbol;
      void currentPrice;
      void selectedTf;
      return getIndicatorHistory();
    },
    [asset.symbol, currentPrice, getIndicatorHistory, selectedTf],
  );
  const pairSentiment = useMemo(
    () => getSentimentSplit(pairHistory, currentPrice),
    [currentPrice, pairHistory],
  );
  const timeframeSeconds = TIMEFRAMES[selectedTf]?.seconds ?? 60;
  const pairTrend = useMemo(() => buildPairInfoTrend(pairHistory), [pairHistory]);
  const pairDayRange = useMemo(() => {
    const latest = pairHistory.slice(-96);
    if (latest.length === 0) {
      return { low: currentPrice, high: currentPrice };
    }
    return latest.reduce(
      (range, candle) => ({
        low: Math.min(range.low, candle.low),
        high: Math.max(range.high, candle.high),
      }),
      { low: Number.POSITIVE_INFINITY, high: Number.NEGATIVE_INFINITY },
    );
  }, [currentPrice, pairHistory]);
  const pairChangeCards = useMemo(
    () => buildPairChangeCards(pairHistory, timeframeSeconds, t),
    [pairHistory, timeframeSeconds],
  );
  const pairLongChangeCards = useMemo(
    () => buildPairLongChangeCards(pairHistory, timeframeSeconds, t),
    [pairHistory, timeframeSeconds],
  );
  const pairTrendSvg = useMemo(() => buildPairTrendGeometry(pairTrend), [pairTrend]);
  const pairTrendId = useMemo(
    () => asset.symbol.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "pair-trend",
    [asset.symbol],
  );
  const pairSession = getPairSessionState(t);
  const pairSessionDisplayLabel = pairSession.label.replace(/\b\w/g, (char) => char.toUpperCase());
  const shortPayout = Math.min(95, Math.max(30, asset.maxProfit ?? 79));
  const extendedPayout = Math.min(92, shortPayout + 15);
  const dominantBias = pairSentiment.buy >= pairSentiment.sell ? t("tradingChart.buy") : t("tradingChart.sell");
  const marketClockLabel = useMemo(() => {
    const { offsetMinutes } = getTradingTimezone(tradingPreferences.timezone);
    const zonedDate = new Date(marketClockMs + offsetMinutes * 60 * 1000);
    const timeLabel = [
      zonedDate.getUTCHours(),
      zonedDate.getUTCMinutes(),
      zonedDate.getUTCSeconds(),
    ].map((part) => String(part).padStart(2, "0")).join(":");
    return `${timeLabel} ${tradingPreferences.timezone.replace(":00", "")}`;
  }, [marketClockMs, tradingPreferences.timezone]);
  const minimumStakeLabel = t("tradingChart.minimumStakeLabel");
  const expiryWindowLabel = t("tradingChart.expiryWindowLabel");
  const rangeSpan = Math.max(0, pairDayRange.high - pairDayRange.low);
  const updateChartStyle = useCallback((updates: Partial<ChartStylePreferences>) => {
    setChartStyles((current) => ({ ...current, ...updates }));
  }, []);
  const handleOpenTradeDesk = useCallback(() => {
    setPairInfoOpen(false);
    document.getElementById("tour-trade-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, []);
  const handleTradeDirectionFocus = useCallback((direction: TradeDeskDirection) => {
    setPairInfoOpen(false);
    setStyleEditorOpen(false);
    dispatchTradeDeskDirectionSubmit(direction);
  }, []);
  const dec = getPricePrecision(currentPrice);
  const isUp = priceChange >= 0;
  const showStaticPriceBadge = false;
  const chartTypeOptions: Array<{ id: ChartType; label: string; caption: string }> = [
    { id: "candles", label: t("tradingChart.chartTypeCandles"), caption: t("tradingChart.chartTypeCandlesCaption") },
    { id: "heikinAshi", label: t("tradingChart.chartTypeHeikinAshi"), caption: t("tradingChart.chartTypeHeikinAshiCaption") },
    { id: "line", label: t("tradingChart.chartTypeArea"), caption: t("tradingChart.chartTypeAreaCaption") },
    { id: "bars", label: t("tradingChart.chartTypeBars"), caption: t("tradingChart.chartTypeBarsCaption") },
  ];
  const displayPresetOptions: Array<{ id: ChartDisplayPreset; label: string }> =
    chartType === "line"
      ? [
          { id: "primary", label: t("tradingChart.presetFilledArea") },
          { id: "secondary", label: t("tradingChart.presetLineOnly") },
        ]
      : chartType === "bars"
        ? [
            { id: "primary", label: t("tradingChart.presetStandardBars") },
            { id: "secondary", label: t("tradingChart.presetThinBars") },
          ]
        : [
            { id: "primary", label: t("tradingChart.presetClassic") },
            { id: "secondary", label: t("tradingChart.presetMinimal") },
          ];
  const styleColorFields =
    chartType === "bars"
      ? [
          { key: "barUpColor" as const, label: t("tradingChart.colorUpBars") },
          { key: "barDownColor" as const, label: t("tradingChart.colorDownBars") },
        ]
      : chartType === "heikinAshi"
        ? [
            { key: "heikinUpColor" as const, label: t("tradingChart.colorUpTrend") },
            { key: "heikinDownColor" as const, label: t("tradingChart.colorDownTrend") },
          ]
        : [
            { key: "candleUpColor" as const, label: t("tradingChart.colorUpCandles") },
            { key: "candleDownColor" as const, label: t("tradingChart.colorDownCandles") },
          ];
  const styleSectionTitle = t("tradingChart.displaySettings");
  const bodyScaleLabel = chartType === "bars" ? t("tradingChart.barDensity") : t("tradingChart.bodyWidth");

  if (chartError) {
    return (
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: THEME.bg }}>
        <div className="w-full max-w-2xl rounded-xl p-5" style={{ background: THEME.panel, border: `1px solid ${THEME.border}` }}>
          <h2 className="text-lg font-semibold text-white">{t("tradingChart.chartErrorTitle")}</h2>
          <p className="mt-2 text-sm" style={{ color: THEME.mutedText }}>
            {t("tradingChart.chartErrorMessage")}
          </p>
          <pre className="mt-4 overflow-auto rounded-lg bg-black/30 p-4 text-xs text-red-300 whitespace-pre-wrap">
            {chartError}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="flex-1 flex flex-col min-h-0 relative" style={{ background: effectiveChartTheme.bg }}>
      {asset.available === false && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "var(--trading-workspace-bg, var(--trading-panel-bg))" }}>
          <div className="text-center">
            <div className="text-[16px] font-bold text-white">{t("tradingChart.notAvailable")}</div>
            <div className="text-[12px] text-gray-400 mt-1">{t("tradingChart.assetCoolingDown")}</div>
          </div>
        </div>
      )}
      {settlementAnnouncement && settlementAnnouncement.assetSymbol === asset.symbol ? (
        <SettlementCloneOverlay announcement={settlementAnnouncement} compact={compactPane || miniOverlay} />
      ) : null}

      {showStaticPriceBadge && (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center px-5 py-2.5 rounded-xl pointer-events-none shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
        style={{ background: "var(--trading-panel-bg)", border: "1px solid var(--trading-border-strong-color)" }}>
        <div className="flex items-center gap-3">
          <span className="text-white font-black text-[22px] tracking-tight leading-none">{currentPrice.toFixed(dec)}</span>
          <div className="flex flex-col items-center justify-center leading-none">
            <span className="text-[10px]" style={{ color: isUp ? TRADING_UP_COLOR : TRADING_DOWN_COLOR }}>
              {isUp ? "▲" : "▼"}
            </span>
            <span className="mt-[2px] text-[11px] font-bold" style={{ color: isUp ? TRADING_UP_COLOR : TRADING_DOWN_COLOR }}>
              {Math.abs(priceChange).toFixed(3)}%
            </span>
          </div>
        </div>
      </div>
      )}

      {/* ── MOBILE: Floating Settings / Expanded Toolbar and Briefcase overlay ── */}
      {!mobileHistoryOpen && !hideMobileQuickActions && (
      <>
        {mobileToolsOpen && (
          <button
            type="button"
            aria-label={t("tradingChart.closeChartTools")}
            onClick={() => {
              closeMobileTools();
            }}
            className="fixed inset-0 z-[54] sm:hidden"
          />
        )}

        <div className="absolute left-3 top-3 z-[55] sm:hidden">
          <div className="relative flex flex-col items-start gap-3 pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                setMobileToolsOpen((current) => {
                  const next = !current;
                  if (!next) dismissMobileMenu();
                  return next;
                });
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-[6px] border shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition-colors ${
                mobileToolsOpen
                  ? "border-[#2e8fff] bg-[#1483ff] text-white"
                  : "border-white/6 bg-[#2a3142]/95 text-white hover:bg-[#30394d]"
              }`}
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
            </button>

            {mobileToolsOpen && (
              <>
                {activeMobileMenu === "time" && (
                  <div
                    className="fixed z-[56] overflow-y-auto rounded-[10px] border border-white/10 bg-[#5a5f72]/95 p-2 shadow-2xl backdrop-blur-sm"
                    style={mobileMenuStyle ?? { left: 66, top: 16, width: 228, maxHeight: "calc(100vh - 24px)" }}
                  >
                    <div className="grid grid-cols-3 gap-2 p-1">
                      {SUPPORTED_CHART_TIMEFRAMES.map((tf) => (
                        <button
                          key={tf}
                          onClick={() => {
                            setSelectedTf(tf);
                            closeMobileTools();
                          }}
                          className={`rounded-[8px] px-2 py-3 text-center text-[13px] font-bold transition-colors ${
                            selectedTf === tf
                              ? "bg-white/12 text-white"
                              : "text-white/90 hover:bg-white/8"
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeMobileMenu === "type" && (
                  <div
                    className="fixed z-[56] overflow-y-auto rounded-[10px] border border-white/10 bg-[#5a5f72]/95 p-2 shadow-2xl backdrop-blur-sm"
                    style={mobileMenuStyle ?? { left: 66, top: 16, width: 228, maxHeight: "calc(100vh - 24px)" }}
                  >
                    <div className="grid gap-2 p-1">
                      {[
                        { id: "line" as const, label: t("tradingChart.mobileChartTypeArea"), icon: <Activity className="w-4 h-4" /> },
                        { id: "candles" as const, label: t("tradingChart.mobileChartTypeCandles"), icon: <CandleIcon className="w-4 h-4" /> },
                        { id: "bars" as const, label: t("tradingChart.mobileChartTypeBars"), icon: <CandleIcon className="w-4 h-4" /> },
                        { id: "heikinAshi" as const, label: t("tradingChart.mobileChartTypeHeikenAshi"), icon: <CandleIcon className="w-4 h-4" /> },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setChartType(item.id);
                            closeMobileTools();
                          }}
                          className={`flex items-center gap-3 rounded-[8px] px-4 py-3 text-left text-[13px] font-semibold transition-colors ${
                            chartType === item.id
                              ? "bg-white/12 text-white"
                              : "text-white/90 hover:bg-white/8"
                          }`}
                        >
                          {item.icon}
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    dismissMobileMenu();
                    onToggleDrawingsPanel();
                    setMobileToolsOpen(false);
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-[6px] border shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition-colors ${
                    activeTool !== null
                      ? "border-white/18 bg-[#3a4358] text-white"
                      : "border-white/6 bg-[#2a3142]/95 text-white hover:bg-[#30394d]"
                  }`}
                >
                  <PenTool className="h-[18px] w-[18px]" />
                </button>

                <button
                  type="button"
                  onClick={(event) => toggleMobileMenu("time", event.currentTarget)}
                  className={`mx-1 flex h-10 min-w-[42px] items-center justify-center rounded-[6px] border px-2 py-1.5 text-[18px] font-black transition-colors shadow-[0_8px_18px_rgba(0,0,0,0.24)] ${
                    activeMobileMenu === "time"
                      ? "border-white/18 bg-[#3a4358] text-[#0fa053]"
                      : "border-white/6 bg-[#2a3142]/95 text-[#0fa053] hover:bg-[#30394d]"
                  }`}
                >
                  {selectedTf}
                </button>

                <button
                  type="button"
                  onClick={(event) => toggleMobileMenu("type", event.currentTarget)}
                  className={`flex h-10 w-10 items-center justify-center rounded-[6px] border shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition-colors ${
                    activeMobileMenu === "type"
                      ? "border-white/18 bg-[#ffffff] text-[#212634]"
                      : "border-white/6 bg-[#2a3142]/95 text-white hover:bg-[#30394d]"
                  }`}
                >
                  <CandleIcon className="h-[18px] w-[18px]" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    dismissMobileMenu();
                    onToggleIndicatorsPanel();
                    setMobileToolsOpen(false);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/6 bg-[#2a3142]/95 text-white shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition-colors hover:bg-[#30394d]"
                >
                  <Compass className="h-[18px] w-[18px]" />
                </button>
              </>
            )}

            <button 
              type="button"
              onClick={() => {
                closeMobileTools();
                if (onToggleMobileHistory) {
                  onToggleMobileHistory();
                } else {
                  const tradePanel = document.getElementById("tour-trade-panel");
                  if (tradePanel) tradePanel.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/6 bg-[#2a3142]/95 text-white shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition-colors hover:bg-[#30394d]"
            >
              <Briefcase className="w-5 h-5 text-white" />
              <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-[2.5px] border-[#1c1f2d] bg-[#2962ff] text-[10px] font-black text-white">
                {activeTrades.length}
              </div>
            </button>
          </div>
        </div>
      </>
      )}

      {!mobileHistoryOpen && !compactPane && !overlayUiSuppressed && (
        <>
          <div className={`pointer-events-none absolute z-[52] hidden items-start sm:flex ${miniOverlay ? "left-3 top-3" : "inset-x-3 top-2.5"}`}>
          <div className={`pointer-events-auto flex flex-col items-start ${miniOverlay ? "gap-1 pl-[2px]" : "gap-1.5 pl-[46px]"}`}>
              <div className={`text-slate-400 ${miniOverlay ? "text-[8px] font-medium" : "text-[9px] font-normal"}`}>
                <span>{marketClockLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPairInfoOpen((current) => !current);
                  setStyleEditorOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full border font-bold shadow-[0_8px_16px_rgba(0,0,0,0.18)] transition-colors ${
                  miniOverlay
                    ? "h-[24px] pl-1.5 pr-2.5 text-[11px]"
                    : "h-[30px] pl-2 pr-3 text-[12px]"
                } ${
                  pairInfoOpen
                    ? "border-white/15 bg-[#697286]/92 text-white"
                    : "border-white/10 bg-[#5f697d]/76 text-[#edf2ff] hover:bg-[#6a7285]/84"
                }`}
                title={t("tradingChart.info")}
                aria-label={t("tradingChart.info")}
              >
                <span className={`flex items-center justify-center rounded-full bg-white/12 text-white/85 ${miniOverlay ? "h-[15px] w-[15px]" : "h-[18px] w-[18px]"}`}>
                  <Info className={`${miniOverlay ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
                </span>
                {t("tradingChart.info")}
              </button>
            </div>
          </div>
        </>
      )}

      <div
        className="relative flex-1 min-h-0 overflow-hidden"
        ref={mainRef}
        style={chartViewportStyle}
        onMouseMove={handleChartMouseMove}
        onMouseLeave={handleChartMouseLeave}
        onClick={handleChartClick}
      >
        {showDesktopChartTools && !overlayUiSuppressed && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-[80] hidden sm:flex items-stretch">
              <div
                className="h-full border-r shadow-none"
                style={{
                  width: DESKTOP_SENTIMENT_RAIL_WIDTH,
                  background: "var(--trading-workspace-bg)",
                  borderRightColor: "var(--trading-border-strong-color)",
                }}
              >
                <TradeSentimentRail
                  higherPercent={pairSentiment.buy}
                  lowerPercent={pairSentiment.sell}
                  onSelectDirection={handleTradeDirectionFocus}
                />
              </div>
            </div>
            <div
              className="pointer-events-none absolute z-[81] hidden sm:flex flex-col items-start gap-3"
              style={{ left: DESKTOP_TOOLBAR_MAIN_LEFT_OFFSET, bottom: DESKTOP_TOOLBAR_MAIN_BOTTOM_OFFSET }}
            >
              <ChartToolbar
                selectedTf={selectedTf}
                onSelectTf={(tf) => setSelectedTf(tf)}
                styleEditorOpen={styleEditorOpen}
                onOpenStyleEditor={() => {
                  setStyleEditorOpen((current) => !current);
                  setPairInfoOpen(false);
                }}
                activeInds={[]}
                onToggleInd={() => {}}
                activeDrawTool={activeTool}
                onSelectDrawTool={(tool) => {
                  if (tool === "clear") {
                     setDrawings([]);
                     setActiveTool(null);
                  } else setActiveTool(tool);
                }}
                onToggleIndicatorsPanel={onToggleIndicatorsPanel}
                onToggleDrawingsPanel={onToggleDrawingsPanel}
              />
            </div>
          </>
        )}

        {syncChart && syncSeries && (
           <>
             {!mobileHistoryOpen && (
               <DrawingOverlay 
                 chart={syncChart} 
                 series={syncSeries} 
                 activeIndicators={activeIndicators}
                 indicatorDataMap={indicatorDataMap}
                 timeframeSeconds={TIMEFRAMES[selectedTf]?.seconds ?? 60}
               />
             )}
             {!mobileHistoryOpen && (
               <TradeMarkersOverlay
                 chart={syncChart}
                 series={syncSeries}
                 assetSymbol={asset.symbol}
                 trades={activeTrades}
                 timeframeSeconds={TIMEFRAMES[selectedTf]?.seconds ?? 60}
               />
             )}
             {!mobileHistoryOpen && !overlayUiSuppressed && (
               <LiveChartBeacon
                 chart={syncChart}
                 series={syncSeries}
                 timeframeSeconds={TIMEFRAMES[selectedTf]?.seconds ?? 60}
                 livePrice={livePriceBeacon?.price ?? currentPrice}
                 liveTime={livePriceBeacon?.time ?? liveRef.current?.time ?? null}
                 liveLogical={livePriceBeacon?.logical ?? null}
               />
             )}
           </>
        )}

        {hoverPriceData && !overlayUiSuppressed && (
          <>
            <div className="pointer-events-none absolute inset-x-0 z-[87]" style={{ top: hoverPriceData.top }}>
              <div className="absolute inset-x-0 h-px bg-[#8fa4d2]/50" />
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                addPriceAlert(hoverPriceData.price);
              }}
              className="pointer-events-auto absolute right-2 z-[88] inline-flex items-center gap-2 rounded-full border border-[#8fa4d2]/40 bg-[#121826]/95 px-3 py-2 text-xs font-black text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition hover:border-[#c7d6f4] hover:bg-[#1b2232]"
              style={{ top: hoverPriceData.top - 12 }}
              title={t("tradingChart.setAlertAtPrice")}
            >
              <Bell className="h-4 w-4 text-[#b9c8ea]" />
              <span>{formatAlertPrice(hoverPriceData.price)}</span>
            </button>
          </>
        )}

        {priceAlerts.length > 0 && mainSeriesRef.current && !overlayUiSuppressed && (
          <>
            <div className="pointer-events-none absolute inset-y-0 right-0 z-[89]">
              {priceAlerts.map((alert) => {
                const y = mainSeriesRef.current?.priceToCoordinate(alert.price);
                if (y === null || !Number.isFinite(y)) return null;
                return (
                  <div key={`marker-${alert.id}`} className="absolute right-2 z-[89]" style={{ top: y - 18 }}>
                    <div className="pointer-events-none absolute -right-10 h-[1px] w-[calc(100vw-96px)] bg-[#8fa4d2]/25" />
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removePriceAlert(alert.id);
                      }}
                      className="pointer-events-auto group relative inline-flex items-center gap-2 rounded-full border border-[#8fa4d2]/45 bg-[#121826]/95 px-3 py-2 text-[11px] font-black text-[#d9e4ff] shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition hover:border-rose-300/70 hover:bg-rose-500/15"
                      title={t("tradingChart.clickToRemoveAlert")}
                      aria-label={`Remove alert at ${formatAlertPrice(alert.price)}`}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#8fa4d2]/30 bg-slate-900/90 text-[#b9c8ea]">
                        <BellRing className="h-4 w-4" />
                      </span>
                      <span>{formatAlertPrice(alert.price)}</span>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white ring-1 ring-white/20 transition-transform group-hover:scale-110">
                        <X className="h-3 w-3" strokeWidth={3} />
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!compactPane && !miniOverlay && !mobileHistoryOpen && !overlayUiSuppressed && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-[56] hidden -translate-x-1/2 sm:flex">
            <div className="pointer-events-auto inline-flex items-center gap-[3px] rounded-[4px] bg-transparent">
              <button
                type="button"
                onClick={() => adjustChartZoom("out")}
                className="flex h-[20px] w-[20px] items-center justify-center rounded-[2px] border border-white/6 bg-[#2a3040]/96 text-[#b8c1d2] shadow-[0_6px_14px_rgba(0,0,0,0.22)] transition-colors hover:bg-[#333a4b]"
                title={t("tradingChart.zoomOut")}
                aria-label={t("tradingChart.zoomOut")}
              >
                <Minus className="h-[11px] w-[11px]" strokeWidth={2.6} />
              </button>
              <button
                type="button"
                onClick={() => adjustChartZoom("in")}
                className="flex h-[20px] w-[20px] items-center justify-center rounded-[2px] border border-white/6 bg-[#2a3040]/96 text-[#b8c1d2] shadow-[0_6px_14px_rgba(0,0,0,0.22)] transition-colors hover:bg-[#333a4b]"
                title={t("tradingChart.zoomIn")}
                aria-label={t("tradingChart.zoomIn")}
              >
                <Plus className="h-[11px] w-[11px]" strokeWidth={2.6} />
              </button>
            </div>
          </div>
        )}

        {chartType === "line" && (
          <div className="pointer-events-none absolute bottom-[18px] right-0 z-[55]">
            <div className="h-2.5 w-2.5 animate-ping rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
            <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-white" />
          </div>
        )}
      </div>

      {pairInfoOpen && !mobileHistoryOpen && (
        <div className="pointer-events-none absolute inset-0 z-[70] hidden sm:block">
          <div className="absolute inset-0 bg-[#111724]/70 backdrop-blur-[3px]" />
          <button
            type="button"
            aria-label={t("tradingChart.closePairInfo")}
            onClick={() => setPairInfoOpen(false)}
            className="absolute inset-0 pointer-events-auto"
          />
          <div className="pointer-events-auto absolute left-1/2 top-1/2 w-[calc(100%-120px)] max-w-[920px] -translate-x-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={() => setPairInfoOpen(false)}
              className="absolute -left-[17px] -top-[17px] z-10 flex h-[34px] w-[34px] items-center justify-center rounded-full border-[3px] border-[#2d3446] bg-white text-[#2d3446] shadow-[0_12px_24px_rgba(0,0,0,0.35)] transition-transform hover:scale-[1.04]"
              aria-label={t("tradingChart.closePairInfo")}
            >
              <X className="h-4 w-4" strokeWidth={3} />
            </button>

            <div className="max-h-[calc(100vh-118px)] overflow-y-auto rounded-[6px] border border-[#394154] bg-[#2d3446]/[0.99] px-[30px] py-[28px] shadow-[0_32px_86px_rgba(0,0,0,0.52)]">
              <div className="flex items-center justify-between gap-5 border-b border-dashed border-white/16 pb-5">
                <div className="min-w-0 flex items-center gap-3">
                  <AssetSymbolMark
                    symbol={asset.symbol}
                    name={asset.name}
                    category={asset.type}
                    size={22}
                    fallbackLabelLength={3}
                  />
                  <h2 className="truncate text-[18px] font-black leading-none text-white">{asset.symbol}</h2>
                  <span className="text-[14px] font-black text-[var(--trading-success-color)]">{shortPayout}%</span>
                </div>
                <div className="hidden items-center gap-3 text-right lg:flex">
                  <span className={`text-[14px] font-black ${pairSession.isOpen ? "text-white" : "text-[#ff8d99]"}`}>
                    {pairSessionDisplayLabel}
                  </span>
                  <span className="text-[18px] font-medium text-slate-600">/</span>
                  <span className="text-[13px] font-semibold text-slate-500">{pairSession.detail}</span>
                </div>
              </div>

              <div className="mt-5 grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_180px]">
                <div className="grid max-w-[430px] grid-cols-2 divide-x divide-white/12">
                  <div className="pr-10">
                    <div className="text-[14px] font-semibold text-slate-400">{t("tradingChart.priceNow")}</div>
                    <div className="mt-1 text-[17px] font-black text-white">{currentPrice.toFixed(dec)}</div>
                  </div>
                  <div className="pl-10">
                    <div className="text-[14px] font-semibold text-slate-400">{t("tradingChart.sessionChange")}</div>
                    <div className={`mt-1 text-[17px] font-black ${isUp ? "text-[#18d67b]" : "text-[#ff4c45]"}`}>
                      {formatSignedPercent(priceChange)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenTradeDesk}
                  className="inline-flex h-11 items-center justify-center gap-3 rounded-[4px] bg-[#1684e8] px-6 text-[15px] font-black text-white shadow-[0_14px_30px_rgba(22,132,232,0.26)] transition-colors hover:bg-[#2394fb]"
                >
                  {t("tradingChart.tradeNow")}
                  <ArrowRight className="h-4 w-4 rounded-full bg-white/20 p-0.5" />
                </button>
              </div>

              <div className="mt-5 rounded-[6px] bg-[#3a4153] px-4 py-4">
                <div className="grid grid-cols-[140px_auto_minmax(0,1fr)_auto] items-center gap-3">
                  <div>
                    <div className="text-[21px] font-medium leading-none text-white">{dominantBias}</div>
                    <div className="mt-2 text-[14px] font-medium text-slate-500">{t("tradingChart.tradersSentiment")}</div>
                  </div>
                  <span className="text-[18px] font-black text-white">{pairSentiment.sell}%</span>
                  <div className="flex h-1 overflow-hidden rounded-full bg-[#252b3a]">
                    <div className="h-full bg-[#ff4c45]" style={{ width: `${pairSentiment.sell}%` }} />
                    <div className="h-full bg-[#18d67b]" style={{ width: `${pairSentiment.buy}%` }} />
                  </div>
                  <span className="text-[18px] font-black text-white">{pairSentiment.buy}%</span>
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-[12px] font-semibold text-slate-400">{t("tradingChart.minimumInvestment")}</div>
                  <div className="mt-1 text-[16px] font-black text-white">{minimumStakeLabel}</div>
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-slate-400">{t("tradingChart.profit1min")}</div>
                  <div className="mt-1 text-[16px] font-black text-[#18d67b]">{shortPayout}%</div>
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-slate-400">{t("tradingChart.profit5plusMin")}</div>
                  <div className="mt-1 text-[16px] font-black text-[#18d67b]">{extendedPayout}%</div>
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-slate-400">{t("tradingChart.expiryTime")}</div>
                  <div className="mt-1 text-[16px] font-black text-white">{expiryWindowLabel}</div>
                </div>
              </div>

              <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_345px]">
                <div>
                  <div className="grid grid-cols-3">
                    {pairChangeCards.map((item, index) => (
                      <div
                        key={item.label}
                        className={`px-5 py-4 ${index === 0 ? "rounded-t-[6px] bg-[#3a4153]" : ""}`}
                      >
                        <div className="text-[14px] font-black text-white">{item.label}</div>
                        <div className={`mt-2 text-[20px] font-medium ${item.value >= 0 ? "text-[#18d67b]" : "text-[#ff4c45]"}`}>
                          {formatChangeCardPercent(item.value)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="relative h-[250px] overflow-hidden bg-[#333b4d]">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                      <defs>
                        <linearGradient id={`${pairTrendId}-line`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2489ee" />
                          <stop offset="100%" stopColor="#0a68cb" />
                        </linearGradient>
                        <linearGradient id={`${pairTrendId}-fill`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(32,129,233,0.26)" />
                          <stop offset="100%" stopColor="rgba(32,129,233,0.05)" />
                        </linearGradient>
                      </defs>
                      {Array.from({ length: 7 }).map((_, index) => {
                        const y = 12 + index * 12.5;
                        return (
                          <line
                            key={`h-${index}`}
                            x1="0"
                            y1={y}
                            x2="100"
                            y2={y}
                            stroke="rgba(255,255,255,0.055)"
                            strokeWidth="0.75"
                          />
                        );
                      })}
                      {Array.from({ length: 6 }).map((_, index) => {
                        const x = 16 + index * 20;
                        return (
                          <line
                            key={`v-${index}`}
                            x1={x}
                            y1="0"
                            x2={x}
                            y2="100"
                            stroke="rgba(255,255,255,0.045)"
                            strokeWidth="0.75"
                          />
                        );
                      })}
                      <polygon points={pairTrendSvg.areaPoints} fill={`url(#${pairTrendId}-fill)`} />
                      <polyline
                        points={pairTrendSvg.linePoints}
                        fill="none"
                        stroke={`url(#${pairTrendId}-line)`}
                        strokeWidth="0.55"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-5 text-[12px] font-semibold text-slate-500">
                    {pairLongChangeCards.map((item) => (
                      <div key={item.label}>
                        {item.label}
                        <span className={`ml-2 font-black ${item.value >= 0 ? "text-[#18d67b]" : "text-[#ff4c45]"}`}>
                          {formatChangeCardPercent(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-center text-[16px] font-black text-white">{t("tradingChart.tradingSchedule")}</div>
                  <div className="mt-5 space-y-0">
                    <div className="grid grid-cols-[92px_minmax(90px,1fr)_112px] gap-3 px-3 pb-3 text-[12px] font-black text-slate-500">
                      <span>{t("tradingChart.scheduleDate")}</span>
                      <span>{t("tradingChart.scheduleWeekday")}</span>
                      <span className="text-right">{t("tradingChart.scheduleTradingTime")}</span>
                    </div>
                    {tradingSchedule.slice(0, 7).map((row, index) => (
                      <div
                        key={`${row.weekday}-${row.dateLabel}`}
                        className={`grid grid-cols-[92px_minmax(90px,1fr)_112px] items-center gap-3 px-3 py-3 text-[13px] ${
                          index === 0 ? "rounded-[4px] bg-[#3a4153]" : "border-b border-white/10"
                        }`}
                      >
                        <div className="font-black text-white">{row.dateLabel}</div>
                        <div className="font-semibold text-slate-300">{row.weekday}</div>
                        <div className="text-right font-black text-white">{row.session}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {styleEditorOpen && !mobileHistoryOpen && (
        <div className="absolute inset-0 z-[70] hidden sm:block pointer-events-none">
          <button
            type="button"
            aria-label={t("tradingChart.closeStyleEditor")}
            onClick={() => setStyleEditorOpen(false)}
            className="absolute inset-0 pointer-events-auto"
          />
          <div className="pointer-events-auto absolute left-[72px] top-4 w-[540px] max-h-[calc(100%-32px)] max-w-[calc(100%-80px)] overflow-y-auto rounded-[4px] border border-[#353d50] bg-[#252c3b] shadow-[0_20px_48px_rgba(0,0,0,0.48)]">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#343b4a] px-4 py-3">
              <div className="text-[12px] font-black uppercase tracking-[0.08em] text-white">{t("tradingChart.chartType")}</div>
              <label className="ml-auto flex max-w-[280px] items-center justify-end gap-2 text-right text-[11px] font-medium leading-tight text-slate-300">
                <span>{t("tradingChart.fullWidthPriceLine")}</span>
                <button
                  type="button"
                  onClick={() => updateChartStyle({ priceLineVisible: !chartStyles.priceLineVisible })}
                  className={`flex h-4 w-4 items-center justify-center rounded-[3px] border ${
                    chartStyles.priceLineVisible
                      ? "border-[#10a055] bg-[#2f3545]"
                      : "border-[#5a6272] bg-[#232937]"
                  }`}
                  aria-label={t("tradingChart.toggleFullWidthPriceLine")}
                >
                  {chartStyles.priceLineVisible ? (
                    <span className="block h-2 w-2 rounded-[1px] bg-[#10a055]" />
                  ) : null}
                </button>
              </label>
            </div>

            <div className="grid grid-cols-[170px_minmax(0,1fr)]">
              <div className="border-r border-[#343b4a] bg-[#232937]">
                {chartTypeOptions.map((option) => {
                  const selected = chartType === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setChartType(option.id)}
                      className={`flex w-full items-center gap-3 border-b border-[#343b4a] px-4 py-3 text-left transition-colors ${
                        selected ? "bg-[#363d4d] text-white" : "text-slate-200 hover:bg-[#2c3343]"
                      }`}
                    >
                      <span className={`${selected ? "text-[#10a055]" : "text-slate-300"}`}>
                        {option.id === "line" ? (
                          <Activity className="h-4 w-4" />
                        ) : option.id === "bars" ? (
                          <BarChart className="h-4 w-4" />
                        ) : (
                          <CandleIcon className="h-4 w-4" />
                        )}
                      </span>
                      <span className="text-[12px] font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="min-w-0 bg-[#252c3b]">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="text-[12px] font-medium text-slate-300">{styleSectionTitle}</div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <div className="flex h-6 w-6 items-center justify-center rounded-[4px] border border-[#434b5d] bg-[#2a3142]">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </div>
                    {t("tradingChart.livePreview")}
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    {displayPresetOptions.map((preset) => {
                      const selected = chartStyles.displayPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => updateChartStyle({ displayPreset: preset.id })}
                          className={`text-left ${selected ? "" : "opacity-85"}`}
                        >
                          <ChartStylePreview chartType={chartType} variant={preset.id} styles={chartStyles} />
                          <div className={`mt-1.5 text-[11px] font-medium ${selected ? "text-white" : "text-slate-400"}`}>
                            {preset.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {chartType === "line" ? (
                    <>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <label className="relative flex min-h-[48px] cursor-pointer items-start justify-between gap-3 rounded-[4px] bg-[#4c5567] px-3 py-2 text-white">
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="h-5 w-5 rounded-[2px] border border-white/10" style={{ background: chartStyles.areaLineColor }} />
                            <span className="min-w-0 whitespace-normal text-[12px] font-semibold leading-tight">{t("tradingChart.lineColor")}</span>
                          </span>
                          <span className="text-[12px] text-white/70">▼</span>
                          <input
                            type="color"
                            value={chartStyles.areaLineColor}
                            onChange={(event) => updateChartStyle({ areaLineColor: event.target.value })}
                            className="absolute inset-0 cursor-pointer opacity-0"
                          />
                        </label>
                        <label className="relative flex min-h-[48px] cursor-pointer items-start justify-between gap-3 rounded-[4px] bg-[#4c5567] px-3 py-2 text-white">
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="h-5 w-5 rounded-[2px] border border-white/10" style={{ background: chartStyles.areaFillColor }} />
                            <span className="min-w-0 whitespace-normal text-[12px] font-semibold leading-tight">{t("tradingChart.fillColor")}</span>
                          </span>
                          <span className="text-[12px] text-white/70">▼</span>
                          <input
                            type="color"
                            value={chartStyles.areaFillColor}
                            onChange={(event) => updateChartStyle({ areaFillColor: event.target.value })}
                            className="absolute inset-0 cursor-pointer opacity-0"
                          />
                        </label>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
                          <input
                            type="checkbox"
                            checked={chartStyles.areaFillEnabled}
                            onChange={(event) => updateChartStyle({ areaFillEnabled: event.target.checked })}
                            className="h-4 w-4 accent-[#10a055]"
                          />
                          {t("tradingChart.areaFill")}
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-slate-400">{t("tradingChart.thickness")}</span>
                          {[1, 2, 3, 4].map((width) => (
                            <button
                              key={width}
                              type="button"
                              onClick={() => updateChartStyle({ areaLineWidth: width })}
                              className={`flex h-7 w-7 items-center justify-center rounded-[4px] border text-[11px] font-black ${
                                chartStyles.areaLineWidth === width
                                  ? "border-[#10a055] bg-[#273a32] text-white"
                                  : "border-[#4a5264] bg-[#313848] text-slate-300"
                              }`}
                            >
                              {width}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {styleColorFields.map((item) => (
                          <label key={item.key} className="relative flex min-h-[48px] cursor-pointer items-start justify-between gap-3 rounded-[4px] bg-[#4c5567] px-3 py-2 text-white">
                            <span className="flex min-w-0 items-center gap-3">
                              <span className="h-5 w-5 rounded-[2px] border border-white/10" style={{ background: chartStyles[item.key] }} />
                              <span className="min-w-0 whitespace-normal text-[12px] font-semibold leading-tight">{item.label}</span>
                            </span>
                            <span className="text-[12px] text-white/70">▼</span>
                            <input
                              type="color"
                              value={chartStyles[item.key]}
                              onChange={(event) => updateChartStyle({ [item.key]: event.target.value })}
                              className="absolute inset-0 cursor-pointer opacity-0"
                            />
                          </label>
                        ))}
                      </div>

                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {CANDLE_COLOR_PRESETS.map((preset) => {
                          const selected =
                            matchesHexColor(chartStyles[styleColorFields[0].key], preset.up) &&
                            matchesHexColor(chartStyles[styleColorFields[1].key], preset.down);

                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() =>
                                updateChartStyle({
                                  [styleColorFields[0].key]: preset.up,
                                  [styleColorFields[1].key]: preset.down,
                                } as Partial<ChartStylePreferences>)
                              }
                              className={`flex min-h-[42px] items-center gap-2 rounded-[4px] border px-2 text-left transition-colors ${
                                selected
                                  ? "border-[#8fb3e7] bg-[#34394a] text-white"
                                  : "border-[#4a5264] bg-[#313848] text-slate-300 hover:bg-[#373f51]"
                              }`}
                              aria-label={t("tradingChart.candlePreset" + preset.id.charAt(0).toUpperCase() + preset.id.slice(1))}
                            >
                              <span className="flex shrink-0 overflow-hidden rounded-[2px] border border-white/10">
                                <span className="h-5 w-3" style={{ background: preset.up }} />
                                <span className="h-5 w-3" style={{ background: preset.down }} />
                              </span>
                              <span className="min-w-0 truncate text-[11px] font-black">{t("tradingChart.candlePreset" + preset.id.charAt(0).toUpperCase() + preset.id.slice(1))}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[11px] font-medium text-slate-400">{bodyScaleLabel}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0.72}
                            max={1.42}
                            step={0.01}
                            value={chartStyles.bodyScale}
                            onChange={(event) => updateChartStyle({ bodyScale: clampBodyScale(Number(event.target.value)) })}
                            className="w-[148px]"
                          />
                          <span className="min-w-10 text-right text-[11px] font-black text-white">
                            {chartStyles.bodyScale.toFixed(2)}x
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setChartStyles(DEFAULT_CHART_STYLE);
                        setChartType(DEFAULT_CHART_TYPE);
                      }}
                      className="rounded-[4px] border border-[#4a5264] bg-[#313848] px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-200"
                    >
                      {t("tradingChart.reset")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStyleEditorOpen(false)}
                      className="rounded-[4px] border border-[#4a5264] bg-[#313848] px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-200"
                    >
                      {t("tradingChart.close")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!mobileHistoryOpen && !compactPane && !miniOverlay && !overlayUiSuppressed && mainChartIndicators.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-40 hidden sm:block">
          <div
            className="pointer-events-auto absolute flex flex-col items-start gap-1.5"
            style={{ left: overlayStripLeftInset, top: 78 }}
          >
            {mainChartIndicators.map((ind) => (
              <IndicatorControlStrip
                key={ind.instanceId}
                indicator={ind}
                onOpenSettings={onUpdateIndicator ? () => handleOpenIndicatorSettings(ind.instanceId) : undefined}
                onToggleVisibility={onUpdateIndicator ? () => onUpdateIndicator(ind.instanceId, { visible: !ind.visible }) : undefined}
                onRemove={onRemoveIndicator ? () => onRemoveIndicator(ind.instanceId) : undefined}
                variant="overlay"
              />
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Render of Oscillators in Independent Panes Sync'd to the Master Chart */}
      {separateIndicators.map((ind) => (
        <OscillatorPane
          key={ind.instanceId}
          indicator={ind}
          getHistory={getIndicatorHistory}
          syncMainChart={syncChart}
          selectedTf={selectedTf}
          bodyScale={chartStyles.bodyScale}
          renderKey={forceOscillatorRender}
          liveSignal={currentPrice}
          controlStripLeftInset={oscillatorStripLeftInset}
          onOpenSettings={onUpdateIndicator ? () => handleOpenIndicatorSettings(ind.instanceId) : undefined}
          onToggleVisibility={onUpdateIndicator ? () => onUpdateIndicator(ind.instanceId, { visible: !ind.visible }) : undefined}
          onRemove={onRemoveIndicator ? () => onRemoveIndicator(ind.instanceId) : undefined}
        />
      ))}

      {editingIndicator && !onOpenIndicatorSettings && onUpdateIndicator && (
        <IndicatorSettingsModal
          indicator={editingIndicator}
          onSave={(updates) => onUpdateIndicator(editingIndicator.instanceId, updates)}
          onDelete={onRemoveIndicator ? () => onRemoveIndicator(editingIndicator.instanceId) : undefined}
          onClose={() => setEditingIndicatorId(null)}
        />
      )}
    </div>
  );
};

export default TradingChart;
