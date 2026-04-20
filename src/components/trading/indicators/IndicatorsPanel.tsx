import { useMemo, useState } from "react";
import { Eye, EyeOff, Plus, RotateCcw, Trash2, X } from "lucide-react";
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
  onResetParams: (instanceId: string) => void;
  onClose: () => void;
}

const renderParamField = (
  field: IndicatorParamSchema,
  indicator: ActiveIndicator,
  onUpdate: (key: string, value: number | string | boolean) => void,
) => {
  const rawValue = indicator.params[field.key];

  if (field.type === "boolean") {
    return (
      <label key={field.key} className="flex items-center justify-between text-[11px] text-slate-300">
        <span>{field.label}</span>
        <input
          type="checkbox"
          checked={Boolean(rawValue)}
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
          value={typeof rawValue === "string" ? rawValue : field.defaultValue}
          onChange={(event) => onUpdate(field.key, event.target.value)}
          className="h-8 w-10 rounded border border-white/10 bg-transparent p-0"
        />
      </label>
    );
  }

  const numericValue = typeof rawValue === "number" ? rawValue : Number(rawValue);

  return (
    <label key={field.key} className="flex items-center justify-between gap-3 text-[11px] text-slate-300">
      <span>{field.label}</span>
      <input
        type="number"
        value={Number.isFinite(numericValue) ? numericValue : field.defaultValue}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(event) => {
          const nextValue = event.target.valueAsNumber;
          onUpdate(field.key, Number.isFinite(nextValue) ? nextValue : field.defaultValue);
        }}
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
  onResetParams,
  onClose,
}: IndicatorsPanelProps) => {
  const [nextIndicator, setNextIndicator] = useState<IndicatorKey>("sma");

  const indicatorCountByType = useMemo(
    () =>
      indicators.reduce<Record<string, number>>((acc, indicator) => {
        acc[indicator.key] = (acc[indicator.key] || 0) + 1;
        return acc;
      }, {}),
    [indicators],
  );

  return (
    <div className="absolute right-4 top-[5.6rem] z-[65] max-h-[75vh] w-[340px] overflow-hidden rounded-xl border border-white/10 bg-[#0f1722]/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Indicators</p>
          <p className="text-[11px] text-slate-400">Standard indicators powered by technicalindicators</p>
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
        {indicators.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 px-3 py-6 text-center text-sm text-slate-400">
            No active indicators.
          </div>
        ) : null}

        {indicators.map((indicator) => {
          const definition = INDICATOR_DEFINITIONS[indicator.key];
          const sameTypeCount = indicatorCountByType[indicator.key] || 0;
          const showInstanceSuffix = sameTypeCount > 1;

          return (
            <div key={indicator.instanceId} className="rounded-lg border border-white/10 bg-[#111821]">
              <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {indicator.name}
                    {showInstanceSuffix ? <span className="ml-1 text-slate-400">• {indicator.instanceId.slice(0, 4)}</span> : null}
                  </p>
                  <p className="truncate text-[10px] uppercase tracking-[0.08em] text-slate-500">{definition.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onResetParams(indicator.instanceId)}
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                  title="Reset settings"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onToggleVisibility(indicator.instanceId)}
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                  title={indicator.visible ? "Hide" : "Show"}
                >
                  {indicator.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => onRemoveIndicator(indicator.instanceId)}
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2 px-3 py-2">
                {definition.paramsSchema.map((field) =>
                  renderParamField(field, indicator, (paramKey, value) => onUpdateParam(indicator.instanceId, paramKey, value)),
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
