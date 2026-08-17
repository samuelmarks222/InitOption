import { useEffect, useRef, useState } from "react";
import { CheckCircle, ExternalLink, Loader2, RefreshCw, Shield, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  CryptoDepositInstructionPayload,
  getCryptoDepositPaymentStatus,
  isCryptoDepositCompleted,
  isCryptoDepositFailed,
} from "@/lib/cryptoDeposits";

interface DepositCryptoProcessProps {
  coin: string;
  network: string;
  amount: string;
  instruction: CryptoDepositInstructionPayload | null;
  onBack: () => void;
  onComplete: () => void;
}

export function DepositCryptoProcess({
  coin,
  network,
  amount,
  instruction,
  onBack,
  onComplete,
}: DepositCryptoProcessProps) {
  const [checking, setChecking] = useState(false);
  const [resolved, setResolved] = useState<null | "completed" | "failed">(null);
  const pollRef = useRef<number | null>(null);

  const checkoutUrl = instruction?.hosted_checkout_url ?? "";
  const depositAmount = instruction?.amount ?? (Number(amount) || 0);

  const openCheckout = () => {
    if (!checkoutUrl) return;
    window.location.href = checkoutUrl;
  };

  const checkStatus = async () => {
    if (!instruction?.instruction_id) return;
    setChecking(true);
    try {
      const status = await getCryptoDepositPaymentStatus({ instructionId: instruction.instruction_id });
      if (isCryptoDepositCompleted(status)) {
        setResolved("completed");
        window.setTimeout(() => onComplete(), 800);
      } else if (isCryptoDepositFailed(status)) {
        setResolved("failed");
      }
    } catch {
      toast({ title: "Unable to check payment status", variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!instruction?.instruction_id) return;
    pollRef.current = window.setInterval(() => {
      void checkStatus();
    }, 8000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [instruction?.instruction_id]);

  useEffect(() => {
    if (checkoutUrl && instruction?.instruction_id) {
      openCheckout();
    }
  }, [checkoutUrl, instruction?.instruction_id]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Complete Your Crypto Deposit</h1>

      {resolved === "completed" ? (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
          <h3 className="mt-4 text-xl font-bold text-white">Deposit Successful</h3>
          <p className="mt-2 text-sm text-white/70">
            ${depositAmount.toFixed(2)} has been credited to your account.
          </p>
          <button
            type="button"
            onClick={onComplete}
            className="mt-6 h-12 rounded-xl bg-gradient-to-r from-[#f1a526] to-[#f1a526]/80 px-8 text-white font-bold shadow-[0_10px_30px_rgba(241,165,38,0.3)]"
          >
            Done
          </button>
        </div>
      ) : resolved === "failed" ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-4 text-xl font-bold text-white">Payment Not Received</h3>
          <p className="mt-2 text-sm text-white/70">
            Your deposit could not be confirmed. No funds were added to your account. Please try again.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-6 h-12 rounded-xl border border-white/10 bg-white/5 px-8 text-white font-bold transition-colors hover:bg-white/10"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-white">Redirecting to Plisio...</h3>
              <p className="text-sm text-white/60">
                Complete your payment on Plisio's secure hosted checkout.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center mb-6">
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-white/50 text-sm">Amount</p>
              <p className="font-bold text-2xl text-white">${depositAmount.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-white/50 text-sm">Coin</p>
              <p className="font-bold text-white">{coin}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-white/50 text-sm">Network</p>
              <p className="font-bold text-white">{network}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0a0d17] p-4">
            <Shield className="h-5 w-5 text-green-400 shrink-0" />
            <p className="text-sm text-white/70">
              You will pay the crypto equivalent on Plisio. Your balance updates automatically once the payment is
              confirmed on the blockchain. Do not close the window before the payment is complete.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={openCheckout}
              disabled={!checkoutUrl}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f1a526] to-[#f1a526]/80 text-white font-bold text-lg shadow-[0_10px_30px_rgba(241,165,38,0.3)] hover:from-[#f1a526] hover:to-[#f1a526] disabled:from-white/10 disabled:to-white/10 disabled:shadow-none"
            >
              <ExternalLink className="h-5 w-5" />
              Open Payment Page
            </button>
            <button
              type="button"
              onClick={() => void checkStatus()}
              disabled={checking}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-white font-bold transition-colors hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCw className={`h-5 w-5 ${checking ? "animate-spin" : ""}`} />
              {checking ? "Checking..." : "I've completed the payment — check status"}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 h-12 rounded-xl border border-white/10 bg-white/5 text-white font-bold transition-colors hover:bg-white/10"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
