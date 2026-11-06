import { X } from "lucide-react";
import type { IChartApi } from "lightweight-charts";
import type { OscillatorIndicatorResult } from "./calculations";
import type { ActiveIndicator } from "./types";

// Indicator calculations and settings are retained. Rendering must be reconnected
// to the replacement chart; this pane deliberately does not fabricate a plot.
interface OscillatorPaneProps {
  indicator: ActiveIndicator;
  data: OscillatorIndicatorResult | null;
  errorMessage?: string;
  renderKey: number;
  syncMainChart: IChartApi | null;
  onRemove?: () => void;
}
export const OscillatorPane = ({ indicator, errorMessage, onRemove }: OscillatorPaneProps) => (
  <div className="flex h-[176px] flex-col border-t border-white/5 bg-[#0b1118]">
    <div className="flex items-center justify-between px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">{indicator.name}</p>
      {onRemove && <button type="button" aria-label={`Remove ${indicator.name}`} onClick={onRemove} className="rounded p-1 text-slate-500"><X className="h-3.5 w-3.5" /></button>}
    </div>
    <p className="px-3 text-[11px] text-slate-400">{errorMessage || "Indicator plotting will return with the chart."}</p>
  </div>
);
