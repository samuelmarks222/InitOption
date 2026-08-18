import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPlisioMethodMinimums, PlisioMethodMinimumInfo } from "@/lib/cryptoDeposits";
import type { DepositBonusCatalogEntry } from "@/lib/depositBonusOffers";
import { DepositBonusSelector } from "./DepositBonusSelector";

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
  bonusEnabled: boolean;
  useBonus: boolean;
  setUseBonus: (value: boolean) => void;
  matchingOffer: DepositBonusCatalogEntry | null;
  bonusAmount: number;
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

const formatUsd = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatCoinAmount = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 100000) return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (Math.abs(value) >= 1) return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
  return value.toLocaleString("en-US", { maximumSignificantDigits: 6 });
};

function CoinBadge({
  icon,
  symbol,
  className = "h-6 w-6 text-xs",
}: {
  icon?: string | null;
  symbol: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (icon && !failed) {
    return (
      <img
        src={icon}
        alt={symbol}
        onError={() => setFailed(true)}
        className={`${className} shrink-0 rounded-full object-contain`}
      />
    );
  }

  return (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 font-bold text-white/80`}
    >
      {symbol.slice(0, 1)}
    </span>
  );
}

export function DepositCryptoDetails({
  selectedCoin,
  setSelectedCoin,
  selectedNetwork,
  setSelectedNetwork,
  amount,
  setAmount,
  cryptoMethods,
  bonusEnabled,
  useBonus,
  setUseBonus,
  matchingOffer,
  bonusAmount,
  onContinue,
  onBack,
}: DepositCryptoDetailsProps) {
  // Live Plisio minimums / rates / logos for every supported method.
  const [plisioInfos, setPlisioInfos] = useState<PlisioMethodMinimumInfo[]>([]);
  const [plisioMinLoading, setPlisioMinLoading] = useState(true);

  useEffect(() => {
    if (cryptoMethods.length === 0) return;
    let cancelled = false;
    setPlisioMinLoading(true);
    void getPlisioMethodMinimums({ methods: cryptoMethods }).then((infos) => {
      if (cancelled) return;
      setPlisioInfos(infos);
      setPlisioMinLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [cryptoMethods]);

  // Only offer coin/network combos Plisio can actually process (excludes coins not
  // in Plisio's supported list like XRP, coins in maintenance, and coins not enabled
  // in the shop). When Plisio data is unavailable, fall back to the full DB list.
  const supportedMethods = useMemo(() => {
    if (plisioInfos.length === 0) return cryptoMethods;
    return cryptoMethods.filter((method) =>
      plisioInfos.some(
        (info) =>
          info.symbol.toUpperCase() === method.symbol.toUpperCase() &&
          info.network.toUpperCase() === method.network.toUpperCase() &&
          info.hiddenInShop !== true,
      ),
    );
  }, [cryptoMethods, plisioInfos]);

  const coins = useMemo(() => {
    const seen = new Set<string>();
    return supportedMethods.filter((method) => {
      if (seen.has(method.symbol)) return false;
      seen.add(method.symbol);
      return true;
    });
  }, [supportedMethods]);

  const activeCoin = coins.find((coin) => coin.symbol === selectedCoin) ?? coins[0];

  const networks = useMemo(
    () => supportedMethods.filter((method) => method.symbol === activeCoin?.symbol).map((method) => method.network),
    [supportedMethods, activeCoin?.symbol],
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

  const selectedMethod = supportedMethods.find(
    (method) => method.symbol === selectedCoin && method.network === selectedNetwork,
  ) ?? null;

  const selectedInfo = useMemo(
    () =>
      plisioInfos.find(
        (info) =>
          info.symbol.toUpperCase() === selectedCoin.toUpperCase() &&
          info.network.toUpperCase() === selectedNetwork.toUpperCase(),
      ) ?? null,
    [plisioInfos, selectedCoin, selectedNetwork],
  );

  const symbolIcons = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const info of plisioInfos) {
      if (map[info.symbol.toUpperCase()] === undefined && info.icon) {
        map[info.symbol.toUpperCase()] = info.icon;
      }
    }
    return map;
  }, [plisioInfos]);

  const coinMinimums = useMemo(() => {
    const map: Record<string, number> = {};
    for (const method of supportedMethods) {
      const key = method.symbol.toUpperCase();
      const info = plisioInfos.find(
        (candidate) =>
          candidate.symbol.toUpperCase() === key && candidate.network.toUpperCase() === method.network.toUpperCase(),
      );
      const min = info?.minAmountUsd ?? Math.max(Number(method.minimum_deposit_amount ?? 10), 10);
      map[key] = map[key] === undefined ? min : Math.min(map[key], min);
    }
    return map;
  }, [supportedMethods, plisioInfos]);

  const fallbackMinimumUsd = Math.max(Number(selectedMethod?.minimum_deposit_amount ?? 10), 10);
  const minimumUsd = selectedInfo?.minAmountUsd ?? fallbackMinimumUsd;
  const minimumCoin = selectedInfo?.minAmountCoin ?? null;
  const rateUsd = selectedInfo?.rateUsd ?? null;

  const amountValue = Number(amount) || 0;
  const aboveMinimum = amountValue >= minimumUsd;
  const coinEstimate = amountValue > 0 && rateUsd ? amountValue * rateUsd : null;

  const networkInfo = NETWORK_INFO[activeNetwork.toUpperCase()] || {
    name: activeNetwork || "—",
    minConfirmations: 1,
    approxTime: "~1 min",
  };

  const showNetworkSelect = networks.length > 1;

  if (cryptoMethods.length === 0 || plisioMinLoading) {
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

  if (supportedMethods.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Cryptocurrency Details</h1>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-12 text-center">
          <p className="text-sm text-white/60">
            No cryptocurrencies are currently supported by the payment provider.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Cryptocurrency Details</h1>
        <p className="mt-1 text-sm text-white/50">Choose a coin below, then enter the deposit amount.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-white">Select Cryptocurrency</label>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {coins.map((coin) => {
              const isActive = coin.symbol === selectedCoin;
              return (
                <button
                  key={coin.symbol}
                  type="button"
                  onClick={() => setSelectedCoin(coin.symbol)}
                  className={`group relative flex flex-col items-center justify-center gap-2 rounded-xl border bg-[#0a0d17] px-3 py-4 text-center transition-all ${
                    isActive
                      ? "border-[#f1a526] bg-[#f1a526]/10 shadow-[0_0_0_1px_rgba(241,165,38,0.6),0_8px_24px_rgba(241,165,38,0.15)]"
                      : "border-white/10 hover:border-white/25 hover:bg-white/5"
                  }`}
                >
                  {isActive && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#f1a526] text-[10px] font-black text-black">
                      ✓
                    </span>
                  )}
                  <CoinBadge
                    icon={symbolIcons[coin.symbol.toUpperCase()]}
                    symbol={coin.symbol}
                    className="h-9 w-9 text-sm"
                  />
                  <div>
                    <p className={`text-sm font-bold ${isActive ? "text-white" : "text-white/80"}`}>{coin.symbol}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-white/40">{coin.coin_name}</p>
                  </div>
                  <p className={`text-[10px] font-semibold ${isActive ? "text-[#f1a526]" : "text-white/35"}`}>
                    Min {formatUsd(coinMinimums[coin.symbol.toUpperCase()])}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-white">Network</label>
          {showNetworkSelect ? (
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
          ) : (
            <div className="mt-2 rounded-xl border border-white/10 bg-[#0a0d17] px-4 py-3 text-sm font-medium text-white">
              {networkInfo.name}
            </div>
          )}
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
              min={minimumUsd}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Enter amount (Min ${formatUsd(minimumUsd)})`}
              className="w-full pl-10 pr-4 py-4 bg-[#0a0d17] border border-white/10 rounded-xl text-xl font-bold text-white outline-none placeholder:text-white/30 focus:border-[#0fa053]/50 focus:ring-1 focus:ring-[#0fa053]/20"
            />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-[#0fa053] shrink-0" />
            <span className="text-sm text-white/70">
              You will be redirected to Plisio's secure checkout to complete the payment. Only {selectedCoin} on the{" "}
              {activeNetwork} network is accepted for this deposit.
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/50">Coin</span>
              <p className="font-bold text-white flex items-center gap-2">
                <CoinBadge icon={selectedInfo?.icon ?? null} symbol={selectedCoin} className="h-6 w-6 text-xs" />
                {selectedCoin}
              </p>
            </div>
            <div>
              <span className="text-white/50">Network</span>
              <p className="font-bold text-white">{networkInfo.name}</p>
            </div>
            <div>
              <span className="text-white/50">Min. Deposit</span>
              {plisioMinLoading ? (
                <p className="font-bold text-white flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white/50" />
                  <span className="text-white/50">Checking...</span>
                </p>
              ) : (
                <p className="font-bold text-white">
                  {minimumCoin != null ? `${formatCoinAmount(minimumCoin)} ${selectedCoin}` : formatUsd(minimumUsd)}
                  <span className="ml-1 text-xs font-medium text-white/50">≈ {formatUsd(minimumUsd)}</span>
                </p>
              )}
            </div>
            <div>
              <span className="text-white/50">Confirmations</span>
              <p className="font-bold text-white">{networkInfo.minConfirmations}</p>
            </div>
          </div>
        </div>

        {plisioMinLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading the current minimum deposit for {selectedCoin}...
          </div>
        ) : amountValue > 0 && !aboveMinimum ? (
          <div className="flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-100">
              Minimum deposit is {formatUsd(minimumUsd)}
              {minimumCoin != null ? ` (${formatCoinAmount(minimumCoin)} ${selectedCoin})` : ""}. Increase your deposit
              amount to continue.
            </p>
          </div>
        ) : amountValue > 0 && aboveMinimum ? (
          <div className="flex items-center gap-3 rounded-xl border border-[#0fa053]/30 bg-[#0fa053]/10 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-[#0fa053] shrink-0" />
            <p className="text-sm text-emerald-100">
              Minimum deposit requirement met. {formatUsd(amountValue)}
              {coinEstimate != null ? ` ≈ ${formatCoinAmount(coinEstimate)} ${selectedCoin}` : ""}.
            </p>
          </div>
        ) : null}

        <DepositBonusSelector
          enabled={bonusEnabled}
          useBonus={useBonus}
          setUseBonus={setUseBonus}
          amount={amountValue}
          matchingOffer={matchingOffer}
          bonusAmount={bonusAmount}
          tone="amber"
        />

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
            disabled={!amount || amountValue < minimumUsd || plisioMinLoading}
            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#f1a526] to-[#f1a526]/80 text-white font-bold text-lg shadow-[0_10px_30px_rgba(241,165,38,0.3)] hover:from-[#f1a526] hover:to-[#f1a526] disabled:from-white/10 disabled:to-white/10 disabled:shadow-none disabled:cursor-not-allowed"
          >
            Continue to Payment
          </button>
        </div>
      </div>
    </div>
  );
}