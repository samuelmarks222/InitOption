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
    <div className="relative flex h-[56px] shrink-0 items-center justify-between overflow-hidden hidden lg:flex px-3 bg-[var(--trading-tabs-bg,#1e2131)] border-b border-[var(--trading-border-color,rgba(143,164,210,0.16))] text-white select-none">
      {/* Scrollable strip */}
      <div
        ref={stripRef}
        className="relative flex h-full flex-1 items-center gap-2 overflow-x-auto overflow-y-hidden pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Plus button */}
        <button
          onClick={onAddAssetClick ?? onOpenSelector}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg bg-[#0084FF] text-white shadow-md shadow-[#0084FF]/30 hover:bg-[#0070df] transition-all"
          title="Add asset pair"
        >
          <Plus className="h-6 w-6 stroke-[3.5]" />
        </button>

        {/* Asset tab chips */}
        <div className="flex items-center gap-2">
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
                className={`group relative flex h-[42px] min-w-[150px] shrink-0 cursor-pointer items-center gap-2.5 overflow-hidden rounded-lg border px-3 transition-all ${
                  isActive
                    ? "bg-[#2a3040] border-[#4b5773] shadow-md ring-1 ring-white/15"
                    : "bg-[#2a3040] border-[#384259] hover:bg-[#343b4f] hover:border-gray-500/50"
                }`}
              >
                {/* Active trade progress bar */}
                {hasActiveTrade && (
                  <div className="absolute inset-x-0 bottom-0 h-[2.5px] overflow-hidden rounded-full bg-black/40">
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

                <AssetSymbolMark symbol={tab.symbol} category={tab.type} size={20} />

                <div className="min-w-0 flex-1 leading-none">
                  <p className="truncate text-[13px] font-black uppercase tracking-wide text-white">{tab.symbol}</p>
                  <p className={`mt-0.5 text-[11px] font-black ${hasActiveTrade ? (isWinningTrade ? "text-[#18d87d]" : isLosingTrade ? "text-[#ff6a72]" : "text-[#FFB800]") : "text-[#FFB800]"}`}>
                    {hasActiveTrade
                      ? `${totalLiveResult >= 0 ? "+" : ""}${formatMoney(Math.abs(totalLiveResult), { maximumFractionDigits: 2 })}`
                      : `${payout}%`}
                  </p>
                </div>

                {/* Timer badge for active trades */}
                {activeTrade && (
                  <span className="shrink-0 rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-black text-white">
                    {formatCompactTimer(activeTrade.timeLeft)}
                  </span>
                )}

                {/* Close button */}
                {onRemoveTab && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemoveTab(tab.symbol); }}
                    className="ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-gray-400 opacity-60 transition-all hover:bg-white/15 hover:text-white hover:opacity-100"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll arrows */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollTabs("left")}
          className="absolute left-[54px] top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--trading-border-color)] bg-[var(--trading-tabs-bg)] text-gray-300 shadow-md hover:text-white transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={3} />
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollTabs("right")}
          className="absolute right-3 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--trading-border-color)] bg-[var(--trading-tabs-bg)] text-gray-300 shadow-md hover:text-white transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={3} />
        </button>
      )}
    </div>
  );
};

export default AssetInfo;
