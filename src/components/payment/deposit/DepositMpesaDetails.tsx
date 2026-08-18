import { Smartphone, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DepositBonusCatalogEntry } from "@/lib/depositBonusOffers";
import { DepositBonusSelector } from "./DepositBonusSelector";
import { KesEquivalent } from "@/components/payment/KesEquivalent";

interface DepositMpesaDetailsProps {
  amount: string;
  setAmount: (amount: string) => void;
  phone: string;
  setPhone: (phone: string) => void;
  bonusEnabled: boolean;
  useBonus: boolean;
  setUseBonus: (value: boolean) => void;
  matchingOffer: DepositBonusCatalogEntry | null;
  bonusAmount: number;
  onContinue: () => void;
  onBack: () => void;
}

export function DepositMpesaDetails({
  amount,
  setAmount,
  phone,
  setPhone,
  bonusEnabled,
  useBonus,
  setUseBonus,
  matchingOffer,
  bonusAmount,
  onContinue,
  onBack,
}: DepositMpesaDetailsProps) {
  const amountValue = Number(amount) || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">M-PESA Details</h1>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-white">Amount (USD)</Label>
          <div className="relative mt-2">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40">
              <span className="text-xl font-bold">$</span>
            </div>
            <input
              type="number"
              step="1"
              min="5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full pl-10 pr-4 py-4 bg-[#0a0d17] border border-white/10 rounded-xl text-xl font-bold text-white outline-none placeholder:text-white/30 focus:border-[#0fa053]/50 focus:ring-1 focus:ring-[#0fa053]/20"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-white">M-PESA Phone Number</Label>
          <div className="relative mt-2">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40">
              <span className="text-xl font-bold">+254</span>
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder="7XX XXX XXX"
              maxLength={9}
              className="w-full pl-14 pr-4 py-4 bg-[#0a0d17] border border-white/10 rounded-xl text-xl font-bold text-white outline-none placeholder:text-white/30 focus:border-[#0fa053]/50 focus:ring-1 focus:ring-[#0fa053]/20"
            />
          </div>
          <p className="mt-2 text-sm text-white/50">You'll receive an M-PESA payment request on your phone</p>
        </div>
      </div>

      {amountValue > 0 && <KesEquivalent amountUsd={amountValue} label="You will pay approximately" />}

      <DepositBonusSelector
        enabled={bonusEnabled}
        useBonus={useBonus}
        setUseBonus={setUseBonus}
        amount={amountValue}
        matchingOffer={matchingOffer}
        bonusAmount={bonusAmount}
        tone="green"
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 h-12 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-lg transition-colors hover:bg-white/10"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!phone || amountValue < 5}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#0fa053] to-[#0fa053]/80 text-white font-bold text-lg shadow-[0_10px_30px_rgba(15,160,83,0.3)] hover:from-[#0fa053] hover:to-[#0fa053] disabled:from-white/10 disabled:to-white/10 disabled:shadow-none disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}