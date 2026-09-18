import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowUp,
  ArrowDown,
  HelpCircle,
  Settings,
  X,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { type AssetOption } from "../trading/AssetSelector";
import { useTradingDesk } from "../trading/TradingDeskContext";
import { toast } from "sonner";
import {
  buildTradingSignalSnapshot,
  getSignalPricePrecision,
  type SignalAssetInput,
  type SignalTimeframe,
  type TradingSignalSnapshot,
} from "@/lib/tradingSignals";
import { getEffectiveLiveBalance } from "@/lib/live-balance";

interface LiveSignal extends TradingSignalSnapshot {
  id: string;
  copied: number;
  timestamp: number;
  expiresAt: number;
}

interface WorkspaceSignalsProps {
  onClose?: () => void;
  activeAsset?: AssetOption | null;
  onOpenDeposit?: () => void;
}

const SIGNAL_ASSETS: SignalAssetInput[] = [
  { symbol: "EUR/USD", name: "EUR/USD", category: "Forex" },
  { symbol: "GBP/USD", name: "GBP/USD", category: "Forex" },
  { symbol: "USD/JPY", name: "USD/JPY", category: "Forex" },
  { symbol: "AUD/USD", name: "AUD/USD", category: "Forex" },
  { symbol: "USD/PHP OTC", name: "USD/PHP OTC", category: "OTC" },
  { symbol: "XAU/USD", name: "Gold", category: "Commodities" },
  { symbol: "BTC/USD", name: "Bitcoin", category: "Crypto" },
  { symbol: "US30", name: "US30", category: "Indices" },
];

const TIMEFRAMES: SignalTimeframe[] = ["1m", "5m", "15m"];
const REFRESH_INTERVAL = 5000;

function formatTime(seconds: number): string {
  if (seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatTimeAgo(ts: number) {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return `${diff} sec ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export const WorkspaceSignals = ({ onClose, activeAsset, onOpenDeposit }: WorkspaceSignalsProps) => {
  const [activeTab, setActiveTab] = useState<"updates" | "all">("updates");
  const [timeframe, setTimeframe] = useState<SignalTimeframe>("1m");
  const [signals, setSignals] = useState<LiveSignal[]>([]);
  const [copyingSignalId, setCopyingSignalId] = useState<string | null>(null);
  const [nowSec, setNowSec] = useState(() => Date.now() / 1000);
  const [showInsufficientFunds, setShowInsufficientFunds] = useState(false);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());

  const {
    setExpirySeconds,
    setInvestment,
    setDirection,
    setSignalMode,
    executeTrade,
    accountType,
    balance,
  } = useTradingDesk();

  const liveBalance = getEffectiveLiveBalance({ balance });

  useEffect(() => {
    const timer = setInterval(() => setNowSec(Date.now() / 1000), REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const rebuildSignals = useCallback(() => {
    const newSignals: LiveSignal[] = [];
    for (const asset of SIGNAL_ASSETS) {
      const snapshot = buildTradingSignalSnapshot(asset, timeframe, nowSec);
      if (snapshot.action !== "neutral") {
        const expirySeconds = timeframe === "1m" ? 180 : timeframe === "5m" ? 900 : 2700;
        newSignals.push({
          ...snapshot,
          id: `${snapshot.symbol}-${timeframe}`,
          copied: Math.floor(Math.random() * 200) + 10,
          timestamp: nowSec - Math.floor(Math.random() * 600),
          expiresAt: nowSec + expirySeconds,
        } as LiveSignal);
      }
    }
    setSignals(newSignals);
  }, [nowSec, timeframe]);

  useEffect(() => {
    rebuildSignals();
  }, [nowSec, timeframe, rebuildSignals]);

  const handleCopySignal = useCallback(
    async (signal: LiveSignal) => {
      if (accountType === "live" && liveBalance < 1) {
        setShowInsufficientFunds(true);
        return;
      }

      setCopyingSignalId(signal.id);
      try {
        setSignalMode(true);
        setDirection(signal.action);
        const expiry = signal.timeframe === "1m" ? 180 : signal.timeframe === "5m" ? 900 : 2700;
        setExpirySeconds(expiry);
        setInvestment(1);

        const success = await executeTrade({
          assetSymbol: signal.symbol,
          direction: signal.action,
          amount: 1,
          entryPrice: signal.currentPrice,
          expirySeconds: expiry,
          payoutRate: 0.85,
        });

        if (success) {
          setSignals((prev) =>
            prev.map((sig) => (sig.id === signal.id ? { ...sig, copied: sig.copied + 1 } : sig))
          );
          setCopiedIds((prev) => new Set([...prev, signal.id]));
          setTimeout(() => {
            setCopiedIds((prev) => {
              const next = new Set(prev);
              next.delete(signal.id);
              return next;
            });
          }, 2000);
          toast.success("Signal copied!", {
            description: `${signal.action.toUpperCase()} ${signal.symbol}`,
          });
        } else {
          toast.error("Trade failed", { description: "Check your balance" });
        }
      } catch (error) {
        toast.error("Error", { description: error instanceof Error ? error.message : "Unknown" });
      } finally {
        setCopyingSignalId(null);
        setSignalMode(false);
        setDirection(null);
      }
    },
    [setSignalMode, setDirection, setExpirySeconds, setInvestment, executeTrade, accountType, liveBalance]
  );

  const filteredSignals = useMemo(() => {
    let filtered = signals.filter((s) => s.action !== "neutral");

    if (activeTab === "updates") {
      filtered = filtered.filter((s) => s.expiresAt > nowSec);
    }

    return filtered.sort((a, b) => {
      const aExpired = a.expiresAt <= nowSec;
      const bExpired = b.expiresAt <= nowSec;
      if (aExpired !== bExpired) return aExpired ? 1 : -1;
      return b.confidence - a.confidence;
    });
  }, [signals, activeTab, nowSec]);

  return (
    <div className="flex h-full flex-col" style={{ background: "#0f1923" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h2 className="text-[15px] font-bold text-white tracking-wide">Signals</h2>
        <div className="flex items-center gap-3">
          <button className="text-[#5e6370] hover:text-white transition-colors">
            <HelpCircle className="w-[18px] h-[18px]" />
          </button>
          <button className="text-[#5e6370] hover:text-white transition-colors">
            <Settings className="w-[18px] h-[18px]" />
          </button>
          {onClose && (
            <button onClick={onClose} className="text-[#5e6370] hover:text-white transition-colors">
              <X className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06]">
        {(["updates", "all"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-center text-[13px] font-semibold relative transition-colors capitalize ${
              activeTab === tab ? "text-white" : "text-[#5e6370] hover:text-white"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2c8af5]" />
            )}
          </button>
        ))}
      </div>

      {/* Signal List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSignals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[#5e6370]">
            <p className="text-[13px] font-medium">No signals</p>
          </div>
        ) : (
          <div className="py-1">
            {filteredSignals.map((signal) => {
              const isUp = signal.action === "higher";
              const remaining = Math.max(0, Math.ceil(signal.expiresAt - nowSec));
              const totalDuration =
                signal.timeframe === "1m" ? 180 : signal.timeframe === "5m" ? 900 : 2700;
              const progress = Math.min(((totalDuration - remaining) / totalDuration) * 100, 100);
              const isCopying = copyingSignalId === signal.id;
              const isExpired = remaining <= 0;
              const isCopied = copiedIds.has(signal.id);

              return (
                <div
                  key={signal.id}
                  className={`px-4 py-2.5 ${isExpired ? "opacity-40" : ""}`}
                >
                  {/* Row 1: Asset name | Arrow + Progress bar + Timer */}
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-bold text-white">
                      {signal.symbol}
                    </span>
                    <div className="flex items-center gap-2">
                      {isUp ? (
                        <ArrowUp className="w-4 h-4 text-[#2c8af5] stroke-[2.5]" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-red-400 stroke-[2.5]" />
                      )}
                      {!isExpired && (
                        <>
                          <div className="w-12 h-[3px] rounded-full overflow-hidden bg-[#2c8af5]/30">
                            <div
                              className="h-full rounded-full bg-[#2c8af5] transition-all duration-1000"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[13px] font-mono font-bold text-white min-w-[36px] text-right">
                            {formatTime(remaining)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Row 2: $1 + profit | Copy signal button */}
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-white/70">$1</span>
                      <span
                        className={`text-[13px] font-bold ${
                          isUp ? "text-[#2c8af5]" : "text-red-400"
                        }`}
                      >
                        {isUp ? "+$" : "-$"}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopySignal(signal)}
                      disabled={isCopying || isExpired}
                      className={`rounded-md px-3 py-1 text-[12px] font-bold transition-all ${
                        isExpired
                          ? "bg-white/5 text-[#5e6370] cursor-not-allowed"
                          : isCopied
                            ? "bg-[#00C076]/20 text-[#00C076]"
                            : "bg-[#00C076]/15 text-[#00C076] hover:bg-[#00C076]/25"
                      }`}
                    >
                      {isCopying ? "..." : isCopied ? "Copied" : "Copy signal"}
                    </button>
                  </div>

                  {/* Row 3: Copied count | Time ago */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-[#5e6370]">
                      Copied: {signal.copied} times
                    </span>
                    <span className="text-[11px] text-[#5e6370]">
                      {formatTimeAgo(signal.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Insufficient Funds Modal */}
      {showInsufficientFunds && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[320px] rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-yellow-500/15 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-yellow-500" />
              </div>
            </div>
            <h3 className="text-center text-[16px] font-bold text-white mb-2">Insufficient Funds</h3>
            <p className="text-center text-[12px] text-[#5e6370] mb-5 leading-relaxed">
              You need funds to copy this signal. Top up your account to start trading.
            </p>
            <button
              onClick={() => {
                setShowInsufficientFunds(false);
                onOpenDeposit?.();
              }}
              className="w-full py-2.5 rounded-xl bg-[#00C076] text-white text-[13px] font-bold hover:bg-[#00a860] transition-colors"
            >
              Top up your account
            </button>
            <button
              onClick={() => setShowInsufficientFunds(false)}
              className="w-full py-2 mt-2 rounded-xl text-[#5e6370] text-[12px] font-medium hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
