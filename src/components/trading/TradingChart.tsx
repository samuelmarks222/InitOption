import { useEffect, useRef, useState } from "react";
import { Briefcase, Compass, Eye, EyeOff, MoreHorizontal, PenTool, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ActiveTrade, TradeDirection } from "@/hooks/useTrading";
import { useDrawings } from "@/contexts/DrawingContext";
import { isInternalOTC, marketWebSocketUrl } from "@/lib/otcMarket";
import { createMarketDataFeed } from "./engine/marketDataFeed";
import { SUPPORTED_CHART_TIMEFRAMES, TIMEFRAMES, type SupportedChartTimeframe } from "./engine/priceEngine";
import ChartToolbar, { CandleIcon, type ChartType } from "./ChartToolbar";
import { ChartSettingsPanel } from "./ChartSettingsPanel";
import { ChartZoomControls } from "./ChartZoomControls";
import { dispatchTradeDeskDirectionSubmit } from "./tradeDeskEvents";
import { PairInfoModal } from "./PairInfoModal";
import type { ActiveIndicator } from "./indicators/types";
import { DrawingOverlay } from "./drawings/DrawingOverlay";
import { useTradingPriceChart } from "./chart-core/useTradingPriceChart";

export interface ChartSettlementAnnouncement {
  id: string; assetSymbol: string; direction: TradeDirection; amount: number; expirySeconds: number;
  profit: number; status: "won" | "lost"; entryPrice?: number; exitPrice?: number;
  markerTime?: number | null; markerLogical?: number | null; expiryTime?: number | null;
}
export interface ChartOrderAnnouncement { id: string; assetSymbol: string; direction: TradeDirection; amount: number }

interface TradingChartProps {
  asset: { symbol: string; name?: string; price: number; basePrice?: number; type?: string; change?: number; maxProfit?: number; available?: boolean };
  onPriceUpdate?: (price: number, markerTime?: number, timeframeSeconds?: number, markerLogical?: number) => void;
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
  settlementAnnouncements?: ChartSettlementAnnouncement[];
  orderAnnouncements?: ChartOrderAnnouncement[];
}

export default function TradingChart({
  asset, onPriceUpdate, activeIndicators, activeTrades = [], onToggleIndicatorsPanel,
  onToggleDrawingsPanel, onRemoveIndicator, onUpdateIndicator, onOpenIndicatorSettings,
  overlayUiSuppressed = false, onToggleMobileHistory, mobileHistoryOpen = false,
  compactPane = false, miniOverlay = false, liveEdgeRequestKey,
}: TradingChartProps) {
  const { t } = useTranslation();
  const { activeTool, setActiveTool, setDrawings } = useDrawings();
  const [selectedTf, setSelectedTf] = useState<SupportedChartTimeframe>("5s");
  const [chartType, setChartTypeState] = useState<ChartType>("candles");
  const setChartType = (type: ChartType) => setChartTypeState(type);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pairInfoOpen, setPairInfoOpen] = useState(false);
  const timeframeRef = useRef(TIMEFRAMES[selectedTf].seconds);
  timeframeRef.current = TIMEFRAMES[selectedTf].seconds;
  const callbackRef = useRef(onPriceUpdate);
  callbackRef.current = onPriceUpdate;
  const basePriceRef = useRef(asset.basePrice ?? asset.price);
  basePriceRef.current = asset.basePrice ?? asset.price;
  const chartContainer = useRef<HTMLDivElement>(null);
  const chart = useTradingPriceChart(chartContainer, asset.symbol, TIMEFRAMES[selectedTf].seconds, chartType === "line" ? "area" : chartType);
  const chartHandlers = useRef(chart);
  chartHandlers.current = chart;

  useEffect(() => {
    if (liveEdgeRequestKey !== undefined) chartHandlers.current.latest();
  }, [liveEdgeRequestKey]);

  useEffect(() => {
    let active = true;
    const feed = createMarketDataFeed({
      websocketUrl: marketWebSocketUrl(),
      internalOTC: isInternalOTC,
      subscription: { symbol: asset.symbol, basePrice: basePriceRef.current, timeframe: TIMEFRAMES["1m"], assetCategory: asset.type },
      callbacks: {
        onTick: (tick) => {
          if (!active || tick.symbol !== asset.symbol) return;
          const seconds = timeframeRef.current;
          callbackRef.current?.(tick.price, Math.floor(tick.timestamp / seconds) * seconds, seconds);
          try { chartHandlers.current.onTick(tick); }
          catch (error) { console.error('Chart update failed:', error); }
        },
        onHistory: () => { try { chartHandlers.current.onHistory(); } catch (error) { console.error('Chart history failed:', error); } },
        onStatusChange: (status) => chartHandlers.current.onStatus(status),
        onError: (error) => console.warn(`Market feed error for ${asset.symbol}:`, error),
      },
    });
    feed.connect();
    return () => { active = false; feed.disconnect(); };
  }, [asset.symbol, asset.type]);

  const showTools = !compactPane && !miniOverlay && !mobileHistoryOpen && !overlayUiSuppressed;
  const openDrawings = () => { setMobileToolsOpen(false); onToggleDrawingsPanel(); };
  const openIndicators = () => { setMobileToolsOpen(false); onToggleIndicatorsPanel(); };
  return (
    <div className="relative flex w-full min-w-0 flex-1 flex-col min-h-0" style={{ background: "var(--trading-workspace-bg, #1c1f2b)" }}>
      {!compactPane && !mobileHistoryOpen && !overlayUiSuppressed && (
        <div className="absolute left-[52px] top-3 z-[52] hidden sm:block">
          <button type="button" onClick={() => setPairInfoOpen(true)} className="text-left text-xs font-bold text-slate-200 hover:text-white">{asset.symbol}</button>
        </div>
      )}
      <div className={`absolute inset-y-0 right-0 left-0 ${showTools ? "sm:left-[44px]" : ""}`}>
        <div ref={chartContainer} className="absolute inset-0" aria-label="Price chart" />
        {chart.view && !compactPane && <DrawingOverlay chart={chart.view.chart} series={chart.view.series} timeframeSeconds={TIMEFRAMES[selectedTf].seconds} />}
        {chart.message && <div role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center px-16 text-center text-xs text-slate-400">{chart.message}</div>}
      </div>
      <div className="pointer-events-none absolute right-3 top-3 z-40 text-right text-[10px] text-slate-400">
        {isInternalOTC && <div>Synthetic OTC prices</div>}
        {chart.status !== "live" && <div>Feed: {chart.status}</div>}
        {chart.historyWarning && <div>{chart.historyWarning}</div>}
        {activeIndicators.some(ind => ind.visible) && <div>Indicator plots are not yet available</div>}
      </div>
      {showTools && <>
        <div className="absolute inset-y-0 left-0 hidden w-[44px] border-r sm:block" style={{ borderRightColor: "var(--trading-border-strong-color)" }}>
          <button type="button" aria-label="Trade lower" onClick={() => dispatchTradeDeskDirectionSubmit("lower")} className="absolute inset-x-0 top-0 h-[45%] hover:bg-white/[0.04]"><span className="absolute left-1 top-2 text-[11px] text-slate-400">—</span></button>
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-4 left-1/2 w-[5px] -translate-x-1/2 rounded-full bg-white/10" />
          <button type="button" aria-label="Trade higher" onClick={() => dispatchTradeDeskDirectionSubmit("higher")} className="absolute inset-x-0 bottom-0 h-[45%] hover:bg-white/[0.04]"><span className="absolute bottom-2 left-1 text-[11px] text-slate-400">—</span></button>
        </div>
        <div className="absolute bottom-4 left-[56px] z-[81] hidden sm:flex">
          <ChartToolbar selectedTf={selectedTf} onSelectTf={setSelectedTf} timeframeLocked={false} styleEditorOpen={settingsOpen}
            onOpenStyleEditor={() => setSettingsOpen(v => !v)} activeInds={[]} onToggleInd={() => {}}
            activeDrawTool={activeTool} onSelectDrawTool={(tool) => { if (tool === "clear") setDrawings([]); setActiveTool(tool === "clear" ? null : tool); }}
            onToggleIndicatorsPanel={openIndicators} onToggleDrawingsPanel={openDrawings} />
        </div>
        <ChartZoomControls onZoom={chart.zoom} />
        <div className="absolute bottom-3 right-3 z-[56] flex gap-2">
          <button type="button" onClick={chart.latest} className="rounded bg-[#2a3040] px-2 py-1 text-[11px] text-slate-200" title="Return to latest candle">Latest</button>
          <button type="button" onClick={chart.reset} className="rounded bg-[#2a3040] px-2 py-1 text-[11px] text-slate-200" title="Reset chart view">Reset</button>
        </div>
      </>}
      {!mobileHistoryOpen && !overlayUiSuppressed && !compactPane && <div className="absolute left-3 top-3 z-[55] flex flex-col gap-3 sm:hidden">
        <button type="button" aria-label="Chart tools" onClick={() => setMobileToolsOpen(v => !v)} className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/6 bg-[#2a3142]/95 text-white"><MoreHorizontal size={18}/></button>
        {mobileToolsOpen && <>
          <button type="button" aria-label="Drawing tools" onClick={openDrawings} className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/6 bg-[#2a3142]/95 text-white"><PenTool size={18}/></button>
          <button type="button" aria-label="Time interval" onClick={() => setTimeMenuOpen(v => !v)} className="flex h-10 min-w-[42px] items-center justify-center rounded-[6px] border border-white/6 bg-[#2a3142]/95 text-[#0fa053] font-black">{selectedTf}</button>
          {timeMenuOpen && <div className="fixed left-16 top-20 z-[56] grid w-56 grid-cols-3 gap-1 rounded-[10px] border border-white/10 bg-[#5a5f72] p-2">{SUPPORTED_CHART_TIMEFRAMES.map(tf => <button key={tf} type="button" onClick={() => {setSelectedTf(tf);setTimeMenuOpen(false)}} className="rounded px-2 py-2 text-xs text-white hover:bg-white/10">{tf}</button>)}</div>}
          <button type="button" aria-label="Chart settings" onClick={() => setSettingsOpen(v => !v)} className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/6 bg-[#2a3142]/95 text-white"><CandleIcon className="h-[18px] w-[18px]"/></button>
          <button type="button" aria-label="Indicators" onClick={openIndicators} className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/6 bg-[#2a3142]/95 text-white"><Compass size={18}/></button>
        </>}
        <button type="button" aria-label="Open trade history" onClick={onToggleMobileHistory} className="relative flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/6 bg-[#2a3142]/95 text-white"><Briefcase size={19}/><span className="absolute -right-1 -top-1 rounded-full bg-[#2962ff] px-1 text-[10px]">{activeTrades.length}</span></button>
      </div>}
      {settingsOpen && !mobileHistoryOpen && <ChartSettingsPanel chartType={chartType} setChartType={setChartType} onClose={() => setSettingsOpen(false)} />}
      {!compactPane && !mobileHistoryOpen && !overlayUiSuppressed && activeIndicators.length > 0 && <div className="absolute left-[52px] top-[78px] z-40 hidden flex-col items-start gap-1.5 sm:flex">
        {activeIndicators.map(ind => <div key={ind.instanceId} className="inline-flex items-center gap-1.5 rounded-[4px] border border-white/6 bg-[#232a38]/94 px-2 py-1 text-[11px]">
          {onUpdateIndicator && <button type="button" aria-label={`${ind.visible ? 'Hide' : 'Show'} ${ind.name}`} onClick={() => onUpdateIndicator(ind.instanceId, {visible: !ind.visible})}>{ind.visible ? <Eye size={12}/> : <EyeOff size={12}/>}</button>}
          <button type="button" onClick={() => onOpenIndicatorSettings?.(ind.instanceId)} className="font-black uppercase text-white">{ind.name}</button>
          {onRemoveIndicator && <button type="button" aria-label={`Delete ${ind.name}`} onClick={() => onRemoveIndicator(ind.instanceId)} className="text-[#f27a72]"><X size={12}/></button>}
        </div>)}
      </div>}
      {pairInfoOpen && <PairInfoModal symbol={asset.symbol} onClose={() => setPairInfoOpen(false)} onTradeNow={() => setPairInfoOpen(false)}/>}
      {asset.available === false && <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--trading-workspace-bg)]"><div className="text-center"><div className="text-[16px] font-bold text-white">{t("tradingChart.notAvailable")}</div><div className="mt-1 text-[12px] text-gray-400">{t("tradingChart.assetCoolingDown")}</div></div></div>}
    </div>
  );
}
