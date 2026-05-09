import { useState } from "react";
import { Search, X, Flame, TrendingUp, Activity, BarChart3, Waves, PieChart, Star } from "lucide-react";

interface Indicator {
  id: string;
  name: string;
  fullName?: string;
  category: string;
}

const ALL_INDICATORS: Indicator[] = [
  // Popular
  { id: "alligator", name: "Alligator", category: "Popular" },
  { id: "adx", name: "Average Directional Movement Index", category: "Popular" },
  { id: "atr", name: "Average True Range", category: "Popular" },
  { id: "ao", name: "Awesome Oscillator", category: "Popular" },
  { id: "bb", name: "Bollinger Bands", category: "Popular" },
  { id: "cci", name: "Commodity Channel Index", category: "Popular" },
  { id: "dpo", name: "Detrended Price Oscillator (DPO)", category: "Popular" },
  { id: "fractal", name: "Fractal", category: "Popular" },
  { id: "macd", name: "MACD", category: "Popular" },
  { id: "momentum", name: "Momentum", category: "Popular" },
  // Momentum
  { id: "rsi", name: "RSI", fullName: "Relative Strength Index", category: "Momentum" },
  { id: "stoch", name: "Stochastic", category: "Momentum" },
  { id: "wpr", name: "Williams %R", category: "Momentum" },
  { id: "mfi", name: "Money Flow Index", category: "Momentum" },
  // Trend
  { id: "sma", name: "SMA", fullName: "Simple Moving Average", category: "Trend" },
  { id: "ema", name: "EMA", fullName: "Exponential Moving Average", category: "Trend" },
  { id: "ichimoku", name: "Ichimoku Cloud", category: "Trend" },
  { id: "parabolic", name: "Parabolic SAR", category: "Trend" },
  // Volatility
  { id: "atr2", name: "ATR Bands", category: "Volatility" },
  { id: "keltner", name: "Keltner Channel", category: "Volatility" },
  // Moving Averages
  { id: "wma", name: "WMA", fullName: "Weighted Moving Average", category: "Moving Averages" },
  { id: "hull", name: "Hull MA", category: "Moving Averages" },
  { id: "vwap", name: "VWAP", category: "Moving Averages" },
  // Volume
  { id: "obv", name: "OBV", fullName: "On Balance Volume", category: "Volume" },
  { id: "vpt", name: "Volume Price Trend", category: "Volume" },
  // Other
  { id: "pivot", name: "Pivot Points", category: "Other" },
  { id: "zigzag", name: "Zig Zag", category: "Other" },
];

const LEFT_CATEGORIES = [
  { id: "Added", label: "Added", icon: Star },
  { id: "Popular", label: "Popular", icon: Flame },
  { id: "Momentum", label: "Momentum", icon: Activity },
  { id: "Trend", label: "Trend", icon: TrendingUp },
  { id: "Volatility", label: "Volatility", icon: Waves },
  { id: "Moving Averages", label: "Moving Averages", icon: TrendingUp },
  { id: "Volume", label: "Volume", icon: BarChart3 },
  { id: "Other", label: "Other", icon: PieChart },
];

const MAIN_TABS = ["INDICATORS", "TEMPLATES", "WIDGETS", "SCRIPTS"];

interface ChartAnalysisPanelProps {
  activeIndicators: string[];
  onToggleIndicator: (id: string) => void;
  onClose: () => void;
}

const ChartAnalysisPanel = ({ activeIndicators, onToggleIndicator, onClose }: ChartAnalysisPanelProps) => {
  const [mainTab, setMainTab] = useState("INDICATORS");
  const [leftCategory, setLeftCategory] = useState("Popular");
  const [search, setSearch] = useState("");

  const displayed = ALL_INDICATORS.filter(ind => {
    if (search) return ind.name.toLowerCase().includes(search.toLowerCase());
    if (leftCategory === "Added") return activeIndicators.includes(ind.id);
    return ind.category === leftCategory;
  });

  return (
    <div className="absolute left-12 top-0 w-[580px] bg-[#1a1b20] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col" style={{ maxHeight: "460px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#22242a]">
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Chart Analysis</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search for indicators"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-[#2a2d35] border border-white/10 rounded text-xs text-foreground pl-7 pr-3 py-1.5 w-44 focus:outline-none focus:border-white/20 placeholder:text-muted-foreground"
            />
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-white/5 bg-[#1a1b20]">
        {MAIN_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`px-5 py-2.5 text-xs font-bold tracking-wider transition-colors border-b-2 ${
              mainTab === tab
                ? "text-trading-orange border-trading-orange"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Body */}
      {mainTab === "INDICATORS" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Category List */}
          <div className="w-[200px] border-r border-white/5 overflow-y-auto shrink-0">
            {LEFT_CATEGORIES.map(cat => {
              const addedCount = cat.id === "Added" ? activeIndicators.length : undefined;
              return (
                <button
                  key={cat.id}
                  onClick={() => setLeftCategory(cat.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors border-l-2 ${
                    leftCategory === cat.id
                      ? "bg-[#2a2d35] text-foreground border-trading-orange"
                      : "text-muted-foreground border-transparent hover:bg-[#22242a] hover:text-foreground"
                  }`}
                >
                  {cat.id === "Added" ? (
                    <span className="w-5 h-5 rounded-full bg-[#32363e] text-xs flex items-center justify-center font-semibold">
                      {addedCount}
                    </span>
                  ) : (
                    <cat.icon className="w-4 h-4 opacity-70" />
                  )}
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Right Indicator List */}
          <div className="flex-1 overflow-y-auto">
            {displayed.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No indicators found</div>
            ) : (
              displayed.map(ind => {
                const isActive = activeIndicators.includes(ind.id);
                return (
                  <button
                    key={ind.id}
                    onClick={() => onToggleIndicator(ind.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors border-b border-white/5 last:border-0 ${
                      isActive
                        ? "bg-trading-orange/10 text-trading-orange"
                        : "text-foreground hover:bg-[#22242a]"
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-trading-orange" : "bg-muted-foreground/40"}`} />
                    <span>{ind.name}</span>
                    {isActive && <span className="ml-auto text-xs text-trading-orange">Active</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {(mainTab === "TEMPLATES" || mainTab === "WIDGETS" || mainTab === "SCRIPTS") && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-8 text-center">
          <div>
            <div className="text-3xl mb-3">📊</div>
            <div>No {mainTab.toLowerCase()} available yet.</div>
            <div className="text-xs mt-1">Use the community library to find and add {mainTab.toLowerCase()}.</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartAnalysisPanel;
