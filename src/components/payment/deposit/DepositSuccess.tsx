import { CheckCircle, Wallet, ArrowRight, Clock, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useCurrency } from "@/contexts/CurrencyContext";
import { KesEquivalent } from "@/components/payment/KesEquivalent";

interface DepositSuccessProps {
  method: "mpesa" | "crypto" | null;
  coin: string;
  network: string;
  amount: string;
  onBackToTrading: () => void;
}

export function DepositSuccess({
  method,
  coin,
  network,
  amount,
  onBackToTrading,
}: DepositSuccessProps) {
  const amountValue = Number(amount) || 0;
  const bonusAmount = amountValue * 0.3; // 30% bonus mock
  const totalCredited = amountValue + bonusAmount;
  const { formatMoney } = useCurrency();

  return (
    <div className="space-y-6 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20 mx-auto mb-6">
        <svg className="h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-white">Payment Successful</h1>
      <p className="text-white/60">Your deposit has been successfully received.</p>

      <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-6 max-w-md mx-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-white/60">Deposit</span>
            <span className="font-bold text-xl text-white">{formatMoney(amountValue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Bonus</span>
            <span className="font-bold text-xl text-green-400">+{formatMoney(bonusAmount)}</span>
          </div>
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">Total Credited</span>
              <span className="text-2xl font-bold text-green-400">{formatMoney(totalCredited)}</span>
            </div>
          </div>
        </div>
      </div>

      {method === "mpesa" && amountValue > 0 && <KesEquivalent amountUsd={amountValue} label="Paid approximately" />}

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 max-w-md mx-auto">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-white/50">Method</span>
            <p className="font-bold text-white">{method === "crypto" ? `Crypto (${coin} - ${network})` : "M-PESA"}</p>
          </div>
          <div>
            <span className="text-white/50">Status</span>
            <p className="font-bold text-green-400">Completed</p>
          </div>
          <div>
            <span className="text-white/50">Date</span>
            <p className="font-bold text-white">{new Date().toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-white/50">Transaction ID</span>
            <p className="font-bold text-white text-xs">#IO-{Math.random().toString(36).substr(2, 8).toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          className="flex-1 h-12 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-lg"
          onClick={onBackToTrading}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Trading
        </Button>
        <Button
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#0fa053] to-[#0fa053]/80 text-white font-bold text-lg shadow-[0_10px_30px_rgba(15,160,83,0.3)] hover:from-[#0fa053] hover:to-[#0fa053]"
          onClick={onBackToTrading}
        >
          View Transaction
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}