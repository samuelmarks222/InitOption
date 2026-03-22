import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Magnet, Plus, X } from "lucide-react";
import Flag from "react-world-flags";
import type { ActiveTrade } from "@/hooks/useTrading";
import { useDynamicAssets } from "@/contexts/DynamicAssetContext";
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
const DEFAULT_ICON_BG = "#24304a";

const formatCompactTimer = (seconds: number) => {
  const safeSeconds = Math.max(1, Math.ceil(seconds));

  if (safeSeconds >= 60) {
    return `${Math.ceil(safeSeconds / 60)}m`;
  }

  return `${safeSeconds}s`;
};

const formatTradeResult = (amount: number) =>
  `${amount >= 0 ? "+" : "-"}$${Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const isTradeWinning = (trade: ActiveTrade, currentPrice: number) =>
  trade.direction === "higher" ? currentPrice > trade.entry_price : currentPrice < trade.entry_price;

const getChipTitle = (tab: Asset) => {
  if (tab.type === "Stock" || tab.type === "Stocks") {
    const cleaned = tab.name
      .replace(/\b(incorporated|inc\.?|corporation|corp\.?|class a|class b|plc|ltd\.?)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    return `${cleaned || tab.symbol} (OTC)`;
  }

  if (tab.type === "Forex") {
    return `${tab.symbol} (OTC)`;
  }

  return `${tab.name || tab.symbol} (OTC)`;
};

const renderAssetLogo = (
  symbol: string,
  type: Asset["type"],
  flags: string[],
  stockLogo?: string | null,
  commodityIcon?: "gold" | "silver" | "oil" | "gas" | "copper",
) => {
  if ((type === "Forex" || type === "OTC") && flags.length >= 2) {
    return (
      <div className="relative h-[22px] w-[26px] shrink-0">
        <div className="absolute left-[8px] top-0 z-0 h-[22px] w-[22px] overflow-hidden rounded-full border border-white/15 bg-white">
          <Flag code={flags[1]} className="h-full w-full object-cover" />
        </div>
        <div className="absolute left-0 top-0 z-10 h-[22px] w-[22px] overflow-hidden rounded-full border border-white/15 bg-white">
          <Flag code={flags[0]} className="h-full w-full object-cover" />
        </div>
      </div>
    );
  }

  if ((type === "Stock" || type === "Stocks") && stockLogo) {
    return (
      <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
        <img
          src={stockLogo}
          alt=""
          className="h-full w-full object-contain p-[2px]"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = "flex";
          }}
        />
        <div className="hidden h-full w-full items-center justify-center bg-[#0b65c2] text-[10px] font-black text-white">
          {symbol.slice(0, 1)}
        </div>
      </div>
    );
  }

  if (type === "Crypto") {
    return (
      <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
        <img
          src={`https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`}
          alt=""
          className="h-full w-full object-contain p-[2px]"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = "flex";
          }}
        />
        <div className="hidden h-full w-full items-center justify-center bg-[#f59e0b] text-[9px] font-black text-white">
          {symbol.slice(0, 2)}
        </div>
      </div>
    );
  }

  if (type === "Commodities") {
    return (
      <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#1f2636] text-white">
        {commodityIcon === "gold" && <div className="h-2.5 w-2.5 rounded-sm bg-yellow-400 skew-x-12" />}
        {commodityIcon === "silver" && <div className="h-2.5 w-2.5 rounded-sm bg-gray-300 skew-x-12" />}
        {commodityIcon === "oil" && <div className="h-3 w-2.5 rounded-sm border border-gray-600 bg-black" />}
        {commodityIcon === "gas" && <Flame className="h-3 w-3 text-blue-400" />}
        {commodityIcon === "copper" && <Magnet className="h-3 w-3 text-orange-500" />}
      </div>
    );
  }

  return (
    <div
      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white"
      style={{ background: DEFAULT_ICON_BG }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
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
      className="relative h-[62px] shrink-0"
      style={{ background: "#1c1f2d", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div
        ref={stripRef}
        className="flex h-full items-center gap-2 overflow-x-auto overflow-y-hidden px-3 pr-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          onClick={onAddAssetClick ?? onOpenSelector}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] text-white transition-all hover:brightness-110 active:scale-95 shadow-[0_8px_18px_rgba(14,117,225,0.22)]"
          style={{ background: "linear-gradient(180deg,#1486ff,#0d6cdf)" }}
          title="Add asset"
        >
          <Plus className="h-5 w-5" strokeWidth={3} />
        </button>

        <div className="flex items-center gap-2">
          {tabs.map((tab) => {
            const dynamicTab = getAsset(tab.symbol);
            const isActive = (activeTabId ?? asset.symbol) === tab.symbol;
            const currentPrice = Number(livePrices[tab.symbol] ?? dynamicTab?.price ?? tab.price ?? tab.basePrice ?? 0);
            const resolvedFlags = dynamicTab?.flags ?? tab.flags ?? [];
            const resolvedStockLogo = dynamicTab?.stockLogo ?? (tab as { stockLogo?: string | null }).stockLogo ?? null;
            const resolvedCommodityIcon =
              dynamicTab?.commodityIcon ?? (tab as { commodityIcon?: "gold" | "silver" | "oil" | "gas" | "copper" }).commodityIcon;
            const relatedTrades = activeTrades.filter((trade) => trade.asset_symbol === tab.symbol);
            const activeTrade = relatedTrades.reduce<ActiveTrade | null>((shortest, trade) => {
              if (!shortest) return trade;
              return trade.timeLeft < shortest.timeLeft ? trade : shortest;
            }, null);
            const hasActiveTrade = Boolean(activeTrade);
            const liveTradeResult = activeTrade
              ? isTradeWinning(activeTrade, currentPrice)
                ? activeTrade.amount * activeTrade.payout_rate
                : -activeTrade.amount
              : 0;
            const isWinningTrade = hasActiveTrade && liveTradeResult > 0;
            const accent = isWinningTrade ? WIN_COLOR : LOSS_COLOR;

            return (
              <div
                key={tab.symbol}
                className="group relative flex h-[42px] min-w-[156px] max-w-[188px] shrink-0 cursor-pointer items-center gap-2 rounded-[8px] border px-2.5 transition-colors"
                style={{
                  background: hasActiveTrade
                    ? isWinningTrade
                      ? "#40574f"
                      : "#523a42"
                    : isActive
                      ? "#2f3647"
                      : "#2a3142",
                  borderColor: hasActiveTrade
                    ? isWinningTrade
                      ? "rgba(24,216,125,0.22)"
                      : "rgba(255,106,114,0.22)"
                    : isActive
                      ? "rgba(255,255,255,0.14)"
                      : "rgba(255,255,255,0.08)",
                }}
                onClick={() => (onSelectTab ? onSelectTab(tab.symbol) : onOpenSelector())}
              >
                {onRemoveTab && (
                  <span
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveTab(tab.symbol);
                    }}
                    className={`absolute -right-1 -top-1 flex h-[16px] w-[16px] items-center justify-center rounded-full bg-[#1b2130] text-[#9aa6c1] transition-colors hover:text-white ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  >
                    <X className="h-3 w-3" strokeWidth={2.6} />
                  </span>
                )}

                {activeTrade ? (
                  <div
                    className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full border text-[10px] font-black text-white"
                    style={{ borderColor: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.04)" }}
                  >
                    {formatCompactTimer(activeTrade.timeLeft)}
                  </div>
                ) : null}

                {renderAssetLogo(
                  tab.symbol,
                  tab.type,
                  resolvedFlags,
                  resolvedStockLogo,
                  resolvedCommodityIcon,
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-black leading-none text-white">{getChipTitle(tab)}</div>
                  {hasActiveTrade ? (
                    <div className="mt-1 text-[12px] font-black leading-none" style={{ color: accent }}>
                      {formatTradeResult(liveTradeResult)}
                    </div>
                  ) : null}
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
          className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#151c28]/95 text-white shadow-[0_8px_18px_rgba(0,0,0,0.28)] transition-colors hover:bg-[#1d2433]"
          aria-label="Show previous assets"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={3} />
        </button>
      ) : null}

      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scrollTabs("right")}
          className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#151c28]/95 text-white shadow-[0_8px_18px_rgba(0,0,0,0.28)] transition-colors hover:bg-[#1d2433]"
          aria-label="Show more assets"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={3} />
        </button>
      ) : null}
    </div>
  );
};

export default AssetInfo;
