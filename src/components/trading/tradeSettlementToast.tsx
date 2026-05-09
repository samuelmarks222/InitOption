import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { TradeSettlement } from "@/hooks/useTrading";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type TradeSettlementToastPayload = Pick<
  TradeSettlement,
  "asset_symbol" | "direction" | "profit" | "status"
> & {
  accountLabel?: string;
};

const formatSignedMoney = (amount: number) => `${amount >= 0 ? "+" : "-"}$${Math.abs(amount).toFixed(2)}`;

export const showTradeSettlementToast = ({
  asset_symbol,
  direction,
  profit,
  status,
  accountLabel,
}: TradeSettlementToastPayload) => {
  const won = status === "won";
  const accentClass = won ? "text-emerald-200" : "text-rose-200";
  const accentSurfaceClass = won
    ? "border-emerald-400/18 bg-[linear-gradient(180deg,rgba(10,29,22,0.97),rgba(12,20,18,0.96))]"
    : "border-rose-400/18 bg-[linear-gradient(180deg,rgba(39,18,23,0.97),rgba(22,14,18,0.96))]";
  const accountTag = accountLabel?.trim();
  const directionLabel = direction === "higher" ? "Higher" : "Lower";

  toast({
    duration: 2200,
    className: cn(
      "w-[min(238px,calc(100vw-1rem))] rounded-[18px] px-3 py-2.5 pr-7 text-white shadow-[0_16px_40px_rgba(0,0,0,0.34)] backdrop-blur-xl",
      accentSurfaceClass,
    ),
    title: (
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
            won
              ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
              : "border-rose-400/20 bg-rose-500/10 text-rose-300",
          )}
        >
          {won ? (
            <ArrowUpRight className="h-[15px] w-[15px]" strokeWidth={2.4} />
          ) : (
            <ArrowDownRight className="h-[15px] w-[15px]" strokeWidth={2.4} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[12px] font-black tracking-[-0.01em] text-white">
              {asset_symbol}
            </span>
            <span className={cn("shrink-0 text-[9px] font-black uppercase tracking-[0.16em]", accentClass)}>
              {won ? "Won" : "Lost"}
            </span>
            {accountTag ? (
              <span className="shrink-0 rounded-full border border-white/10 bg-white/8 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/65">
                {accountTag}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-[16px] font-black tracking-[-0.02em] text-white">{formatSignedMoney(profit)}</p>
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/50">
              {directionLabel}
            </span>
          </div>
        </div>
      </div>
    ),
  });
};
