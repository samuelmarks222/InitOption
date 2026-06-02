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
const TAB_PAYOUT_COLOR = "#62d17f";
const TAB_SPARKLINE_COLOR = "#0e8beb";

const getTabSparklinePoints = (symbol: string, change = 0) => {
  let seed = Array.from(symbol).reduce((hash, char) => hash * 31 + char.charCodeAt(0), 17);
  const direction = change >= 0 ? -0.18 : 0.18;

  return Array.from({ length: 22 }, (_, index) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const wave = Math.sin(index * 0.72 + seed * 0.000001) * 4.8;
    const noise = ((seed % 1000) / 1000 - 0.5) * 6.2;
    const x = 2 + index * (116 / 21);
    const y = Math.max(8, Math.min(39, 25 + wave + noise + index * direction));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
};

const formatCompactTimer = (seconds: number) => {
  const safeSeconds = Math.max(1, Math.ceil(seconds));

  if (safeSeconds >= 60) {
    return `${Math.ceil(safeSeconds / 60)}m`;
  }

  return `${safeSeconds}s`;
};

const getTradeProgressPercent = (trade?: ActiveTrade | null) => {
  if (!trade || !Number.isFinite(trade.expiry_seconds) || trade.expiry_seconds <= 0) {
    return 0;
  }

  const elapsed = trade.expiry_seconds - Math.max(0, trade.timeLeft);
  return Math.min(100, Math.max(0, (elapsed / trade.expiry_seconds) * 100));
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
      className="relative h-[60px] shrink-0 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, var(--trading-panel-bg) 0%, var(--trading-tabs-bg) 100%)",
        borderBottom: "1px solid var(--trading-border-color)",
      }}
    >
      <style>{`
        @keyframes sparkline-draw { to { stroke-dashoffset: 0; } }
      `}</style>
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "linear-gradient(180deg, rgba(143,164,210,0.06), transparent 70%)",
        }}
      />
      <div
        ref={stripRef}
        className="relative flex h-full items-center gap-1.5 overflow-x-auto overflow-y-hidden px-2.5 pr-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          onClick={onAddAssetClick ?? onOpenSelector}
          className="group relative flex h-[42px] w-[48px] shrink-0 items-center justify-center overflow-hidden rounded-[5px] border text-white transition-all duration-200 active:scale-[0.98]"
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
            const relatedTrades = activeTrades.filter((trade) => trade.asset_symbol === tab.symbol);
            const { nextExpiringTrade: activeTrade, netState, totalLiveResult } = getLiveAssetTradeSummary(
              relatedTrades,
              currentPrice,
            );
            const hasActiveTrade = Boolean(activeTrade);
            const isWinningTrade = hasActiveTrade && netState === "positive";
            const isLosingTrade = hasActiveTrade && netState === "negative";
            const accent = isWinningTrade ? WIN_COLOR : isLosingTrade ? LOSS_COLOR : NEUTRAL_TRADE_COLOR;
            const totalOpenAmount = relatedTrades.reduce(
              (sum, trade) => sum + (Number.isFinite(trade.amount) ? trade.amount : 0),
              0,
            );
            const activeAmountLabel = formatMoney(totalOpenAmount, {
              minimumFractionDigits: Number.isInteger(totalOpenAmount) ? 0 : 2,
              maximumFractionDigits: Number.isInteger(totalOpenAmount) ? 0 : 2,
            });
            const progressPercent = getTradeProgressPercent(activeTrade);
            const payout = Math.round(dynamicTab?.maxProfit ?? tab.maxProfit ?? 82);
            const liveResultLabel = hasActiveTrade
              ? `${totalLiveResult > 0 ? "+" : totalLiveResult < 0 ? "-" : ""}${formatMoney(Math.abs(totalLiveResult), {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : `${payout}%`;
            const sparklinePoints = getTabSparklinePoints(tab.symbol, Number(dynamicTab?.change24h ?? tab.change ?? 0));
            const sparklineFillPoints = `${sparklinePoints} 120,44 0,44`;
            const sparklineColor = hasActiveTrade ? accent : TAB_SPARKLINE_COLOR;
            const sparklineFill = hasActiveTrade ? `${accent}24` : "rgba(14,139,235,0.16)";

            return (
              <div
                key={tab.symbol}
                className="group relative flex h-[50px] min-w-[166px] max-w-[186px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-[4px] border px-2 py-1.5 transition-all duration-200"
                style={{
                  background: hasActiveTrade
                    ? isWinningTrade
                      ? "var(--trading-success-soft-color)"
                      : isLosingTrade
                        ? "var(--trading-danger-soft-color)"
                        : "var(--trading-panel-soft-bg)"
                    : isActive
                      ? "var(--trading-accent-soft-color)"
                      : "var(--trading-panel-soft-bg)",
                  borderColor: hasActiveTrade
                    ? isWinningTrade
                      ? "rgba(24,216,125,0.72)"
                      : isLosingTrade
                        ? "rgba(255,106,114,0.68)"
                        : "rgba(214,222,241,0.38)"
                    : isActive
                      ? "rgba(14,139,235,0.92)"
                      : "rgba(143,164,210,0.22)",
                  boxShadow: hasActiveTrade
                    ? `inset 0 0 0 1px ${accent}44, inset 0 1px 0 rgba(255,255,255,0.08)`
                    : isActive
                      ? "inset 0 0 0 1px rgba(14,139,235,0.18), inset 0 1px 0 rgba(255,255,255,0.08)"
                    : "inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
                onClick={() => (onSelectTab ? onSelectTab(tab.symbol) : onOpenSelector())}
              >
                <svg
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[34px] w-full"
                  viewBox="0 0 120 44"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <polygon points={sparklineFillPoints} fill={sparklineFill} opacity={0.4} />
                  <polyline
                    points={sparklinePoints}
                    fill="none"
                    stroke={sparklineColor}
                    strokeWidth="3"
                    opacity={0.08}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points={sparklinePoints}
                    fill="none"
                    stroke={sparklineColor}
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="1000"
                    strokeDashoffset="1000"
                    style={{ animation: "sparkline-draw 1.2s ease-out forwards" }}
                  />
                </svg>

                <div className="relative z-[1] flex w-full items-start gap-1.5">
                  {onRemoveTab && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveTab(tab.symbol);
                      }}
                      className="mt-[1px] flex h-[12px] w-[12px] shrink-0 items-center justify-center text-[#9aa8c5] transition-colors hover:text-white"
                      aria-label={`Close ${tab.symbol}`}
                    >
                      <X className="h-3 w-3" strokeWidth={3} />
                    </button>
                  )}

                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <AssetSymbolMark symbol={tab.symbol} category={tab.type} size={18} />
                    <div className="truncate text-[12px] font-black uppercase leading-[1.05] text-white">
                      {getChipTitle(tab)}
                    </div>
                  </div>

                  <div className="shrink-0 text-[12px] font-black leading-[1.05]" style={{ color: hasActiveTrade ? accent : TAB_PAYOUT_COLOR }}>
                    {liveResultLabel}
                  </div>
                </div>

                {activeTrade ? (
                  <>
                    <div className="relative z-[1] mt-auto flex w-full items-end justify-between gap-2 pb-0.5">
                      <span className="text-[12px] font-black leading-none text-white">
                        {activeAmountLabel}
                      </span>
                      <span className="rounded-full bg-black/30 px-1.5 py-[2px] text-[8px] font-black leading-none text-white/90">
                        {formatCompactTimer(activeTrade.timeLeft)}
                      </span>
                    </div>
                    <div className="absolute inset-x-2 bottom-[3px] z-[2] h-[3px] overflow-hidden rounded-full bg-black/35">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${progressPercent}%`,
                          background: accent,
                          boxShadow: `0 0 8px ${accent}88`,
                        }}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {canScrollLeft ? (
        <button
          type="button"
          onClick={() => scrollTabs("left")}
          className="absolute left-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border text-[var(--trading-tool-text)] shadow-[0_8px_18px_rgba(0,0,0,0.28)] transition-colors hover:bg-[var(--trading-tool-hover-bg)]"
          style={{ background: "var(--trading-tool-bg)", borderColor: "var(--trading-tool-border)" }}
          aria-label="Show previous assets"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={3} />
        </button>
      ) : null}

      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scrollTabs("right")}
          className="absolute right-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border text-[var(--trading-tool-text)] shadow-[0_8px_18px_rgba(0,0,0,0.28)] transition-colors hover:bg-[var(--trading-tool-hover-bg)]"
          style={{ background: "var(--trading-tool-bg)", borderColor: "var(--trading-tool-border)" }}
          aria-label="Show more assets"
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={3} />
        </button>
      ) : null}
    </div>
  );
};

export default AssetInfo;
