import { useEffect } from "react";
import { ArrowDownRight, ArrowUpRight, CircleAlert, Sparkles, Trophy } from "lucide-react";
import { useTrading } from "@/hooks/useTrading";

const formatSignedMoney = (amount: number) => `${amount >= 0 ? "+" : "-"}$${Math.abs(amount).toFixed(2)}`;

const formatPrice = (price: number) => {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 100) return price.toFixed(3);
  if (price >= 1) return price.toFixed(5);
  return price.toFixed(6);
};

export const TradeSettlementOverlay = () => {
  const { latestSettlement, clearLatestSettlement } = useTrading();

  useEffect(() => {
    if (!latestSettlement) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      clearLatestSettlement();
    }, 3600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [clearLatestSettlement, latestSettlement]);

  if (!latestSettlement) {
    return null;
  }

  const won = latestSettlement.status === "won";
  const accent = won ? "#1fcd73" : "#ff7b74";
  const badgeBackground = won ? "rgba(31, 205, 115, 0.14)" : "rgba(255, 123, 116, 0.14)";
  const panelBackground = won
    ? "linear-gradient(180deg, rgba(12, 34, 24, 0.97), rgba(10, 18, 28, 0.96))"
    : "linear-gradient(180deg, rgba(38, 17, 22, 0.97), rgba(10, 18, 28, 0.96))";
  const message = won
    ? "Nice one. The position closed in profit."
    : "This setup missed, but stay calm. Keep trading happy and wait for the next clean opportunity.";

  return (
    <div className="pointer-events-none absolute left-3 top-[5.7rem] z-[58] sm:left-4 sm:top-[6.2rem]">
      <div className="relative w-[min(300px,calc(100vw-2rem))]">
        <div
          className="absolute inset-[-8px] rounded-[26px] blur-xl"
          style={{ background: won ? "rgba(31, 205, 115, 0.18)" : "rgba(255, 123, 116, 0.16)" }}
        />

        <div
          className="relative overflow-hidden rounded-[20px] border px-4 py-4 text-white shadow-[0_18px_44px_rgba(0,0,0,0.34)]"
          style={{
            background: panelBackground,
            borderColor: won ? "rgba(31, 205, 115, 0.2)" : "rgba(255, 123, 116, 0.18)",
          }}
        >
          <div
            className="absolute inset-x-8 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
          />
          <div
            className="absolute -right-10 -top-10 h-24 w-24 rounded-full blur-2xl"
            style={{ background: won ? "rgba(31, 205, 115, 0.14)" : "rgba(255, 123, 116, 0.14)" }}
          />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                style={{ background: badgeBackground, color: accent }}
              >
                {won ? <Trophy className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
                {won ? "Trade won" : "Trade closed"}
              </div>

              <div className="mt-3 font-display text-2xl font-bold leading-none text-white">
                {formatSignedMoney(latestSettlement.profit)}
              </div>
              <div className="mt-2 flex items-center gap-2 font-copy text-[11px] font-semibold text-slate-300">
                <span className="truncate uppercase tracking-[0.16em] text-slate-500">{latestSettlement.asset_symbol}</span>
                <span className="text-white/20">|</span>
                {latestSettlement.direction === "higher" ? (
                  <ArrowUpRight className="h-4 w-4" style={{ color: accent }} />
                ) : (
                  <ArrowDownRight className="h-4 w-4" style={{ color: accent }} />
                )}
                <span className="capitalize">{latestSettlement.direction}</span>
              </div>
            </div>

            <div
              className="shrink-0 rounded-2xl px-3 py-2 text-center"
              style={{ background: badgeBackground, color: accent }}
            >
              <div className="font-copy text-[9px] font-bold uppercase tracking-[0.16em]">Payout</div>
              <div className="font-display mt-1 text-sm font-bold">
                {Math.round(latestSettlement.payout_rate * 100)}%
              </div>
            </div>
          </div>

          <div className="relative mt-3 rounded-[16px] border border-white/6 bg-white/[0.04] px-3 py-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
              <p className="font-copy text-[12px] leading-6 text-slate-200">{message}</p>
            </div>
          </div>

          <div className="relative mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[14px] border border-white/6 bg-white/[0.04] px-3 py-2">
              <div className="font-copy text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Entry</div>
              <div className="mt-1 font-display text-[13px] font-bold text-white">
                {formatPrice(latestSettlement.entry_price)}
              </div>
            </div>

            <div className="rounded-[14px] border border-white/6 bg-white/[0.04] px-3 py-2">
              <div className="font-copy text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Exit</div>
              <div className="mt-1 font-display text-[13px] font-bold text-white">
                {formatPrice(latestSettlement.exit_price)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
