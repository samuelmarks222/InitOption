import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, BarChart, SlidersHorizontal } from "lucide-react";
import { CandleIcon, type ChartType } from "./ChartToolbar";

const PROFESSIONAL_UP_COLOR = "#10a055";
const PROFESSIONAL_DOWN_COLOR = "#e85b4e";
const LEGACY_INIT_UP_COLOR = "#147648";
const LEGACY_INIT_DOWN_COLOR = "#ea5d51";
const LEGACY_PROFESSIONAL_UP_COLOR = "#21a566";
const LEGACY_PROFESSIONAL_DOWN_COLOR = "#d96059";
const LEGACY_PLATFORM_UP = "#00C076";
const LEGACY_PLATFORM_DOWN = "#F6465D";
const CHART_STYLE_STORAGE_KEY = "trade_chart_style_preferences_v4";
const DEFAULT_CHART_TYPE: ChartType = "candles";
type ChartDisplayPreset = "primary" | "secondary";

type ChartStylePreferences = {
  areaLineColor: string;
  areaFillColor: string;
  areaFillEnabled: boolean;
  areaLineWidth: number;
  candleUpColor: string;
  candleDownColor: string;
  barUpColor: string;
  barDownColor: string;
  heikinUpColor: string;
  heikinDownColor: string;
  bodyScale: number;
  displayPreset: ChartDisplayPreset;
  priceLineVisible: boolean;
};

const DEFAULT_CHART_STYLE: ChartStylePreferences = {
  areaLineColor: "#2585f1",
  areaFillColor: "#2585f1",
  areaFillEnabled: true,
  areaLineWidth: 2,
  candleUpColor: PROFESSIONAL_UP_COLOR,
  candleDownColor: PROFESSIONAL_DOWN_COLOR,
  barUpColor: PROFESSIONAL_UP_COLOR,
  barDownColor: PROFESSIONAL_DOWN_COLOR,
  heikinUpColor: PROFESSIONAL_UP_COLOR,
  heikinDownColor: PROFESSIONAL_DOWN_COLOR,
  bodyScale: 1.5,
  displayPreset: "primary",
  priceLineVisible: true,
};

const CANDLE_COLOR_PRESETS = [
  { id: "init", label: "Init", up: PROFESSIONAL_UP_COLOR, down: PROFESSIONAL_DOWN_COLOR },
  { id: "soft", label: "Soft", up: LEGACY_PROFESSIONAL_UP_COLOR, down: LEGACY_PROFESSIONAL_DOWN_COLOR },
  { id: "bright", label: "Bright", up: LEGACY_PLATFORM_UP, down: LEGACY_PLATFORM_DOWN },
  { id: "classic", label: "Classic", up: "#29c76c", down: "#ea6860" },
] as const;

const isValidHexColor = (value: unknown): value is string =>
  typeof value === "string" && /^#([0-9a-fA-F]{6})$/.test(value);

const toRgba = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace("#", "");
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
};

const mixHexColors = (sourceHex: string, targetHex: string, weight: number) => {
  if (!isValidHexColor(sourceHex) || !isValidHexColor(targetHex)) {
    return sourceHex;
  }

  const normalizedWeight = Math.max(0, Math.min(1, weight));
  const source = sourceHex.replace("#", "");
  const target = targetHex.replace("#", "");
  const mixChannel = (index: number) => {
    const sourceValue = parseInt(source.slice(index, index + 2), 16);
    const targetValue = parseInt(target.slice(index, index + 2), 16);
    return Math.round(sourceValue + (targetValue - sourceValue) * normalizedWeight)
      .toString(16)
      .padStart(2, "0");
  };

  return `#${mixChannel(0)}${mixChannel(2)}${mixChannel(4)}`;
};

const matchesHexColor = (value: string, target: string) => value.trim().toLowerCase() === target.trim().toLowerCase();

const resolveChartCandleColor = (
  value: string | null | undefined,
  legacyColor: string | string[],
  professionalColor: string,
) => {
  if (!isValidHexColor(value)) {
    return professionalColor;
  }

  const legacyColors = Array.isArray(legacyColor) ? legacyColor : [legacyColor];
  return legacyColors.some((color) => matchesHexColor(value, color)) ? professionalColor : value;
};

const clampBodyScale = (value: number) => Math.max(0.9, Math.min(2.5, value));
const isChartDisplayPreset = (value: unknown): value is ChartDisplayPreset =>
  value === "primary" || value === "secondary";

const getCandlestickPreviewPalette = (color: string, variant: ChartDisplayPreset) => ({
  bodyColor: variant === "secondary" ? toRgba(color, 0.92) : color,
  borderColor: variant === "secondary" ? toRgba(color, 0.92) : color,
  wickColor: variant === "secondary" ? toRgba(color, 0.92) : mixHexColors(color, "#ffffff", 0.08),
});

const loadChartStylePreferences = (): ChartStylePreferences => {
  if (typeof window === "undefined") return DEFAULT_CHART_STYLE;

  try {
    const raw = window.localStorage.getItem(CHART_STYLE_STORAGE_KEY);
    if (!raw) return DEFAULT_CHART_STYLE;
    const parsed = JSON.parse(raw) as Partial<ChartStylePreferences>;
    return {
      // Area colors are locked to Quotex blue — ignore any stored override
      areaLineColor: DEFAULT_CHART_STYLE.areaLineColor,
      areaFillColor: DEFAULT_CHART_STYLE.areaFillColor,
      areaFillEnabled: DEFAULT_CHART_STYLE.areaFillEnabled,
      areaLineWidth: DEFAULT_CHART_STYLE.areaLineWidth,
      candleUpColor: resolveChartCandleColor(
        parsed.candleUpColor,
        [LEGACY_PLATFORM_UP, LEGACY_INIT_UP_COLOR, LEGACY_PROFESSIONAL_UP_COLOR, "#0faf59"],
        DEFAULT_CHART_STYLE.candleUpColor,
      ),
      candleDownColor: resolveChartCandleColor(
        parsed.candleDownColor,
        [LEGACY_PLATFORM_DOWN, LEGACY_INIT_DOWN_COLOR, LEGACY_PROFESSIONAL_DOWN_COLOR, "#db4635"],
        DEFAULT_CHART_STYLE.candleDownColor,
      ),
      barUpColor: resolveChartCandleColor(
        parsed.barUpColor,
        [LEGACY_PLATFORM_UP, LEGACY_INIT_UP_COLOR, LEGACY_PROFESSIONAL_UP_COLOR, "#0faf59"],
        DEFAULT_CHART_STYLE.barUpColor,
      ),
      barDownColor: resolveChartCandleColor(
        parsed.barDownColor,
        [LEGACY_PLATFORM_DOWN, LEGACY_INIT_DOWN_COLOR, LEGACY_PROFESSIONAL_DOWN_COLOR, "#db4635"],
        DEFAULT_CHART_STYLE.barDownColor,
      ),
      heikinUpColor: resolveChartCandleColor(
        parsed.heikinUpColor,
        ["#29c76c", LEGACY_INIT_UP_COLOR, LEGACY_PROFESSIONAL_UP_COLOR, "#0faf59"],
        DEFAULT_CHART_STYLE.heikinUpColor,
      ),
      heikinDownColor: resolveChartCandleColor(
        parsed.heikinDownColor,
        ["#ea6860", LEGACY_INIT_DOWN_COLOR, LEGACY_PROFESSIONAL_DOWN_COLOR, "#db4635"],
        DEFAULT_CHART_STYLE.heikinDownColor,
      ),
      bodyScale: typeof parsed.bodyScale === "number" ? clampBodyScale(parsed.bodyScale) : DEFAULT_CHART_STYLE.bodyScale,
      displayPreset: isChartDisplayPreset(parsed.displayPreset) ? parsed.displayPreset : DEFAULT_CHART_STYLE.displayPreset,
      priceLineVisible:
        typeof parsed.priceLineVisible === "boolean" ? parsed.priceLineVisible : DEFAULT_CHART_STYLE.priceLineVisible,
    };
  } catch {
    return DEFAULT_CHART_STYLE;
  }
};

const ChartStylePreview = ({
  chartType,
  variant,
  styles,
}: {
  chartType: ChartType;
  variant: ChartDisplayPreset;
  styles: ChartStylePreferences;
}) => {
  const backgroundClass =
    variant === "primary"
      ? "border-[#10a055] bg-[#20283a]"
      : "border-white/8 bg-[#252d3d]";

  if (chartType === "line") {
    const stroke = styles.areaLineColor;
    const fill = variant === "primary" && styles.areaFillEnabled ? toRgba(styles.areaFillColor, 0.28) : "transparent";

    return (
      <div className={`flex h-[62px] w-full items-center justify-center rounded-[6px] border ${backgroundClass}`}>
        <svg viewBox="0 0 100 48" className="h-[48px] w-[92px]">
          <polyline points="2,41 18,26 31,30 46,12 60,18 73,16 86,29 98,26" fill={fill} stroke="none" />
          <polyline
            points="2,41 18,26 31,30 46,12 60,18 73,16 86,29 98,26"
            fill="none"
            stroke={stroke}
            strokeWidth={variant === "primary" ? 2.4 : 1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  const upColor =
    chartType === "bars"
      ? styles.barUpColor
      : chartType === "heikinAshi"
        ? styles.heikinUpColor
        : styles.candleUpColor;
  const downColor =
    chartType === "bars"
      ? styles.barDownColor
      : chartType === "heikinAshi"
        ? styles.heikinDownColor
        : styles.candleDownColor;
  const upPalette = getCandlestickPreviewPalette(upColor, variant);
  const downPalette = getCandlestickPreviewPalette(downColor, variant);
  const borderVisible = variant === "primary";
  const thinBars = chartType === "bars" && variant === "secondary";

  return (
    <div className={`flex h-[62px] w-full items-center justify-center rounded-[6px] border ${backgroundClass}`}>
      <svg viewBox="0 0 100 48" className="h-[48px] w-[92px]">
        {[14, 29, 44, 59, 74, 89].map((x, index) => {
          const isUp = index % 2 === 0;
          const color = isUp ? upColor : downColor;
          const bodyTop = isUp ? 20 - (index % 3) * 2 : 12 + (index % 3) * 4;
          const bodyBottom = isUp ? 34 - (index % 2) * 4 : 32 + (index % 2) * 3;

          if (chartType === "bars") {
            return (
              <g key={`${variant}-${x}`}>
                <line x1={x} y1="8" x2={x} y2="40" stroke={color} strokeWidth="1.4" />
                <line x1={x - (thinBars ? 3 : 5)} y1={bodyTop} x2={x} y2={bodyTop} stroke={color} strokeWidth="1.8" />
                <line x1={x} y1={bodyBottom} x2={x + (thinBars ? 3 : 5)} y2={bodyBottom} stroke={color} strokeWidth="1.8" />
              </g>
            );
          }

          return (
            <g key={`${variant}-${x}`}>
              <line
                x1={x}
                y1="8"
                x2={x}
                y2="40"
                stroke={isUp ? upPalette.wickColor : downPalette.wickColor}
                strokeWidth="1.2"
              />
              <rect
                x={x - 4}
                y={Math.min(bodyTop, bodyBottom)}
                width="8"
                height={Math.max(8, Math.abs(bodyBottom - bodyTop))}
                fill={isUp ? upPalette.bodyColor : downPalette.bodyColor}
                stroke={isUp ? upPalette.borderColor : downPalette.borderColor}
                strokeWidth={borderVisible ? 1 : 0}
                rx="1"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export function ChartSettingsPanel({ chartType, setChartType, onClose }: {chartType: ChartType; setChartType: (value: ChartType) => void; onClose: () => void}) {
  const { t } = useTranslation();
  const [chartStyles, setChartStyles] = useState<ChartStylePreferences>(loadChartStylePreferences);
  const setStyleEditorOpen = (_open: boolean) => onClose();
  const saveChartStyle = (next: ChartStylePreferences) => {
    setChartStyles(next);
    try { window.localStorage.setItem(CHART_STYLE_STORAGE_KEY, JSON.stringify(next)); } catch { /* settings remain usable in this session */ }
  };
  const updateChartStyle = (updates: Partial<ChartStylePreferences>) => saveChartStyle({...chartStyles, ...updates});
  const chartTypeOptions: Array<{ id: ChartType; label: string; caption: string }> = [
    { id: "candles", label: t("tradingChart.chartTypeCandles"), caption: t("tradingChart.chartTypeCandlesCaption") },
    { id: "heikinAshi", label: t("tradingChart.chartTypeHeikinAshi"), caption: t("tradingChart.chartTypeHeikinAshiCaption") },
    { id: "line", label: t("tradingChart.chartTypeArea"), caption: t("tradingChart.chartTypeAreaCaption") },
    { id: "bars", label: t("tradingChart.chartTypeBars"), caption: t("tradingChart.chartTypeBarsCaption") },
  ];
  const displayPresetOptions: Array<{ id: ChartDisplayPreset; label: string }> =
    chartType === "line"
      ? [
          { id: "primary", label: t("tradingChart.presetFilledArea") },
          { id: "secondary", label: t("tradingChart.presetLineOnly") },
        ]
      : chartType === "bars"
        ? [
            { id: "primary", label: t("tradingChart.presetStandardBars") },
            { id: "secondary", label: t("tradingChart.presetThinBars") },
          ]
        : [
            { id: "primary", label: t("tradingChart.presetClassic") },
            { id: "secondary", label: t("tradingChart.presetMinimal") },
          ];
  const styleColorFields =
    chartType === "bars"
      ? [
          { key: "barUpColor" as const, label: t("tradingChart.colorUpBars") },
          { key: "barDownColor" as const, label: t("tradingChart.colorDownBars") },
        ]
      : chartType === "heikinAshi"
        ? [
            { key: "heikinUpColor" as const, label: t("tradingChart.colorUpTrend") },
            { key: "heikinDownColor" as const, label: t("tradingChart.colorDownTrend") },
          ]
        : [
            { key: "candleUpColor" as const, label: t("tradingChart.colorUpCandles") },
            { key: "candleDownColor" as const, label: t("tradingChart.colorDownCandles") },
          ];
  const styleSectionTitle = t("tradingChart.displaySettings");
  const bodyScaleLabel = chartType === "bars" ? t("tradingChart.barDensity") : t("tradingChart.bodyWidth");

  return <>
      {(
        <div className="absolute inset-0 z-[90] pointer-events-none">
          <button
            type="button"
            aria-label={t("tradingChart.closeStyleEditor")}
            onClick={() => setStyleEditorOpen(false)}
            className="absolute inset-0 pointer-events-auto"
          />
          <div className="pointer-events-auto absolute left-[60px] top-4 w-[540px] max-h-[calc(100%-32px)] max-w-[calc(100%-68px)] overflow-y-auto rounded-[4px] border border-[#353d50] bg-[#252c3b] shadow-[0_20px_48px_rgba(0,0,0,0.48)]">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#343b4a] px-4 py-3">
              <div className="text-[12px] font-black uppercase tracking-[0.08em] text-white">{t("tradingChart.chartType")}</div>
              <label className="ml-auto flex max-w-[280px] items-center justify-end gap-2 text-right text-[11px] font-medium leading-tight text-slate-300">
                <span>{t("tradingChart.fullWidthPriceLine")}</span>
                <button
                  type="button"
                  onClick={() => updateChartStyle({ priceLineVisible: !chartStyles.priceLineVisible })}
                  className={`flex h-4 w-4 items-center justify-center rounded-[3px] border ${
                    chartStyles.priceLineVisible
                      ? "border-[#10a055] bg-[#2f3545]"
                      : "border-[#5a6272] bg-[#232937]"
                  }`}
                  aria-label={t("tradingChart.toggleFullWidthPriceLine")}
                >
                  {chartStyles.priceLineVisible ? (
                    <span className="block h-2 w-2 rounded-[1px] bg-[#10a055]" />
                  ) : null}
                </button>
              </label>
            </div>

            <div className="grid grid-cols-[170px_minmax(0,1fr)]">
              <div className="border-r border-[#343b4a] bg-[#232937]">
                {chartTypeOptions.map((option) => {
                  const selected = chartType === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setChartType(option.id)}
                      className={`flex w-full items-center gap-3 border-b border-[#343b4a] px-4 py-3 text-left transition-colors ${
                        selected ? "bg-[#363d4d] text-white" : "text-slate-200 hover:bg-[#2c3343]"
                      }`}
                    >
                      <span className={`${selected ? "text-[#10a055]" : "text-slate-300"}`}>
                        {option.id === "line" ? (
                          <Activity className="h-4 w-4" />
                        ) : option.id === "bars" ? (
                          <BarChart className="h-4 w-4" />
                        ) : (
                          <CandleIcon className="h-4 w-4" />
                        )}
                      </span>
                      <span className="text-[12px] font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="min-w-0 bg-[#252c3b]">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="text-[12px] font-medium text-slate-300">{styleSectionTitle}</div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <div className="flex h-6 w-6 items-center justify-center rounded-[4px] border border-[#434b5d] bg-[#2a3142]">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </div>
                    Preview
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    {displayPresetOptions.map((preset) => {
                      const selected = chartStyles.displayPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => updateChartStyle({ displayPreset: preset.id })}
                          className={`text-left ${selected ? "" : "opacity-85"}`}
                        >
                          <ChartStylePreview chartType={chartType} variant={preset.id} styles={chartStyles} />
                          <div className={`mt-1.5 text-[11px] font-medium ${selected ? "text-white" : "text-slate-400"}`}>
                            {preset.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {chartType === "line" ? (
                    <>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <label className="relative flex min-h-[48px] cursor-pointer items-start justify-between gap-3 rounded-[4px] bg-[#4c5567] px-3 py-2 text-white">
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="h-5 w-5 rounded-[2px] border border-white/10" style={{ background: chartStyles.areaLineColor }} />
                            <span className="min-w-0 whitespace-normal text-[12px] font-semibold leading-tight">{t("tradingChart.lineColor")}</span>
                          </span>
                          <span className="text-[12px] text-white/70">▼</span>
                          <input
                            type="color"
                            value={chartStyles.areaLineColor}
                            onChange={(event) => updateChartStyle({ areaLineColor: event.target.value })}
                            className="absolute inset-0 cursor-pointer opacity-0"
                          />
                        </label>
                        <label className="relative flex min-h-[48px] cursor-pointer items-start justify-between gap-3 rounded-[4px] bg-[#4c5567] px-3 py-2 text-white">
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="h-5 w-5 rounded-[2px] border border-white/10" style={{ background: chartStyles.areaFillColor }} />
                            <span className="min-w-0 whitespace-normal text-[12px] font-semibold leading-tight">{t("tradingChart.fillColor")}</span>
                          </span>
                          <span className="text-[12px] text-white/70">▼</span>
                          <input
                            type="color"
                            value={chartStyles.areaFillColor}
                            onChange={(event) => updateChartStyle({ areaFillColor: event.target.value })}
                            className="absolute inset-0 cursor-pointer opacity-0"
                          />
                        </label>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
                          <input
                            type="checkbox"
                            checked={chartStyles.areaFillEnabled}
                            onChange={(event) => updateChartStyle({ areaFillEnabled: event.target.checked })}
                            className="h-4 w-4 accent-[#10a055]"
                          />
                          {t("tradingChart.areaFill")}
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-slate-400">{t("tradingChart.thickness")}</span>
                          {[1, 2, 3, 4].map((width) => (
                            <button
                              key={width}
                              type="button"
                              onClick={() => updateChartStyle({ areaLineWidth: width })}
                              className={`flex h-7 w-7 items-center justify-center rounded-[4px] border text-[11px] font-black ${
                                chartStyles.areaLineWidth === width
                                  ? "border-[#10a055] bg-[#273a32] text-white"
                                  : "border-[#4a5264] bg-[#313848] text-slate-300"
                              }`}
                            >
                              {width}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {styleColorFields.map((item) => (
                          <label key={item.key} className="relative flex min-h-[48px] cursor-pointer items-start justify-between gap-3 rounded-[4px] bg-[#4c5567] px-3 py-2 text-white">
                            <span className="flex min-w-0 items-center gap-3">
                              <span className="h-5 w-5 rounded-[2px] border border-white/10" style={{ background: chartStyles[item.key] }} />
                              <span className="min-w-0 whitespace-normal text-[12px] font-semibold leading-tight">{item.label}</span>
                            </span>
                            <span className="text-[12px] text-white/70">▼</span>
                            <input
                              type="color"
                              value={chartStyles[item.key]}
                              onChange={(event) => updateChartStyle({ [item.key]: event.target.value })}
                              className="absolute inset-0 cursor-pointer opacity-0"
                            />
                          </label>
                        ))}
                      </div>

                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {CANDLE_COLOR_PRESETS.map((preset) => {
                          const selected =
                            matchesHexColor(chartStyles[styleColorFields[0].key], preset.up) &&
                            matchesHexColor(chartStyles[styleColorFields[1].key], preset.down);

                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() =>
                                updateChartStyle({
                                  [styleColorFields[0].key]: preset.up,
                                  [styleColorFields[1].key]: preset.down,
                                } as Partial<ChartStylePreferences>)
                              }
                              className={`flex min-h-[42px] items-center gap-2 rounded-[4px] border px-2 text-left transition-colors ${
                                selected
                                  ? "border-[#8fb3e7] bg-[#34394a] text-white"
                                  : "border-[#4a5264] bg-[#313848] text-slate-300 hover:bg-[#373f51]"
                              }`}
                              aria-label={t("tradingChart.candlePreset" + preset.id.charAt(0).toUpperCase() + preset.id.slice(1))}
                            >
                              <span className="flex shrink-0 overflow-hidden rounded-[2px] border border-white/10">
                                <span className="h-5 w-3" style={{ background: preset.up }} />
                                <span className="h-5 w-3" style={{ background: preset.down }} />
                              </span>
                              <span className="min-w-0 truncate text-[11px] font-black">{t("tradingChart.candlePreset" + preset.id.charAt(0).toUpperCase() + preset.id.slice(1))}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[11px] font-medium text-slate-400">{bodyScaleLabel}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0.72}
                            max={1.42}
                            step={0.01}
                            value={chartStyles.bodyScale}
                            onChange={(event) => updateChartStyle({ bodyScale: clampBodyScale(Number(event.target.value)) })}
                            className="w-[148px]"
                          />
                          <span className="min-w-10 text-right text-[11px] font-black text-white">
                            {chartStyles.bodyScale.toFixed(2)}x
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        saveChartStyle(DEFAULT_CHART_STYLE);
                        setChartType(DEFAULT_CHART_TYPE);
                      }}
                      className="rounded-[4px] border border-[#4a5264] bg-[#313848] px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-200"
                    >
                      {t("tradingChart.reset")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStyleEditorOpen(false)}
                      className="rounded-[4px] border border-[#4a5264] bg-[#313848] px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-200"
                    >
                      {t("tradingChart.close")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

  </>;
}
