import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, Loader2, Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DepositCryptoMethodOption {
  id: string;
  coin_name: string;
  symbol: string;
  network: string;
  minimum_deposit_amount?: number | null;
}

interface DepositCryptoDetailsProps {
  selectedCoin: string;
  setSelectedCoin: (coin: string) => void;
  selectedNetwork: string;
  setSelectedNetwork: (network: string) => void;
  amount: string;
  setAmount: (amount: string) => void;
  cryptoMethods: DepositCryptoMethodOption[];
  onContinue: () => void;
  onBack: () => void;
}

const NETWORK_INFO: Record<string, { name: string; minConfirmations: number; approxTime: string }> = {
  "TRC20": { name: "TRON (TRC20)", minConfirmations: 1, approxTime: "~1-2 min" },
  "ERC20": { name: "Ethereum (ERC20)", minConfirmations: 12, approxTime: "~3 min" },
  "BEP20": { name: "BSC (BEP20)", minConfirmations: 15, approxTime: "~1 min" },
  "SOL": { name: "Solana", minConfirmations: 32, approxTime: "~10 sec" },
  "TON": { name: "TON", minConfirmations: 1, approxTime: "~1 min" },
  "BITCOIN": { name: "Bitcoin", minConfirmations: 2, approxTime: "~10-30 min" },
  "LITECOIN": { name: "Litecoin", minConfirmations: 2, approxTime: "~5 min" },
  "DOGECOIN": { name: "Dogecoin", minConfirmations: 6, approxTime: "~5 min" },
};

const COIN_BRAND: Record<string, { icon: string; color: string }> = {
  "BTC": { icon: "₿", color: "text-amber-400" },
  "USDT": { icon: "₮", color: "text-green-400" },
  "ETH": { icon: "Ξ", color: "text-slate-400" },
  "BNB": { icon: "BNB", color: "text-amber-400" },
  "SOL": { icon: "SOL", color: "text-purple-400" },
  "TRX": { icon: "TRX", color: "text-red-400" },
  "LTC": { icon: "Ł", color: "text-slate-400" },
  "DOGE": { icon: "Ð", color: "text-amber-400" },
  "TON": { icon: "TON", color: "text-cyan-400" },
  "USDC": { icon: "USDC", color: "text-blue-400" },
};

export function DepositCryptoDetails({
  selectedCoin,
  setSelectedCoin,
  selectedNetwork,
  setSelectedNetwork,
  amount,
  setAmount,
  cryptoMethods,
  onContinue,
  onBack,
}: DepositCryptoDetailsProps) {
  const coins = useMemo(() => {
    const seen = new Set<string>();
    return cryptoMethods.filter((method) => {
      if (seen.has(method.symbol)) return false;
      seen.add(method.symbol);
      return true;
    });
  }, [cryptoMethods]);

  const activeCoin = coins.find((coin) => coin.symbol === selectedCoin) ?? coins[0];

  const networks = useMemo(
    () => cryptoMethods.filter((method) => method.symbol === activeCoin?.symbol).map((method) => method.network),
    [cryptoMethods, activeCoin?.symbol],
  );

  const activeNetwork = networks.includes(selectedNetwork) ? selectedNetwork : (networks[0] ?? "");

  useEffect(() => {
    if (activeCoin && activeCoin.symbol !== selectedCoin) {
      setSelectedCoin(activeCoin.symbol);
    }
  }, [activeCoin, selectedCoin, setSelectedCoin]);

  useEffect(() => {
    if (activeNetwork && activeNetwork !== selectedNetwork) {
      setSelectedNetwork(activeNetwork);
    }
  }, [activeNetwork, selectedNetwork, setSelectedNetwork]);

  const selectedMethod = cryptoMethods.find(
    (method) => method.symbol === selectedCoin && method.network === selectedNetwork,
  ) ?? null;

  const minimumDeposit = Math.max(Number(selectedMethod?.minimum_deposit_amount ?? 10), 10);
  const amountValue = Number(amount) || 0;
  const networkInfo = NETWORK_INFO[activeNetwork.toUpperCase()] || {
    name: activeNetwork || "—",
    minConfirmations: 1,
    approxTime: "~1 min",
  };
  const brand = COIN_BRAND[selectedCoin] || { icon: selectedCoin, color: "text-white" };

  if (cryptoMethods.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Cryptocurrency Details</h1>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
          <p className="mt-4 text-sm text-white/60">Loading supported cryptocurrencies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Cryptocurrency Details</h1>
        <p className="mt-1 text-sm text-white/50">Select the coin and network, then enter the deposit amount.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-white">Cryptocurrency</label>
          <div className="relative mt-2">
            <Select value={selectedCoin} onValueChange={setSelectedCoin}>
              <SelectTrigger className="bg-[#0a0d17] border border-white/10 rounded-xl text-white">
                <SelectValue placeholder="Select cryptocurrency" />
              </SelectTrigger>
              <SelectContent className="bg-[#141a2a] border border-white/10">
                {coins.map((coin) => (
                  <SelectItem key={coin.symbol} value={coin.symbol}>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-lg ${COIN_BRAND[coin.symbol]?.color || "text-white"}`}>
                        {COIN_BRAND[coin.symbol]?.icon || coin.symbol}
                      </span>
                      <div>
                        <p className="font-medium text-white">{coin.symbol}</p>
                        <p className="text-xs text-white/50">{coin.coin_name}</p>
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
            <Select value={activeNetwork} onValueChange={setSelectedNetwork}>
              <SelectTrigger className="bg-[#0a0d17] border border-white/10 rounded-xl text-white">
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent className="bg-[#141a2a] border border-white/10">
                {networks.map((net) => (
                  <SelectItem key={net} value={net}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium text-white">{NETWORK_INFO[net.toUpperCase()]?.name || net}</span>
                      <span className="flex items-center gap-1 text-xs text-white/50">
                        <Clock className="h-3 w-3" />
                        {NETWORK_INFO[net.toUpperCase()]?.approxTime || "~1 min"}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-2 text-sm text-white/50">
            Network: <span className="text-white/70">{networkInfo.name}</span> • Confirmations:{" "}
            <span className="text-white/70">{networkInfo.minConfirmations}</span> • Est. time:{" "}
            <span className="text-white/70">{networkInfo.approxTime}</span>
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
              min={minimumDeposit}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Enter amount (Min $${minimumDeposit})`}
              className="w-full pl-10 pr-4 py-4 bg-[#0a0d17] border border-white/10 rounded-xl text-xl font-bold text-white outline-none placeholder:text-white/30 focus:border-[#0fa053]/50 focus:ring-1 focus:ring-[#0fa053]/20"
            />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <span className="text-sm text-white/70">
              You will be redirected to Plisio's secure checkout to complete the payment. Only {selectedCoin} on the{" "}
              {activeNetwork} network is accepted for this deposit.
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/50">Coin</span>
              <p className="font-bold text-white flex items-center gap-2">
                <span className={brand.color}>{brand.icon}</span>
                {selectedCoin}
              </p>
            </div>
            <div>
              <span className="text-white/50">Network</span>
              <p className="font-bold text-white">{networkInfo.name}</p>
            </div>
            <div>
              <span className="text-white/50">Min. Deposit</span>
              <p className="font-bold text-white">${minimumDeposit}</p>
            </div>
            <div>
              <span className="text-white/50">Confirmations</span>
              <p className="font-bold text-white">{networkInfo.minConfirmations}</p>
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
            disabled={!amount || amountValue < minimumDeposit}
            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#f1a526] to-[#f1a526]/80 text-white font-bold text-lg shadow-[0_10px_30px_rgba(241,165,38,0.3)] hover:from-[#f1a526] hover:to-[#f1a526] disabled:from-white/10 disabled:to-white/10 disabled:shadow-none disabled:cursor-not-allowed"
          >
            Continue to Payment
          </button>
        </div>
      </div>
    </div>
  );
}
