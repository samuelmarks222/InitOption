import { Loader2, Clock, ShieldCheck, Smartphone, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { convertUsdToCurrency, formatCurrencyAmount } from "@/lib/currency";

interface DepositMpesaProcessProps {
  phone: string;
  amount: string;
  status: "pending" | "approved" | "rejected" | "processing";
  onBack: () => void;
  onComplete: () => void;
}

export function DepositMpesaProcess({
  phone,
  amount,
  status,
  onBack,
  onComplete,
}: DepositMpesaProcessProps) {
  const [timeLeft, setTimeLeft] = useState(120);
  const { formatMoney } = useCurrency();
  const amountValue = Number(amount || 0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (status === "approved") {
      toast({ title: "Deposit Successful", description: "Your account has been credited." });
      setTimeout(onComplete, 1000);
    }
  }, [status, onComplete]);

  return (
    <div className="space-y-6 text-center">
      <h1 className="text-3xl font-bold text-white">M-PESA Payment</h1>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <div className="mb-8">
          {status === "pending" && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-yellow-500/20">
                <Loader2 className="h-12 w-12 text-yellow-400 animate-spin" />
              </div>
              <div>
                <h3 className="font-bold text-2xl text-white">Payment Request Sent</h3>
                <p className="text-white/60 mt-2">Check your phone and enter your M-PESA PIN</p>
                <div className="mt-4 flex items-center justify-center gap-4 text-sm">
                  <div className="px-4 py-2 rounded-lg bg-white/5">
                    <p className="text-white/50">Amount</p>
                    <p className="font-bold text-white">{amountValue > 0 ? formatMoney(amountValue) : "$0.00"}</p>
                    {amountValue > 0 && (
                      <p className="text-[11px] text-white/40">{formatCurrencyAmount(convertUsdToCurrency(amountValue, "KES"), "KES")}</p>
                    )}
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-white/5">
                    <p className="text-white/50">Phone</p>
                    <p className="font-bold text-white">{phone || "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {status === "approved" && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle className="h-12 w-12 text-green-400" />
              </div>
              <div>
                <h3 className="font-bold text-2xl text-white">Deposit Successful</h3>
                <p className="text-white/60 mt-2">Your account has been credited</p>
              </div>
            </div>
          )}
          {status === "rejected" && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500/20">
                <svg className="h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-2xl text-white">Deposit Failed</h3>
                <p className="text-white/60 mt-2">No funds were added. Please try again.</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center p-4 rounded-xl bg-white/5">
              <p className="text-white/50 text-sm">Time Remaining</p>
              <p className="font-bold text-2xl text-yellow-400">{status === "pending" ? formatTime(timeLeft) : "00:00"}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5">
              <p className="text-white/50 text-sm">Status</p>
              <p className="font-bold text-2xl">
                {status === "pending" && <span className="text-yellow-400">Pending</span>}
                {status === "approved" && <span className="text-green-400">Approved</span>}
                {status === "rejected" && <span className="text-red-400">Failed</span>}
              </p>
            </div>
          </div>
        </div>

        {status === "pending" && (
          <div className="mt-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-3 text-sm text-yellow-400">
              <Smartphone className="h-5 w-5" />
              <span>Check your phone and enter your M-PESA PIN to complete the payment</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={status !== "pending"}
          className="flex-1 h-12 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-lg transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={status !== "approved"}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#0fa053] to-[#0fa053]/80 text-white font-bold text-lg shadow-[0_10px_30px_rgba(15,160,83,0.3)] hover:from-[#0fa053] hover:to-[#0fa053] disabled:from-white/10 disabled:to-white/10 disabled:shadow-none disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}