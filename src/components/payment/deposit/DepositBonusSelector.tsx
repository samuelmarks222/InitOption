import { BadgeCheck, Gift, Info, XCircle } from "lucide-react";
import type { DepositBonusCatalogEntry } from "@/lib/depositBonusOffers";

interface DepositBonusSelectorProps {
  enabled: boolean;
  useBonus: boolean;
  setUseBonus: (value: boolean) => void;
  amount: number;
  matchingOffer: DepositBonusCatalogEntry | null;
  bonusAmount: number;
  tone?: "green" | "amber";
}

const formatUsd = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function DepositBonusSelector({
  enabled,
  useBonus,
  setUseBonus,
  amount,
  matchingOffer,
  bonusAmount,
  tone = "green",
}: DepositBonusSelectorProps) {
  if (!enabled) return null;

  const accent = tone === "amber" ? "amber" : "green";
  const accentText = tone === "amber" ? "text-amber-400" : "text-green-400";
  const accentBorder = tone === "amber" ? "border-amber-400/30" : "border-green-500/30";
  const accentBg = tone === "amber" ? "bg-amber-400/10" : "bg-green-500/10";
  const accentSolid = tone === "amber" ? "bg-amber-400/20" : "bg-green-500/20";

  const totalCredited = amount + bonusAmount;
  const hasMatch = useBonus && amount > 0 && matchingOffer !== null && matchingOffer.eligible;

  return (
    <div className={`rounded-xl border ${accentBorder} ${accentBg} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Gift className={`h-5 w-5 ${accentText} shrink-0`} />
          <div>
            <p className="text-sm font-bold text-white">Deposit Bonus</p>
            <p className="text-xs text-white/50">Choose whether to apply your deposit bonus</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={useBonus}
          onClick={() => setUseBonus(!useBonus)}
          className={`relative flex h-7 w-14 shrink-0 items-center rounded-full transition-colors ${
            useBonus ? accentSolid : "bg-white/10"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              useBonus ? "translate-x-8" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {!useBonus ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/50">
          <XCircle className="h-4 w-4 shrink-0" />
          Bonus disabled for this deposit. Only your {formatUsd(amount)} deposit will be credited.
        </div>
      ) : amount > 0 && hasMatch ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-black/25 p-3">
              <p className="text-xs text-white/50">Deposit</p>
              <p className="mt-1 text-lg font-bold text-white">{formatUsd(amount)}</p>
            </div>
            <div className={`rounded-xl ${accentSolid} p-3`}>
              <p className={`text-xs ${accentText}`}>Bonus (+{matchingOffer.bonus_percent}%)</p>
              <p className={`mt-1 text-lg font-bold ${accentText}`}>+{formatUsd(bonusAmount)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
              <p className="text-xs text-white/50">Total Credited</p>
              <p className={`mt-1 text-lg font-bold ${accentText}`}>{formatUsd(totalCredited)}</p>
            </div>
          </div>
          <p className={`mt-3 flex items-center gap-1.5 text-xs ${accentText}`}>
            <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
            You will receive {formatUsd(amount)} + {formatUsd(bonusAmount)} bonus = {formatUsd(totalCredited)}
          </p>
        </>
      ) : amount > 0 ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/50">
          <Info className="h-4 w-4 shrink-0" />
          No active bonus applies to this deposit amount. Only your {formatUsd(amount)} will be credited.
        </div>
      ) : null}
    </div>
  );
}