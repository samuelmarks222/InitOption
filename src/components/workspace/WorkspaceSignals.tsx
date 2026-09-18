import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowUp,
  ArrowDown,
  HelpCircle,
  Settings,
  X,
  Zap,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { type AssetOption } from "../trading/AssetSelector";
import { useTradingDesk } from "../trading/TradingDeskContext";
import { toast } from "sonner";
import {
  buildTradingSignalSnapshot,
  getSignalPricePrecision,
  type SignalAssetInput,
  type SignalDirection,
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
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function getStrengthColor(score: number) {
  const abs = Math.abs(score);
  if (abs >= 70) return "#00C076";
  if (abs >= 46) return "#f59e0b";
  return "#ef5350";
}

function getStrengthLabel(score: number) {
  const abs = Math.abs(score);
  if (abs >= 70) return "Strong";
  if (abs >= 46) return "Moderate";
  return "Early";
}

export const WorkspaceSignals = ({ onClose, activeAsset, onOpenDeposit }: WorkspaceSignalsProps) => {
  const [activeTab, setActiveTab] = useState<"active" | "all">("active");
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
          copied: 0,
          timestamp: nowSec,
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
        setInvestment(1000);

        const success = await executeTrade({
          assetSymbol: signal.symbol,
          direction: signal.action,
          amount: 1000,
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
            description: `${signal.action.toUpperCase()} ${signal.symbol} @ ${signal.currentPrice.toFixed(getSignalPricePrecision(signal.currentPrice))}`,
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

    if (activeTab === "active") {
      filtered = filtered.filter((s) => s.expiresAt > nowSec);
    }

    return filtered.sort((a, b) => {
      const aExpired = a.expiresAt <= nowSec;
      const bExpired = b.expiresAt <= nowSec;
      if (aExpired !== bExpired) return aExpired ? 1 : -1;
      return b.confidence - a.confidence;
    });
  }, [signals, activeTab, nowSec]);

  const activeCount = signals.filter((s) => s.expiresAt > nowSec).length;
  const strongCount = signals.filter((s) => Math.abs(s.score) >= 70 && s.expiresAt > nowSec).length;

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--trading-workspace-bg)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderBottomColor: "var(--trading-border-color)" }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-bold text-white tracking-wide">Signals</h2>
          <span className="relative flex h-1.5 w-1.5 rounded-full bg-[#00C076]">
            <span className="absolute inset-0 rounded-full animate-ping bg-[#00C076] opacity-50" />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-white/10 bg-black/20 p-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`rounded px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
                  timeframe === tf
                    ? "bg-[#00C076]/20 text-[#00C076]"
                    : "text-[#787b86] hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[#787b86] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div
        className="flex items-center gap-4 px-4 py-1.5 border-b text-[10px]"
        style={{ borderBottomColor: "var(--trading-border-color)" }}
      >
        <span className="text-[#787b86]">
          Active: <span className="text-white font-bold">{activeCount}</span>
        </span>
        <span className="text-[#787b86]">
          Strong: <span className="text-[#00C076] font-bold">{strongCount}</span>
        </span>
        {accountType === "live" && (
          <span className="text-[#787b86]">
            Balance: <span className="text-white font-bold">${liveBalance.toLocaleString()}</span>
          </span>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex border-b" style={{ borderBottomColor: "var(--trading-border-color)" }}>
        {(["active", "all"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-center text-[11px] font-semibold relative transition-colors capitalize ${
              activeTab === tab ? "text-white" : "text-[#787b86] hover:text-white"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[#00C076]" />
            )}
          </button>
        ))}
      </div>

      {/* Signal List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSignals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[#787b86]">
            <Zap className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-[12px] font-medium">No {activeTab} signals</p>
            <p className="text-[10px] mt-0.5">Try another timeframe</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredSignals.map((signal) => {
              const isUp = signal.action === "higher";
              const remaining = Math.max(0, Math.ceil(signal.expiresAt - nowSec));
              const totalDuration =
                signal.timeframe === "1m" ? 180 : signal.timeframe === "5m" ? 900 : 2700;
              const progress = Math.min(((totalDuration - remaining) / totalDuration) * 100, 100);
              const isCopying = copyingSignalId === signal.id;
              const isExpired = remaining <= 0;
              const strengthColor = getStrengthColor(signal.score);
              const strengthLabel = getStrengthLabel(signal.score);
              const isCopied = copiedIds.has(signal.id);

              return (
                <div
                  key={signal.id}
                  className={`rounded-xl p-3 transition-all border ${
                    isExpired
                      ? "opacity-40 border-white/5 bg-white/[0.01]"
                      : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  {/* Row 1: Symbol + Direction + Timer */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      {/* Direction Arrow */}
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                          isUp ? "bg-[#00C076]/15" : "bg-red-500/15"
                        }`}
                      >
                        {isUp ? (
                          <ArrowUp className="h-4 w-4 stroke-[2.5] text-[#00C076]" />
                        ) : (
                          <ArrowDown className="h-4 w-4 stroke-[2.5] text-red-400" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-bold text-white">{signal.symbol}</span>
                          <span className="text-[9px] font-medium text-[#787b86] bg-white/5 rounded px-1 py-0.5">
                            {signal.timeframe}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[10px] font-bold ${
                              isUp ? "text-[#00C076]" : "text-red-400"
                            }`}
                          >
                            {isUp ? "+" : "-"}{signal.confidence}%
                          </span>
                          <span
                            className="text-[9px] font-bold rounded px-1 py-0.5"
                            style={{
                              color: strengthColor,
                              background: `${strengthColor}15`,
                            }}
                          >
                            {strengthLabel}
                          </span>
                          {signal.verifiedAccuracy !== null && (
                            <span
                              className={`text-[9px] font-bold ${
                                signal.verifiedAccuracy >= 60
                                  ? "text-[#00C076]"
                                  : "text-[#787b86]"
                              }`}
                            >
                              {signal.verifiedAccuracy}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timer */}
                    {!isExpired && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-[#787b86]" />
                        <span className="text-[11px] font-mono font-bold text-white">
                          {formatTime(remaining)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Price + Indicators */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="text-white font-semibold font-mono">
                        {signal.currentPrice.toFixed(
                          getSignalPricePrecision(signal.currentPrice)
                        )}
                      </span>
                      <span className="text-[#787b86]">RSI {signal.rsi?.toFixed(0) ?? "--"}</span>
                      <span className="text-[#787b86]">
                        MACD {signal.macdBias !== null ? (signal.macdBias >= 0 ? "+" : "") + signal.macdBias.toFixed(2) : "--"}
                      </span>
                    </div>

                    {/* Progress bar */}
                    {!isExpired && (
                      <div className="w-16 h-[3px] rounded-full overflow-hidden bg-white/10">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${progress}%`,
                            background: isUp ? "#00C076" : "#ef5350",
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Row 3: Badges + Copy */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {signal.mtfConfirmation && (
                        <span
                          className={`text-[8px] font-bold rounded px-1.5 py-0.5 ${
                            signal.mtfConfirmation === "higher"
                              ? "bg-[#00C076]/10 text-[#00C076]"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          MTF {signal.mtfConfidence}%
                        </span>
                      )}
                      {signal.volatilityLabel && signal.volatilityLabel !== "Normal" && (
                        <span
                          className={`text-[8px] font-bold rounded px-1.5 py-0.5 ${
                            signal.volatilityLabel === "High"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-blue-500/10 text-blue-400"
                          }`}
                        >
                          Vol {signal.volatilityLabel}
                        </span>
                      )}
                      {signal.copied > 0 && (
                        <span className="text-[9px] text-[#787b86]">
                          Copied: {signal.copied}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-[#787b86]">{formatTimeAgo(signal.timestamp)}</span>

                      {/* Copy Signal Button */}
                      <button
                        onClick={() => handleCopySignal(signal)}
                        disabled={isCopying || isExpired}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all ${
                          isExpired
                            ? "bg-white/5 text-[#787b86] cursor-not-allowed"
                            : isCopied
                              ? "bg-[#00C076]/20 text-[#00C076] border border-[#00C076]/30"
                              : isUp
                                ? "bg-[#00C076]/15 text-[#00C076] hover:bg-[#00C076]/25 border border-[#00C076]/30"
                                : "bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30"
                        }`}
                      >
                        {isCopying ? (
                          "..."
                        ) : isCopied ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Copied
                          </>
                        ) : isExpired ? (
                          "Expired"
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy Signal
                          </>
                        )}
                      </button>
                    </div>
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
            <p className="text-center text-[12px] text-[#787b86] mb-5 leading-relaxed">
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
              className="w-full py-2 mt-2 rounded-xl text-[#787b86] text-[12px] font-medium hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
