import { useMemo, useState } from "react";
import { Eye, EyeOff, Plus, Trash2, X } from "lucide-react";
import {
  INDICATOR_DEFINITIONS,
  INDICATOR_ORDER,
  type ActiveIndicator,
  type IndicatorKey,
  type IndicatorParamSchema,
} from "./types";

interface IndicatorsPanelProps {
  indicators: ActiveIndicator[];
  onAddIndicator: (key: IndicatorKey) => void;
  onRemoveIndicator: (instanceId: string) => void;
  onToggleVisibility: (instanceId: string) => void;
  onUpdateParam: (instanceId: string, paramKey: string, value: number | string | boolean) => void;
  onClose: () => void;
}

const renderField = (
  field: IndicatorParamSchema,
  indicator: ActiveIndicator,
  onUpdate: (key: string, value: number | string | boolean) => void,
) => {
  const fieldValue = indicator.params[field.key];

  if (field.type === "boolean") {
    return (
      <label key={field.key} className="flex items-center justify-between text-[11px] text-slate-300">
        <span>{field.label}</span>
        <input
          type="checkbox"
          checked={Boolean(fieldValue)}
          onChange={(event) => onUpdate(field.key, event.target.checked)}
          className="h-4 w-4"
        />
      </label>
    );
  }

  if (field.type === "color") {
    return (
      <label key={field.key} className="flex items-center justify-between gap-3 text-[11px] text-slate-300">
        <span>{field.label}</span>
        <input
          type="color"
          value={typeof fieldValue === "string" ? fieldValue : "#ffffff"}
          onChange={(event) => onUpdate(field.key, event.target.value)}
          className="h-8 w-10 rounded border border-white/10 bg-transparent p-0"
        />
      </label>
    );
  }

  return (
    <label key={field.key} className="flex items-center justify-between gap-3 text-[11px] text-slate-300">
      <span>{field.label}</span>
      <input
        type="number"
        value={typeof fieldValue === "number" ? fieldValue : Number(fieldValue) || 0}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(event) => onUpdate(field.key, Number(event.target.value))}
        className="w-20 rounded border border-white/10 bg-[#111821] px-2 py-1 text-right text-[11px] text-white outline-none focus:border-[#3b82f6]"
      />
    </label>
  );
};

export const IndicatorsPanel = ({
  indicators,
  onAddIndicator,
  onRemoveIndicator,
  onToggleVisibility,
  onUpdateParam,
  onClose,
}: IndicatorsPanelProps) => {
  const [nextIndicator, setNextIndicator] = useState<IndicatorKey>("sma");

  const indicatorCountByType = useMemo(() => {
    return indicators.reduce<Record<string, number>>((acc, indicator) => {
      acc[indicator.key] = (acc[indicator.key] || 0) + 1;
      return acc;
    }, {});
  }, [indicators]);

  return (
    <div className="absolute right-4 top-[5.6rem] z-[65] w-[340px] max-h-[75vh] overflow-hidden rounded-xl border border-white/10 bg-[#0f1722]/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Indicators</p>
          <p className="text-[11px] text-slate-400">Technical indicators powered by technicalindicators</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <select
            value={nextIndicator}
            onChange={(event) => setNextIndicator(event.target.value as IndicatorKey)}
            className="flex-1 rounded-md border border-white/10 bg-[#111821] px-2 py-2 text-sm text-white outline-none"
          >
            {INDICATOR_ORDER.map((key) => (
              <option key={key} value={key}>
                {INDICATOR_DEFINITIONS[key].name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onAddIndicator(nextIndicator)}
            className="inline-flex items-center gap-1 rounded-md bg-[#2563eb] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </div>

      <div className="max-h-[52vh] space-y-2 overflow-y-auto p-3">
        {indicators.length === 0 && (
          <div className="rounded-lg border border-dashed border-white/15 px-3 py-6 text-center text-sm text-slate-400">
            No active indicators.
          </div>
        )}

        {indicators.map((indicator) => {
          const definition = INDICATOR_DEFINITIONS[indicator.key];
          const sameTypeIndex = indicatorCountByType[indicator.key] > 1;

          return (
            <div key={indicator.instanceId} className="rounded-lg border border-white/10 bg-[#111821]">
              <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {indicator.name}
                    {sameTypeIndex ? <span className="ml-1 text-slate-400">• {indicator.instanceId.slice(0, 4)}</span> : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleVisibility(indicator.instanceId)}
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {indicator.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveIndicator(indicator.instanceId)}
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2 px-3 py-2">
                {definition.paramsSchema.map((field) =>
                  renderField(field, indicator, (key, value) => onUpdateParam(indicator.instanceId, key, value)),
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
