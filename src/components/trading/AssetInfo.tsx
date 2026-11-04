import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import type { ActiveTrade } from "@/hooks/useTrading";
import { useDynamicAssets } from "@/contexts/DynamicAssetContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencyAmount } from "@/lib/currency";
import { getLiveAssetTradeSummary } from "@/lib/liveTradeSummary";
import { Asset } from "./data/assets";
import AssetSymbolMark from "./AssetSymbolMark";

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
  const { currency } = useCurrency();
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
    <div className="trading-asset-strip relative flex h-[48px] shrink-0 items-center justify-between overflow-hidden hidden lg:flex px-2 bg-[var(--trading-tabs-bg,#1e2131)] border-b border-[var(--trading-border-color,rgba(143,164,210,0.16))] text-white select-none">
      {/* Scrollable strip */}
      <div
        ref={stripRef}
        className="relative flex h-full flex-1 items-center gap-2 overflow-x-auto overflow-y-hidden pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Plus button */}
        <button
          onClick={onAddAssetClick ?? onOpenSelector}
          className="trading-add-asset flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[5px] bg-[#0084FF] text-white shadow-md shadow-[#0084FF]/30 hover:bg-[#0070df] transition-all"
          title="Add asset pair"
        >
          <Plus className="h-5 w-5 stroke-[3]" />
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

            const showOtcSuffix = tab.symbol.includes("/") && !tab.symbol.toUpperCase().includes("OTC");
            const tabLabel = showOtcSuffix ? `${tab.symbol} (OTC)` : tab.symbol;
            const liveTone = !hasActiveTrade ? null : isWinningTrade ? "up" : isLosingTrade ? "down" : null;
            const borderClasses = hasActiveTrade && liveTone
              ? liveTone === "up"
                ? "bg-[#363a43] border-[#18d87d] shadow-md ring-1 ring-[#18d87d]/40"
                : "bg-[#363a43] border-[#E03E3E] shadow-md ring-1 ring-[#E03E3E]/45"
              : isActive
                ? "bg-[#444a55] border-[#939dad]"
                : "bg-[#363a43] border-white/10 hover:bg-[#414752] hover:border-white/25";

            // Live P/L text: +$19.20 (winning) or -$0.45 (losing, live value)
            const livePnlText = isWinningTrade
              ? `+${formatCurrencyAmount(Math.abs(totalLiveResult), currency)}`
              : isLosingTrade
              ? `-${formatCurrencyAmount(Math.abs(totalLiveResult), currency)}`
              : null;
            const stakeText = activeTrade
              ? `$${Number(activeTrade.amount).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
              : null;

            return (
              <div key={tab.symbol} className={`trading-asset-tab group relative h-[38px] w-[148px] shrink-0 overflow-hidden rounded-[4px] border ${borderClasses}`}>
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => (onSelectTab ? onSelectTab(tab.symbol) : onOpenSelector())}
                  className="flex h-full w-full items-center gap-2 px-2 pr-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400"
                >
                  <AssetSymbolMark symbol={tab.symbol} category={tab.type} flags={tab.flags} size={20} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="trading-asset-name block truncate text-[12px] font-black text-white">{tabLabel}</span>
                    <span className="trading-asset-payout block text-[12px] font-black text-[#f5b44b]">{payout}%</span>
                  </span>
                  {hasActiveTrade && livePnlText && (
                    <span className="absolute bottom-1 right-2 text-[9px] font-bold tabular-nums" style={{color:accent}} title={`Investment ${stakeText ?? ''}`}>
                      {livePnlText}
                    </span>
                  )}
                </button>
                {onRemoveTab && (
                  <button type="button" aria-label={`Close ${tabLabel}`} onClick={() => onRemoveTab(tab.symbol)}
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-sky-400">
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
                {hasActiveTrade && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-black/30"><div className="h-full transition-[width]" style={{width:`${progressPercent}%`,background:accent}} /></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll arrows */}
      {canScrollLeft && (
        <button
          type="button"
          aria-label="Scroll assets left"
          onClick={() => scrollTabs("left")}
          className="absolute left-[54px] top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--trading-border-color)] bg-[var(--trading-tabs-bg)] text-gray-300 shadow-md hover:text-white transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={3} />
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          aria-label="Scroll assets right"
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
