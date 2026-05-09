import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import type { ActiveTrade } from "@/hooks/useTrading";
import { useDynamicAssets } from "@/contexts/DynamicAssetContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getLiveAssetTradeSummary } from "@/lib/liveTradeSummary";
import AssetSymbolMark from "./AssetSymbolMark";
import { Asset } from "./data/assets";

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
const TAB_PAYOUT_COLOR = "#ffb52e";

const formatCompactTimer = (seconds: number) => {
  const safeSeconds = Math.max(1, Math.ceil(seconds));

  if (safeSeconds >= 60) {
    return `${Math.ceil(safeSeconds / 60)}m`;
  }

  return `${safeSeconds}s`;
};

const getChipTitle = (tab: Asset) => {
  if (tab.type === "Stock" || tab.type === "Stocks") {
    const cleaned = tab.name
      .replace(/\b(incorporated|inc\.?|corporation|corp\.?|class a|class b|plc|ltd\.?)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    return cleaned || tab.symbol;
  }

  if (tab.type === "Forex") {
    return tab.symbol;
  }

  return tab.name || tab.symbol;
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
    element.scrollBy({
      left: direction === "left" ? -delta : delta,
      behavior: "smooth",
    });
  };

  return (
    <div
      className="relative h-[50px] shrink-0 overflow-hidden"
      style={{
        background: "#1c2130",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.03), transparent 65%)",
        }}
      />
      <div
        ref={stripRef}
        className="relative flex h-full items-center gap-1.5 overflow-x-auto overflow-y-hidden px-2 pr-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          onClick={onAddAssetClick ?? onOpenSelector}
          className="group relative flex h-[36px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] border text-white transition-all duration-200 hover:bg-[#2b8cff] active:scale-[0.98]"
          style={{
            background: "linear-gradient(180deg,#1e86ff 0%,#0f67d9 100%)",
            borderColor: "rgba(104, 175, 255, 0.34)",
            boxShadow: "0 10px 22px rgba(8, 70, 162, 0.28)",
          }}
          title="Add asset"
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={3} />
        </button>

        <div className="flex items-center gap-1.5">
          {tabs.map((tab) => {
            const dynamicTab = getAsset(tab.symbol);
            const isActive = (activeTabId ?? asset.symbol) === tab.symbol;
            const currentPrice = Number(livePrices[tab.symbol] ?? dynamicTab?.price ?? tab.price ?? tab.basePrice ?? 0);
            const resolvedFlags = dynamicTab?.flags ?? tab.flags ?? [];
            const resolvedStockLogo = dynamicTab?.stockLogo ?? (tab as { stockLogo?: string | null }).stockLogo ?? null;
            const resolvedCommodityIcon =
              dynamicTab?.commodityIcon ?? (tab as { commodityIcon?: "gold" | "silver" | "oil" | "gas" | "copper" }).commodityIcon;
            const relatedTrades = activeTrades.filter((trade) => trade.asset_symbol === tab.symbol);
            const { nextExpiringTrade: activeTrade, netState, totalLiveResult } = getLiveAssetTradeSummary(
              relatedTrades,
              currentPrice,
            );
            const hasActiveTrade = Boolean(activeTrade);
            const isWinningTrade = hasActiveTrade && netState === "positive";
            const isLosingTrade = hasActiveTrade && netState === "negative";
            const accent = isWinningTrade ? WIN_COLOR : isLosingTrade ? LOSS_COLOR : NEUTRAL_TRADE_COLOR;
            const payout = Math.round(dynamicTab?.maxProfit ?? tab.maxProfit ?? 82);
            const liveResultLabel = hasActiveTrade
              ? `${totalLiveResult > 0 ? "+" : totalLiveResult < 0 ? "-" : ""}${formatMoney(Math.abs(totalLiveResult), {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : `${payout}%`;

            return (
              <div
                key={tab.symbol}
                className="group relative flex h-[36px] min-w-[132px] max-w-[148px] shrink-0 cursor-pointer items-center gap-2 overflow-hidden rounded-[7px] border px-2.5 transition-all duration-200"
                style={{
                  background: hasActiveTrade
                    ? isWinningTrade
                      ? "#2d3845"
                      : isLosingTrade
                        ? "#312e41"
                        : "#2d3447"
                    : isActive
                      ? "#353d53"
                      : "#2c3345",
                  borderColor: hasActiveTrade
                    ? isWinningTrade
                      ? "rgba(24,216,125,0.26)"
                      : isLosingTrade
                        ? "rgba(255,106,114,0.26)"
                        : "rgba(214,222,241,0.18)"
                    : isActive
                      ? "rgba(101,143,255,0.38)"
                      : "rgba(255,255,255,0.08)",
                  boxShadow: isActive ? "inset 0 1px 0 rgba(255,255,255,0.05)" : "none",
                }}
                onClick={() => (onSelectTab ? onSelectTab(tab.symbol) : onOpenSelector())}
              >
                {isActive ? (
                  <div className="absolute inset-y-0 left-0 w-[2px] bg-[#ff7b65]" />
                ) : null}

                {onRemoveTab && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveTab(tab.symbol);
                    }}
                    className="absolute right-1 top-1 z-10 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#1a1f2b] text-white/70 transition-all hover:bg-[#262d3e] hover:text-white"
                    aria-label={`Close ${tab.symbol}`}
                  >
                    <X className="h-2.5 w-2.5" strokeWidth={2.6} />
                  </button>
                )}

                {activeTrade ? (
                  <div
                    className="relative z-[1] flex h-[16px] min-w-[16px] shrink-0 items-center justify-center rounded-full border text-[7px] font-black text-white"
                    style={{
                      borderColor: "rgba(255,255,255,0.16)",
                      background: "rgba(11,15,22,0.45)",
                    }}
                  >
                    {formatCompactTimer(activeTrade.timeLeft)}
                  </div>
                ) : null}

                <div className="relative z-[1]">
                  <AssetSymbolMark
                    symbol={tab.symbol}
                    name={tab.name}
                    category={tab.type}
                    flags={resolvedFlags}
                    stockLogo={resolvedStockLogo}
                    commodityIcon={resolvedCommodityIcon}
                    size={18}
                  />
                </div>

                <div className="relative z-[1] min-w-0 flex-1 pr-3">
                  <div className="truncate text-[11px] font-black leading-none text-white">{getChipTitle(tab)}</div>
                  <div className="mt-0.5 text-[10px] font-black leading-none" style={{ color: hasActiveTrade ? accent : TAB_PAYOUT_COLOR }}>
                    {liveResultLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {canScrollLeft ? (
        <button
          type="button"
          onClick={() => scrollTabs("left")}
          className="absolute left-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#151c28]/95 text-white shadow-[0_8px_18px_rgba(0,0,0,0.28)] transition-colors hover:bg-[#20283a]"
          aria-label="Show previous assets"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={3} />
        </button>
      ) : null}

      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scrollTabs("right")}
          className="absolute right-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#151c28]/95 text-white shadow-[0_8px_18px_rgba(0,0,0,0.28)] transition-colors hover:bg-[#20283a]"
          aria-label="Show more assets"
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={3} />
        </button>
      ) : null}
    </div>
  );
};

export default AssetInfo;
