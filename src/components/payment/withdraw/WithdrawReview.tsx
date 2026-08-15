import { ArrowRight, ChevronDown, Copy, QrCode, AlertTriangle, Shield, Clock, Loader2, CheckCircle, AlertCircle, Smartphone, ShieldCheck, Bitcoin, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface WithdrawReviewProps {
  method: "mpesa" | "crypto";
  coin: string;
  network: string;
  amount: string;
  address: string;
  phone: string;
  memo: string;
  availableBalance: number;
  onSubmit: () => void;
  onBack: () => void;
}

const NETWORK_INFO: Record<string, { name: string; fee: string }> = {
  "TRC20": { name: "TRON (TRC20)", fee: "~1 USDT" },
  "ERC20": { name: "Ethereum (ERC20)", fee: "~5 USDT" },
  "BEP20": { name: "BSC (BEP20)", fee: "~0.5 USDT" },
  "SOL": { name: "Solana", fee: "~0.01 SOL" },
  "TON": { name: "TON", fee: "~0.1 TON" },
  "BITCOIN": { name: "Bitcoin", fee: "~0.0005 BTC" },
  "LIGHTNING": { name: "Lightning Network", fee: "~0.0001 BTC" },
  "BASE": { name: "Base", fee: "~1 USDT" },
  "ARBITRUM": { name: "Arbitrum", fee: "~1 USDT" },
  "OPTIMISM": { name: "Optimism", fee: "~1 USDT" },
  "BEP2": { name: "BNB Beacon Chain", fee: "~0.01 BNB" },
  "LITECOIN": { name: "Litecoin", fee: "~0.001 LTC" },
  "DOGECOIN": { name: "Dogecoin", fee: "~1 DOGE" },
  "SOLANA": { name: "Solana", fee: "~0.01 SOL" },
  "XRP LEDGER": { name: "XRP Ledger", fee: "~0.00001 XRP" },
  "TON": { name: "TON", fee: "~0.1 TON" },
};

export function WithdrawReview({
  method,
  coin,
  network,
  amount,
  address,
  phone,
  memo,
  availableBalance,
  onSubmit,
  onBack,
}: WithdrawReviewProps) {
  const amountValue = Number(amount) || 0;
  const networkInfo = NETWORK_INFO[network.toUpperCase()] || { name: network, fee: "~1" };
  const fee = networkInfo.fee || "~1";
  const total = amountValue + (method === "crypto" ? 0 : amountValue * 0.02);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Review Withdrawal</h1>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20">
            <span className="text-2xl font-bold">{method === "crypto" ? "₿" : "📱"}</span>
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">{method === "crypto" ? "Cryptocurrency" : "M-PESA"} Withdrawal</h3>
            <p className="text-white/60">Review your withdrawal details before submitting</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="grid grid-cols-2 gap-4 text-center mb-4">
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-white/50 text-sm">Amount</p>
                <p className="font-bold text-2xl text-white">${amountValue.toFixed(2)}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-white/50 text-sm">Fee</p>
                <p className="font-bold text-white">${fee}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#0a0d17] border border-white/10">
                <p className="text-white/60 text-sm">Total</p>
                <p className="font-bold text-2xl text-amber-400">${(amountValue + (method === "crypto" ? 0 : amountValue * 0.02)).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {method === "crypto" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <span className="text-sm text-white/70">Important: Double-check the wallet address and network. Sending to wrong address or network will result in permanent loss of funds.</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-white/50">Coin</label>
                    <p className="font-bold text-white">{coin}</p>
                  </div>
                  <div>
                    <label className="text-sm text-white/50">Network</label>
                    <p className="font-bold text-white">{network}</p>
                  </div>
                  <div>
                    <label className="text-sm text-white/50">Destination Address</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-[#0a0d14] border border-white/10 rounded-lg px-4 py-3 font-mono text-sm text-white break-all">
                        {address}
                      </div>
                    </div>
                  </div>
                  {memo && (
                    <div>
                      <label className="text-sm text-white/50">Memo/Tag</label>
                      <p className="font-bold text-white mt-1">{memo}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )} : (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-white/50">Phone Number</label>
                    <p className="font-bold text-white mt-1">{phone}</p>
                  </div>
                  <div>
                    <label className="text-sm text-white/50">Method</label>
                    <p className="font-bold text-white mt-1">M-PESA</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <span className="text-sm text-white/70">Your withdrawal will be reviewed and processed according to our payment policy.</span>
                </div>
              </div>
            </div>
          )} : null}

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-white/50 text-sm">Available Balance</span>
                <p className="font-bold text-white">${availableBalance.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-white/50 text-sm">Total Deducted</span>
                <p className="font-bold text-white">${(amountValue + (method === "crypto" ? 0 : amountValue * 0.02)).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-white/50 text-sm">Remaining</span>
                <p className="font-bold text-white">${(availableBalance - amountValue - (method === "crypto" ? 0 : amountValue * 0.02)).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <span className="text-sm text-white/70">Important: Double-check all details before submitting. Once submitted, withdrawals cannot be cancelled.</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 h-12 rounded-xl border border-white/10 bg-white/5 text-white font-bold text-lg transition-colors hover:bg-white/10"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#f1a526] to-[#f1a526]/80 text-white font-bold text-lg shadow-[0_10px_30px_rgba(241,165,38,0.3)] hover:from-[#f1a526] hover:to-[#f1a526]"
          >
            Request Withdrawal
          </button>
        </div>
      </div>
    </div>
  );
}