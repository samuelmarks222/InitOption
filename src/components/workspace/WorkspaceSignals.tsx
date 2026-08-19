import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowUp,
  ArrowDown,
  HelpCircle,
  Send,
  Settings,
  Wifi,
  X,
  Check,
  AlertCircle,
  Zap,
  TrendingUp,
  TrendingDown,
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

interface LiveSignal extends TradingSignalSnapshot {
  id: string;
  copied: number;
  timestamp: number;
  expiresAt: number;
}

interface WorkspaceSignalsProps {
  onClose?: () => void;
  activeAsset?: AssetOption | null;
}

// Tracked assets for signals
const SIGNAL_ASSETS: SignalAssetInput[] = [
  { symbol: "USD/PHP OTC", name: "USD/PHP OTC", category: "OTC" },
  { symbol: "EUR/USD", name: "EUR/USD", category: "Forex" },
  { symbol: "GBP/USD", name: "GBP/USD", category: "Forex" },
  { symbol: "XAU/USD", name: "Gold", category: "Commodities" },
  { symbol: "BTC/USD", name: "Bitcoin", category: "Crypto" },
  { symbol: "USD/JPY", name: "USD/JPY", category: "Forex" },
  { symbol: "AUD/USD", name: "AUD/USD", category: "Forex" },
  { symbol: "US30", name: "US30", category: "Indices" },
];

const TIMEFRAMES: SignalTimeframe[] = ["1m", "5m", "15m"];
const REFRESH_INTERVAL = 5000; // 5 seconds

function formatTime(seconds: number): string {
  if (seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatTimeAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatSignedNumber(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function formatSignalTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export const WorkspaceSignals = ({ onClose, activeAsset }: WorkspaceSignalsProps) => {
  const [activeTab, setActiveTab] = useState<"updates" | "all" | "history">("updates");
  const [timeframe, setTimeframe] = useState<SignalTimeframe>("1m");
  const [signals, setSignals] = useState<LiveSignal[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<SignalAssetInput>(SIGNAL_ASSETS[0]);
  const [copyingSignalId, setCopyingSignalId] = useState<string | null>(null);
  const [nowSec, setNowSec] = useState(() => Date.now() / 1000);

  const {
    setExpirySeconds,
    setInvestment,
    setDirection,
    setSignalMode,
    executeTrade,
    currentAsset,
    setCurrentAsset,
  } = useTradingDesk();

  // Refresh time every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => setNowSec(Date.now() / 1000), REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  // Build signals for all tracked assets
  const rebuildSignals = useCallback(() => {
    const newSignals: LiveSignal[] = [];
    for (const asset of SIGNAL_ASSETS) {
      for (const tf of TIMEFRAMES) {
        const snapshot = buildTradingSignalSnapshot(asset, tf, nowSec);
        if (snapshot.action !== "neutral") {
          const expirySeconds = tf === "1m" ? 180 : tf === "5m" ? 900 : 2700;
          newSignals.push({
            ...snapshot,
            id: `${snapshot.symbol}-${tf}`,
            copied: 0,
            timestamp: nowSec,
            expiresAt: nowSec + expirySeconds,
          } as LiveSignal);
        }
      }
    }
    setSignals(newSignals);
  }, [nowSec]);

  // Initial build and rebuild on timeframe/nowSec change
  useEffect(() => {
    rebuildSignals();
  }, [nowSec, timeframe, rebuildSignals]);

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleCopySignal = useCallback(async (signal: LiveSignal) => {
    setCopyingSignalId(signal.id);

    try {
      setSignalMode(true);
      setDirection(signal.action);
      setExpirySeconds(
        signal.timeframe === "1m" ? 180 : signal.timeframe === "5m" ? 900 : 2700
      );

      // Use current asset price for entry
      const entryPrice = signal.currentPrice;
      const amount = 1000; // Default $10, can be customized

      setInvestment(amount);

      const success = await executeTrade({
        assetSymbol: signal.symbol,
        direction: signal.action,
        amount,
        entryPrice,
        expirySeconds: signal.timeframe === "1m" ? 180 : signal.timeframe === "5m" ? 900 : 2700,
        payoutRate: 0.85,
      });

      if (success) {
        setSignals((prev) =>
          prev.map((sig) => (sig.id === signal.id ? { ...sig, copied: sig.copied + 1 } : sig))
        );
        toast.success(`Signal copied and trade executed!`, {
          description: `${signal.action === "higher" ? "HIGHER" : "LOWER"} ${signal.symbol} for $${amount/100} (${signal.timeframe === "1m" ? "3m" : signal.timeframe === "5m" ? "15m" : "45m"})`,
        });
      } else {
        toast.error("Failed to execute signal trade", {
          description: "Check your balance and try again",
        });
      }
    } catch (error) {
      toast.error("Error executing signal", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setCopyingSignalId(null);
      setSignalMode(false);
      setDirection(null);
    }
  }, [setSignalMode, setDirection, setExpirySeconds, setInvestment, executeTrade, toast]);

  // Filter signals based on active tab and selected asset
  const filteredSignals = useMemo(() => {
    let filtered = signals.filter((s) => s.action !== "neutral");

    if (activeTab === "history") {
      filtered = signals.filter((s) => s.expiresAt < nowSec);
    } else if (selectedAsset) {
      filtered = filtered.filter((s) => s.symbol === selectedAsset.symbol);
    }

    // Sort: active first, then by confidence
    return filtered.sort((a, b) => {
      const aActive = a.expiresAt > nowSec;
      const bActive = b.expiresAt > nowSec;
      if (aActive !== bActive) return aActive ? -1 : 1;
      return b.confidence - a.confidence;
    });
  }, [signals, activeTab, selectedAsset, nowSec]);

  const progressMax = useMemo(() => {
    if (timeframe === "1m") return 180;
    if (timeframe === "5m") return 900;
    return 2700;
  }, [timeframe]);

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--trading-workspace-bg)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{ background: "var(--trading-header-bg)", borderBottomColor: "var(--trading-border-color)" }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-bold text-white tracking-wide">Live Signals</h2>
          <div className="flex items-center gap-1">
            <span className="relative flex h-2 w-2 rounded-full bg-[#00C076]">
              <span className="absolute inset-0 h-2 w-2 rounded-full animate-ping bg-[#00C076]" style={{ opacity: 0.6 }} />
            </span>
            <span className="ml-1 text-[11px] text-[#00C076] font-medium">LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-white/10 bg-black/20 p-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`shrink-0 rounded-md px-3 py-1 text-[11px] font-bold transition-colors ${
                  timeframe === tf
                    ? "bg-[#00C076]/20 text-[#00C076] border border-[#00C076]/30"
                    : "text-[#787b86] hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[#787b86]">
            <HelpCircle className="h-5 w-5 cursor-pointer hover:text-white transition-colors" />
            <Settings className="h-5 w-5 cursor-pointer hover:text-white transition-colors" />
          </div>
        </div>
      </div>

      {/* Asset Filter */}
      <div className="flex overflow-x-auto gap-2 border-b px-4 py-2" style={{ borderBottomColor: "var(--trading-border-color)", scrollbarWidth: "none" }}>
        {SIGNAL_ASSETS.map((asset) => (
          <button
            key={asset.symbol}
            onClick={() => setSelectedAsset(asset)}
            className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
              selectedAsset?.symbol === asset.symbol
                ? "bg-[#00C076]/15 text-[#00C076] border border-[#00C076]/30"
                : "text-[#787b86] hover:text-white hover:bg-white/[0.03]"
            }`}
            style={{
              borderWidth: selectedAsset?.symbol === asset.symbol ? 1 : 0,
              borderStyle: "solid",
              borderColor: "rgba(0,192,118,0.3)",
            }}
          >
            <Zap className="h-3.5 w-3.5" />
            <span className="truncate max-w-[80px]">{asset.name}</span>
          </button>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="flex border-b" style={{ borderBottomColor: "var(--trading-border-color)" }}>
        <button
          type="button"
          onClick={() => setActiveTab("updates")}
          className={`flex-1 py-2.5 text-center text-[12px] font-semibold relative transition-colors ${
            activeTab === "updates"
              ? "text-white"
              : "text-[#787b86] hover:text-white"
          }`}
        >
          Active
          {activeTab === "updates" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: "var(--trading-accent-blue)" }} />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex-1 py-2.5 text-center text-[12px] font-semibold relative transition-colors ${
            activeTab === "all"
              ? "text-white"
              : "text-[#787b86] hover:text-white"
          }`}
        >
          All
          {activeTab === "all" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: "var(--trading-accent-blue)" }} />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2.5 text-center text-[12px] font-semibold relative transition-colors ${
            activeTab === "history"
              ? "text-white"
              : "text-[#787b86] hover:text-white"
          }`}
        >
          History
          {activeTab === "history" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: "var(--trading-accent-blue)" }} />
          )}
        </button>
      </div>

      {/* Signals List */}
      <div className="flex-1 overflow-y-auto divide-y" style={{ divideColor: "var(--trading-border-color)" }}>
        {filteredSignals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[#787b86]">
            <Wifi className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-[13px]">No {activeTab === "history" ? "historical" : "active"} signals</p>
            <p className="mt-1 text-[11px]">Try another timeframe or asset</p>
          </div>
        ) : (
          filteredSignals.map((signal) => {
            const isUp = signal.action === "higher";
            const remaining = Math.max(0, Math.ceil(signal.expiresAt - nowSec));
            const totalDuration = signal.timeframe === "1m" ? 180 : signal.timeframe === "5m" ? 900 : 2700;
            const progress = Math.min(((totalDuration - remaining) / totalDuration) * 100, 100);
            const isCopying = copyingSignalId === signal.id;
            const isExpired = remaining <= 0;

            return (
              <div
                key={signal.id}
                className={`p-4 transition-colors hover:bg-white/[0.02] ${isExpired ? "opacity-50" : ""}`}
                style={{ background: "var(--trading-workspace-bg)" }}
              >
                {/* Top Row */}
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${isUp ? "bg-[#00C076]/15 text-[#00C076]" : "bg-red-500/15 text-red-400}"}`}>
                      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span className="font-mono">{signal.symbol}</span>
                    </span>
                    <span className={`text-[10px] font-medium ${isUp ? "text-[#00C076]" : "text-red-400}"}`}>
                      {signal.timeframe}
                    </span>
                  </div>

                  <div className={`flex items-center text-xs font-bold ${isUp ? "text-[#26a69a]" : "text-[#ef5350]"}`}>
                    <div className="flex -space-x-1 mr-1.5">
                      {isUp ? (
                        <>
                          <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                          <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                        </>
                      ) : (
                        <>
                          <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" />
                          <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" />
                        </>
                      )}
                    </div>
                    <span>{isUp ? "+" : "-"}{signal.confidence}%</span>
                  </div>

                  <div className="flex items-center gap-2 w-28 shrink-0 justify-end">
                    <div className="w-16 h-[3px] rounded-full overflow-hidden" style={{ background: "var(--trading-border-color)" }}>
                      <div
                        className="h-full transition-all duration-1000 ease-linear"
                        style={{
                          width: `${progress}%`,
                          background: isUp ? "var(--admin-green)" : "red",
                        }}
                      />
                    </div>
                    <span className="text-white font-semibold font-mono text-[12px] shrink-0">{formatTime(remaining)}</span>
                  </div>
                </div>

                {/* Middle Row */}
                <div className="flex items-center justify-between my-2">
                  <div className="flex items-center gap-3 text-[12px]">
                    <span className="text-[#9ba1b0] font-semibold">
                      {signal.currentPrice.toFixed(getSignalPricePrecision(signal.currentPrice))}
                    </span>
                    <span className="text-[#787b86] font-mono">S:{signal.support.toFixed(2)} R:{signal.resistance.toFixed(2)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopySignal(signal)}
                    disabled={isCopying || isExpired}
                    className={`bg-[#1e6b4e] hover:bg-[#26a69a] text-white font-medium text-[12px] py-1.5 px-3.5 rounded-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                      isCopying ? "opacity-70" : isExpired ? "opacity-30 bg-gray-700 cursor-not-allowed" : ""
                    }`}
                    style={{ border: "1px solid rgba(38,166,154,0.3)" }}
                  >
                    {isCopying ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Executing...
                      </>
                    ) : isExpired ? (
                      "Expired"
                    ) : (
                      "Copy Signal"
                    )}
                  </button>
                </div>

                {/* Bottom Row - Details */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#787b86]">
                  <div className="flex items-center gap-2">
                    <span>Confidence: <span className="font-bold text-white">{signal.confidence}%</span></span>
                    <span>Score: <span className={`font-bold ${signal.score > 0 ? "text-[#00C076]" : "text-red-400"}`}>{signal.score > 0 ? "+" : ""}{signal.score}</span></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>RSI: <span className="font-bold">{signal.rsi === null ? "--" : signal.rsi.toFixed(1)}</span></span>
                    <span>MACD: <span className="font-bold">{formatSignedNumber(signal.macdBias)}</span></span>
                    <span className="flex items-center gap-1">
                      {signal.action === "higher" ? (
                        <TrendingUp className="h-3 w-3 text-[#00C076]" />
                      ) : signal.action === "lower" ? (
                        <TrendingDown className="h-3 w-3 text-red-400" />
                      ) : (
                        <X className="h-3 w-3 text-[#787b86]" />
                      )}
                      <span className="font-bold capitalize">{signal.action}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Copied: <span className="font-bold">{signal.copied}</span></span>
                    <span>Generated: <span className="font-bold">{formatSignalTime(signal.generatedAt)}</span></span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};