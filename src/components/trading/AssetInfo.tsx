import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import type { ActiveTrade } from "@/hooks/useTrading";
import { useDynamicAssets } from "@/contexts/DynamicAssetContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencyAmount } from "@/lib/currency";
import { getLiveAssetTradeSummary } from "@/lib/liveTradeSummary";
import { getDeterministicPriceAt } from "@/lib/deterministicMarket";
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

const getTradeProgressPercent = (trade?: ActiveTrade | null) => {
  if (!trade || !Number.isFinite(trade.expiry_seconds) || trade.expiry_seconds <= 0) {
    return 0;
  }
  const elapsed = trade.expiry_seconds - Math.max(0, trade.timeLeft);
  return Math.min(100, Math.max(0, (elapsed / trade.expiry_seconds) * 100));
};

// Mini sparkline sampled from the same deterministic market model as the chart.
// Tints green/red while the asset has a live winning/losing position.
const TabSparkline = ({ symbol, category, basePrice, tone }: { symbol: string; category?: string | null; basePrice: number; tone?: "up" | "down" | null }) => {
  const lineColor = tone === "up" ? "#18d87d" : tone === "down" ? "#ff6a72" : "#2ea3f2";
  const coords = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const N = 48;
    const spanSec = 2 * 60 * 60;
    const step = spanSec / (N - 1);
    const safeBase = Number.isFinite(basePrice) && basePrice > 0 ? basePrice : 1;
    const prices: number[] = [];
    for (let i = 0; i < N; i++) {
      try {
        prices.push(getDeterministicPriceAt({ symbol, basePrice: safeBase, timestamp: now - spanSec + i * step, category }));
      } catch {
        prices.push(safeBase);
      }
    }
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    return prices
      .map((p, i) => `${((i / (N - 1)) * 100).toFixed(2)},${(27 - ((p - min) / range) * 26).toFixed(2)}`)
      .join(" ");
  }, [symbol, basePrice, category]);

  const gradientId = useMemo(
    () => `spark-${String(symbol).replace(/[^a-zA-Z0-9]/g, "")}`,
    [symbol]
  );

  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,28 ${coords} 100,28`} fill={`url(#${gradientId})`} />
      <polyline
        points={coords}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
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
  const { formatMoney, currency } = useCurrency();
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
    <div className="relative flex h-[64px] shrink-0 items-center justify-between overflow-hidden hidden lg:flex px-3 bg-[var(--trading-tabs-bg,#1e2131)] border-b border-[var(--trading-border-color,rgba(143,164,210,0.16))] text-white select-none">
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

            const showOtcSuffix = tab.symbol.includes("/") && !tab.symbol.toUpperCase().includes("OTC");
            const tabLabel = showOtcSuffix ? `${tab.symbol} OTC` : tab.symbol;
            const liveTone = !hasActiveTrade ? null : isWinningTrade ? "up" : isLosingTrade ? "down" : null;
            const borderClasses = hasActiveTrade && liveTone
              ? liveTone === "up"
                ? "bg-[#2a3040] border-[#18d87d] shadow-md ring-1 ring-[#18d87d]/40"
                : "bg-[#2a3040] border-[#E03E3E] shadow-md ring-1 ring-[#E03E3E]/45"
              : isActive
                ? "bg-[#2a3040] border-[#2ea3f2] shadow-md ring-1 ring-[#2ea3f2]/50"
                : "bg-[#2a3040] border-[#384259] hover:bg-[#343b4f] hover:border-gray-500/50";

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
              <div
                key={tab.symbol}
                onClick={() => (onSelectTab ? onSelectTab(tab.symbol) : onOpenSelector())}
                className={`group relative flex h-[54px] w-[150px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-md border transition-all ${borderClasses}`}
              >
                {/* Left-edge vertical indicator stripe for active trades */}
                {hasActiveTrade && (
                  <span
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md"
                    style={{ background: isWinningTrade ? "#0FA053" : "#E03E3E" }}
                  />
                )}

                {/* Header row: close | symbol + OTC | payout */}
                <div className="flex shrink-0 items-center gap-1 px-1.5 pt-1.5">
                  {onRemoveTab && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRemoveTab(tab.symbol); }}
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-gray-500 opacity-70 transition-all hover:bg-white/15 hover:text-white hover:opacity-100"
                    >
                      <X className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[12px] font-bold uppercase tracking-wide text-white antialiased">
                    {tabLabel}
                  </span>
                  <span className="shrink-0 text-[12px] font-bold antialiased" style={{ color: WIN_COLOR }}>
                    +{payout}%
                  </span>
                </div>

                {/* Sparkline + stake / live P/L overlay */}
                <div className="relative min-h-0 flex-1">
                  <div className="pointer-events-none absolute inset-0 px-1.5 pb-1 pt-0.5">
                    <TabSparkline
                      symbol={tab.symbol}
                      category={typeof tab.type === "string" ? tab.type : undefined}
                      basePrice={Number(dynamicTab?.price ?? currentPrice ?? 1)}
                      tone={liveTone}
                    />
                  </div>
                  {hasActiveTrade && (stakeText || livePnlText) ? (
                    <div className="relative z-[1] flex items-center justify-between gap-1 px-1.5 pt-0.5 leading-none">
                      {stakeText ? (
                        <span className="text-[12px] font-black text-white">{stakeText}</span>
                      ) : <span />}
                      {livePnlText ? (
                        <span
                          className="text-[12px] font-black"
                          style={{ color: accent, textShadow: "0 1px 3px rgba(0,0,0,0.85)" }}
                        >
                          {livePnlText}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Active trade progress bar at bottom */}
                {hasActiveTrade && (
                  <div className="absolute inset-x-1.5 bottom-[3px] h-[3px] overflow-hidden rounded-full bg-black/45">
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
