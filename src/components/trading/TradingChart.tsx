import React from "react";
import FreshCandlestickChart from "../FreshCandlestickChart";

// Dummy data for demonstration; replace with real data source
const demoData = [
  { time: 1713000000, open: 0.8, high: 0.82, low: 0.78, close: 0.81 },
  { time: 1713000600, open: 0.81, high: 0.83, low: 0.80, close: 0.82 },
  { time: 1713001200, open: 0.82, high: 0.84, low: 0.81, close: 0.83 },
  { time: 1713001800, open: 0.83, high: 0.85, low: 0.82, close: 0.84 },
  { time: 1713002400, open: 0.84, high: 0.86, low: 0.83, close: 0.85 },
  { time: 1713003000, open: 0.85, high: 0.87, low: 0.84, close: 0.86 },
  { time: 1713003600, open: 0.86, high: 0.88, low: 0.85, close: 0.87 },
  { time: 1713004200, open: 0.87, high: 0.89, low: 0.86, close: 0.88 },
  { time: 1713004800, open: 0.88, high: 0.90, low: 0.87, close: 0.89 },
  { time: 1713005400, open: 0.89, high: 0.91, low: 0.88, close: 0.90 },
];

type TradingChartProps = {
  asset: TradeTabAsset;
  onPriceUpdate: (price: number, markerTime?: number) => void;
  activeTrades: ActiveTrade[];
  onToggleDrawingsPanel?: () => void;
  onRemoveIndicator?: (instanceId: string) => void;
  onToggleMobileHistory?: () => void;
  mobileHistoryOpen?: boolean;
};

const TradingChart: React.FC<TradingChartProps> = ({
  asset,
  onPriceUpdate,
  activeTrades,
  onToggleDrawingsPanel,
  onRemoveIndicator,
  onToggleMobileHistory,
  mobileHistoryOpen,
}) => {
  const [globalTheme, setGlobalTheme] = useState({
    bg: '#0E1217',
    up: '#00C076',
    down: '#F6465D'
  });
  const globalThemeRef = useRef(globalTheme);
  
  const { activeTool, setActiveTool, setDrawings } = useDrawings();

  // Propagate refs down for child mounts logic
  const [syncChart, setSyncChart] = useState<IChartApi | null>(null);
  const [syncSeries, setSyncSeries] = useState<ChartSeriesApi | null>(null);
  // Force react render when history strictly ticks candles for Oscillators
  const [forceOscillatorRender, setForceOscillatorRender] = useState(0);

  // ─── FETCH THEME GLOBALS ──────────────────────────────────────────
  useEffect(() => {
    async function fetchTheme() {
      const { data } = await supabase.from('platform_settings').select('chart_bg_color, chart_up_color, chart_down_color').limit(1).maybeSingle();
      if (data) {
        const payload: PlatformThemeRow = data;
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
      if (customEvent.detail?.open) {
        setActiveMobileMenu(null);
        setMobileToolsOpen(false);
      }
    };

    window.addEventListener("mobile_account_dropdown", handleDropdown as EventListener);
    return () => window.removeEventListener("mobile_account_dropdown", handleDropdown as EventListener);
  }, []);

  useEffect(() => {
    if (!mobileHistoryOpen) return;
    setActiveMobileMenu(null);
    setMobileToolsOpen(false);
  }, [mobileHistoryOpen]);

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
          secondsVisible: true,
          tickMarkFormatter: (time: number) => formatTimeScaleTick(time, TIMEFRAMES["1m"].seconds),
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
    const referencePrice =
      (typeof asset.basePrice === "number" && Number.isFinite(asset.basePrice) && asset.basePrice > 0
        ? asset.basePrice
        : asset.price) || 1;
    const priceFormat = getSeriesPriceFormat(referencePrice);

    try {
      if (mainSeriesRef.current) {
        chartRef.current.removeSeries(mainSeriesRef.current);
        mainSeriesRef.current = null;
      }

      if (chartType === "line") {
        mainSeriesRef.current = chartRef.current.addSeries(LineSeries, {
          color: THEME.line,
          lineWidth: 2,
          priceFormat,
          crosshairMarkerRadius: 3,
        });
      } else if (chartType === "bars") {
        mainSeriesRef.current = chartRef.current.addSeries(BarSeries, {
          upColor: globalThemeRef.current.up,
          downColor: globalThemeRef.current.down,
          priceFormat,
        });
      } else {
        mainSeriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
          upColor: globalThemeRef.current.up,
          downColor: globalThemeRef.current.down,
          borderUpColor: globalThemeRef.current.up,
          borderDownColor: globalThemeRef.current.down,
          wickUpColor: globalThemeRef.current.up,
          wickDownColor: globalThemeRef.current.down,
          priceFormat,
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
      mainSeriesRef.current.setData(
        chartType === "line" ? toLineChartData(histToUse) : toOhlcChartData(histToUse),
      );
    }
  }, [asset.basePrice, asset.price, chartType]);

  // ─── ENGINE & CALCULATION LOOP ──────────────────────────────────────────────
  // Track previous indicator params to detect changes
  const prevIndicatorParamsRef = useRef<Record<string, string>>({});

  // Indicators removed - indicator rendering is no longer needed

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

  useEffect(() => {
    const tf = TIMEFRAMES[selectedTf];
    if (!tf || !mainSeriesRef.current || !chartRef.current) return;
    const websocketUrl = import.meta.env.VITE_MARKET_DATA_WS_URL;

    marketFeedRef.current?.disconnect();
    marketFeedRef.current = null;
    if (indicatorRefreshTimer.current !== null) window.clearInterval(indicatorRefreshTimer.current);
    if (aggregatorRef.current) aggregatorRef.current.destroy();

    const nowSec = Date.now() / 1000;
    const engineBasePrice =
      typeof asset.basePrice === "number" && Number.isFinite(asset.basePrice) && asset.basePrice > 0
        ? asset.basePrice
        : assetSnapshotRef.current.price;
    const engine = new OTCPriceEngine(asset.symbol, engineBasePrice, asset.type);

    const history = engine.generateHistory(tf, nowSec);
    historyRef.current = history;

    const histToUse = chartTypeRef.current === "heikinAshi" ? calcHeikinAshi(historyRef.current) : historyRef.current;
    mainSeriesRef.current?.setData(
      chartTypeRef.current === "line" ? toLineChartData(histToUse) : toOhlcChartData(histToUse),
    );

    const step = tf.seconds;
    const seedCandle = engine.generateLiveCandle(tf, nowSec);
    liveRef.current = seedCandle;
    const startPrice = seedCandle.open;

    // Freeze trades to the visible live candle anchor shown on the chart.
    setCurrentPrice(seedCandle.close);
    setPriceChange(((seedCandle.close - seedCandle.open) / Math.max(seedCandle.open, 0.000001)) * 100);

    // Apply timeframe-appropriate bar spacing so candles look correct at each interval
    const visibleBars = VISIBLE_BAR_COUNT_MAP[selectedTf] ?? DEFAULT_VISIBLE_BARS;
    chartRef.current.timeScale().applyOptions({
      barSpacing: BAR_SPACING_MAP[selectedTf] ?? BAR_SPACING_MAP["1m"],
      minBarSpacing: 6,
      rightOffset: 6,
      timeVisible: true,
      secondsVisible: tf.seconds < 60,
      tickMarkFormatter: (time: number) => formatTimeScaleTick(time, tf.seconds),
    });
    const defaultFrom = Math.max(0, history.length - visibleBars);
    chartRef.current.timeScale().setVisibleLogicalRange({
      from: defaultFrom,
      to: history.length + 6,
    });

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
    const handleCandleUpdate = (candle: OHLCCandle) => {
      if (!mainSeriesRef.current) return;
      liveRef.current = candle;
      setCurrentPrice(candle.close);
      setPriceChange(((candle.close - startPrice) / Math.max(startPrice, 0.000001)) * 100);
      onPriceUpdateRef.current?.(candle.close, candle.time);

      let updatePayload: MainChartPoint;
      if (chartTypeRef.current === "heikinAshi" && historyRef.current.length > 0) {
        const hist = calcHeikinAshi(historyRef.current);
        const prev = hist[hist.length - 1];
        const haOpen  = (prev.open + prev.close) / 2;
        const haClose = (candle.open + candle.high + candle.low + candle.close) / 4;
        updatePayload  = {
          time:  toChartTime(candle.time),
          open:  haOpen,
          high:  Math.max(candle.high, haOpen, haClose),
          low:   Math.min(candle.low,  haOpen, haClose),
          close: haClose,
        };
      } else if (chartTypeRef.current === "line") {
        updatePayload = { time: toChartTime(candle.time), value: candle.close };
      } else {
        updatePayload = {
          time: toChartTime(candle.time),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        };
      }

      try { mainSeriesRef.current.update(updatePayload); } catch (_) {}
    };

    aggregatorRef.current = new CandleAggregator(step, handleCandleClose, handleCandleUpdate);
    aggregatorRef.current.setSeedCandle(seedCandle, nowSec);
    handleCandleUpdate(seedCandle);

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
    if (indicatorRefreshTimer.current !== null) window.clearInterval(indicatorRefreshTimer.current);
    indicatorRefreshTimer.current = window.setInterval(() => {
      if (historyRef.current.length > 0) {
        renderOverlayIndicators(getIndicatorHistory());
        setForceOscillatorRender((current) => current + 1);
      }
    }, 1500);

    return () => {
      marketFeedRef.current?.disconnect();
      marketFeedRef.current = null;
      if (indicatorRefreshTimer.current !== null) window.clearInterval(indicatorRefreshTimer.current);
      if (aggregatorRef.current) { aggregatorRef.current.destroy(); aggregatorRef.current = null; }
    };
  }, [asset.basePrice, asset.symbol, getIndicatorHistory, renderOverlayIndicators, selectedTf, setCurrentPrice]); 

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

  const dec = getPricePrecision(currentPrice);
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
      {!mobileHistoryOpen && !hideMobileQuickActions && (
      <>
        {mobileToolsOpen && (
          <button
            type="button"
            aria-label="Close chart tools"
            onClick={() => {
              setMobileToolsOpen(false);
              setActiveMobileMenu(null);
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
                  <div className="absolute left-[54px] top-0 w-[228px] overflow-hidden rounded-[10px] border border-white/10 bg-[#5a5f72]/95 p-2 shadow-2xl backdrop-blur-sm">
                    <div className="grid grid-cols-3 gap-2 p-1">
                      {SUPPORTED_CHART_TIMEFRAMES.map((tf) => (
                        <button
                          key={tf}
                          onClick={() => {
                            setSelectedTf(tf);
                            setActiveMobileMenu(null);
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
                  <div className="absolute left-[54px] top-0 w-[228px] overflow-hidden rounded-[10px] border border-white/10 bg-[#5a5f72]/95 p-2 shadow-2xl backdrop-blur-sm">
                    <div className="grid gap-2 p-1">
                      {[
                        { id: "line" as const, label: "Area", icon: <Activity className="w-4 h-4" /> },
                        { id: "candles" as const, label: "Candles", icon: <CandleIcon className="w-4 h-4" /> },
                        { id: "bars" as const, label: "Bars", icon: <CandleIcon className="w-4 h-4" /> },
                        { id: "heikinAshi" as const, label: "Heiken Ashi", icon: <CandleIcon className="w-4 h-4" /> },
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
                  onClick={() => setActiveMobileMenu((current) => current === "time" ? null : "time")}
                  className={`mx-1 flex h-10 min-w-[42px] items-center justify-center rounded-[6px] border px-2 py-1.5 text-[18px] font-black transition-colors shadow-[0_8px_18px_rgba(0,0,0,0.24)] ${
                    activeMobileMenu === "time"
                      ? "border-white/18 bg-[#3a4358] text-[#18d87d]"
                      : "border-white/6 bg-[#2a3142]/95 text-[#18d87d] hover:bg-[#30394d]"
                  }`}
                >
                  {selectedTf}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMobileMenu((current) => current === "type" ? null : "type")}
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
                    setActiveMobileMenu(null);
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
                setActiveMobileMenu(null);
                setMobileToolsOpen(false);
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

      <div className="hidden sm:block">
        <ChartToolbar
          selectedTf={selectedTf}
          onSelectTf={(tf) => setSelectedTf(tf)}
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
               <LiveChartBeacon chart={syncChart} series={syncSeries} timeframeSeconds={TIMEFRAMES[selectedTf]?.seconds ?? 60} />
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
        )}
      </div>

      {/* Overlay Indicators Legend on Main Chart (So users can delete non-oscillator indicators) */}
      <div className={`absolute left-4 top-[5.75rem] z-40 flex flex-col gap-1 pointer-events-none ${mobileHistoryOpen ? "hidden" : ""}`}>
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
