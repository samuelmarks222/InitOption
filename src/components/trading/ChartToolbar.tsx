import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { PenTool, Activity, Compass, Zap, Flame, TrendingUp, Waves, BarChart2, ArrowRight } from "lucide-react";
import { SUPPORTED_CHART_TIMEFRAMES, type SupportedChartTimeframe } from "./engine/priceEngine";

export type ChartType = "line" | "candles" | "bars" | "heikinAshi";

interface ChartToolbarProps {
  selectedTf: SupportedChartTimeframe;
  onSelectTf: (tf: SupportedChartTimeframe) => void;
  styleEditorOpen?: boolean;
  onOpenStyleEditor: () => void;
  activeInds: string[];
  onToggleInd: (indId: string) => void;
  activeDrawTool: string | null;
  onSelectDrawTool: (tool: string | null) => void;
  onToggleIndicatorsPanel: () => void;
  onToggleDrawingsPanel: () => void;
}

const TIMEFRAME_LABELS = [...SUPPORTED_CHART_TIMEFRAMES];
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
  background: "var(--trading-menu-bg)",
  border: "1px solid var(--trading-menu-border)",
  boxShadow: "0 18px 42px rgba(0,0,0,0.44)",
};

  const ChartToolbar = ({
  selectedTf,
  onSelectTf,
  styleEditorOpen = false,
  onOpenStyleEditor,
  activeInds,
  onToggleInd,
  activeDrawTool,
  onSelectDrawTool,
  onToggleIndicatorsPanel,
  onToggleDrawingsPanel
}: ChartToolbarProps) => {
  const [activeMenu, setActiveMenu] = useState<"time" | "inds" | "added" | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const [analysisTab, setAnalysisTab] = useState("INDICATORS");
  const [activeCat, setActiveCat] = useState("Popular");
  const [searchQuery, setSearchQuery] = useState("");
  const timeframeButtonRef = useRef<HTMLButtonElement>(null);

  const dismissMenu = useCallback(() => {
    setActiveMenu(null);
    setMenuStyle(null);
  }, []);

  const toggleMenu = useCallback(
    (
      menu: "time" | "inds" | "added",
      anchor: HTMLButtonElement | null,
      width: number,
      estimatedHeight: number,
    ) => {
      if (!anchor) return;

      if (activeMenu === menu) {
        dismissMenu();
        return;
      }

      const gap = 12;
      const rect = anchor.getBoundingClientRect();
      const nextLeft = Math.min(
        Math.max(12, rect.right + gap),
        Math.max(12, window.innerWidth - width - 12),
      );
      const nextTop = Math.min(
        Math.max(12, rect.top - 6),
        Math.max(12, window.innerHeight - estimatedHeight - 12),
      );

      setMenuStyle({
        left: nextLeft,
        top: nextTop,
        width,
        maxHeight: "calc(100vh - 24px)",
      });
      setActiveMenu(menu);
    },
    [activeMenu, dismissMenu],
  );

  useEffect(() => {
    if (!activeMenu) return;

    const handleViewportChange = () => dismissMenu();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [activeMenu, dismissMenu]);

  const desktopToolBase =
    "flex h-[32px] w-[32px] items-center justify-center rounded-[4px] border border-[var(--trading-tool-border)] bg-[var(--trading-tool-bg)] transition-colors duration-150";

  const menuBtnClass = (isActive: boolean, accent: "default" | "green" = "default") => {
    const idleClass =
      accent === "green"
        ? "text-[var(--trading-timeframe-text)] hover:border-[var(--trading-tool-hover-border)] hover:bg-[var(--trading-tool-hover-bg)]"
        : "text-[var(--trading-tool-text)] hover:border-[var(--trading-tool-hover-border)] hover:bg-[var(--trading-tool-hover-bg)]";
    const activeClass =
      accent === "green"
        ? "border-[var(--trading-tool-active-border)] bg-[var(--trading-tool-active-bg)] text-[var(--trading-tool-active-text)]"
        : "border-[var(--trading-tool-active-border)] bg-[var(--trading-tool-active-bg)] text-[var(--trading-tool-active-text)]";

    return `${desktopToolBase} ${isActive ? activeClass : idleClass}`;
  };

  return (
    <div className="pointer-events-none">
      {activeMenu && <button type="button" aria-label="Close toolbar menu" onClick={dismissMenu} className="fixed inset-0 z-[41]" />}
      <div className="pointer-events-auto flex flex-col gap-2">
        
        {/* Graphical Tools (Pencil) */}
        <div className="relative">
          <button
            id="tour-drawings"
            onClick={onToggleDrawingsPanel}
            className={menuBtnClass(activeDrawTool !== null)}
            title="Graphical Tools"
          >
            <PenTool className="h-[15px] w-[15px]" />
          </button>
        </div>

        {/* Timeframe */}
        <div className="relative">
          <button
            ref={timeframeButtonRef}
            id="tour-timeframe"
            onClick={() => toggleMenu("time", timeframeButtonRef.current, 224, 220)}
            className={menuBtnClass(activeMenu === "time", "green")}
            title="Time Interval"
          >
              <span className={`text-[12px] font-black tracking-[-0.03em] ${activeMenu === "time" ? "text-[var(--trading-tool-active-text)]" : "text-[var(--trading-timeframe-text)]"}`}>
                {selectedTf}
              </span>
          </button>

          {activeMenu === "time" && (
            <div className="fixed z-[42] overflow-y-auto rounded-xl" style={{ ...MODAL_STYLE, ...(menuStyle ?? { left: 72, top: 24, width: 224, maxHeight: "calc(100vh - 24px)" }) }}>
              <div className="grid grid-cols-4 gap-1 p-2">
                {TIMEFRAME_LABELS.map(tf => (
                  <button
                    key={tf}
                    onClick={() => { onSelectTf(tf); dismissMenu(); }}
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
            onClick={onOpenStyleEditor}
            className={menuBtnClass(styleEditorOpen)}
            title="Chart settings"
            aria-label="Open chart settings"
          >
            <CandleIcon className="h-[15px] w-[15px]" />
          </button>
        </div>

        {/* Professional Indicators Toggle (Compass) */}
        <div className="relative">
          <button
            id="tour-indicators"
            onClick={onToggleIndicatorsPanel}
            className={menuBtnClass(false)}
            title="Indicators"
          >
            <Compass className="h-[15px] w-[15px]" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ChartToolbar;
