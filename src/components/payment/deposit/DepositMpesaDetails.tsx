import { Smartphone, ShieldCheck, Zap, ArrowRight, CreditCard, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DepositMpesaDetailsProps {
  amount: string;
  setAmount: (amount: string) => void;
  phone: string;
  setPhone: (phone: string) => void;
  bonusTier: number;
  setBonusTier: (tier: number) => void;
  onContinue: () => void;
  onBack: () => void;
}

const BONUS_TIERS = [
  { tier: 1, min: 50, max: 99, bonus: 10, label: "10% Bonus" },
  { tier: 2, min: 100, max: 249, bonus: 20, label: "20% Bonus" },
  { tier: 3, min: 250, max: 499, bonus: 30, label: "30% Bonus" },
  { tier: 4, min: 500, max: 999, bonus: 40, label: "40% Bonus" },
  { tier: 5, min: 1000, max: 2499, bonus: 55, label: "55% Bonus" },
  { tier: 6, min: 2500, max: 9999, bonus: 70, label: "70% Bonus" },
];

export function DepositMpesaDetails({
  amount,
  setAmount,
  phone,
  setPhone,
  bonusTier,
  setBonusTier,
  onContinue,
}: DepositMpesaDetailsProps) {
  const amountValue = Number(amount) || 0;
  const activeBonus = BONUS_TIERS.find(b => b.tier === bonusTier) || BONUS_TIERS[2];
  const bonusAmount = (amountValue * activeBonus.bonus) / 100;
  const totalCredited = amountValue + bonusAmount;

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

      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <span className="text-white/60">BONUS</span>
          <div className="flex items-center gap-2">
            {BONUS_TIERS.map((tier) => (
              <button
                key={tier.tier}
                type="button"
                onClick={() => setBonusTier(tier.tier)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                  tier.tier === bonusTier
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "text-white/40 hover:text-white/70 bg-white/5"
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-xl bg-white/5">
            <p className="text-white/50 text-sm">Deposit</p>
            <p className="font-bold text-2xl text-white">${amountValue.toFixed(2)}</p>
          </div>
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <p className="text-green-400 text-sm">Bonus (+{activeBonus.bonus}%)</p>
            <p className="font-bold text-2xl text-green-400">+${bonusAmount.toFixed(2)}</p>
          </div>
          <div className="p-4 rounded-xl bg-[#0a0d17] border border-green-500/30">
            <p className="text-white/60 text-sm">Total Credited</p>
            <p className="font-bold text-2xl text-green-400">${totalCredited.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex-1 h-12 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-lg transition-colors hover:bg-white/10"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => {}}
          disabled={!phone || amountValue < 5}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#0fa053] to-[#0fa053]/80 text-white font-bold text-lg shadow-[0_10px_30px_rgba(15,160,83,0.3)] hover:from-[#0fa053] hover:to-[#0fa053] disabled:from-white/10 disabled:to-white/10 disabled:shadow-none disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}