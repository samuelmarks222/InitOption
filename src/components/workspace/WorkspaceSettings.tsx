import { useRef } from "react";
import { Check, Image, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  TRADING_TEMPLATE_OPTIONS,
  useTradingPreferences,
} from "@/lib/tradingPreferences";

const TIMEZONE_OPTIONS = [
  "UTC-05:00",
  "UTC+00:00",
  "UTC+01:00",
  "UTC+02:00",
  "UTC+03:00",
  "UTC+04:00",
];

const UP_COLOR_OPTIONS = ["#10a055", "#0faf59", "#21a566", "#35b977", "#6fa7e8", "#54c8c6"];
const DOWN_COLOR_OPTIONS = ["#e85b4e", "#db4635", "#d96059", "#e47670", "#d8a441", "#c474d6"];
const MAX_BACKGROUND_BYTES = 2 * 1024 * 1024;

export const WorkspaceSettings = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { preferences, updatePreferences, resetPreferences } = useTradingPreferences();

  const updateGridOpacity = (delta: number) => {
    updatePreferences({ gridOpacity: Math.max(0, Math.min(10, preferences.gridOpacity + delta)) });
  };

  const handleBackgroundUpload = (file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Background not changed", description: "Choose an image file." });
      return;
    }

    if (file.size > MAX_BACKGROUND_BYTES) {
      toast({ title: "Background too large", description: "Choose an image up to 2 MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updatePreferences({ chartBackgroundImage: reader.result });
        toast({ title: "Chart background updated" });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="h-full overflow-y-auto px-4 pb-6 pt-2 no-scrollbar"
      style={{ background: "var(--trading-workspace-panel-bg)", color: "var(--trading-text-color)" }}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <FieldLabel>Language</FieldLabel>
          <select
            value={preferences.language}
            onChange={() => updatePreferences({ language: "en" })}
            className="h-10 w-full rounded-[3px] border px-3 text-[12px] font-semibold outline-none"
            style={{
              background: "var(--trading-panel-bg)",
              borderColor: "var(--trading-tool-border)",
              color: "var(--trading-text-color)",
            }}
          >
            <option value="en">English</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <FieldLabel>Timezone</FieldLabel>
          <select
            value={preferences.timezone}
            onChange={(event) => updatePreferences({ timezone: event.target.value })}
            className="h-10 w-full rounded-[3px] border px-3 text-[12px] font-semibold outline-none"
            style={{
              background: "var(--trading-panel-bg)",
              borderColor: "var(--trading-tool-border)",
              color: "var(--trading-text-color)",
            }}
          >
            {TIMEZONE_OPTIONS.map((timezone) => (
              <option key={timezone} value={timezone}>
                ({timezone})
              </option>
            ))}
          </select>
        </div>

        <SectionLabel>Theme Settings</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {TRADING_TEMPLATE_OPTIONS.map((option) => {
            const selected = preferences.template === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => updatePreferences({ template: option.id })}
                className="h-[58px] overflow-hidden rounded-[6px] border-2 text-left transition-all"
                style={{
                  background: option.surface,
                  borderColor: selected ? option.line : "var(--trading-control-border)",
                }}
              >
                <span
                  className="flex h-full w-full items-center justify-between px-2"
                  style={{ background: `linear-gradient(135deg, ${option.surface} 0%, ${option.panel} 100%)` }}
                >
                  <svg viewBox="0 0 82 34" className="h-full w-[82px] opacity-90" aria-hidden="true">
                    <polyline
                      points="0,25 10,19 20,23 31,13 42,21 53,10 65,16 76,8 82,12"
                      fill="none"
                      stroke={option.line}
                      strokeWidth="2"
                    />
                    <line x1="0" y1="21" x2="82" y2="21" stroke={option.grid} strokeWidth="1" strokeDasharray="3" opacity="0.7" />
                    <circle cx="76" cy="8" r="3" fill={option.line} opacity="0.85" />
                  </svg>
                  <span className="sr-only">{option.label}</span>
                  <span
                    className="h-3.5 w-3.5 rounded-full border"
                    style={{
                      background: selected ? option.line : "transparent",
                      borderColor: selected ? option.line : option.grid,
                    }}
                  />
                </span>
              </button>
            );
          })}
        </div>

        <SectionLabel>Platform</SectionLabel>
        <div className="space-y-3">
          <div>
            <FieldLabel>Grid&apos;s opacity</FieldLabel>
            <div
              className="flex h-9 items-center justify-between rounded-[3px] border px-2"
              style={{ background: "var(--trading-panel-bg)", borderColor: "var(--trading-tool-border)" }}
            >
              <button
                type="button"
                onClick={() => updateGridOpacity(-1)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--trading-accent-contrast-color)] hover:brightness-110"
                style={{ background: "var(--trading-accent-color)" }}
              >
                <Minus className="h-3 w-3" strokeWidth={3} />
              </button>
              <span className="text-[14px] font-semibold tabular-nums">{preferences.gridOpacity}</span>
              <button
                type="button"
                onClick={() => updateGridOpacity(1)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--trading-accent-contrast-color)] hover:brightness-110"
                style={{ background: "var(--trading-accent-color)" }}
              >
                <Plus className="h-3 w-3" strokeWidth={3} />
              </button>
            </div>
          </div>

          <SettingsCheck
            checked={preferences.autoScrolling}
            title="Auto-scrolling"
            caption="Keep the chart locked to the live price edge"
            onClick={() => updatePreferences({ autoScrolling: !preferences.autoScrolling })}
          />
          <SettingsCheck
            checked={preferences.oneClickTrade}
            title="1-click trade"
            caption="Open trades without confirmation"
            onClick={() => updatePreferences({ oneClickTrade: !preferences.oneClickTrade })}
          />
          <SettingsCheck
            checked={preferences.performanceMode}
            title="Performance Mode"
            caption="Use optimized rendering for chart and candles"
            onClick={() => updatePreferences({ performanceMode: !preferences.performanceMode })}
          />
          <SettingsCheck
            checked={preferences.shortOrderLabel}
            title="Short order label"
            caption="Use shorter labels in the trade list"
            onClick={() => updatePreferences({ shortOrderLabel: !preferences.shortOrderLabel })}
          />
        </div>

        <SectionLabel>Trade Button Colors</SectionLabel>
        <ColorPalette
          label="Up Button"
          activeColor={preferences.upTrendColor}
          colors={UP_COLOR_OPTIONS}
          onSelect={(color) => updatePreferences({ upTrendColor: color })}
        />
        <ColorPalette
          label="Down Button"
          activeColor={preferences.downTrendColor}
          colors={DOWN_COLOR_OPTIONS}
          onSelect={(color) => updatePreferences({ downTrendColor: color })}
        />

        <SectionLabel>Background</SectionLabel>
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleBackgroundUpload(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-[3px] border border-dashed text-[12px] font-bold hover:brightness-110"
            style={{
              background: "var(--trading-accent-soft-color)",
              borderColor: "var(--trading-accent-color)",
              color: "var(--trading-accent-color)",
            }}
          >
            <Image className="h-5 w-5 text-[var(--trading-accent-color)]" />
            <span>
              Choose file
              <span className="ml-1 text-[10px] font-semibold text-[var(--trading-muted-color)]">(Max size - 2 MB)</span>
            </span>
          </button>

          {preferences.chartBackgroundImage ? (
            <>
              <div className="space-y-1.5">
                <FieldLabel>Image opacity</FieldLabel>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={preferences.chartBackgroundOpacity}
                  onChange={(event) => updatePreferences({ chartBackgroundOpacity: Number(event.target.value) })}
                  className="h-2 w-full accent-[var(--trading-accent-color)]"
                />
                <div className="text-right text-[10px] font-bold text-[var(--trading-muted-color)]">
                  {preferences.chartBackgroundOpacity}%
                </div>
              </div>
              <button
                type="button"
                onClick={() => updatePreferences({ chartBackgroundImage: null })}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-[3px] border text-[11px] font-bold hover:brightness-110"
                style={{
                  background: "var(--trading-control-bg)",
                  borderColor: "var(--trading-border-color)",
                  color: "var(--trading-text-color)",
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove chart background
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={resetPreferences}
            className="mt-2 h-9 w-full rounded-[3px] border text-[11px] font-black uppercase tracking-[0.12em] hover:brightness-110"
            style={{
              background: "var(--trading-panel-soft-bg)",
              borderColor: "var(--trading-border-color)",
              color: "var(--trading-text-color)",
            }}
          >
            Restore defaults
          </button>
        </div>
      </div>
    </div>
  );
};

const SectionLabel = ({ children }: { children: string }) => (
  <div className="pt-1 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--trading-text-color)]">{children}</div>
);

const FieldLabel = ({ children }: { children: string }) => (
  <div className="ml-2 px-1 text-[9px] font-semibold text-[var(--trading-muted-color)]" style={{ background: "var(--trading-workspace-panel-bg)" }}>{children}</div>
);

const SettingsCheck = ({
  checked,
  title,
  caption,
  onClick,
}: {
  checked: boolean;
  title: string;
  caption: string;
  onClick: () => void;
}) => (
  <button type="button" onClick={onClick} className="flex w-full items-start gap-2 text-left">
    <span
      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border"
      style={{
        background: checked ? "var(--trading-accent-soft-color)" : "transparent",
        borderColor: checked ? "var(--trading-accent-color)" : "var(--trading-muted-color)",
      }}
    >
      {checked ? <Check className="h-3 w-3 text-[var(--trading-accent-color)]" strokeWidth={3} /> : null}
    </span>
    <span>
      <span className="block text-[12px] font-bold leading-tight text-[var(--trading-text-color)]">{title}</span>
      <span className="mt-0.5 block text-[9px] font-medium leading-tight text-[var(--trading-muted-color)]">{caption}</span>
    </span>
  </button>
);

const ColorPalette = ({
  label,
  activeColor,
  colors,
  onSelect,
}: {
  label: string;
  activeColor: string;
  colors: string[];
  onSelect: (color: string) => void;
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <span className="h-4 w-4 rounded-full" style={{ background: activeColor }} />
      <span className="text-[11px] font-bold text-[var(--trading-text-color)]">{label}</span>
    </div>
    <div
      className="flex w-max gap-2 rounded-[3px] border p-2"
      style={{ background: "var(--trading-panel-soft-bg)", borderColor: "var(--trading-border-color)" }}
    >
      {colors.map((color) => {
        const selected = color.toLowerCase() === activeColor.toLowerCase();

        return (
          <button
            key={color}
            type="button"
            onClick={() => onSelect(color)}
            className="flex h-5 w-5 items-center justify-center rounded-[2px]"
            style={{ background: color }}
            aria-label={`Use ${color} for ${label}`}
          >
            {selected ? <Check className="h-3 w-3 text-white drop-shadow" strokeWidth={3} /> : null}
          </button>
        );
      })}
    </div>
  </div>
);
