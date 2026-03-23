import { useState } from "react";
import { BarChart, PenTool, Activity, Compass, Zap, Flame, TrendingUp, Waves, BarChart2, ArrowRight } from "lucide-react";
import { SUPPORTED_CHART_TIMEFRAMES, type SupportedChartTimeframe } from "./engine/priceEngine";

export type ChartType = "line" | "candles" | "bars" | "heikinAshi";

interface ChartToolbarProps {
  selectedTf: SupportedChartTimeframe;
  onSelectTf: (tf: SupportedChartTimeframe) => void;
  chartType: ChartType;
  onSelectChartType: (type: ChartType) => void;
  activeInds: string[];
  onToggleInd: (indId: string) => void;
  activeDrawTool: string | null;
  onSelectDrawTool: (tool: string | null) => void;
  onToggleIndicatorsPanel: () => void;
  onToggleDrawingsPanel: () => void;
}

const TIMEFRAME_LABELS = [...SUPPORTED_CHART_TIMEFRAMES];
const CHART_TYPES = [
  { id: "candles", label: "Candles", icon: <CandleIcon className="w-4 h-4" /> },
  { id: "heikinAshi", label: "Heikin-Ashi", icon: <CandleIcon className="w-4 h-4 text-trading-orange" /> },
  { id: "line", label: "Line", icon: <Activity className="w-4 h-4" /> },
  { id: "bars", label: "Bars", icon: <BarChart className="w-4 h-4" /> },
];

export function CandleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5v4" />
      <rect x="7" y="9" width="4" height="6" fill="currentColor" fillOpacity={0.2} />
      <path d="M9 15v4" />
      <path d="M15 3v4" />
      <rect x="13" y="7" width="4" height="10" fill="currentColor" fillOpacity={0.2} />
      <path d="M15 17v4" />
    </svg>
  );
}

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c3-4 5-4 8 0s5 4 8 0 3-4 5-4" />
      <path d="M2 18c3-4 5-4 8 0s5 4 8 0 3-4 5-4" opacity="0.3" />
    </svg>
  );
}

const CATS = [
  { id: "Scripts", label: "Scripts", icon: Zap, color: "#f1c40f" },
  { id: "Popular", label: "Popular", icon: Flame, color: "#e74c3c" },
  { id: "Momentum", label: "Momentum", icon: Activity, color: "#3498db" },
  { id: "Trend", label: "Trend", icon: TrendingUp, color: "#2ecc71" },
  { id: "Volatility", label: "Volatility", icon: Waves, color: "#e67e22" },
  { id: "Moving Averages", label: "Moving Averages", icon: Activity, color: "#e74c3c" },
  { id: "Volume", label: "Volume", icon: BarChart2, color: "#2ecc71" },
  { id: "Other", label: "Other", icon: ArrowRight, color: "#e74c3c" },
];

const INDICATOR_DB: Record<string, { id: string; label: string; }[]> = {
  "Moving Averages": [
    { id: "sma", label: "Simple Moving Average (SMA)" },
    { id: "ema", label: "Exponential Moving Average (EMA)" },
  ],
  "Momentum": [
    { id: "rsi", label: "Relative Strength Index (RSI)" },
    { id: "awesome", label: "Awesome Oscillator" },
    { id: "mom", label: "Momentum" },
  ],
  "Volatility": [
    { id: "bb", label: "Bollinger Bands" },
    { id: "atr", label: "Average True Range (ATR)" }
  ],
  "Popular": [
    { id: "bb", label: "Bollinger Bands" },
    { id: "rsi", label: "Relative Strength Index (RSI)" },
    { id: "sma", label: "SMA" },
    { id: "ema", label: "EMA" },
  ]
};

const MODAL_STYLE = {
  background: "#1f2736",
  border: "1px solid rgba(88, 102, 132, 0.7)",
  boxShadow: "0 18px 42px rgba(0,0,0,0.44)",
};

  const ChartToolbar = ({
  selectedTf,
  onSelectTf,
  chartType,
  onSelectChartType,
  activeInds,
  onToggleInd,
  activeDrawTool,
  onSelectDrawTool,
  onToggleIndicatorsPanel,
  onToggleDrawingsPanel
}: ChartToolbarProps) => {
  const [activeMenu, setActiveMenu] = useState<"type" | "time" | "inds" | "added" | null>(null);
  const [analysisTab, setAnalysisTab] = useState("INDICATORS");
  const [activeCat, setActiveCat] = useState("Popular");
  const [searchQuery, setSearchQuery] = useState("");

  const toggleMenu = (menu: "type" | "time" | "inds" | "added") => {
    setActiveMenu(p => p === menu ? null : menu);
  };

  const desktopToolBase =
    "flex h-11 w-11 items-center justify-center rounded-[8px] border shadow-[0_10px_24px_rgba(0,0,0,0.34)] transition-all duration-150";

  const menuBtnClass = (isActive: boolean, accent: "default" | "green" = "default") => {
    const idleClass =
      accent === "green"
        ? "border-[#314056] bg-[#232b3a]/96 text-[#18d87d] hover:border-[#3e516d] hover:bg-[#2a3446]"
        : "border-[#314056] bg-[#232b3a]/96 text-[#e7edf6] hover:border-[#3e516d] hover:bg-[#2a3446]";
    const activeClass =
      accent === "green"
        ? "border-[#1f6c49] bg-[#193125]/98 text-[#1be486]"
        : "border-[#4f698e] bg-[#2d3850]/98 text-white";

    return `${desktopToolBase} ${isActive ? activeClass : idleClass}`;
  };

  return (
    <div className="pointer-events-none absolute bottom-6 left-4 z-40 hidden sm:block">
      <div className="pointer-events-auto flex flex-col gap-5">
        
        {/* Graphical Tools (Pencil) */}
        <div className="relative">
          <button
            id="tour-drawings"
            onClick={onToggleDrawingsPanel}
            className={menuBtnClass(activeDrawTool !== null)}
            title="Graphical Tools"
          >
            <PenTool className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* Timeframe */}
        <div className="relative">
          <button
            id="tour-timeframe"
            onClick={() => toggleMenu("time")}
            className={menuBtnClass(activeMenu === "time", "green")}
            title="Time Interval"
          >
            <span className={`text-[14px] font-black tracking-[-0.03em] ${activeMenu === "time" ? "text-white" : "text-[#18d87d]"}`}>
              {selectedTf}
            </span>
          </button>

          {activeMenu === "time" && (
            <div className="absolute left-14 top-0 w-56 rounded-xl" style={MODAL_STYLE}>
              <div className="grid grid-cols-4 gap-1 p-2">
                {TIMEFRAME_LABELS.map(tf => (
                  <button
                    key={tf}
                    onClick={() => { onSelectTf(tf); setActiveMenu(null); }}
                    className={`py-1.5 rounded text-[12px] font-medium transition-colors ${
                      selectedTf === tf ? "bg-trading-orange text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chart Type (Candles) */}
        <div className="relative">
          <button
            id="tour-chart-type"
            onClick={() => toggleMenu("type")}
            className={menuBtnClass(activeMenu === "type")}
            title="Chart Type"
          >
            <CandleIcon className="w-[18px] h-[18px]" />
          </button>
          
          {activeMenu === "type" && (
            <div className="absolute left-14 top-0 w-48 rounded-xl" style={MODAL_STYLE}>
              <div className="flex flex-col p-1.5">
                {CHART_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => { onSelectChartType(type.id as ChartType); setActiveMenu(null); }}
                    className={`flex items-center gap-3 px-3 py-2 rounded text-[13px] font-medium transition-colors ${
                      chartType === type.id ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {type.icon}
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Professional Indicators Toggle (Compass) */}
        <div className="relative">
          <button
            id="tour-indicators"
            onClick={onToggleIndicatorsPanel}
            className={menuBtnClass(false)}
            title="Indicators"
          >
            <Compass className="w-[18px] h-[18px]" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ChartToolbar;
