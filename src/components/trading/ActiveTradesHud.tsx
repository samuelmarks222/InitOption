import Flag from "react-world-flags";
import { ArrowDownRight, ArrowUpRight, Clock3 } from "lucide-react";
import type { ActiveTrade } from "@/hooks/useTrading";

const currencyToCountry: Record<string, string> = {
  USD: "US",
  EUR: "EU",
  GBP: "GB",
  JPY: "JP",
  CHF: "CH",
  AUD: "AU",
  CAD: "CA",
  NZD: "NZ",
  PKR: "PK",
  MXN: "MX",
  NGN: "NG",
  INR: "IN",
  ZAR: "ZA",
  SGD: "SG",
  AED: "AE",
  TRY: "TR",
  BRL: "BR",
  ARS: "AR",
  EGP: "EG",
  KRW: "KR",
  CNY: "CN",
  HKD: "HK",
  IDR: "ID",
  RUB: "RU",
};

const normalizeSymbol = (symbol: string) => symbol.replace(/\s*OTC$/i, "").trim();

const splitAssetSymbol = (symbol: string) => {
  const cleaned = normalizeSymbol(symbol);

  if (cleaned.includes("/")) {
    const [base = "", quote = ""] = cleaned.split("/");
    return [base.toUpperCase(), quote.toUpperCase()].filter(Boolean);
  }

  const compact = cleaned.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (compact.length >= 6) {
    return [compact.slice(0, 3), compact.slice(3, 6)];
  }

  return [compact || cleaned.toUpperCase()];
};

const resolveSymbolTokens = (symbol: string) =>
  splitAssetSymbol(symbol).slice(0, 2).map((token) => ({
    label: token.slice(0, 2),
    code: currencyToCountry[token] ?? null,
  }));

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

export const ActiveTradesHud = ({ assetSymbol, trades }: { assetSymbol: string; trades: ActiveTrade[] }) => {
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
          const accent = isHigher ? "#15d87b" : "#ff5d73";
          const isFocusedTrade = trade.asset_symbol === assetSymbol;
          const potentialProfit = trade.amount * trade.payout_rate;
          const payoutPct = Math.round(trade.payout_rate * 100);
          const progress = Math.max(0, Math.min(100, (1 - trade.timeLeft / trade.expiry_seconds) * 100));
          const badges = resolveSymbolTokens(trade.asset_symbol);

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
                  <div className="relative h-6 w-8 shrink-0">
                    {badges.map((badge, index) => (
                      <div
                        key={`${trade.id}-${badge.label}-${index}`}
                        className="absolute top-0 h-6 w-6 overflow-hidden rounded-full border border-white/20 bg-[#1a2130] shadow-[0_4px_10px_rgba(0,0,0,0.3)]"
                        style={{ left: `${index * 12}px`, zIndex: badges.length - index }}
                      >
                        {badge.code ? (
                          <Flag code={badge.code} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[9px] font-black uppercase text-white">
                            {badge.label}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

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
                    style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
                  />
                  Live now
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
