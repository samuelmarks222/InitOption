import { Smartphone, ShieldCheck, Zap, ArrowRight, CreditCard, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KesEquivalent } from "@/components/payment/KesEquivalent";

interface WithdrawMpesaDetailsProps {
  amount: string;
  setAmount: (amount: string) => void;
  phone: string;
  setPhone: (phone: string) => void;
  availableBalance: number;
  onContinue: () => void;
  onBack: () => void;
}

export function WithdrawMpesaDetails({
  amount,
  setAmount,
  phone,
  setPhone,
  availableBalance,
  onContinue,
  onBack,
}: WithdrawMpesaDetailsProps) {
  const amountValue = Number(amount) || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">M-PESA Withdrawal</h1>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-white">Amount (USD)</label>
          <div className="relative mt-2">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40">
              <span className="text-xl font-bold">$</span>
            </div>
            <input
              type="number"
              step="1"
              min="10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full pl-10 pr-4 py-4 bg-[#0a0d17] border border-white/10 rounded-xl text-xl font-bold text-white outline-none placeholder:text-white/30 focus:border-[#0fa053]/50 focus:ring-1 focus:ring-[#0fa053]/20"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-white">M-PESA Phone Number</label>
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
          <p className="mt-2 text-sm text-white/50">Funds will be sent to this M-PESA number</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-4 rounded-xl bg-white/5">
            <p className="text-white/50 text-sm">Amount</p>
            <p className="font-bold text-2xl text-white">${amountValue.toFixed(2)}</p>
          </div>
          <div className="p-4 rounded-xl bg-[#0a0d17] border border-white/10">
            <p className="text-white/60 text-sm">You Receive</p>
            <p className="font-bold text-2xl text-green-400">${amountValue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <span className="text-white/50 text-sm">Available Balance</span>
            <p className="font-bold text-white">${availableBalance.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-white/50 text-sm">You Receive</span>
            <p className="font-bold text-green-400">${amountValue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {amountValue > 0 && <KesEquivalent amountUsd={amountValue} label="You will receive approximately" />}

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
          disabled={!phone || amountValue < 10 || amountValue > availableBalance}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#0fa053] to-[#0fa053]/80 text-white font-bold text-lg shadow-[0_10px_30px_rgba(15,160,83,0.3)] hover:from-[#0fa053] hover:to-[#0fa053] disabled:from-white/10 disabled:to-white/10 disabled:shadow-none disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}