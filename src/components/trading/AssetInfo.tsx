import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import type { ActiveTrade } from "@/hooks/useTrading";
import { useDynamicAssets } from "@/contexts/DynamicAssetContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getLiveAssetTradeSummary } from "@/lib/liveTradeSummary";
import { Asset } from "./data/assets";
import { AssetSymbolMark } from "./AssetSymbolMark";

interface AssetInfoProps {
  asset: Asset & { price: number; change: number };
  onSelectAsset: (asset: Asset & { price: number; change: number }) => void;
  onOpenSelector: () => void;
  openTabs?: (Asset & { price: number; change: number })[];
  activeTabId?: string;
  onSelectTab?: (symbol: string) => void;
  onRemoveTab?: (symbol: string) => void;
  onAddAssetClick?: () => void;
  activeTrades?: ActiveTrade[];
  livePrices?: Record<string, number>;
}

const WIN_COLOR = "#18d87d";
const LOSS_COLOR = "#ff6a72";
const NEUTRAL_TRADE_COLOR = "#d6def1";

const getTradeProgressPercent = (trade?: ActiveTrade | null) => {
  if (!trade || !Number.isFinite(trade.expiry_seconds) || trade.expiry_seconds <= 0) {
    return 0;
  }
  const elapsed = trade.expiry_seconds - Math.max(0, trade.timeLeft);
  return Math.min(100, Math.max(0, (elapsed / trade.expiry_seconds) * 100));
};

const formatCompactTimer = (seconds: number) => {
  const safeSeconds = Math.max(1, Math.ceil(seconds));
  if (safeSeconds >= 60) return `${Math.ceil(safeSeconds / 60)}m`;
  return `${safeSeconds}s`;
};

const AssetInfo = ({
  asset,
  onOpenSelector,
  openTabs = [],
  activeTabId,
  onSelectTab,
  onRemoveTab,
  onAddAssetClick,
  activeTrades = [],
  livePrices = {},
}: AssetInfoProps) => {
  const { getAsset } = useDynamicAssets();
  const { formatMoney } = useCurrency();
  const tabs = openTabs.length > 0 ? openTabs : [asset];
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const element = stripRef.current;
    if (!element) return;

    const updateScrollState = () => {
      const maxScrollLeft = element.scrollWidth - element.clientWidth;
      setCanScrollLeft(element.scrollLeft > 8);
      setCanScrollRight(maxScrollLeft - element.scrollLeft > 8);
    };

    updateScrollState();
    element.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(element);
    window.addEventListener("resize", updateScrollState);

    return () => {
      element.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [tabs.length]);

  const scrollTabs = (direction: "left" | "right") => {
    const element = stripRef.current;
    if (!element) return;
    const delta = Math.max(180, Math.floor(element.clientWidth * 0.6));
    element.scrollBy({ left: direction === "left" ? -delta : delta, behavior: "smooth" });
  };

  return (
    <div className="relative flex h-[48px] shrink-0 items-center justify-between overflow-hidden hidden lg:flex px-2 bg-[#0A0F18] border-b border-[#1A2436] text-white select-none">
      {/* Scrollable strip */}
      <div
        ref={stripRef}
        className="relative flex h-full flex-1 items-center gap-1.5 overflow-x-auto overflow-y-hidden pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Blue TRADE tab button */}
        <button
          onClick={onAddAssetClick ?? onOpenSelector}
          className="flex h-[34px] shrink-0 items-center gap-1.5 rounded bg-[#0084FF] px-3 text-[11px] font-black uppercase text-white shadow-md shadow-[#0084FF]/30 hover:bg-[#0070df] transition-all"
        >
          <span>🖼️</span> TRADE
        </button>

        {/* Plus button */}
        <button
          onClick={onAddAssetClick ?? onOpenSelector}
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded bg-[#0084FF] text-white shadow-md shadow-[#0084FF]/30 hover:bg-[#0070df] transition-all"
          title="Add asset pair"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
        </button>

        {/* Asset tab chips */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const dynamicTab = getAsset(tab.symbol);
            const isActive = (activeTabId ?? asset.symbol) === tab.symbol;
            const currentPrice = Number(livePrices[tab.symbol] ?? dynamicTab?.price ?? tab.price ?? tab.basePrice ?? 0);
            const relatedTrades = activeTrades.filter((trade) => trade.asset_symbol === tab.symbol);
            const { nextExpiringTrade: activeTrade, netState, totalLiveResult } = getLiveAssetTradeSummary(relatedTrades, currentPrice);
            const hasActiveTrade = Boolean(activeTrade);
            const isWinningTrade = hasActiveTrade && netState === "positive";
            const isLosingTrade = hasActiveTrade && netState === "negative";
            const accent = isWinningTrade ? WIN_COLOR : isLosingTrade ? LOSS_COLOR : NEUTRAL_TRADE_COLOR;
            const progressPercent = getTradeProgressPercent(activeTrade);
            const payout = Math.round(dynamicTab?.maxProfit ?? tab.maxProfit ?? 82);

            return (
              <div
                key={tab.symbol}
                onClick={() => (onSelectTab ? onSelectTab(tab.symbol) : onOpenSelector())}
                className={`group relative flex h-[38px] min-w-[120px] shrink-0 cursor-pointer items-center gap-2 overflow-hidden rounded border px-2 transition-all ${
                  isActive
                    ? "bg-[#182335] border-[#2A3B56]"
                    : "bg-[#101724] border-[#1A2436] hover:bg-[#151F30]"
                }`}
              >
                {/* Active trade progress bar */}
                {hasActiveTrade && (
                  <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progressPercent}%`,
                        background: accent,
                        boxShadow: `0 0 6px ${accent}88`,
                      }}
                    />
                  </div>
                )}

                <AssetSymbolMark symbol={tab.symbol} category={tab.type} size={16} />

                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[11px] font-black uppercase text-white">{tab.symbol}</p>
                  <p className={`text-[10px] font-extrabold ${hasActiveTrade ? (isWinningTrade ? "text-[#18d87d]" : isLosingTrade ? "text-[#ff6a72]" : "text-[#FFA500]") : "text-[#FFA500]"}`}>
                    {hasActiveTrade
                      ? `${totalLiveResult >= 0 ? "+" : ""}${formatMoney(Math.abs(totalLiveResult), { maximumFractionDigits: 2 })}`
                      : `${payout}%`}
                  </p>
                </div>

                {/* Timer badge for active trades */}
                {activeTrade && (
                  <span className="shrink-0 rounded bg-black/40 px-1 py-px text-[9px] font-black text-white/80">
                    {formatCompactTimer(activeTrade.timeLeft)}
                  </span>
                )}

                {/* Close button */}
                {onRemoveTab && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemoveTab(tab.symbol); }}
                    className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-gray-500 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                  >
                    <X className="h-2.5 w-2.5" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel: active asset summary + pending trade toggle */}
      <div className="flex shrink-0 items-center gap-3 border-l border-[#1A2436] pl-3 pr-1">
        <div className="flex items-center gap-1.5">
          <AssetSymbolMark symbol={asset.symbol} category={asset.type} size={18} />
          <div className="leading-none">
            <p className="text-[11px] font-black uppercase text-white">{asset.symbol}</p>
            <p className="text-[10px] font-extrabold text-[#FFA500]">
              {Math.round(asset.maxProfit ?? 85)}%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-l border-[#1A2436] pl-3">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#5E6B7D]">PENDING TRADE</span>
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" className="peer sr-only" />
            <div className="peer h-4 w-7 rounded-full bg-[#1E2736] after:absolute after:left-[2px] after:top-[2px] after:h-3 after:w-3 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#0084FF] peer-checked:after:translate-x-3 peer-focus:outline-none" />
          </label>
        </div>
      </div>

      {/* Scroll arrows */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollTabs("left")}
          className="absolute left-[86px] top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[#1A2436] bg-[#0A0F18] text-gray-400 shadow-md hover:text-white transition-colors"
        >
          <ChevronLeft className="h-3 w-3" strokeWidth={3} />
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollTabs("right")}
          className="absolute right-[220px] top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[#1A2436] bg-[#0A0F18] text-gray-400 shadow-md hover:text-white transition-colors"
        >
          <ChevronRight className="h-3 w-3" strokeWidth={3} />
        </button>
      )}
    </div>
  );
};

export default AssetInfo;
