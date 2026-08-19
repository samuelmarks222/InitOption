import { ArrowRight, ChevronDown, Copy, QrCode, AlertTriangle, Shield, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

interface WithdrawCryptoDetailsProps {
  coin: string;
  setCoin: (coin: string) => void;
  network: string;
  setNetwork: (network: string) => void;
  amount: string;
  setAmount: (amount: string) => void;
  address: string;
  setAddress: (address: string) => void;
  memo: string;
  setMemo: (memo: string) => void;
  availableBalance: number;
  onContinue: () => void;
  onBack: () => void;
}

const COINS = [
  { symbol: "BTC", name: "Bitcoin", networks: ["Bitcoin", "Lightning"], icon: "₿", color: "text-amber-400" },
  { symbol: "USDT", name: "Tether", networks: ["TRC20", "ERC20", "BEP20", "SOL", "TON"], icon: "₮", color: "text-green-400" },
  { symbol: "USDC", name: "USD Coin", networks: ["ERC20", "SOL", "TRC20", "BEP20", "BASE"], icon: "USDC", color: "text-blue-400" },
  { symbol: "ETH", name: "Ethereum", networks: ["ERC20", "BASE", "Arbitrum", "Optimism"], icon: "Ξ", color: "text-slate-400" },
  { symbol: "BNB", name: "BNB", networks: ["BEP20", "BEP2"], icon: "BNB", color: "text-amber-400" },
  { symbol: "TRX", name: "TRON", networks: ["TRC20"], icon: "TRX", color: "text-red-400" },
  { symbol: "LTC", name: "Litecoin", networks: ["Litecoin"], icon: "Ł", color: "text-slate-400" },
  { symbol: "DOGE", name: "Dogecoin", networks: ["Dogecoin"], icon: "Ð", color: "text-amber-400" },
  { symbol: "SOL", name: "Solana", networks: ["SOL"], icon: "SOL", color: "text-purple-400" },
  { symbol: "XRP", name: "Ripple", networks: ["XRP Ledger"], icon: "XRP", color: "text-blue-400" },
  { symbol: "TRX", name: "TRON", networks: ["TRC20"], icon: "TRX", color: "text-red-400" },
  { symbol: "TON", name: "Toncoin", networks: ["TON"], icon: "TON", color: "text-cyan-400" },
];

const NETWORK_INFO: Record<string, { name: string; minConfirmations: number; approxTime: string; fee: string }> = {
  "TRC20": { name: "TRON (TRC20)", minConfirmations: 1, approxTime: "~1-2 min", fee: "~1 USDT" },
  "ERC20": { name: "Ethereum (ERC20)", minConfirmations: 12, approxTime: "~3 min", fee: "~5 USDT" },
  "BEP20": { name: "BSC (BEP20)", minConfirmations: 15, approxTime: "~1 min", fee: "~0.5 USDT" },
  "SOL": { name: "Solana", minConfirmations: 32, approxTime: "~10 sec", fee: "~0.01 SOL" },
  "TON": { name: "TON", minConfirmations: 1, approxTime: "~1 min", fee: "~0.1 TON" },
  "BITCOIN": { name: "Bitcoin", minConfirmations: 2, approxTime: "~10-30 min", fee: "~0.0005 BTC" },
  "LIGHTNING": { name: "Lightning Network", minConfirmations: 1, approxTime: "Instant", fee: "~0.0001 BTC" },
  "BASE": { name: "Base", minConfirmations: 1, approxTime: "~2 min", fee: "~1 USDT" },
  "ARBITRUM": { name: "Arbitrum", minConfirmations: 1, approxTime: "~2 min", fee: "~1 USDT" },
  "OPTIMISM": { name: "Optimism", minConfirmations: 1, approxTime: "~2 min", fee: "~1 USDT" },
  "BEP2": { name: "BNB Beacon Chain", minConfirmations: 1, approxTime: "~1 min", fee: "~0.01 BNB" },
  "LITECOIN": { name: "Litecoin", minConfirmations: 2, approxTime: "~5 min", fee: "~0.001 LTC" },
  "DOGECOIN": { name: "Dogecoin", minConfirmations: 6, approxTime: "~5 min", fee: "~1 DOGE" },
  "SOLANA": { name: "Solana", minConfirmations: 32, approxTime: "~10 sec", fee: "~0.01 SOL" },
  "XRP LEDGER": { name: "XRP Ledger", minConfirmations: 1, approxTime: "~3 sec", fee: "~0.00001 XRP" },
};

export function WithdrawCryptoDetails({
  coin,
  setCoin,
  network,
  setNetwork,
  amount,
  setAmount,
  address,
  setAddress,
  memo,
  setMemo,
  availableBalance,
  onContinue,
  onBack,
}: WithdrawCryptoDetailsProps) {
  const [networks, setNetworks] = useState<string[]>([]);
  const [showNetworks, setShowNetworks] = useState(false);
  const amountValue = Number(amount) || 0;

  const coinInfo = COINS.find(c => c.symbol === coin) || COINS[1];

  const handleCoinChange = (newCoin: string) => {
    setCoin(newCoin);
    const coinData = COINS.find(c => c.symbol === newCoin);
    if (coinData && coinData.networks.length > 0) {
      setNetworks(coinData.networks);
      setNetwork(coinData.networks[0]);
    }
  };

  const networkInfo = NETWORK_INFO[network.toUpperCase()] || { name: network, minConfirmations: 1, approxTime: "~1 min", fee: "~1" };

  useEffect(() => {
    const coinData = COINS.find(c => c.symbol === coin);
    if (coinData && coinData.networks.length > 0) {
      setNetworks(coinData.networks);
      if (!coinData.networks.includes(network)) {
        setNetwork(coinData.networks[0]);
      }
    }
  }, [coin]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Cryptocurrency Withdrawal</h1>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-white">Cryptocurrency</label>
          <div className="relative mt-2">
            <Select value={coin} onValueChange={setCoin}>
              <SelectTrigger className="bg-[#0a0d17] border border-white/10 rounded-xl text-white">
                <SelectValue placeholder="Select cryptocurrency" />
              </SelectTrigger>
              <SelectContent className="bg-[#141a2a] border border-white/10">
                {COINS.map(coin => (
                  <SelectItem key={coin.symbol} value={coin.symbol}>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-lg ${coin.color}`}>{coin.icon}</span>
                      <div>
                        <p className="font-medium text-white">{coin.symbol}</p>
                        <p className="text-xs text-white/50">{coin.name}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-white">Network</label>
          <div className="relative mt-2">
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger className="bg-[#0a0d17] border border-white/10 rounded-xl text-white">
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent className="bg-[#141a2a] border border-white/10">
                {networks.map(net => (
                  <SelectItem key={net} value={net}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{NETWORK_INFO[net.toUpperCase()]?.name || net}</span>
                      <span className="text-xs text-white/50">{NETWORK_INFO[net.toUpperCase()]?.approxTime || "~1 min"}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-2 text-sm text-white/50">
            Network: <span className="text-white/70">{networkInfo.name}</span> • 
            Fee: <span className="text-white/70">{networkInfo.fee}</span> • 
            Est. time: <span className="text-white/70">{networkInfo.approxTime}</span>
          </p>
        </div>

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
          <label className="text-sm font-medium text-white">Destination Wallet Address</label>
          <div className="relative mt-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter wallet address"
              className="w-full pl-4 pr-4 py-4 bg-[#0a0d17] border border-white/10 rounded-xl text-lg font-bold text-white outline-none placeholder:text-white/30 focus:border-[#0fa053]/50 focus:ring-1 focus:ring-[#0fa053]/20"
            />
          </div>
          <p className="mt-2 text-sm text-white/50">Make sure the address is correct and matches the selected network</p>
        </div>

        {network === "XRP LEDGER" || network === "TON" || network === "TRC20" ? (
          <div>
            <label className="text-sm font-medium text-white">{network === "XRP LEDGER" ? "Destination Tag" : network === "TON" ? "Memo/Comment" : "Memo"}</label>
            <div className="relative mt-2">
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder={`Enter ${network === "XRP LEDGER" ? "Destination Tag" : network === "TON" ? "Memo/Comment" : "Memo"} (optional)`}
                className="w-full pl-4 pr-4 py-4 bg-[#0a0d17] border border-white/10 rounded-xl text-lg font-bold text-white outline-none placeholder:text-white/30 focus:border-[#0fa053]/50 focus:ring-1 focus:ring-[#0fa053]/20"
              />
            </div>
            <p className="mt-2 text-sm text-white/50">Required for {network} deposits</p>
          </div>
        ) : null}

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="text-white/50 text-sm">Available Balance</span>
              <p className="font-bold text-white">${availableBalance.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-white/50 text-sm">Fee</span>
              <p className="font-bold text-white">{networkInfo.fee}</p>
            </div>
            <div>
              <span className="text-white/50 text-sm">You Receive</span>
              <p className="font-bold text-green-400">${(amountValue - (networkInfo.fee.includes("USDT") ? 1 : networkInfo.fee.includes("BTC") ? 0.0005 : 0)).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <span className="text-sm text-white/70">Important: Double-check the wallet address and network. Sending to wrong address or network will result in permanent loss of funds.</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/50">Coin</span>
              <p className="font-bold text-white">{coin}</p>
            </div>
            <div>
              <span className="text-white/50">Network</span>
              <p className="font-bold text-white">{network}</p>
            </div>
            <div>
              <span className="text-white/50">Min. Withdrawal</span>
              <p className="font-bold text-white">$10</p>
            </div>
            <div>
              <span className="text-white/50">Fee</span>
              <p className="font-bold text-white">{networkInfo.fee}</p>
            </div>
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
            onClick={onContinue}
            disabled={!amount || Number(amount) < 10 || !address || amountValue > availableBalance}
            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#f1a526] to-[#f1a526]/80 text-white font-bold text-lg shadow-[0_10px_30px_rgba(241,165,38,0.3)] hover:from-[#f1a526] hover:to-[#f1a526] disabled:from-white/10 disabled:to-white/10 disabled:shadow-none disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}