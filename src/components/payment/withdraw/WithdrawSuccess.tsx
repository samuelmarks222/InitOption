import { CheckCircle, Wallet, ArrowRight, Clock, ShieldCheck, Zap, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WithdrawSuccessProps {
  method: "mpesa" | "crypto";
  coin: string;
  network: string;
  amount: string;
  onBackToTrading: () => void;
}

export function WithdrawSuccess({
  method,
  coin,
  network,
  amount,
  onBackToTrading,
}: WithdrawSuccessProps) {
  const amountValue = Number(amount) || 0;

  return (
    <div className="space-y-6 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-500/20 mx-auto mb-6">
        <svg className="h-12 w-12 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-white">Withdrawal Submitted</h1>
      <p className="text-white/60">Your withdrawal request has been submitted for review.</p>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 max-w-md mx-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-white/60">Amount</span>
            <span className="font-bold text-xl text-white">${amountValue.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Fee</span>
            <span className="font-bold text-xl text-amber-400">${method === "crypto" ? "~1" : (amountValue * 0.02).toFixed(2)}</span>
          </div>
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white">Total</span>
              <span className="text-2xl font-bold text-amber-400">${(amountValue * 0.98).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 max-w-md mx-auto">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-white/50">Method</span>
            <p className="font-bold text-white">{method === "crypto" ? `Crypto (${coin} - ${network})` : "M-PESA"}</p>
          </div>
          <div>
            <span className="text-white/50">Status</span>
            <p className="font-bold text-amber-400">Pending Review</p>
          </div>
          <div>
            <span className="text-white/50">Date</span>
            <p className="font-bold text-white">{new Date().toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-white/50">Reference</span>
            <p className="font-bold text-white text-xs">#WD-{Math.random().toString(36).substr(2, 8).toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5 text-amber-400" />
          <span className="text-sm text-white/70">Crypto withdrawals are reviewed and approved by our payment team before funds are sent.</span>
        </div>
        <div className="text-sm text-white/60">
          M-PESA withdrawals are processed during business hours. You will receive a notification once your withdrawal is processed.
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
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#f1a526] to-[#f1a526]/80 text-white font-bold text-lg shadow-[0_10px_30px_rgba(241,165,38,0.3)] hover:from-[#f1a526] hover:to-[#f1a526]"
          onClick={onBackToTrading}
        >
          View Transaction
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}