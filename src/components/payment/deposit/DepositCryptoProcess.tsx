import { Loader2, QrCode, Copy, Shield, AlertTriangle, Clock, CheckCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { CryptoDepositInstructionPayload } from "@/lib/cryptoDeposits";

interface DepositCryptoProcessProps {
  coin: string;
  network: string;
  amount: string;
  instruction: CryptoDepositInstructionPayload | null;
  onBack: () => void;
  onComplete: () => void;
}

const COIN_INFO: Record<string, { name: string; icon: string; color: string }> = {
  "BTC": { name: "Bitcoin", icon: "₿", color: "text-amber-400" },
  "USDT": { name: "Tether", icon: "₮", color: "text-green-400" },
  "USDC": { name: "USD Coin", icon: "USDC", color: "text-blue-400" },
  "ETH": { name: "Ethereum", icon: "Ξ", color: "text-slate-400" },
  "BNB": { name: "BNB", icon: "BNB", color: "text-amber-400" },
  "TRX": { name: "TRON", icon: "TRX", color: "text-red-400" },
  "LTC": { name: "Litecoin", icon: "Ł", color: "text-slate-400" },
  "DOGE": { name: "Dogecoin", icon: "Ð", color: "text-amber-400" },
  "SOL": { name: "Solana", icon: "SOL", color: "text-purple-400" },
  "XRP": { name: "Ripple", icon: "XRP", color: "text-blue-400" },
  "TON": { name: "Toncoin", icon: "TON", color: "text-cyan-400" },
};

const NETWORK_INFO: Record<string, { name: string; minConfirmations: number; approxTime: string }> = {
  "TRC20": { name: "TRON (TRC20)", minConfirmations: 1, approxTime: "~1-2 min" },
  "ERC20": { name: "Ethereum (ERC20)", minConfirmations: 12, approxTime: "~3 min" },
  "BEP20": { name: "BSC (BEP20)", minConfirmations: 15, approxTime: "~1 min" },
  "SOL": { name: "Solana", minConfirmations: 32, approxTime: "~10 sec" },
  "TON": { name: "TON", minConfirmations: 1, approxTime: "~1 min" },
  "BITCOIN": { name: "Bitcoin", minConfirmations: 2, approxTime: "~10-30 min" },
  "LIGHTNING": { name: "Lightning Network", minConfirmations: 1, approxTime: "Instant" },
  "BASE": { name: "Base", minConfirmations: 1, approxTime: "~2 min" },
  "ARBITRUM": { name: "Arbitrum", minConfirmations: 1, approxTime: "~2 min" },
  "OPTIMISM": { name: "Optimism", minConfirmations: 1, approxTime: "~2 min" },
  "BEP2": { name: "BNB Beacon Chain", minConfirmations: 1, approxTime: "~1 min" },
  "LITECOIN": { name: "Litecoin", minConfirmations: 2, approxTime: "~5 min" },
  "DOGECOIN": { name: "Dogecoin", minConfirmations: 6, approxTime: "~5 min" },
  "SOLANA": { name: "Solana", minConfirmations: 32, approxTime: "~10 sec" },
  "XRP LEDGER": { name: "XRP Ledger", minConfirmations: 1, approxTime: "~3 sec" },
  "TON": { name: "TON", minConfirmations: 1, approxTime: "~1 min" },
};

export function DepositCryptoProcess({
  coin,
  network,
  amount,
  instruction,
  onBack,
  onComplete,
}: DepositCryptoProcessProps) {
  const [status, setStatus] = useState<"waiting" | "detected" | "confirming" | "completed">("waiting");
  const [confirmations, setConfirmations] = useState(0);

  const depositAddress = instruction?.address ?? "";
  const depositAmount = instruction?.amount ?? (Number(amount) || 0);

  useEffect(() => {
    if (status === "waiting" && instruction?.instruction_status) {
      const providerStatus = instruction.instruction_status;
      if (providerStatus === "completed") {
        setStatus("completed");
        setTimeout(() => onComplete(), 1000);
      } else if (["pending", "paid_unconfirmed", "processing"].includes(providerStatus)) {
        setStatus("detected");
        const checkTimer = setInterval(() => {
          setConfirmations((prev) => prev + 1);
        }, 4000);
        return () => clearInterval(checkTimer);
      }
    }
  }, [instruction, status]);

  const amountValue = Number(amount) || 0;
  const coinInfo = COIN_INFO[coin] || { name: coin, icon: coin, color: "text-white" };
  const networkInfo = NETWORK_INFO[network.toUpperCase()] || { name: network, minConfirmations: 1, approxTime: "~1 min" };

  const copyAddress = () => {
    if (depositAddress) navigator.clipboard.writeText(depositAddress);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Complete Your Crypto Deposit</h1>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ${coin.color}`}>
            <span className="text-2xl font-bold">{coinInfo.icon}</span>
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">{coinInfo.name}</h3>
            <p className="text-white/60">{network}</p>
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

        <div className="space-y-4">
          {depositAddress ? (
            <>
              <div>
                <div className="flex items-center gap-2 text-sm mb-2">
                  <span className="text-white/60">Deposit Address</span>
                  <span className="text-white/40">•</span>
                  <span className="text-white/60">Network:</span>
                  <span className="font-bold text-white">{network}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#0a0d14] border border-white/10 rounded-lg px-4 py-3 font-mono text-sm text-white break-all">
                    {depositAddress}
                  </div>
                  <button
                    type="button"
                    onClick={copyAddress}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                    aria-label="Copy address"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60 mb-1 block">QR Code</label>
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(depositAddress)}`}
                      alt="Deposit QR Code"
                      className="h-40 w-40"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-white/60">Amount to Send</span>
                    <p className="font-bold text-white">${depositAmount.toFixed(2)}</p>
                  </div>
              <div>
                <span className="text-white/60">Status</span>
                <p className="font-bold text-white flex items-center gap-2">
                  {status === "waiting" && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
                      Waiting for payment...
                    </>
                  )}
                  {status === "detected" && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                      Payment detected - {confirmations}/{networkInfo.minConfirmations} confirmations
                    </>
                  )}
                  {status === "confirming" && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                      Confirming {confirmations}/{networkInfo.minConfirmations}...
                    </>
                  )}
                  {status === "completed" && (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Completed
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-400 mb-3" />
              <p className="text-white/70">Generating your secure deposit address...</p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-white/10">
          <p className="text-sm text-white/60">
            <strong>Important:</strong> Send only {coin} on the {network} network to this address.
            Sending any other currency or using a different network will result in permanent loss of funds.
          </p>
        </div>
      </div>

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
          onClick={onComplete}
          disabled={!depositAddress}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#f1a526] to-[#f1a526]/80 text-white font-bold text-lg shadow-[0_10px_30px_rgba(241,165,38,0.3)] hover:from-[#f1a526] hover:to-[#f1a526] disabled:from-white/10 disabled:to-white/10 disabled:shadow-none disabled:cursor-not-allowed"
        >
          {status === "completed" ? "Done" : "Continue"}
        </button>
      </div>
    </div>
  );
}