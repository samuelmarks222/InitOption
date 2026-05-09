import { useState } from "react";
import { X, LineChart, BarChart2, Activity, PieChart, ShieldAlert, GitCompare, BellRing } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStatistics } from "@/hooks/useStatistics";

import { AnalyticsOverview } from "./analytics/AnalyticsOverview";
import { AnalyticsAnalysis } from "./analytics/AnalyticsAnalysis";
import { AnalyticsAssets } from "./analytics/AnalyticsAssets";
import { AnalyticsRisk } from "./analytics/AnalyticsRisk";
import { AnalyticsBenchmark } from "./analytics/AnalyticsBenchmark";
import { AnalyticsSignals } from "./analytics/AnalyticsSignals";

type AnalyticsTab = "overview" | "analysis" | "assets" | "risk" | "benchmark" | "signals";

interface AnalyticsGridOverlayProps {
  onClose?: () => void;
}

export const AnalyticsGridOverlay = ({ onClose }: AnalyticsGridOverlayProps) => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
  const [dateRange, setDateRange] = useState<"Today" | "Week" | "Month" | "All">("All");

  const { profile } = useAuth();
  const { tradeStats } = useStatistics();

  const TABS = [
    { id: "overview", icon: BarChart2, label: "Performance Overview" },
    { id: "analysis", icon: Activity, label: "Trade Analysis" },
    { id: "assets", icon: PieChart, label: "Asset Performance" },
    { id: "risk", icon: ShieldAlert, label: "Risk Metrics" },
    { id: "benchmark", icon: GitCompare, label: "Benchmark Comparison" },
    { id: "signals", icon: BellRing, label: "Signals & Predictions" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      {/* Slide-in container — full width on mobile */}
      <div className="w-full md:w-[90%] h-full bg-[#0E1217] shadow-2xl flex flex-col border-l border-white/10">

        {/* ── TOP HEADER ── */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between px-4 md:px-8 py-3 md:py-5 border-b border-[#ffffff10] bg-[#1A1F26] shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-[17px] md:text-[22px] font-bold text-white flex items-center gap-2">
                <LineChart className="w-5 h-5 text-[#0b65c2] shrink-0" /> Advanced Analytics
              </h1>
              <p className="text-[11px] md:text-[13px] text-gray-400 hidden sm:block">Real-time performance metrics and statistical insights</p>
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <div className="flex bg-[#0E1217] rounded-lg p-1 border border-white/5 shrink-0">
              {(["Today", "Week", "Month", "All"] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors ${
                    dateRange === range ? "bg-[#0b65c2] text-white" : "text-gray-500 hover:text-white"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            <button className="hidden md:flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg text-[13px] font-bold text-white transition-colors shrink-0">
              Export Data
            </button>
          </div>
        </div>

        {/* ── KPI STRIP ── */}
        <div className="bg-[#14181F] px-4 py-3 border-b border-[#ffffff10] shrink-0">
          <div className="flex overflow-x-auto gap-3 scrollbar-hide">
            <KPICard label="Net Profit" value={`$${tradeStats.totalProfit.toFixed(2)}`} color={tradeStats.totalProfit >= 0 ? "text-[#00C076]" : "text-red-500"} />
            <KPICard label="Total Trades" value={tradeStats.totalTrades} />
            <KPICard label="Win Rate" value={`${tradeStats.winRate}%`} color={tradeStats.winRate >= 50 ? "text-[#00C076]" : "text-[#0fa053]"} />
            <KPICard label="Profit Factor" value={tradeStats.profitFactor > 900 ? "MAX" : tradeStats.profitFactor.toFixed(2)} />
            <KPICard label="Avg Return" value={`$${tradeStats.averageReturn.toFixed(2)}`} color={tradeStats.averageReturn >= 0 ? "text-[#00C076]" : "text-red-500"} />
            <KPICard label="Max Drawdown" value={`-$${tradeStats.maxDrawdown.toFixed(2)}`} color="text-red-400" />
            <KPICard label="Sharpe Ratio" value={tradeStats.sharpeRatio.toFixed(2)} />
            <KPICard label="Current Balance" value={`$${(profile?.balance ?? 0).toFixed(2)}`} color="text-white" />
          </div>
        </div>

        {/* ── MOBILE: Horizontal Tab Scroll ── */}
        <div className="md:hidden shrink-0 flex overflow-x-auto gap-1 px-2 py-2 bg-[#1A1F26] border-b border-white/5 scrollbar-hide snap-x snap-mandatory">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AnalyticsTab)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl shrink-0 whitespace-nowrap transition-colors snap-start ${isActive ? "bg-[#0fa053]/15 text-[#0fa053]" : "text-gray-500"}`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-[9px] font-bold text-center leading-tight max-w-[60px]">
                  {tab.label.split(" ").slice(0, 2).join(" ")}
                </span>
                {isActive && <div className="w-4 h-[2px] bg-[#0fa053] rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* ── DESKTOP BODY: Vertical tabs + content ── */}
        <div className="flex-1 flex overflow-hidden min-h-0">

          {/* Desktop Vertical Tabs */}
          <div className="hidden md:flex w-[280px] bg-[#1A1F26] border-r border-[#ffffff10] flex-col p-4 space-y-2 shrink-0 overflow-y-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AnalyticsTab)}
                className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-left transition-all ${
                  activeTab === tab.id
                    ? "bg-[#0b65c2]/10 text-[#0b65c2] border border-[#0b65c2]/20 shadow-sm"
                    : "text-gray-400 hover:text-white border border-transparent hover:bg-white/5"
                }`}
              >
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? "text-[#0b65c2]" : "text-gray-500"}`} />
                <span className="font-bold text-[14px]">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-[#0E1217] p-4 md:p-8">
            <h2 className="text-[18px] md:text-[24px] font-bold text-white mb-4 md:mb-8 border-b border-white/5 pb-4">
              {TABS.find(t => t.id === activeTab)?.label}
            </h2>
            {activeTab === "overview" && <AnalyticsOverview />}
            {activeTab === "analysis" && <AnalyticsAnalysis />}
            {activeTab === "assets" && <AnalyticsAssets />}
            {activeTab === "risk" && <AnalyticsRisk />}
            {activeTab === "benchmark" && <AnalyticsBenchmark />}
            {activeTab === "signals" && <AnalyticsSignals />}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- KPI Card ---
const KPICard = ({ label, value, color = "text-white" }: { label: string, value: string | number, color?: string }) => (
  <div className="min-w-[120px] md:min-w-[160px] flex-1 bg-[#1A1F26] rounded-xl p-3 md:p-4 border border-white/5 shadow-sm flex flex-col justify-center shrink-0">
    <span className="text-[10px] md:text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</span>
    <span className={`text-[16px] md:text-[22px] font-black tracking-tight ${color}`}>{value}</span>
  </div>
);


