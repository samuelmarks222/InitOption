import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Briefcase, Compass, MoreHorizontal, PenTool } from "lucide-react";
import {
  BarSeries,
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineSeries,
  LineStyle,
  type SeriesType,
  type Time,
} from "lightweight-charts";
import { supabase } from "@/integrations/supabase/client";
import type { ActiveTrade } from "@/hooks/useTrading";
import { useDrawings } from "@/contexts/DrawingContext";
import { CandleAggregator } from "./CandleAggregator";
import ChartToolbar, { type ChartType, CandleIcon } from "./ChartToolbar";
import { TradeSettlementOverlay } from "./TradeSettlementOverlay";
import { LiveChartBeacon } from "./LiveChartBeacon";
import { TradeMarkersOverlay } from "./TradeMarkersOverlay";
import { DrawingOverlay } from "./drawings/DrawingOverlay";
import { createMarketDataFeed, type MarketDataFeed } from "./engine/marketDataFeed";
import {
  OTCPriceEngine,
  SUPPORTED_CHART_TIMEFRAMES,
  TIMEFRAMES,
  type OHLCCandle,
  type SupportedChartTimeframe,
} from "./engine/priceEngine";
import { calculateBollingerBands, calculateEma, calculateSma } from "./indicators/calculations";
import { IndicatorsPanel } from "./indicators/IndicatorsPanel";
import { OscillatorPane } from "./indicators/OscillatorPane";
import {
  createIndicator,
  isOscillatorIndicator,
  isOverlayIndicator,
  type ActiveIndicator,
  type IndicatorKey,
} from "./indicators/types";

type TradingChartAsset = {
  symbol: string;
  type?: string | null;
  price: number;
  change?: number;
  basePrice?: number;
};

type TradingChartProps = {
  asset: TradingChartAsset;
  onPriceUpdate: (price: number, markerTime?: number) => void;
  activeTrades: ActiveTrade[];
  onToggleDrawingsPanel?: () => void;
  onRemoveIndicator?: (instanceId: string) => void;
  onToggleMobileHistory?: () => void;
  mobileHistoryOpen?: boolean;
};

type PlatformThemeRow = {
  chart_bg_color?: string | null;
  chart_up_color?: string | null;
  chart_down_color?: string | null;
};

type OverlaySeriesHandle = {
  primary?: ISeriesApi<"Line">;
  middle?: ISeriesApi<"Line">;
  upper?: ISeriesApi<"Line">;
  lower?: ISeriesApi<"Line">;
};

const MAX_CANDLES_IN_MEMORY = 600;
const DEFAULT_VISIBLE_BARS = 90;

const BAR_SPACING_MAP: Partial<Record<SupportedChartTimeframe, number>> = {
  "1s": 10,
  "5s": 9,
  "15s": 8,
  "30s": 7,
  "1m": 7,
  "5m": 6,
  "10m": 5,
  "15m": 5,
  "30m": 4,
  "1h": 4,
  "2h": 3,
  "3h": 3,
  "4h": 3,
  "12h": 2.5,
  "1D": 2.2,
};

const getPricePrecision = (price: number) => {
  if (price > 1000) return 2;
  if (price > 100) return 3;
  if (price > 1) return 5;
  return 6;
};

const formatTimeScaleTick = (time: number, timeframeSeconds: number) => {
  const date = new Date(time * 1000);

  if (timeframeSeconds < 60) {
    return date.toLocaleTimeString([], {
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  if (timeframeSeconds < 60 * 60 * 24) {
    return date.toLocaleTimeString([], {
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

const toChartTime = (time: number) => time as Time;

const toOhlcChartData = (candles: OHLCCandle[]) =>
  candles.map((candle) => ({
    time: toChartTime(candle.time),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }));

const toLineChartData = (candles: OHLCCandle[]) =>
  candles.map((candle) => ({
    time: toChartTime(candle.time),
    value: candle.close,
  }));

const calcHeikinAshi = (candles: OHLCCandle[]): OHLCCandle[] => {
  if (candles.length === 0) return [];

  return candles.reduce<OHLCCandle[]>((result, candle, index) => {
    if (index === 0) {
      result.push({
        ...candle,
        open: (candle.open + candle.close) / 2,
        close: (candle.open + candle.high + candle.low + candle.close) / 4,
      });
      return result;
    }

    const previous = result[index - 1];
    const close = (candle.open + candle.high + candle.low + candle.close) / 4;
    const open = (previous.open + previous.close) / 2;

    result.push({
      ...candle,
      open,
      close,
      high: Math.max(candle.high, open, close),
      low: Math.min(candle.low, open, close),
    });

    return result;
  }, []);
};

const getSeriesPriceFormat = (referencePrice: number) => {
  const precision = getPricePrecision(referencePrice);
  const minMove = Number((1 / 10 ** precision).toFixed(precision));

  return {
    type: "price" as const,
    precision,
    minMove,
  };
};

const normalizeNumber = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const TradingChart = ({
  asset,
  onPriceUpdate,
  activeTrades,
  onToggleDrawingsPanel,
  onRemoveIndicator,
  onToggleMobileHistory,
  mobileHistoryOpen,
}: TradingChartProps) => {
  const [selectedTf, setSelectedTf] = useState<SupportedChartTimeframe>("1m");
  const [chartType, setChartType] = useState<ChartType>("candles");
  const [showIndicatorsPanel, setShowIndicatorsPanel] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState(asset.price);
  const [priceChange, setPriceChange] = useState(asset.change ?? 0);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [activeMobileMenu, setActiveMobileMenu] = useState<"time" | "type" | null>(null);
  const [hideMobileQuickActions, setHideMobileQuickActions] = useState(false);
  const [globalTheme, setGlobalTheme] = useState({
    bg: "#0E1217",
    up: "#00C076",
    down: "#F6465D",
  });
  const [activeIndicators, setActiveIndicators] = useState<ActiveIndicator[]>([createIndicator("sma")]);
  const [syncChart, setSyncChart] = useState<IChartApi | null>(null);
  const [syncSeries, setSyncSeries] = useState<ISeriesApi<SeriesType> | null>(null);
  const [oscillatorRenderKey, setOscillatorRenderKey] = useState(0);

  const mainRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const overlaySeriesRef = useRef<Record<string, OverlaySeriesHandle>>({});
  const historyRef = useRef<OHLCCandle[]>([]);
  const liveRef = useRef<OHLCCandle | null>(null);
  const onPriceUpdateRef = useRef(onPriceUpdate);
  const chartTypeRef = useRef<ChartType>(chartType);
  const marketFeedRef = useRef<MarketDataFeed | null>(null);
  const aggregatorRef = useRef<CandleAggregator | null>(null);
  const indicatorRefreshTimerRef = useRef<number | null>(null);
  const indicatorCandlesRef = useRef<OHLCCandle[]>([]);
  const indicatorDataMap = useRef<Record<string, { time: number; value: number }[]>>({});
  const globalThemeRef = useRef(globalTheme);

  const { activeTool, setActiveTool, setDrawings } = useDrawings();

  const overlayIndicators = useMemo(
    () => activeIndicators.filter((indicator) => indicator.visible && isOverlayIndicator(indicator)),
    [activeIndicators],
  );
  const oscillatorIndicators = useMemo(
    () => activeIndicators.filter((indicator) => indicator.visible && isOscillatorIndicator(indicator)),
    [activeIndicators],
  );

  const hasActiveAssetTrade = useMemo(
    () => activeTrades.some((trade) => trade.asset_symbol === asset.symbol),
    [activeTrades, asset.symbol],
  );

  const removeOverlaySeries = useCallback((instanceId: string) => {
    const chart = chartRef.current;
    const handle = overlaySeriesRef.current[instanceId];

    if (!chart || !handle) return;

    Object.values(handle).forEach((series) => {
      if (series) {
        chart.removeSeries(series);
      }
    });

    delete overlaySeriesRef.current[instanceId];
  }, []);

  const getIndicatorCandles = useCallback(() => {
    const merged = liveRef.current
      ? [...historyRef.current, liveRef.current].slice(-MAX_CANDLES_IN_MEMORY)
      : historyRef.current.slice(-MAX_CANDLES_IN_MEMORY);

    return merged;
  }, []);

  const applyMainSeriesData = useCallback((candles: OHLCCandle[]) => {
    if (!mainSeriesRef.current) return;

    const source = chartTypeRef.current === "heikinAshi" ? calcHeikinAshi(candles) : candles;

    if (chartTypeRef.current === "line") {
      mainSeriesRef.current.setData(toLineChartData(source));
      return;
    }

    mainSeriesRef.current.setData(toOhlcChartData(source));
  }, []);

  const updateMainSeries = useCallback((candle: OHLCCandle) => {
    if (!mainSeriesRef.current) return;

    if (chartTypeRef.current === "line") {
      mainSeriesRef.current.update({
        time: toChartTime(candle.time),
        value: candle.close,
      });
      return;
    }

    if (chartTypeRef.current === "heikinAshi") {
      const source = calcHeikinAshi([...historyRef.current, candle]);
      const last = source[source.length - 1];
      if (!last) return;

      mainSeriesRef.current.update({
        time: toChartTime(last.time),
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close,
      });
      return;
    }

    mainSeriesRef.current.update({
      time: toChartTime(candle.time),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    });
  }, []);

  const reconcileOverlaySeries = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const activeIds = new Set(overlayIndicators.map((indicator) => indicator.instanceId));

    Object.keys(overlaySeriesRef.current).forEach((instanceId) => {
      if (!activeIds.has(instanceId)) {
        removeOverlaySeries(instanceId);
      }
    });

    overlayIndicators.forEach((indicator) => {
      if (overlaySeriesRef.current[indicator.instanceId]) {
        return;
      }

      if (indicator.key === "sma" || indicator.key === "ema") {
        overlaySeriesRef.current[indicator.instanceId] = {
          primary: chart.addSeries(LineSeries, {
            color: typeof indicator.params.color === "string" ? indicator.params.color : "#ffffff",
            lineWidth: Math.max(1, Math.min(4, normalizeNumber(indicator.params.lineWidth, 2))),
            priceLineVisible: false,
            lastValueVisible: false,
          }),
        };
      }

      if (indicator.key === "bb") {
        overlaySeriesRef.current[indicator.instanceId] = {
          middle: chart.addSeries(LineSeries, {
            color: typeof indicator.params.middleColor === "string" ? indicator.params.middleColor : "#d1d5db",
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
          }),
          upper: chart.addSeries(LineSeries, {
            color: typeof indicator.params.upperColor === "string" ? indicator.params.upperColor : "#34d399",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: false,
          }),
          lower: chart.addSeries(LineSeries, {
            color: typeof indicator.params.lowerColor === "string" ? indicator.params.lowerColor : "#f87171",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: false,
          }),
        };
      }
    });
  }, [overlayIndicators, removeOverlaySeries]);

  const syncOverlayIndicatorData = useCallback(
    (candles: OHLCCandle[]) => {
      indicatorDataMap.current = {};

      overlayIndicators.forEach((indicator) => {
        const seriesHandle = overlaySeriesRef.current[indicator.instanceId];
        if (!seriesHandle) return;

        if (indicator.key === "sma" && seriesHandle.primary) {
          const data = calculateSma(candles, indicator.params.period);
          seriesHandle.primary.applyOptions({
            color: typeof indicator.params.color === "string" ? indicator.params.color : "#facc15",
            lineWidth: Math.max(1, Math.min(4, normalizeNumber(indicator.params.lineWidth, 2))),
          });
          seriesHandle.primary.setData(data.map((point) => ({ time: toChartTime(point.time), value: point.value })));
          indicatorDataMap.current[indicator.instanceId] = data;
        }

        if (indicator.key === "ema" && seriesHandle.primary) {
          const data = calculateEma(candles, indicator.params.period);
          seriesHandle.primary.applyOptions({
            color: typeof indicator.params.color === "string" ? indicator.params.color : "#22d3ee",
            lineWidth: Math.max(1, Math.min(4, normalizeNumber(indicator.params.lineWidth, 2))),
          });
          seriesHandle.primary.setData(data.map((point) => ({ time: toChartTime(point.time), value: point.value })));
          indicatorDataMap.current[indicator.instanceId] = data;
        }

        if (indicator.key === "bb" && seriesHandle.upper && seriesHandle.middle && seriesHandle.lower) {
          const data = calculateBollingerBands(candles, indicator.params.period, indicator.params.stdDev);

          seriesHandle.middle.applyOptions({
            color: typeof indicator.params.middleColor === "string" ? indicator.params.middleColor : "#d1d5db",
            lineWidth: 2,
          });
          seriesHandle.upper.applyOptions({
            color: typeof indicator.params.upperColor === "string" ? indicator.params.upperColor : "#34d399",
          });
          seriesHandle.lower.applyOptions({
            color: typeof indicator.params.lowerColor === "string" ? indicator.params.lowerColor : "#f87171",
          });

          seriesHandle.middle.setData(
            data.middle.map((point) => ({ time: toChartTime(point.time), value: point.value })),
          );
          seriesHandle.upper.setData(
            data.upper.map((point) => ({ time: toChartTime(point.time), value: point.value })),
          );
          seriesHandle.lower.setData(
            data.lower.map((point) => ({ time: toChartTime(point.time), value: point.value })),
          );

          indicatorDataMap.current[indicator.instanceId] = data.middle;
          indicatorDataMap.current[`${indicator.instanceId}-upper`] = data.upper;
          indicatorDataMap.current[`${indicator.instanceId}-lower`] = data.lower;
        }
      });
    },
    [overlayIndicators],
  );

  const refreshIndicators = useCallback(
    (forceOscillatorRefresh = false) => {
      if (!chartRef.current) return;

      const candles = getIndicatorCandles();
      indicatorCandlesRef.current = candles;

      reconcileOverlaySeries();
      syncOverlayIndicatorData(candles);

      if (forceOscillatorRefresh) {
        setOscillatorRenderKey((current) => current + 1);
      }
    },
    [getIndicatorCandles, reconcileOverlaySeries, syncOverlayIndicatorData],
  );

  useEffect(() => {
    onPriceUpdateRef.current = onPriceUpdate;
  }, [onPriceUpdate]);

  useEffect(() => {
    chartTypeRef.current = chartType;
  }, [chartType]);

  useEffect(() => {
    globalThemeRef.current = globalTheme;

    if (!chartRef.current) return;

    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: globalTheme.bg },
      },
    });

    if (!mainSeriesRef.current) return;

    if (chartTypeRef.current === "bars") {
      mainSeriesRef.current.applyOptions({
        upColor: globalTheme.up,
        downColor: globalTheme.down,
      } as never);
      return;
    }

    if (chartTypeRef.current !== "line") {
      mainSeriesRef.current.applyOptions({
        upColor: globalTheme.up,
        downColor: globalTheme.down,
        borderUpColor: globalTheme.up,
        borderDownColor: globalTheme.down,
        wickUpColor: globalTheme.up,
        wickDownColor: globalTheme.down,
      } as never);
    }
  }, [globalTheme]);

  useEffect(() => {
    const fetchTheme = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("chart_bg_color, chart_up_color, chart_down_color")
        .limit(1)
        .maybeSingle();

      if (!data) return;

      const payload = data as PlatformThemeRow;

      setGlobalTheme({
        bg: payload.chart_bg_color || "#0E1217",
        up: payload.chart_up_color || "#00C076",
        down: payload.chart_down_color || "#F6465D",
      });
    };

    void fetchTheme();
  }, []);

  useEffect(() => {
    const handleDropdown = (event: Event) => {
      const customEvent = event as CustomEvent<{ open?: boolean }>;
      setHideMobileQuickActions(Boolean(customEvent.detail?.open));

      if (customEvent.detail?.open) {
        setMobileToolsOpen(false);
        setActiveMobileMenu(null);
      }
    };

    window.addEventListener("mobile_account_dropdown", handleDropdown as EventListener);
    return () => window.removeEventListener("mobile_account_dropdown", handleDropdown as EventListener);
  }, []);

  useEffect(() => {
    if (!mainRef.current) return;

    let chart: IChartApi;

    try {
      chart = createChart(mainRef.current, {
        width: mainRef.current.clientWidth,
        height: mainRef.current.clientHeight,
        layout: {
          background: { type: ColorType.Solid, color: globalThemeRef.current.bg },
          textColor: "#d9e2ef",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 12,
        },
        grid: {
          vertLines: { color: "rgba(82, 96, 114, 0.22)" },
          horzLines: { color: "rgba(82, 96, 114, 0.22)" },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: "rgba(255,255,255,0.16)",
            width: 1,
            style: LineStyle.Dashed,
          },
          horzLine: {
            color: "rgba(255,255,255,0.16)",
            width: 1,
            style: LineStyle.Dashed,
          },
        },
        rightPriceScale: {
          borderColor: "rgba(82, 96, 114, 0.4)",
          scaleMargins: { top: 0.08, bottom: 0.08 },
          entireTextOnly: true,
        },
        timeScale: {
          borderColor: "rgba(82, 96, 114, 0.4)",
          timeVisible: true,
          secondsVisible: true,
          rightOffset: 6,
          barSpacing: BAR_SPACING_MAP["1m"] ?? 7,
          minBarSpacing: 3,
        },
      });
      setChartError(null);
    } catch (error) {
      setChartError(error instanceof Error ? error.message : String(error));
      return;
    }

    chartRef.current = chart;
    setSyncChart(chart);

    const resizeObserver = new ResizeObserver(() => {
      if (!mainRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: mainRef.current.clientWidth,
        height: mainRef.current.clientHeight,
      });
    });

    resizeObserver.observe(mainRef.current);

    return () => {
      resizeObserver.disconnect();

      Object.keys(overlaySeriesRef.current).forEach((instanceId) => {
        removeOverlaySeries(instanceId);
      });

      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      setSyncChart(null);
      setSyncSeries(null);
    };
  }, [removeOverlaySeries]);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    const referencePrice =
      typeof asset.basePrice === "number" && Number.isFinite(asset.basePrice) && asset.basePrice > 0
        ? asset.basePrice
        : Math.max(asset.price, 0.000001);
    const priceFormat = getSeriesPriceFormat(referencePrice);

    if (mainSeriesRef.current) {
      chart.removeSeries(mainSeriesRef.current);
      mainSeriesRef.current = null;
    }

    if (chartType === "line") {
      mainSeriesRef.current = chart.addSeries(LineSeries, {
        color: "#60a5fa",
        lineWidth: 2,
        priceFormat,
      });
    } else if (chartType === "bars") {
      mainSeriesRef.current = chart.addSeries(BarSeries, {
        upColor: globalThemeRef.current.up,
        downColor: globalThemeRef.current.down,
        priceFormat,
      });
    } else {
      mainSeriesRef.current = chart.addSeries(CandlestickSeries, {
        upColor: globalThemeRef.current.up,
        downColor: globalThemeRef.current.down,
        borderUpColor: globalThemeRef.current.up,
        borderDownColor: globalThemeRef.current.down,
        wickUpColor: globalThemeRef.current.up,
        wickDownColor: globalThemeRef.current.down,
        priceFormat,
      });
    }

    setSyncSeries(mainSeriesRef.current);

    if (historyRef.current.length > 0) {
      applyMainSeriesData(historyRef.current);
      refreshIndicators(true);
    }
  }, [applyMainSeriesData, asset.basePrice, asset.price, chartType, refreshIndicators]);

  useEffect(() => {
    const tf = TIMEFRAMES[selectedTf];
    if (!tf || !mainSeriesRef.current || !chartRef.current) return;

    marketFeedRef.current?.disconnect();
    marketFeedRef.current = null;

    if (indicatorRefreshTimerRef.current !== null) {
      window.clearInterval(indicatorRefreshTimerRef.current);
      indicatorRefreshTimerRef.current = null;
    }

    if (aggregatorRef.current) {
      aggregatorRef.current.destroy();
      aggregatorRef.current = null;
    }

    const nowSec = Date.now() / 1000;
    const basePrice =
      typeof asset.basePrice === "number" && Number.isFinite(asset.basePrice) && asset.basePrice > 0
        ? asset.basePrice
        : Math.max(asset.price, 0.000001);

    const engine = new OTCPriceEngine(asset.symbol, basePrice, asset.type);
    const history = engine.generateHistory(tf, nowSec);
    historyRef.current = history;

    applyMainSeriesData(history);

    const seedCandle = engine.generateLiveCandle(tf, nowSec);
    liveRef.current = seedCandle;
    updateMainSeries(seedCandle);

    setCurrentPrice(seedCandle.close);
    setPriceChange(((seedCandle.close - seedCandle.open) / Math.max(seedCandle.open, 0.000001)) * 100);
    onPriceUpdateRef.current?.(seedCandle.close, seedCandle.time);

    chartRef.current.timeScale().applyOptions({
      barSpacing: BAR_SPACING_MAP[selectedTf] ?? 6,
      minBarSpacing: 3,
      rightOffset: 6,
      secondsVisible: tf.seconds < 60,
      tickMarkFormatter: (time) => formatTimeScaleTick(time as number, tf.seconds),
    });

    const from = Math.max(0, history.length - DEFAULT_VISIBLE_BARS);
    chartRef.current.timeScale().setVisibleLogicalRange({
      from,
      to: history.length + 6,
    });

    refreshIndicators(true);

    const handleCandleClose = (closedCandle: OHLCCandle) => {
      historyRef.current = [...historyRef.current, closedCandle].slice(-MAX_CANDLES_IN_MEMORY);
      refreshIndicators(true);
    };

    const openAnchor = seedCandle.open;

    const handleCandleUpdate = (candle: OHLCCandle) => {
      liveRef.current = candle;
      updateMainSeries(candle);
      setCurrentPrice(candle.close);
      setPriceChange(((candle.close - openAnchor) / Math.max(openAnchor, 0.000001)) * 100);
      onPriceUpdateRef.current?.(candle.close, candle.time);
    };

    aggregatorRef.current = new CandleAggregator(tf.seconds, handleCandleClose, handleCandleUpdate);
    aggregatorRef.current.setSeedCandle(seedCandle, nowSec);

    const websocketUrl = import.meta.env.VITE_MARKET_DATA_WS_URL;

    marketFeedRef.current = createMarketDataFeed({
      websocketUrl,
      subscription: {
        symbol: asset.symbol,
        basePrice,
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

    indicatorRefreshTimerRef.current = window.setInterval(() => {
      refreshIndicators(true);
    }, 1200);

    return () => {
      marketFeedRef.current?.disconnect();
      marketFeedRef.current = null;

      if (indicatorRefreshTimerRef.current !== null) {
        window.clearInterval(indicatorRefreshTimerRef.current);
        indicatorRefreshTimerRef.current = null;
      }

      if (aggregatorRef.current) {
        aggregatorRef.current.destroy();
        aggregatorRef.current = null;
      }
    };
  }, [applyMainSeriesData, asset.basePrice, asset.price, asset.symbol, asset.type, refreshIndicators, selectedTf, updateMainSeries]);

  useEffect(() => {
    reconcileOverlaySeries();
    refreshIndicators(true);
  }, [activeIndicators, reconcileOverlaySeries, refreshIndicators]);

  useEffect(() => {
    if (!mobileHistoryOpen) return;

    setMobileToolsOpen(false);
    setActiveMobileMenu(null);
  }, [mobileHistoryOpen]);

  const handleAddIndicator = useCallback((key: IndicatorKey) => {
    setActiveIndicators((current) => [...current, createIndicator(key)]);
  }, []);

  const handleRemoveIndicator = useCallback(
    (instanceId: string) => {
      removeOverlaySeries(instanceId);
      setActiveIndicators((current) => current.filter((indicator) => indicator.instanceId !== instanceId));
      onRemoveIndicator?.(instanceId);
    },
    [onRemoveIndicator, removeOverlaySeries],
  );

  const handleToggleIndicatorVisibility = useCallback((instanceId: string) => {
    setActiveIndicators((current) =>
      current.map((indicator) =>
        indicator.instanceId === instanceId
          ? {
              ...indicator,
              visible: !indicator.visible,
            }
          : indicator,
      ),
    );
  }, []);

  const handleUpdateIndicatorParam = useCallback(
    (instanceId: string, paramKey: string, value: number | string | boolean) => {
      setActiveIndicators((current) =>
        current.map((indicator) => {
          if (indicator.instanceId !== instanceId) return indicator;

          return {
            ...indicator,
            params: {
              ...indicator.params,
              [paramKey]: value,
            },
          };
        }),
      );
    },
    [],
  );

  const dec = getPricePrecision(currentPrice);
  const isUp = priceChange >= 0;

  if (chartError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6" style={{ background: "#0E1217" }}>
        <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-[#141b24] p-5">
          <h2 className="text-lg font-semibold text-white">Chart failed to render</h2>
          <p className="mt-2 text-sm text-slate-300">The trading chart hit a runtime error.</p>
          <pre className="mt-4 overflow-auto rounded-lg bg-black/30 p-4 text-xs text-red-300 whitespace-pre-wrap">
            {chartError}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col" style={{ background: globalTheme.bg }}>
      <div className="hidden sm:block">
        <ChartToolbar
          selectedTf={selectedTf}
          onSelectTf={setSelectedTf}
          chartType={chartType}
          onSelectChartType={setChartType}
          activeInds={activeIndicators.map((indicator) => indicator.key)}
          onToggleInd={() => {}}
          activeDrawTool={activeTool}
          onSelectDrawTool={(tool) => {
            if (tool === "clear") {
              setDrawings([]);
              setActiveTool(null);
              return;
            }

            setActiveTool(tool);
          }}
          onToggleIndicatorsPanel={() => setShowIndicatorsPanel((current) => !current)}
          onToggleDrawingsPanel={() => onToggleDrawingsPanel?.()}
        />
      </div>

      {!mobileHistoryOpen && !hideMobileQuickActions && (
        <>
          <div className="absolute left-3 top-3 z-[55] sm:hidden">
            <div className="relative flex flex-col items-start gap-3">
              <button
                type="button"
                onClick={() => {
                  setMobileToolsOpen((current) => {
                    const next = !current;
                    if (!next) setActiveMobileMenu(null);
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
                    <div className="absolute left-[54px] top-0 w-[228px] overflow-hidden rounded-[10px] border border-white/10 bg-[#4f566f]/95 p-2 shadow-2xl backdrop-blur-sm">
                      <div className="grid grid-cols-3 gap-2 p-1">
                        {SUPPORTED_CHART_TIMEFRAMES.map((tf) => (
                          <button
                            key={tf}
                            onClick={() => {
                              setSelectedTf(tf);
                              setActiveMobileMenu(null);
                            }}
                            className={`rounded-[8px] px-2 py-2 text-center text-[13px] font-bold transition-colors ${
                              selectedTf === tf ? "bg-white/12 text-white" : "text-white/90 hover:bg-white/8"
                            }`}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeMobileMenu === "type" && (
                    <div className="absolute left-[54px] top-0 w-[220px] overflow-hidden rounded-[10px] border border-white/10 bg-[#4f566f]/95 p-2 shadow-2xl backdrop-blur-sm">
                      <div className="grid gap-2 p-1">
                        {[
                          { id: "line" as const, label: "Line", icon: <Compass className="h-4 w-4" /> },
                          { id: "candles" as const, label: "Candles", icon: <CandleIcon className="h-4 w-4" /> },
                          { id: "bars" as const, label: "Bars", icon: <CandleIcon className="h-4 w-4" /> },
                          { id: "heikinAshi" as const, label: "Heikin Ashi", icon: <CandleIcon className="h-4 w-4" /> },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setChartType(item.id);
                              setActiveMobileMenu(null);
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
                      setActiveMobileMenu(null);
                      onToggleDrawingsPanel?.();
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
                    onClick={() => setActiveMobileMenu((current) => (current === "time" ? null : "time"))}
                    className={`mx-1 flex h-10 min-w-[42px] items-center justify-center rounded-[6px] border px-2 py-1.5 text-[17px] font-black transition-colors shadow-[0_8px_18px_rgba(0,0,0,0.24)] ${
                      activeMobileMenu === "time"
                        ? "border-white/18 bg-[#3a4358] text-[#18d87d]"
                        : "border-white/6 bg-[#2a3142]/95 text-[#18d87d] hover:bg-[#30394d]"
                    }`}
                  >
                    {selectedTf}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveMobileMenu((current) => (current === "type" ? null : "type"))}
                    className={`flex h-10 w-10 items-center justify-center rounded-[6px] border shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition-colors ${
                      activeMobileMenu === "type"
                        ? "border-white/18 bg-white text-[#212634]"
                        : "border-white/6 bg-[#2a3142]/95 text-white hover:bg-[#30394d]"
                    }`}
                  >
                    <CandleIcon className="h-[18px] w-[18px]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveMobileMenu(null);
                      setShowIndicatorsPanel((current) => !current);
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
                  setActiveMobileMenu(null);
                  setMobileToolsOpen(false);
                  onToggleMobileHistory?.();
                }}
                className="relative flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/6 bg-[#2a3142]/95 text-white shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition-colors hover:bg-[#30394d]"
              >
                <Briefcase className="h-5 w-5 text-white" />
                <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-[2.5px] border-[#1c1f2d] bg-[#2962ff] text-[10px] font-black text-white">
                  {activeTrades.length}
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {showIndicatorsPanel && (
        <IndicatorsPanel
          indicators={activeIndicators}
          onAddIndicator={handleAddIndicator}
          onRemoveIndicator={handleRemoveIndicator}
          onToggleVisibility={handleToggleIndicatorVisibility}
          onUpdateParam={handleUpdateIndicatorParam}
          onClose={() => setShowIndicatorsPanel(false)}
        />
      )}

      <div className="absolute left-1/2 top-4 z-40 hidden -translate-x-1/2 rounded-xl border border-[#1f2c3d] bg-[#11161d]/95 px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:flex">
        <div className="flex items-center gap-3">
          <span className="text-[20px] font-black tracking-tight text-white">{currentPrice.toFixed(dec)}</span>
          <span className={`text-xs font-bold ${isUp ? "text-[#00c076]" : "text-[#ff4d6d]"}`}>
            {isUp ? "▲" : "▼"} {Math.abs(priceChange).toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[50%]" ref={mainRef}>
        {syncChart && syncSeries ? (
          <>
            {!mobileHistoryOpen && <TradeSettlementOverlay />}
            {!mobileHistoryOpen && (
              <DrawingOverlay
                chart={syncChart}
                series={syncSeries}
                activeIndicators={activeIndicators}
                indicatorDataMap={indicatorDataMap}
              />
            )}
            {!mobileHistoryOpen && !hasActiveAssetTrade && (
              <LiveChartBeacon
                chart={syncChart}
                series={syncSeries}
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
          </>
        ) : null}
      </div>

      <div className={`pointer-events-none absolute left-4 top-[5.75rem] z-40 flex flex-col gap-1 ${mobileHistoryOpen ? "hidden" : ""}`}>
        {overlayIndicators.map((indicator) => (
          <div
            key={indicator.instanceId}
            className="pointer-events-auto group flex items-center gap-2 rounded bg-black/50 px-2 py-1 transition-colors hover:bg-black/80"
          >
            <span className="text-[11px] font-semibold text-white">{indicator.name}</span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleRemoveIndicator(indicator.instanceId);
              }}
              className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/80 text-white transition-all hover:bg-red-500 md:opacity-0 md:group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {oscillatorIndicators.map((indicator) => (
        <OscillatorPane
          key={indicator.instanceId}
          indicator={indicator}
          candlesRef={indicatorCandlesRef}
          renderKey={oscillatorRenderKey}
          syncMainChart={syncChart}
          onRemove={() => handleRemoveIndicator(indicator.instanceId)}
        />
      ))}
    </div>
  );
};

export default TradingChart;
