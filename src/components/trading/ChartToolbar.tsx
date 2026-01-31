import { useState } from "react";
import {
  Pencil,
  Waves,
  Clock,
  Crosshair,
  TrendingUp,
  BarChart3,
  Type,
  Eraser,
  ChevronDown,
  X,
  Minus,
  Circle,
  Triangle,
  ArrowRight,
  Square,
} from "lucide-react";
import { indicators, drawingTools, chartTimeframes } from "./data/assets";

interface ChartToolbarProps {
  timeframe: number;
  onTimeframeChange: (value: number) => void;
  activeIndicators: string[];
  onToggleIndicator: (id: string) => void;
  activeTool: string | null;
  onSelectTool: (tool: string | null) => void;
}

const ChartToolbar = ({
  timeframe,
  onTimeframeChange,
  activeIndicators,
  onToggleIndicator,
  activeTool,
  onSelectTool,
}: ChartToolbarProps) => {
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(false);
  const [showDrawingPanel, setShowDrawingPanel] = useState(false);

  const currentTimeframe = chartTimeframes.find((t) => t.value === timeframe);

  const getToolIcon = (id: string) => {
    switch (id) {
      case "line":
        return <Minus className="w-4 h-4" />;
      case "horizontal":
        return <Minus className="w-4 h-4" />;
      case "vertical":
        return <Minus className="w-4 h-4 rotate-90" />;
      case "trend":
        return <TrendingUp className="w-4 h-4" />;
      case "rectangle":
        return <Square className="w-4 h-4" />;
      case "ellipse":
        return <Circle className="w-4 h-4" />;
      case "triangle":
        return <Triangle className="w-4 h-4" />;
      case "arrow":
        return <ArrowRight className="w-4 h-4" />;
      case "text":
        return <Type className="w-4 h-4" />;
      case "eraser":
        return <Eraser className="w-4 h-4" />;
      default:
        return <Pencil className="w-4 h-4" />;
    }
  };

  return (
    <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
      {/* Timeframe Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
          className="flex items-center gap-1 px-2 py-1.5 rounded bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Clock className="w-3.5 h-3.5" />
          {currentTimeframe?.label || "12h"}
          <ChevronDown className="w-3 h-3" />
        </button>

        {showTimeframeDropdown && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowTimeframeDropdown(false)}
            />
            <div className="absolute left-0 top-full mt-1 w-24 bg-card border border-border rounded-lg shadow-xl z-50 py-1 max-h-[250px] overflow-y-auto">
              {chartTimeframes.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => {
                    onTimeframeChange(tf.value);
                    setShowTimeframeDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-xs hover:bg-secondary transition-colors ${
                    timeframe === tf.value
                      ? "text-primary bg-secondary"
                      : "text-muted-foreground"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Indicators Button */}
      <div className="relative">
        <button
          onClick={() => setShowIndicatorPanel(!showIndicatorPanel)}
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
            activeIndicators.length > 0
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          <Waves className="w-4 h-4" />
        </button>

        {showIndicatorPanel && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowIndicatorPanel(false)}
            />
            <div className="absolute left-full ml-2 top-0 w-[280px] bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-border">
                <span className="text-sm font-semibold text-foreground">Indicators</span>
                <button
                  onClick={() => setShowIndicatorPanel(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2">
                {["Trend", "Momentum", "Volatility", "Volume", "Pattern", "Support/Resistance"].map(
                  (category) => (
                    <div key={category} className="mb-3">
                      <div className="text-[10px] uppercase text-muted-foreground mb-1 px-2">
                        {category}
                      </div>
                      {indicators
                        .filter((ind) => ind.category === category)
                        .map((indicator) => (
                          <button
                            key={indicator.id}
                            onClick={() => onToggleIndicator(indicator.id)}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                              activeIndicators.includes(indicator.id)
                                ? "bg-primary/20 text-primary"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            }`}
                          >
                            <span>{indicator.name}</span>
                            <span className="text-[10px] opacity-60">{indicator.fullName}</span>
                          </button>
                        ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drawing Tools Button */}
      <div className="relative">
        <button
          onClick={() => setShowDrawingPanel(!showDrawingPanel)}
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
            activeTool
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pencil className="w-4 h-4" />
        </button>

        {showDrawingPanel && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDrawingPanel(false)}
            />
            <div className="absolute left-full ml-2 top-0 w-[200px] bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-border">
                <span className="text-sm font-semibold text-foreground">Drawing Tools</span>
                <button
                  onClick={() => setShowDrawingPanel(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2 grid grid-cols-4 gap-1">
                {drawingTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      onSelectTool(activeTool === tool.id ? null : tool.id);
                    }}
                    className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                      activeTool === tool.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                    title={tool.name}
                  >
                    {getToolIcon(tool.id)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Crosshair */}
      <button className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
        <Crosshair className="w-4 h-4" />
      </button>

      {/* Chart Type */}
      <button className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
        <BarChart3 className="w-4 h-4" />
      </button>

      {/* Active Indicators Count */}
      {activeIndicators.length > 0 && (
        <div className="px-2 py-1 rounded bg-primary/20 text-primary text-[10px] text-center">
          {activeIndicators.length} active
        </div>
      )}
    </div>
  );
};

export default ChartToolbar;
