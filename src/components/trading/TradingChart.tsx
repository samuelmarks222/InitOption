import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  LineSeries,
  BarSeries,
  HistogramSeries
} from "lightweight-charts";
import { OTCPriceEngine, TIMEFRAMES, OHLCCandle } from "./engine/priceEngine";
import { CandleAggregator } from "./CandleAggregator";
import ChartToolbar, { ChartType, CandleIcon } from "./ChartToolbar";
import { TradeMarkersOverlay } from "./TradeMarkersOverlay";
import { LiveChartBeacon } from "./LiveChartBeacon";
import { TradeSentimentRail } from "./TradeSentimentRail";
import { TradeSettlementOverlay } from "./TradeSettlementOverlay";
import { ActiveIndicator } from "./indicators/types";
import { calculateIndicator } from "./indicators/engine";
import { INDICATOR_REGISTRY } from "./indicators/config";
import { DrawingOverlay } from "./drawings/DrawingOverlay";
import { useDrawings } from "@/contexts/DrawingContext";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, X, Activity, Compass, PenTool } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type { ActiveTrade } from "@/hooks/useTrading";

const MOBILE_TIMEFRAMES = ["5s", "10s", "15s", "30s", "1m", "2m", "3m", "5m", "10m", "15m", "30m", "1h", "4h", "1D"];

interface TradingChartProps {
  asset: { symbol: string; price: number; type?: string; change?: number; maxProfit?: number; };
  onPriceUpdate?: (price: number, markerTime?: number) => void;
  activeIndicators: ActiveIndicator[];
  activeTrades?: ActiveTrade[];
  onToggleIndicatorsPanel: () => void;
  onToggleDrawingsPanel: () => void;
  onRemoveIndicator?: (id: string) => void;
  onToggleMobileHistory?: () => void;
}

const THEME = {
  bg: "#0b1016",
  panel: "#111923",
  text: "#cfd6df",
  mutedText: "#7f8b99",
  grid: "rgba(255, 255, 255, 0.05)",
  border: "rgba(255, 255, 255, 0.08)",
  up: "#17d67a",
  down: "#ff4d6d",
  line: "#4da3ff"
};

const DEFAULT_VISIBLE_BARS = 80;
const MAX_CANDLES_IN_MEMORY = 500;
const LIVE_TICK_INTERVAL_MS = 1000 / 60;

const BAR_SPACING_MAP: Record<string, number> = {
  "5s": 8,
  "10s": 8,
  "15s": 9,
  "30s": 10,
  "1m": 11,
  "5m": 12,
  "15m": 13,
  "30m": 14,
  "1h": 15,
  "4h": 16,
  "1D": 17,
  "1W": 18,
  "1M": 19,
};

const VISIBLE_BAR_COUNT_MAP: Record<string, number> = {
  "5s": 90,
  "10s": 90,
  "15s": 85,
  "30s": 80,
  "1m": 80,
  "5m": 75,
  "15m": 70,
  "30m": 70,
  "1h": 65,
  "4h": 60,
  "1D": 55,
  "1W": 50,
  "1M": 45,
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

// Sub-component to seamlessly manage separate panes (Oscillators)
const OscillatorPane = ({
  indicator,
  historyRef,
  syncMainChart,
  renderKey,
  onRemove
}: {
  indicator: ActiveIndicator;
  historyRef: React.MutableRefObject<OHLCCandle[]>;
  syncMainChart: IChartApi | null;
  renderKey: number;
  onRemove?: () => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<Record<string, ISeriesApi<any>>>({});
  const prevParamsRef = useRef<string>("");

  // 1. Mount Chart
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: THEME.panel }, textColor: THEME.mutedText, fontSize: 10 },
      grid: { vertLines: { color: THEME.grid }, horzLines: { color: THEME.grid } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { visible: false, labelVisible: false },
        horzLine: { visible: false, labelVisible: false },
      },
      rightPriceScale: { borderColor: THEME.border, scaleMargins: { top: 0.1, bottom: 0.1 }, textColor: THEME.mutedText },
      timeScale: { borderColor: THEME.border, visible: true, timeVisible: true, secondsVisible: true },
    });
    chartRef.current = chart;

    // TimeSync
    if (syncMainChart) {
      const mainTs = syncMainChart.timeScale();
      const paneTs = chart.timeScale();
      const syncToPane = () => { try { paneTs.setVisibleLogicalRange(mainTs.getVisibleLogicalRange()!); } catch(e) {} };
      const syncToMain = () => { try { mainTs.setVisibleLogicalRange(paneTs.getVisibleLogicalRange()!); } catch(e) {} };
      mainTs.subscribeVisibleLogicalRangeChange(syncToPane);
      paneTs.subscribeVisibleLogicalRangeChange(syncToMain);
      return () => {
        mainTs.unsubscribeVisibleLogicalRangeChange(syncToPane);
        paneTs.unsubscribeVisibleLogicalRangeChange(syncToMain);
        chart.remove();
        chartRef.current = null;
      };
    }

    const obs = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current)
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth, height: 90 });
    });
    obs.observe(containerRef.current);
    return () => { obs.disconnect(); chart.remove(); chartRef.current = null; };
  }, [syncMainChart]);

  // 2. Data + Param Update — fires on indicator change OR renderKey tick
  useEffect(() => {
    if (!chartRef.current || !indicator.visible) return;
    const history = historyRef.current;
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
    }

    const outputs = calculateIndicator(indicator, history);

    outputs.forEach(out => {
      const outConf = conf.outputs.find(o => o.id === out.id);
      if (!outConf) return;

      if (!seriesRefs.current[out.id]) {
        // Resolve color: try outId-specific (e.g. macdColor, kColor), camelCase (colorUpper), generic color
        const color =
          indicator.params[`${out.id}Color`] ||
          indicator.params[`color${out.id.charAt(0).toUpperCase()}${out.id.slice(1)}`] ||
          indicator.params.color ||
          outConf.defaultColor || THEME.line;
        const lineWidth = Number(indicator.params.width || indicator.params.lineWidth || 1);
        if (outConf.type === "histogram") {
          seriesRefs.current[out.id] = chartRef.current!.addSeries(HistogramSeries, { color, priceLineVisible: false });
        } else {
          seriesRefs.current[out.id] = chartRef.current!.addSeries(LineSeries, {
            color, lineWidth: lineWidth as any, priceLineVisible: false, crosshairMarkerVisible: false
          });
        }
      }

      if (out.data.length > 0) {
        try { 
          let finalData = out.data;
          if (outConf.type === "histogram") {
            const upColor = indicator.params.histColorUp || indicator.params.upColor || THEME.up;
            const downColor = indicator.params.histColorDown || indicator.params.downColor || THEME.down;
            // For MACD or Awesome Oscillator histogram, color is positive=up, negative=down
            finalData = out.data.map((d: any) => ({ ...d, color: d.value >= 0 ? upColor : downColor }));
          }
          seriesRefs.current[out.id].setData(finalData); 
        } catch(e) {
          // Safely retry after recreating series
          try { chartRef.current!.removeSeries(seriesRefs.current[out.id]); } catch(_e) {}
          delete seriesRefs.current[out.id];
        }
      }
    });
  }, [indicator, renderKey]);

  if (!indicator.visible) return null;

  return (
    <div className="shrink-0 relative overflow-hidden" style={{ height: "115px", borderTop: `1px solid ${THEME.border}`, background: THEME.bg }}>
      <div className="absolute top-1 left-2 z-40 flex items-center justify-between w-full pr-4 pointer-events-none">
        <span className="text-[11px] font-semibold" style={{ color: indicator.params.color || THEME.text }}>
          {indicator.name}
        </span>
        {onRemove && (
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="w-5 h-5 bg-black/40 hover:bg-red-500/80 rounded flex items-center justify-center pointer-events-auto transition-colors shadow" title="Delete Indicator">
            <X className="w-3 h-3 text-white" strokeWidth={3} />
          </button>
        )}
      </div>
      <div ref={containerRef} style={{ height: "110px", width: "100%" }} />
    </div>
  );
};


const TradingChart = ({
  asset,
  onPriceUpdate,
  activeIndicators,
  activeTrades = [],
  onToggleIndicatorsPanel,
  onToggleDrawingsPanel,
  onRemoveIndicator,
  onToggleMobileHistory,
}: TradingChartProps) => {
  const mainRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);

  // Overlay Indicators Refs Map
  const overlaySeriesMap = useRef<Record<string, ISeriesApi<any>>>({});
  const indicatorDataMap = useRef<Record<string, { time: any; value: number }[]>>({});
  
  const engineRef = useRef<OTCPriceEngine | null>(null);
  const engineSymbolRef = useRef<string | null>(null);
  const historyRef = useRef<OHLCCandle[]>([]);
  const liveRef = useRef<OHLCCandle | null>(null);
  const tickTimer = useRef<number | null>(null);
  const tickClockRef = useRef<{ epochOffsetMs: number; nextTickAtMs: number; startPrice: number } | null>(null);
  const aggregatorRef = useRef<CandleAggregator | null>(null);
  // Always-fresh ref for activeIndicators so stale closures see latest value
  const activeIndicatorsRef = useRef<ActiveIndicator[]>(activeIndicators);

  const separateIndicators = activeIndicators.filter(i => {
    const conf = INDICATOR_REGISTRY.find(c => c.id === i.configId);
    return conf && conf.pane === "separate";
  });
  const mainChartIndicators = activeIndicators.filter(i => {
    const conf = INDICATOR_REGISTRY.find(c => c.id === i.configId);
    return conf && conf.pane === "overlay";
  });
  const closeTimer = useRef<number | null>(null);
  const indicatorRefreshTimer = useRef<number | null>(null); // dedicated indicator refresh
  const [selectedTf, setSelectedTf] = useState("1m");
  const [currentPrice, setCurrentPrice] = useState(asset.price);
  const [priceChange, setPriceChange] = useState(asset.change || 0);
  const [chartType, setChartType] = useState<ChartType>("candles");
  const [showMobileTfMenu, setShowMobileTfMenu] = useState(true);
  const [activeMobileMenu, setActiveMobileMenu] = useState<"time" | "type" | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [hideMobileQuickActions, setHideMobileQuickActions] = useState(false);
  const [globalTheme, setGlobalTheme] = useState({
    bg: '#0E1217',
    up: '#00C076',
    down: '#F6465D'
  });
  const globalThemeRef = useRef(globalTheme);
  
  const { activeTool, setActiveTool, setDrawings } = useDrawings();

  // Propagate refs down for child mounts logic
  const [syncChart, setSyncChart] = useState<IChartApi | null>(null);
  const [syncSeries, setSyncSeries] = useState<ISeriesApi<any> | null>(null);
  // Force react render when history strictly ticks candles for Oscillators
  const [forceOscillatorRender, setForceOscillatorRender] = useState(0);

  const getDecimals = (p: number) => p > 10000 ? 2 : p > 100 ? 3 : p > 1 ? 5 : 6;

  // ─── FETCH THEME GLOBALS ──────────────────────────────────────────
  useEffect(() => {
    async function fetchTheme() {
      const { data } = await supabase.from('platform_settings').select('chart_bg_color, chart_up_color, chart_down_color').limit(1).maybeSingle();
      if (data) {
        const payload = data as any;
        const newTheme = {
          bg: payload.chart_bg_color || '#0E1217',
          up: payload.chart_up_color || '#00C076',
          down: payload.chart_down_color || '#F6465D'
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
      setShowMobileTfMenu(!customEvent.detail?.open);
      if (customEvent.detail?.open) setActiveMobileMenu(null);
    };

    window.addEventListener("mobile_account_dropdown", handleDropdown as EventListener);
    return () => window.removeEventListener("mobile_account_dropdown", handleDropdown as EventListener);
  }, []);

  useEffect(() => {
    globalThemeRef.current = globalTheme;
    if (!chartRef.current) return;
    
    // Apply background colors reactively
    chartRef.current.applyOptions({
      layout: { background: { type: ColorType.Solid, color: globalTheme.bg } }
    });
    
    // Apply candle series colors reactively
    if (mainSeriesRef.current) {
        if (chartTypeRef.current === "bars") {
            mainSeriesRef.current.applyOptions({ upColor: globalTheme.up, downColor: globalTheme.down });
        } else if (chartTypeRef.current !== "line") {
            mainSeriesRef.current.applyOptions({
              upColor: globalTheme.up,
              downColor: globalTheme.down,
              borderUpColor: globalTheme.up,
              borderDownColor: globalTheme.down,
              wickUpColor: globalTheme.up,
              wickDownColor: globalTheme.down,
            });
        }
    }
  }, [globalTheme]);

  // ─── INIT MASTER CHART ───────────────────────────────────────────
  useEffect(() => {
    if (!mainRef.current) return;
    let chart: IChartApi;
    try {
      chart = createChart(mainRef.current, {
        width: mainRef.current.clientWidth,
        height: mainRef.current.clientHeight,
        layout: { 
          background: { type: ColorType.Solid, color: '#0E1217' }, 
          textColor: '#FFFFFF', 
          fontFamily: "'Roboto', sans-serif", 
          fontSize: 12 
        },
        grid: { 
          vertLines: { color: '#2A2F36' }, 
          horzLines: { color: '#2A2F36' } 
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { visible: false, labelVisible: false },
          horzLine: { visible: false, labelVisible: false },
        },
        rightPriceScale: { 
          borderColor: '#2A2F36', 
          scaleMargins: { top: 0.1, bottom: 0.1 },
          entireTextOnly: true,
          ticksVisible: true,
          borderVisible: true,
        },
        timeScale: { 
          borderColor: '#2A2F36', 
          timeVisible: true, 
          secondsVisible: false,
          tickMarkFormatter: (time: number) => {
            const date = new Date(time * 1000);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          },
          rightOffset: 6,
          barSpacing: BAR_SPACING_MAP["1m"],
          minBarSpacing: 6,
          fixLeftEdge: true,
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

    const obs = new ResizeObserver(() => {
      if (mainRef.current && chartRef.current) chartRef.current.applyOptions({ width: mainRef.current.clientWidth, height: mainRef.current.clientHeight });
    });
    obs.observe(mainRef.current);

    return () => {
      obs.disconnect();
      chart.remove();
    };
  }, []);

  const chartTypeRef = useRef(chartType);

  useEffect(() => {
    chartTypeRef.current = chartType;
    if (!chartRef.current) return;

    try {
      if (mainSeriesRef.current) {
        chartRef.current.removeSeries(mainSeriesRef.current);
        mainSeriesRef.current = null;
      }

      if (chartType === "line") {
        mainSeriesRef.current = chartRef.current.addSeries(LineSeries, { color: THEME.line, lineWidth: 2 });
      } else if (chartType === "bars") {
        mainSeriesRef.current = chartRef.current.addSeries(BarSeries, {
          upColor: globalThemeRef.current.up,
          downColor: globalThemeRef.current.down,
        });
      } else {
        mainSeriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
          upColor: globalThemeRef.current.up,
          downColor: globalThemeRef.current.down,
          borderUpColor: globalThemeRef.current.up,
          borderDownColor: globalThemeRef.current.down,
          wickUpColor: globalThemeRef.current.up,
          wickDownColor: globalThemeRef.current.down,
          priceFormat: {
            type: 'price',
            precision: 5,
            minMove: 0.00001,
          },
        });
      }
      setChartError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Trading chart series init failed:", error);
      setChartError(message);
      return;
    }
    
    setSyncSeries(mainSeriesRef.current);

    if (historyRef.current.length > 0 && mainSeriesRef.current) {
        const histToUse = chartType === "heikinAshi" ? calcHeikinAshi(historyRef.current) : historyRef.current;
        if (chartType === "line") {
            mainSeriesRef.current.setData(histToUse.map(c => ({ time: c.time as any, value: c.close })));
        } else {
            mainSeriesRef.current.setData(histToUse.map(c => ({ time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close })));
        }
    }
  }, [chartType]);

  // ─── ENGINE & CALCULATION LOOP ──────────────────────────────────────────────
  // Track previous indicator params to detect changes
  const prevIndicatorParamsRef = useRef<Record<string, string>>({});

  // Keep activeIndicatorsRef in sync on every render
  activeIndicatorsRef.current = activeIndicators;

  const renderOverlayIndicators = (hist: OHLCCandle[]) => {
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
          if (!overlaySeriesMap.current[mapKey]) {
            // Resolve color: try outId-specific param, then generic "color" param, then config default
            const color = ind.params[`${out.id}Color`] || 
                          ind.params[`color${out.id.charAt(0).toUpperCase()}${out.id.slice(1)}`] ||
                          ind.params.color ||
                          outConf?.defaultColor || THEME.line;
            const lineWidth = Number(ind.params.width || ind.params.lineWidth || 1);
            
            if (outConf?.type === "histogram") {
               overlaySeriesMap.current[mapKey] = chartRef.current!.addSeries(HistogramSeries, { color, priceLineVisible: false });
            } else {
               overlaySeriesMap.current[mapKey] = chartRef.current!.addSeries(LineSeries, { color, lineWidth: lineWidth as any, priceLineVisible: false, crosshairMarkerVisible: false });
            }
          }
          if (out.data.length > 0) {
            try {
              let finalData = out.data;
              if (outConf?.type === "histogram") {
                const upColor = ind.params.histColorUp || ind.params.upColor || THEME.up;
                const downColor = ind.params.histColorDown || ind.params.downColor || THEME.down;
                finalData = out.data.map((d: any) => ({ ...d, color: d.value >= 0 ? upColor : downColor }));
              }
              overlaySeriesMap.current[mapKey].setData(finalData);
              // Store raw data for background fills
              indicatorDataMap.current[mapKey] = out.data;
            } catch (e) {
              console.warn("Failed setting data for", ind.name, e);
            }
          }
        });
      } catch (e) {
        console.warn("Failed to render overlay indicator", ind.name, e);
      }
    });
  };

  useEffect(() => {
    const tf = TIMEFRAMES[selectedTf];
    if (!tf || !mainSeriesRef.current || !chartRef.current) return;

    if (tickTimer.current !== null) window.cancelAnimationFrame(tickTimer.current);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);

    const seedPrice =
      engineSymbolRef.current === asset.symbol && engineRef.current
        ? engineRef.current.getCurrentPrice()
        : asset.price;
    const engine = new OTCPriceEngine(asset.symbol, seedPrice);
    engineRef.current = engine;
    engineSymbolRef.current = asset.symbol;

    const history = engine.generateHistory(tf);
    historyRef.current = history;

    const histToUse = chartTypeRef.current === "heikinAshi" ? calcHeikinAshi(historyRef.current) : historyRef.current;
    if (chartTypeRef.current === "line") {
        mainSeriesRef.current?.setData(histToUse.map(c => ({ time: c.time as any, value: c.close })));
    } else {
        mainSeriesRef.current?.setData(histToUse.map(c => ({ time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close })));
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const step = tf.seconds;
    const periodStart = Math.floor(nowSec / step) * step;
    const liveOpen = engine.getCurrentPrice();
    const seedCandle: OHLCCandle = { time: periodStart, open: liveOpen, high: liveOpen, low: liveOpen, close: liveOpen, volume: 0 };
    liveRef.current = seedCandle;

    // Freeze trades to the visible live candle anchor shown on the chart.
    setCurrentPrice(liveOpen, seedCandle.time);
    setPriceChange(asset.change || 0);

    // Apply timeframe-appropriate bar spacing so candles look correct at each interval
    const visibleBars = VISIBLE_BAR_COUNT_MAP[selectedTf] ?? DEFAULT_VISIBLE_BARS;
    chartRef.current.timeScale().applyOptions({
      barSpacing: BAR_SPACING_MAP[selectedTf] ?? BAR_SPACING_MAP["1m"],
      minBarSpacing: 6,
      rightOffset: 6,
    });
    chartRef.current.timeScale().setVisibleLogicalRange({
      from: Math.max(0, history.length - visibleBars),
      to: history.length + 6,
    });

    renderOverlayIndicators(history);
    setForceOscillatorRender(Date.now()); // ping instances

    // ── CandleAggregator setup ─────────────────────────────────────────────
    // Destroy previous aggregator and create a new one
    if (aggregatorRef.current) aggregatorRef.current.destroy();

    // onClose: called synchronously when a period ends — push the closed candle to history
    const handleCandleClose = (closed: OHLCCandle) => {
      historyRef.current = [...historyRef.current, closed].slice(-MAX_CANDLES_IN_MEMORY);
      setForceOscillatorRender(Date.now());
    };

    // onUpdate: called via RAF — update the live candle in the chart
    const handleCandleUpdate = (candle: OHLCCandle) => {
      if (!mainSeriesRef.current) return;
      liveRef.current = candle;
      onPriceUpdate?.(candle.close, candle.time);

      let updatePayload: any;
      if (chartTypeRef.current === "heikinAshi" && historyRef.current.length > 0) {
        const hist = calcHeikinAshi(historyRef.current);
        const prev = hist[hist.length - 1];
        const haOpen  = (prev.open + prev.close) / 2;
        const haClose = (candle.open + candle.high + candle.low + candle.close) / 4;
        updatePayload  = {
          time:  candle.time as any,
          open:  haOpen,
          high:  Math.max(candle.high, haOpen, haClose),
          low:   Math.min(candle.low,  haOpen, haClose),
          close: haClose,
        };
      } else if (chartTypeRef.current === "line") {
        updatePayload = { time: candle.time as any, value: candle.close };
      } else {
        updatePayload = { time: candle.time as any, open: candle.open, high: candle.high, low: candle.low, close: candle.close };
      }

      try { mainSeriesRef.current.update(updatePayload); } catch (_) {}
    };

    aggregatorRef.current = new CandleAggregator(step, handleCandleClose, handleCandleUpdate);
    aggregatorRef.current.setSeedCandle(seedCandle);
    handleCandleUpdate(seedCandle);

    const startPrice = liveOpen;

    // ── Tick loop (drives price engine + feeds aggregator) ─────────────────
    const tickIntervalMs = Math.min(tf.updateIntervalMs, LIVE_TICK_INTERVAL_MS);
    const ticksPerCandle = Math.max(1, (tf.seconds * 1000) / tickIntervalMs);
    const perTickVol = (tf.bodyPips / Math.sqrt(ticksPerCandle)) / 5;
    tickClockRef.current = {
      epochOffsetMs: Date.now() - performance.now(),
      nextTickAtMs: performance.now(),
      startPrice,
    };

    const runTickLoop = (frameTime: number) => {
      if (!engineRef.current || !aggregatorRef.current || !tickClockRef.current) return;

      const clock = tickClockRef.current;
      let latestPrice: number | null = null;
      let guard = 0;

      while (frameTime >= clock.nextTickAtMs && guard < 8) {
        const tickTimestamp = (clock.epochOffsetMs + clock.nextTickAtMs) / 1000;
        const price = engineRef.current.tick(perTickVol);
        aggregatorRef.current.onTick({ timestamp: tickTimestamp, price });
        latestPrice = price;
        clock.nextTickAtMs += tickIntervalMs;
        guard += 1;
      }

      if (frameTime - clock.nextTickAtMs > tickIntervalMs * 8) {
        clock.nextTickAtMs = frameTime + tickIntervalMs;
      }

      if (latestPrice !== null) {
        setCurrentPrice(latestPrice, liveRef.current?.time);
        setPriceChange(((latestPrice - clock.startPrice) / clock.startPrice) * 100);
      }

      tickTimer.current = window.requestAnimationFrame(runTickLoop);
    };

    tickTimer.current = window.requestAnimationFrame(runTickLoop);

    // ── Dedicated overlay indicator refresh every 3s ────────────────────────
    if (indicatorRefreshTimer.current !== null) window.clearInterval(indicatorRefreshTimer.current);
    indicatorRefreshTimer.current = window.setInterval(() => {
      if (historyRef.current.length > 0) {
        renderOverlayIndicators(historyRef.current);
        setForceOscillatorRender(p => p + 1);
      }
    }, 3000);

    return () => {
      if (tickTimer.current !== null) window.cancelAnimationFrame(tickTimer.current);
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
      if (indicatorRefreshTimer.current !== null) window.clearInterval(indicatorRefreshTimer.current);
      tickClockRef.current = null;
      if (aggregatorRef.current) { aggregatorRef.current.destroy(); aggregatorRef.current = null; }
    };
  }, [selectedTf, asset.symbol]); 

  // Immediately re-render overlays when activeIndicators changes (add / remove / update)
  useEffect(() => {
    // Run now
    if (historyRef.current.length > 0) {
      renderOverlayIndicators(historyRef.current);
      setForceOscillatorRender(p => p + 1);
    }
    // Run again after 500ms to ensure updates propagate through React batching
    const t = window.setTimeout(() => {
      if (historyRef.current.length > 0) {
        renderOverlayIndicators(historyRef.current);
        setForceOscillatorRender(p => p + 1);
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [activeIndicators]);

  const dec = getDecimals(currentPrice);
  const isUp = priceChange >= 0;
  const showStaticPriceBadge = false;

  if (chartError) {
    return (
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: THEME.bg }}>
        <div className="w-full max-w-2xl rounded-xl p-5" style={{ background: THEME.panel, border: `1px solid ${THEME.border}` }}>
          <h2 className="text-lg font-semibold text-white">Chart failed to render</h2>
          <p className="mt-2 text-sm" style={{ color: THEME.mutedText }}>
            The page is alive, but the trading chart hit a runtime error.
          </p>
          <pre className="mt-4 overflow-auto rounded-lg bg-black/30 p-4 text-xs text-red-300 whitespace-pre-wrap">
            {chartError}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative" style={{ background: THEME.bg }}>
      {showStaticPriceBadge && (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center px-5 py-2.5 rounded-xl pointer-events-none shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
        style={{ background: "#11161d", border: "1px solid #202532" }}>
        <div className="flex items-center gap-3">
          <span className="text-white font-black text-[22px] tracking-tight leading-none">{currentPrice.toFixed(dec)}</span>
          <div className="flex flex-col items-center justify-center leading-none">
            <span className={`text-[10px] ${isUp ? "text-[#00c076]" : "text-[#ff4d6d]"}`}>
              {isUp ? "▲" : "▼"}
            </span>
            <span className={`text-[11px] font-bold mt-[2px] ${isUp ? "text-[#00c076]" : "text-[#ff4d6d]"}`}>
              {Math.abs(priceChange).toFixed(3)}%
            </span>
          </div>
        </div>
      </div>
      )}

      {/* ── MOBILE: Floating Settings / Expanded Toolbar and Briefcase overlay ── */}
      {!hideMobileQuickActions && (
      <div className="absolute left-2 top-1/2 z-[55] flex -translate-y-1/2 sm:hidden flex-col gap-5 pointer-events-auto">
        <div className="relative">
          {showMobileTfMenu && (
             <div className="flex flex-col gap-5 items-center">
                {/* Pencil / Drawings */}
                <button onClick={() => { onToggleDrawingsPanel(); }} className={`flex h-10 w-10 items-center justify-center rounded-[6px] border shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition-colors ${activeTool !== null ? "border-white/18 bg-[#3a4358] text-white" : "border-white/6 bg-[#2a3142]/95 text-white hover:bg-[#30394d]"}`}>
                  <PenTool className="h-[18px] w-[18px]" />
                </button>

                {/* Timeframe Pill */}
                <div className="relative flex justify-center w-full">
                  <button onClick={() => setActiveMobileMenu(p => p === "time" ? null : "time")} className={`mx-1 flex h-10 min-w-[42px] items-center justify-center rounded-[6px] border px-2 py-1.5 text-[18px] font-black transition-colors shadow-[0_8px_18px_rgba(0,0,0,0.24)] ${activeMobileMenu === "time" ? "border-white/18 bg-[#3a4358] text-[#18d87d]" : "border-white/6 bg-[#2a3142]/95 text-[#18d87d] hover:bg-[#30394d]"}`}>
                    {selectedTf}
                  </button>
                  {/* The Timeframe 3-column Grid Modal attached to the Timeframe button */}
                  {activeMobileMenu === "time" && (
                    <div className="absolute top-0 left-[54px] w-64 overflow-hidden rounded-xl border border-[#434d61] bg-[#2a3040] shadow-2xl" style={{ zIndex: 60 }}>
                      <div className="grid grid-cols-3 gap-2 p-3">
                        {MOBILE_TIMEFRAMES.map((tf) => (
                          <button
                            key={tf}
                            onClick={() => { setSelectedTf(tf); setActiveMobileMenu(null); }}
                            className={`py-2 rounded-md text-[13px] font-bold text-center transition-colors ${selectedTf === tf ? "bg-[#3f475a] text-white" : "text-[#7f8b99] hover:bg-[#32394c] hover:text-white"}`}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Chart Type */}
                <div className="relative flex justify-center w-full">
                  <button onClick={() => setActiveMobileMenu(p => p === "type" ? null : "type")} className={`flex h-10 w-10 items-center justify-center rounded-[6px] border shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition-colors ${activeMobileMenu === "type" ? "border-white/18 bg-[#3a4358] text-white" : "border-white/6 bg-[#2a3142]/95 text-white hover:bg-[#30394d]"}`}>
                     <CandleIcon className="h-[18px] w-[18px]" />
                  </button>
                  {activeMobileMenu === "type" && (
                    <div className="absolute top-0 left-[54px] w-48 rounded-xl border border-[#434d61] bg-[#2a3040] p-1.5 shadow-2xl" style={{ zIndex: 60 }}>
                       <button onClick={() => { setChartType("candles"); setActiveMobileMenu(null); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-[13px] font-medium transition-colors ${chartType === "candles" ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5"}`} >
                          <CandleIcon className="w-4 h-4" /> Candles
                       </button>
                       <button onClick={() => { setChartType("heikinAshi"); setActiveMobileMenu(null); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-[13px] font-medium transition-colors ${chartType === "heikinAshi" ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5"}`} >
                          <CandleIcon className="w-4 h-4 text-trading-orange" /> Heikin-Ashi
                       </button>
                       <button onClick={() => { setChartType("line"); setActiveMobileMenu(null); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-[13px] font-medium transition-colors ${chartType === "line" ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5"}`} >
                          <Activity className="w-4 h-4" /> Line
                       </button>
                    </div>
                  )}
                </div>

                {/* Indicators */}
                <button onClick={() => { onToggleIndicatorsPanel(); }} className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/6 bg-[#2a3142]/95 text-white shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition-colors hover:bg-[#30394d]">
                  <Compass className="h-[18px] w-[18px]" />
                </button>
             </div>
          )}
        </div>

        {/* The Briefcase button (for Trade History) */}
        <button 
          onClick={() => {
            if (onToggleMobileHistory) {
              onToggleMobileHistory();
            } else {
              const tradePanel = document.getElementById("tour-trade-panel");
              if (tradePanel) tradePanel.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="relative flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/6 bg-[#2a3142]/95 text-white shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition-colors hover:bg-[#30394d]"
        >
          <Briefcase className="w-5 h-5 text-white" />
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#2962ff] text-white text-[10px] font-black flex items-center justify-center rounded-full border-[2.5px] border-[#1c1f2d]">
            {/* TODO: Bind to actual active trades count if supplied, default 0 for UI parity */}
            0
          </div>
        </button>
      </div>
      )}

      <div className="hidden sm:block">
        <ChartToolbar
          selectedTf={selectedTf}
          onSelectTf={setSelectedTf}
          activeInds={[]}
          onToggleInd={() => {}}
          chartType={chartType}
          onSelectChartType={setChartType}
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

      <div className="relative flex-1 min-h-[50%]" ref={mainRef}>
        {syncChart && syncSeries && (
           <>
             <TradeSentimentRail asset={asset} />
             <TradeSettlementOverlay />
             <DrawingOverlay 
               chart={syncChart} 
               series={syncSeries} 
               activeIndicators={activeIndicators}
               indicatorDataMap={indicatorDataMap}
             />
             <LiveChartBeacon chart={syncChart} series={syncSeries} timeframeSeconds={TIMEFRAMES[selectedTf]?.seconds ?? 60} />
             <TradeMarkersOverlay chart={syncChart} series={syncSeries} assetSymbol={asset.symbol} trades={activeTrades} />
           </>
        )}
      </div>

      {/* Overlay Indicators Legend on Main Chart (So users can delete non-oscillator indicators) */}
      <div className="absolute left-4 top-[5.75rem] z-40 flex flex-col gap-1 pointer-events-none">
        {mainChartIndicators.map(ind => (
          <div key={ind.instanceId} className="flex items-center gap-2 bg-black/40 hover:bg-black/80 px-2 py-1 rounded transition-colors pointer-events-auto group">
            <span className="text-[11px] font-semibold" style={{ color: ind.params.color || THEME.text }}>
              {ind.name}
            </span>
            {onRemoveIndicator && (
               <button 
                 onClick={(e) => { e.stopPropagation(); onRemoveIndicator(ind.instanceId); }} 
                 className="md:opacity-0 md:group-hover:opacity-100 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-all ml-1 shadow-lg pointer-events-auto"
               >
                 <X className="w-3 h-3 text-white" strokeWidth={3} />
               </button>
            )}
          </div>
        ))}
      </div>

      {/* Dynamic Render of Oscillators in Independent Panes Sync'd to the Master Chart */}
      {separateIndicators.map((ind) => (
        <OscillatorPane
          key={ind.instanceId}
          indicator={ind}
          historyRef={historyRef}
          syncMainChart={syncChart}
          renderKey={forceOscillatorRender}
          onRemove={onRemoveIndicator ? () => onRemoveIndicator(ind.instanceId) : undefined}
        />
      ))}
    </div>
  );
};

export default TradingChart;
