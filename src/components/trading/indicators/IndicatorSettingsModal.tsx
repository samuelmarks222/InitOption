import React, { useState } from "react";
import { X, ChevronLeft, ChevronDown } from "lucide-react";
import { ActiveIndicator } from "./types";
import { INDICATOR_REGISTRY } from "./config";

interface IndicatorSettingsModalProps {
  indicator: ActiveIndicator;
  onSave: (updates: Partial<ActiveIndicator>) => void;
  onClose: () => void;
}

const COLOR_PALETTE = [
  "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#1abc9c",
  "#3498db", "#9b59b6", "#8e44ad", "#e91e63", "#ff5722",
];

const SLIDER_TRACK = "w-full h-1 rounded-full cursor-pointer accent-[#3498db]";

export default function IndicatorSettingsModal({ indicator, onSave, onClose }: IndicatorSettingsModalProps) {
  const config = INDICATOR_REGISTRY.find(c => c.id === indicator.configId);
  const [params, setParams] = useState<Record<string, any>>({ ...indicator.params });

  if (!config) return null;

  const setParam = (key: string, val: any) => setParams(p => ({ ...p, [key]: val }));

  const handleApply = () => {
    onSave({ params });
    onClose();
  };

  // Separate numeric/source params from color params
  const nonColorParams = config.params.filter(p => p.type === "number" || p.type === "source");
  const colorParams = config.params.filter(p => p.type === "color" || p.type === "fill");

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-start" onClick={onClose}>
      <div
        className="w-[260px] flex flex-col overflow-hidden rounded-lg shadow-2xl"
        style={{
          position: "absolute",
          left: "410px",
          top: "80px",
          background: "#141820",
          border: "1px solid #2a2d3e",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d3e]">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white font-bold text-[15px]">Indicators</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Indicator Name */}
        <div className="px-4 pt-4 pb-2">
          <span className="text-white font-bold text-[17px]">{indicator.name}</span>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4" style={{ maxHeight: "500px" }}>
          
          {/* Non-color params (numbers / dropdowns) */}
          {nonColorParams.map(def => {
            const val = params[def.id] ?? def.default;
            return (
              <div key={def.id}>
                {def.type === "number" && (
                  <div className="rounded border border-[#2a2d3e]" style={{ background: "#1A1F26" }}>
                    <span className="block text-[11px] text-gray-500 px-3 pt-2 pb-1">{def.name}</span>
                    <div className="flex items-center">
                      <button
                        onClick={() => {
                          const step = def.step ?? 1;
                          const newVal = Number((Number(val) - step).toFixed(3));
                          setParam(def.id, Math.max(def.min ?? 1, newVal));
                        }}
                        className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-white text-xl font-bold transition-colors"
                      >
                        −
                      </button>
                      <span className="flex-1 text-center text-white font-semibold text-[15px]">{val}</span>
                      <button
                        onClick={() => {
                          const step = def.step ?? 1;
                          const newVal = Number((Number(val) + step).toFixed(3));
                          setParam(def.id, Math.min(def.max ?? 9999, newVal));
                        }}
                        className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-white text-xl font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {def.type === "source" && def.options && (
                  <div className="rounded border border-[#2a2d3e]" style={{ background: "#1A1F26" }}>
                    <span className="block text-[11px] text-gray-500 px-3 pt-2 pb-1">{def.name}</span>
                    <div className="relative">
                      <select
                        value={val}
                        onChange={e => setParam(def.id, e.target.value)}
                        className="w-full bg-transparent text-white px-3 pb-3 pt-1 outline-none appearance-none text-[14px] font-medium cursor-pointer"
                      >
                        {def.options.map(opt => (
                          <option key={opt} value={opt} style={{ background: "#141820" }}>{opt.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Color params — each with label, preview swatch, slider, and palette */}
          {colorParams.map(def => {
            const isFill = def.type === "fill";
            const val = params[def.id] ?? def.default ?? "#3498db";
            const widthKey = def.id.replace("Color", "Width").replace("color", "width");
            const widthVal = params[widthKey] ?? params["width"] ?? 1;
            
            const enabledKey = def.id + "_enabled";
            const isEnabled = params[enabledKey] ?? true;

            return (
              <div key={def.id}>
                {/* Label row with current color box */}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded cursor-pointer border border-white/10 transition-all ${isFill ? "opacity-100" : ""}`}
                    style={{ background: isFill && !isEnabled ? "transparent" : val, border: isFill && !isEnabled ? "1px solid #2a2d3e" : "none" }}
                    onClick={() => {
                      if (isFill) {
                        setParam(enabledKey, !isEnabled);
                        return;
                      }
                      const tmp = document.createElement("input");
                      tmp.type = "color";
                      let initialColor = val;
                      if (initialColor.startsWith("rgba")) initialColor = "#3498db"; 
                      tmp.value = initialColor.length === 7 ? initialColor : "#ffffff";
                      tmp.oninput = (e) => setParam(def.id, (e.target as HTMLInputElement).value);
                      tmp.onchange = (e) => setParam(def.id, (e.target as HTMLInputElement).value);
                      tmp.click();
                    }}
                  >
                    {isFill && isEnabled && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                  </div>
                  <span className="text-white text-[13px] font-semibold">{def.name.replace(" Color", "").replace("color", "main")}</span>
                </div>

                {/* Line width slider (only for lines, not fills) */}
                {!isFill && (
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={widthVal}
                    onChange={e => {
                      setParam(widthKey, Number(e.target.value));
                      setParam("width", Number(e.target.value)); // fallback
                    }}
                    className={SLIDER_TRACK}
                    style={{ accentColor: val }}
                  />
                )}

                {/* Color palette grid */}
                <div className="grid grid-cols-5 gap-2 mt-3 p-3 rounded-lg border border-[#2a2d3e]" style={{ background: "#1A1F26" }}>
                  {COLOR_PALETTE.map(color => (
                    <button
                      key={color}
                      onClick={() => {
                         setParam(def.id, color);
                         if (isFill) setParam(enabledKey, true);
                      }}
                      className="w-9 h-9 rounded transition-all hover:scale-110 flex items-center justify-center"
                      style={{
                        background: color,
                        outline: val === color ? `2px solid white` : "none",
                        outlineOffset: "2px",
                      }}
                    >
                      {isFill && val === color && isEnabled && (
                         <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                       )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Apply Button */}
        <div className="px-4 pb-4 pt-2 border-t border-[#2a2d3e] mt-2">
          <button
            onClick={handleApply}
            className="w-full py-2.5 rounded text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors shadow"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
