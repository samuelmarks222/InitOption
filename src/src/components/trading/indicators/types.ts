export type IndicatorCategory = "Trend Indicators" | "Oscillators" | "Volatility" | "Volume";

export type ParamType = "number" | "color" | "source" | "style" | "fill";

export interface IndicatorParamDef {
  id: string; // e.g. "period", "color"
  name: string; // e.g. "Period", "Line Color"
  type: ParamType;
  default: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[]; // for source: ["close", "open", "high", "low", "hl2", "hlc3", "ohlc4"]
}

export interface IndicatorConfig {
  id: string; // e.g., "sma", "macd"
  name: string;
  category: IndicatorCategory;
  pane: "overlay" | "separate"; // overlay draws on main chart, separate draws below
  params: IndicatorParamDef[];
  outputs: Array<{
    id: string; // e.g., "macdLine", "signalLine", "histogram"
    type: "line" | "histogram";
    defaultColor?: string;
  }>;
}

export interface ActiveIndicator {
  instanceId: string; // uuid
  configId: string; // references IndicatorConfig.id
  name: string; // e.g., "SMA (14, close)"
  pane: "overlay" | "separate";
  params: Record<string, any>; // user's current settings matching IndicatorParamDef.id
  visible: boolean;
}
