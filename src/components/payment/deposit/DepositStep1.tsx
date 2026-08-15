import { ArrowRight, Smartphone, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import MpesaLogo from "@/assets/payment-logos/mpesa.png";
import CryptoLogo from "@/assets/payment-logos/bitcoin.png";

interface DepositStep1Props {
  selectedMethod: "mpesa" | "crypto" | null;
  onSelectMethod: (method: "mpesa" | "crypto") => void;
  onContinue: () => void;
}

export function DepositStep1({
  selectedMethod,
  onSelectMethod,
  onContinue,
}: DepositStep1Props) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold text-white">Choose Payment Method</h1>
        <p className="mt-2 text-white/60">Select how you'd like to fund your account</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelectMethod("mpesa")}
          className={`relative group p-6 rounded-2xl border-2 transition-all duration-300 ${
            selectedMethod === "mpesa"
              ? "border-[#0fa053] bg-[#0fa053]/10 shadow-lg shadow-[#0fa053]/20"
              : "border-white/10 bg-white/[0.03] hover:border-[#0fa053]/30 hover:bg-white/[0.05]"
          }`}
        >
          <div className="absolute -top-2 -right-2">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-400 bg-green-500/20 rounded-full">
              Popular
            </span>
          </div>
          <div className="flex items-center gap-4">
            <img src="/payment-logos/mpesa.png" alt="M-PESA" className="h-20 w-20 object-contain" />
            <div className="flex-1">
              <h3 className="font-bold text-lg text-white">M-PESA</h3>
              <p className="text-sm text-white/60 mt-1">Mobile Money</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-white/50">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Instant
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Secure
                </span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-4 right-4">
            {selectedMethod === "mpesa" ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/20 text-white/40">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectMethod("crypto")}
          className={`relative group p-6 rounded-2xl border-2 transition-all duration-300 ${
            selectedMethod === "crypto"
              ? "border-[#f1a526] bg-[#f1a526]/10 shadow-lg shadow-[#f1a526]/20"
              : "border-white/10 bg-white/[0.03] hover:border-[#f1a526]/30 hover:bg-white/[0.05]"
          }`}
        >
          <div className="absolute -top-2 -right-2">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400 bg-amber-500/20 rounded-full">
              Crypto
            </span>
          </div>
          <div className="flex items-center gap-4">
            <img src="/payment-logos/bitcoin.png" alt="Bitcoin" className="h-20 w-20 object-contain" />
            <div className="flex-1">
              <h3 className="font-bold text-lg text-white">Cryptocurrency</h3>
              <p className="text-sm text-white/60 mt-1">BTC, USDT, ETH, BNB & more</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-white/50">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Fast
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Secure
                </span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-4 right-4">
            {selectedMethod === "crypto" ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/20 text-white/40">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            )}
          </div>
        </button>
      </div>

      <div className="pt-4">
        <Button
          onClick={onContinue}
          disabled={!selectedMethod}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0fa053] to-[#0fa053]/80 text-white font-bold text-lg shadow-[0_10px_30px_rgba(15,160,83,0.3)] hover:from-[#0fa053] hover:to-[#0fa053] disabled:from-white/10 disabled:to-white/10 disabled:shadow-none"
        >
          Continue
          <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Button>
      </div>
    </div>
  );
}