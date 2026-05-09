import { ArrowDownRight, ArrowUpRight, Clock3 } from "lucide-react";
import type { ActiveTrade } from "@/hooks/useTrading";
import { TRADING_DOWN_COLOR, TRADING_UP_COLOR } from "./tradingPalette";
import AssetSymbolMark from "./AssetSymbolMark";

const formatCountdown = (timeLeft: number) => {
  const totalSeconds = Math.max(0, Math.ceil(timeLeft));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return `${totalSeconds}s`;
};

const formatDuration = (seconds: number) => {
  if (seconds >= 60) {
    const minutes = seconds / 60;
    return Number.isInteger(minutes) ? `${minutes}m` : `${minutes.toFixed(1)}m`;
  }

  return `${seconds}s`;
};

const getFocusedTradeStatus = (trade: ActiveTrade, currentPrice?: number) => {
  if (typeof currentPrice !== "number" || !Number.isFinite(currentPrice) || currentPrice <= 0) {
    return null;
  }

  if (Math.abs(currentPrice - trade.entry_price) < 0.0000001) {
    return { label: "At Entry", color: "#94a3b8" };
  }

  const winningNow =
    (trade.direction === "higher" && currentPrice > trade.entry_price) ||
    (trade.direction === "lower" && currentPrice < trade.entry_price);

  return {
    label: winningNow ? "Winning Now" : "Losing Now",
    color: winningNow ? TRADING_UP_COLOR : TRADING_DOWN_COLOR,
  };
};

export const ActiveTradesHud = ({
  assetSymbol,
  trades,
  currentPrice,
}: {
  assetSymbol: string;
  trades: ActiveTrade[];
  currentPrice?: number;
}) => {
  if (trades.length === 0) {
    return null;
  }

  const sortedTrades = [...trades].sort(
    (left, right) => new Date(right.opened_at).getTime() - new Date(left.opened_at).getTime(),
  );

  return (
    <div className="pointer-events-none absolute left-[4.35rem] right-3 top-3 z-[56] sm:left-4 sm:right-4">
      <div className="pointer-events-auto flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sortedTrades.map((trade) => {
          const isHigher = trade.direction === "higher";
          const accent = isHigher ? TRADING_UP_COLOR : TRADING_DOWN_COLOR;
          const isFocusedTrade = trade.asset_symbol === assetSymbol;
          const potentialProfit = trade.amount * trade.payout_rate;
          const payoutPct = Math.round(trade.payout_rate * 100);
          const progress = Math.max(0, Math.min(100, (1 - trade.timeLeft / trade.expiry_seconds) * 100));
          const focusedStatus = isFocusedTrade ? getFocusedTradeStatus(trade, currentPrice) : null;
          return (
            <div
              key={trade.id}
              className="relative min-w-[190px] max-w-[214px] overflow-hidden rounded-[16px] border px-3 py-2.5 shadow-[0_14px_36px_rgba(0,0,0,0.34)] backdrop-blur-md"
              style={{
                background: isFocusedTrade ? "rgba(8, 10, 15, 0.96)" : "rgba(40, 47, 65, 0.96)",
                borderColor: isFocusedTrade ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)",
              }}
            >
              <span
                className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                style={{ background: accent }}
              />

              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <AssetSymbolMark symbol={trade.asset_symbol} size={24} />

                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-black uppercase tracking-[0.03em] text-white">
                      {trade.asset_symbol}
                    </div>
                    <div
                      className="mt-0.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em]"
                      style={{ color: accent }}
                    >
                      {isHigher ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      <span>{payoutPct}%</span>
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-md px-2 py-1 text-[10px] font-black text-white"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  {formatCountdown(trade.timeLeft)}
                </div>
              </div>

              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8290a8]">
                    {isHigher ? "Higher" : "Lower"}
                  </div>
                  <div className="mt-1 text-[16px] font-black leading-none text-white">
                    ${trade.amount.toFixed(2)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8290a8]">
                    Potential
                  </div>
                  <div
                    className="mt-1 rounded-md px-2 py-1 text-[13px] font-black leading-none text-white"
                    style={{ background: `${accent}22`, color: accent }}
                  >
                    +${potentialProfit.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${accent}, ${accent}99)`,
                  }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.18em] text-[#8190a9]">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full animate-pulse"
                    style={{
                      background: focusedStatus?.color ?? accent,
                      boxShadow: `0 0 10px ${focusedStatus?.color ?? accent}`,
                    }}
                  />
                  <span style={{ color: focusedStatus?.color ?? "#8190a9" }}>
                    {focusedStatus?.label ?? "Live Now"}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3 w-3" />
                  {formatDuration(trade.expiry_seconds)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
