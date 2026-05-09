import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronLeft, Trash2, X } from "lucide-react";
import { ActiveIndicator } from "./types";
import { INDICATOR_REGISTRY } from "./config";
import { toIndicatorFillColor } from "./fillColors";

interface IndicatorSettingsEditorProps {
  indicator: ActiveIndicator;
  onSave: (updates: Partial<ActiveIndicator>) => void;
  onDelete?: () => void;
  onClose?: () => void;
  onBack?: () => void;
}

const COLOR_PALETTE = [
  "#f97316",
  "#f59e0b",
  "#f5d90a",
  "#66d10b",
  "#1fd2cf",
  "#3291ff",
  "#6b7cff",
  "#a566f4",
  "#c851d7",
  "#e5484d",
] as const;

const SLIDER_CLASS =
  "h-[2px] w-full cursor-pointer appearance-none rounded-full bg-[#4b5568] accent-[#3291ff]";

const formatNumericValue = (value: number) => {
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(value < 1 ? 2 : 3).replace(/0+$/, "").replace(/\.$/, "");
};

const toPaletteSelectionValue = (value: unknown, isFill: boolean) => {
  if (typeof value !== "string") return null;
  if (!isFill) return value.toLowerCase();

  const normalized = value.trim().toLowerCase();
  const matched = COLOR_PALETTE.find((paletteColor) => toIndicatorFillColor(paletteColor).toLowerCase() === normalized);
  return matched?.toLowerCase() ?? null;
};

const toOptionLabel = (value: string) => {
  const compact = value.replace(/([a-z])([A-Z])/g, "$1 $2");
  return compact
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export default function IndicatorSettingsEditor({
  indicator,
  onSave,
  onDelete,
  onClose,
  onBack,
}: IndicatorSettingsEditorProps) {
  const config = useMemo(
    () => INDICATOR_REGISTRY.find((entry) => entry.id === indicator.configId) ?? null,
    [indicator.configId],
  );
  const [params, setParams] = useState<Record<string, any>>({ ...indicator.params });

  useEffect(() => {
    setParams({ ...indicator.params });
  }, [indicator.instanceId, indicator.params]);

  if (!config) return null;

  const updateParams = (updater: Record<string, any> | ((current: Record<string, any>) => Record<string, any>)) => {
    setParams((current) => {
      const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
      onSave({ params: next });
      return next;
    });
  };

  const numberAndSelectParams = config.params.filter(
    (param) => param.type === "number" || param.type === "source",
  );
  const styleParams = config.params.filter(
    (param) => param.type === "color" || param.type === "fill",
  );

  return (
    <div className="flex h-full w-full max-w-[208px] flex-col border-r border-[#2b3241] bg-[#1d2332]">
      <div className="flex items-center justify-between border-b border-white/6 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack ?? onClose}
            className="rounded-[4px] p-1 text-slate-300 transition-colors hover:bg-white/8 hover:text-white"
            aria-label="Back"
            title="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[12px] font-semibold text-white">Indicators</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[4px] p-1 text-slate-400 transition-colors hover:bg-white/8 hover:text-white"
          aria-label="Close"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-3 pb-3 pt-4">
        <h2 className="text-[14px] font-semibold text-white">{config.name}</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 pb-4">
        {numberAndSelectParams.map((param) => {
          const value = params[param.id] ?? param.default;

          if (param.type === "number") {
            const step = param.step ?? 1;

            return (
              <div key={param.id} className="space-y-2">
                <div className="px-1 text-[11px] text-slate-400">{param.name}</div>
                <div className="rounded-[4px] border border-[#485064] bg-[#202736] px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateParams((current) => {
                          const rawValue = Number(current[param.id] ?? param.default);
                          const nextValue = Number((rawValue - step).toFixed(6));
                          return {
                            ...current,
                            [param.id]: Math.max(param.min ?? Number.NEGATIVE_INFINITY, nextValue),
                          };
                        })
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3a4255] text-[15px] font-bold text-white transition-colors hover:bg-[#454f65]"
                      aria-label={`Decrease ${param.name}`}
                    >
                      -
                    </button>
                    <div className="flex-1 text-center text-[15px] font-semibold text-white">
                      {formatNumericValue(Number(value))}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateParams((current) => {
                          const rawValue = Number(current[param.id] ?? param.default);
                          const nextValue = Number((rawValue + step).toFixed(6));
                          return {
                            ...current,
                            [param.id]: Math.min(param.max ?? Number.POSITIVE_INFINITY, nextValue),
                          };
                        })
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3a4255] text-[15px] font-bold text-white transition-colors hover:bg-[#454f65]"
                      aria-label={`Increase ${param.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={param.id} className="space-y-2">
              <div className="px-1 text-[11px] text-slate-400">{param.name}</div>
              <div className="relative rounded-[4px] border border-[#485064] bg-[#202736]">
                <select
                  value={String(value)}
                  onChange={(event) => updateParams({ [param.id]: event.target.value })}
                  className="h-10 w-full appearance-none bg-transparent px-3 pr-9 text-[13px] font-medium text-white outline-none"
                >
                  {(param.options ?? []).map((option) => (
                    <option key={option} value={option} className="bg-[#202736] text-white">
                      {toOptionLabel(option)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          );
        })}

        {styleParams.map((param) => {
          const isFill = param.type === "fill";
          const value = params[param.id] ?? param.default;
          const paletteSelection = toPaletteSelectionValue(value, isFill);
          const widthKey = param.id.replace(/color/i, "width");
          const activeWidth = Number(params[widthKey] ?? params.width ?? 1);
          const enabledKey = `${param.id}_enabled`;
          const isEnabled = isFill ? params[enabledKey] !== false : true;

          return (
            <div key={param.id} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!isFill) return;
                    updateParams({ [enabledKey]: !isEnabled });
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-[2px] border border-white/8 transition-colors"
                  style={{ background: isFill && !isEnabled ? "#1b2130" : isFill ? String(value) : String(value) }}
                  aria-label={isFill ? `Toggle ${param.name}` : `${param.name} color`}
                >
                  {isFill && isEnabled ? <Check className="h-3.5 w-3.5 text-white" /> : null}
                </button>
                <span className="text-[13px] font-medium text-white">{param.name}</span>
              </div>

              {!isFill && (
                <div className="px-1 pb-0.5">
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={activeWidth}
                    onChange={(event) =>
                      updateParams({
                        [widthKey]: Number(event.target.value),
                        width: Number(event.target.value),
                      })
                    }
                    className={SLIDER_CLASS}
                    style={{ accentColor: String(value) }}
                  />
                </div>
              )}

              <div className="rounded-[4px] bg-[#586178] px-3 py-3">
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_PALETTE.map((paletteColor) => {
                    const selected = paletteSelection === paletteColor.toLowerCase();
                    return (
                      <button
                        key={`${param.id}-${paletteColor}`}
                        type="button"
                        onClick={() =>
                          updateParams({
                            [param.id]: isFill ? toIndicatorFillColor(paletteColor) : paletteColor,
                            ...(isFill ? { [enabledKey]: true } : {}),
                          })
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-[2px] transition-transform hover:scale-[1.06]"
                        style={{ background: paletteColor }}
                        aria-label={`Set ${param.name} to ${paletteColor}`}
                      >
                        {selected ? <Check className="h-3.5 w-3.5 text-white" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {onDelete && (
        <div className="border-t border-white/6 bg-[#1a2030] px-2 py-2">
          <button
            type="button"
            onClick={onDelete}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[4px] bg-[#252c3c] text-[13px] font-semibold text-[#ff6c64] transition-colors hover:bg-[#2d3445]"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
