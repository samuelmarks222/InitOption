import { useState, useEffect, useMemo } from "react";
import {
  ArrowUp,
  ArrowDown,
  HelpCircle,
  Send,
  Settings,
  Wifi,
  X,
} from "lucide-react";
import { type AssetOption } from "../trading/AssetSelector";

interface SignalData {
  id: string;
  asset: string;
  direction: "up" | "down";
  duration: number;
  value: string;
  copied: number;
  timeAgo: string;
  timestamp: number;
}

interface WorkspaceSignalsProps {
  onClose?: () => void;
  activeAsset?: AssetOption | null;
}

const MOCK_SIGNALS: SignalData[] = [
  { id: "1", asset: "USD/PHP OTC", direction: "up", duration: 580, value: "$2.82", copied: 15, timeAgo: "20 sec ago", timestamp: Date.now() - 20000 },
  { id: "2", asset: "USD/PHP OTC", direction: "down", duration: 90, value: "$2.82", copied: 36, timeAgo: "30 sec ago", timestamp: Date.now() - 30000 },
  { id: "3", asset: "USD/PHP OTC", direction: "down", duration: 25, value: "$2.82", copied: 66, timeAgo: "35 sec ago", timestamp: Date.now() - 35000 },
  { id: "4", asset: "EUR/USD", direction: "up", duration: 145, value: "$1.95", copied: 12, timeAgo: "40 sec ago", timestamp: Date.now() - 40000 },
  { id: "5", asset: "USD/PHP OTC", direction: "down", duration: 265, value: "$2.82", copied: 23, timeAgo: "35 sec ago", timestamp: Date.now() - 35000 },
  { id: "6", asset: "GBP/USD", direction: "up", duration: 420, value: "$2.45", copied: 8, timeAgo: "1 min ago", timestamp: Date.now() - 60000 },
  { id: "7", asset: "Gold", direction: "down", duration: 180, value: "$3.10", copied: 42, timeAgo: "2 min ago", timestamp: Date.now() - 120000 },
  { id: "8", asset: "Bitcoin", direction: "up", duration: 300, value: "$4.20", copied: 19, timeAgo: "3 min ago", timestamp: Date.now() - 180000 },
  { id: "9", asset: "EUR/USD", direction: "down", duration: 95, value: "$1.95", copied: 27, timeAgo: "4 min ago", timestamp: Date.now() - 240000 },
  { id: "10", asset: "USD/PHP OTC", direction: "up", duration: 510, value: "$2.82", copied: 11, timeAgo: "5 min ago", timestamp: Date.now() - 300000 },
];

function generateTimeAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 60) return `${diff} sec ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

export const WorkspaceSignals = ({ onClose, activeAsset }: WorkspaceSignalsProps) => {
  const [activeTab, setActiveTab] = useState<"updates" | "all">("updates");
  const [signals, setSignals] = useState<SignalData[]>(MOCK_SIGNALS);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setSignals((prev) =>
        prev.map((sig) => {
          const newDuration = Math.max(0, sig.duration - 1);
          return { ...sig, duration: newDuration, timeAgo: generateTimeAgo(sig.timestamp) };
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleCopySignal = (id: string) => {
    setSignals((prev) =>
      prev.map((sig) => (sig.id === id ? { ...sig, copied: sig.copied + 1 } : sig))
    );
    console.log(`Signal ${id} copied — execute trade logic here`);
  };

  const selectedAssetCode = activeAsset?.code || "USD/PHP OTC";

  const filteredSignals = useMemo(() => {
    if (activeTab === "all") return signals;
    return signals.filter((s) => s.asset === selectedAssetCode);
  }, [signals, activeTab, selectedAssetCode]);

  const progressMax = 900;

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--trading-workspace-bg)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{ background: "var(--trading-header-bg)", borderBottomColor: "var(--trading-border-color)" }}
      >
        <h2 className="text-[15px] font-bold text-white tracking-wide">Signals</h2>
        <div className="flex items-center gap-3 text-[#787b86]">
          <HelpCircle className="h-5 w-5 cursor-pointer hover:text-white transition-colors" />
          <Send className="h-4 w-4 cursor-pointer hover:text-white transition-colors" />
          <Settings className="h-5 w-5 cursor-pointer hover:text-white transition-colors" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderBottomColor: "var(--trading-border-color)" }}>
        <button
          type="button"
          onClick={() => setActiveTab("updates")}
          className={`flex-1 py-2.5 text-center text-[13px] font-semibold relative transition-colors ${
            activeTab === "updates"
              ? "text-white"
              : "text-[#787b86] hover:text-white"
          }`}
        >
          Updates
          {activeTab === "updates" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: "var(--trading-accent-blue)" }} />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex-1 py-2.5 text-center text-[13px] font-semibold relative transition-colors ${
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
      </div>

      {/* Signals List */}
      <div className="flex-1 overflow-y-auto divide-y" style={{ divideColor: "var(--trading-border-color)" }}>
        {filteredSignals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[#787b86]">
            <Wifi className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-[13px]">No active signals for {selectedAssetCode}</p>
            <p className="mt-1 text-[11px]">Switch assets or check back shortly</p>
          </div>
        ) : (
          filteredSignals.map((signal) => {
            const isUp = signal.direction === "up";
            const progress = Math.min((signal.duration / progressMax) * 100, 100);

            return (
              <div
                key={signal.id}
                className="p-4 transition-colors hover:bg-white/[0.02]"
                style={{ background: "var(--trading-workspace-bg)" }}
              >
                {/* Top Row */}
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="truncate text-white font-bold text-[14px] tracking-wide">{signal.asset}</span>

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
                    <span>{isUp ? "+$" : "-$"}</span>
                  </div>

                  <div className="flex items-center gap-2 w-28 shrink-0 justify-end">
                    <div className="w-16 h-[3px] rounded-full overflow-hidden" style={{ background: "var(--trading-border-color)" }}>
                      <div
                        className="h-full transition-all duration-1000 ease-linear"
                        style={{
                          width: `${progress}%`,
                          background: "var(--trading-accent-blue)",
                        }}
                      />
                    </div>
                    <span className="text-white font-semibold font-mono text-[12px] shrink-0">{formatTime(signal.duration)}</span>
                  </div>
                </div>

                {/* Middle Row */}
                <div className="flex items-center justify-between my-2">
                  <span className="text-[#9ba1b0] font-semibold text-[13px]">{signal.value}</span>
                  <button
                    type="button"
                    onClick={() => handleCopySignal(signal.id)}
                    className="bg-[#1e6b4e] hover:bg-[#26a69a] text-white font-medium text-[12px] py-1.5 px-3.5 rounded-md transition-all active:scale-[0.98]"
                    style={{ border: "1px solid rgba(38,166,154,0.3)" }}
                  >
                    Copy signal
                  </button>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between text-[11px] text-[#787b86]">
                  <span>Copied: {signal.copied} times</span>
                  <span>{signal.timeAgo}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};