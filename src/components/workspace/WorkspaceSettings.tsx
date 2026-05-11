import { useRef } from "react";
import { Check, Image, Minus, Plus, Sun, Moon, CloudSun, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  type TradingTemplate,
  useTradingPreferences,
} from "@/lib/tradingPreferences";

const TEMPLATE_OPTIONS: Array<{ id: TradingTemplate; label: string; icon: typeof Sun }> = [
  { id: "light", label: "Light Mode", icon: Sun },
  { id: "twilight", label: "Twilight", icon: CloudSun },
  { id: "fullNight", label: "Full Night", icon: Moon },
];

const TIMEZONE_OPTIONS = [
  "UTC-05:00",
  "UTC+00:00",
  "UTC+01:00",
  "UTC+02:00",
  "UTC+03:00",
  "UTC+04:00",
];

const UP_COLOR_OPTIONS = ["#23b35f", "#20c776", "#24a8ff", "#54e6e5", "#f7f8fb"];
const DOWN_COLOR_OPTIONS = ["#e05d56", "#ef4444", "#f7c948", "#d85cf6", "#0f1118"];
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
    <div className="h-full overflow-y-auto bg-[#181d2b] px-4 pb-6 pt-2 text-white no-scrollbar">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <FieldLabel>Language</FieldLabel>
          <select
            value={preferences.language}
            onChange={() => updatePreferences({ language: "en" })}
            className="h-10 w-full rounded-[3px] border border-[#596278] bg-[#1d2332] px-3 text-[12px] font-semibold text-white outline-none"
          >
            <option value="en">English</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <FieldLabel>Timezone</FieldLabel>
          <select
            value={preferences.timezone}
            onChange={(event) => updatePreferences({ timezone: event.target.value })}
            className="h-10 w-full rounded-[3px] border border-[#596278] bg-[#1d2332] px-3 text-[12px] font-semibold text-white outline-none"
          >
            {TIMEZONE_OPTIONS.map((timezone) => (
              <option key={timezone} value={timezone}>
                ({timezone})
              </option>
            ))}
          </select>
        </div>

        <SectionLabel>Template</SectionLabel>
        <div className="space-y-2">
          {TEMPLATE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = preferences.template === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => updatePreferences({ template: option.id })}
                className={`flex h-9 w-full items-center justify-between rounded-full border px-3 text-left transition-all ${
                  selected
                    ? "border-[#1584ff] bg-white text-[#111827] shadow-[0_0_0_1px_rgba(21,132,255,0.35)]"
                    : "border-[#15456e] bg-[#1c2437] text-white hover:border-[#2876b7]"
                }`}
              >
                <span className="flex items-center gap-2 text-[12px] font-bold">
                  <Icon className={`h-4 w-4 ${selected ? "text-[#ff8a00]" : "text-[#ff8a00]"}`} />
                  {option.label}
                </span>
                <span
                  className={`h-4 w-4 rounded-full transition-colors ${
                    selected ? "bg-[#1683f5]" : "bg-[#3c465c]"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <SectionLabel>Platform</SectionLabel>
        <div className="space-y-3">
          <div>
            <FieldLabel>Grid&apos;s opacity</FieldLabel>
            <div className="flex h-9 items-center justify-between rounded-[3px] border border-[#596278] bg-[#242b3b] px-2">
              <button
                type="button"
                onClick={() => updateGridOpacity(-1)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#535b70] text-white hover:bg-[#626b82]"
              >
                <Minus className="h-3 w-3" strokeWidth={3} />
              </button>
              <span className="text-[14px] font-semibold tabular-nums">{preferences.gridOpacity}</span>
              <button
                type="button"
                onClick={() => updateGridOpacity(1)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#535b70] text-white hover:bg-[#626b82]"
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

        <SectionLabel>Graph Colors</SectionLabel>
        <ColorPalette
          label="Up Trend"
          activeColor={preferences.upTrendColor}
          colors={UP_COLOR_OPTIONS}
          onSelect={(color) => updatePreferences({ upTrendColor: color })}
        />
        <ColorPalette
          label="Down Trend"
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
            className="flex h-11 w-full items-center justify-center gap-3 rounded-[3px] border border-dashed border-[#1683f5] bg-[#102a47] text-[12px] font-bold text-white hover:bg-[#143559]"
          >
            <Image className="h-5 w-5 text-[#1683f5]" />
            <span>
              Choose file
              <span className="ml-1 text-[10px] font-semibold text-[#b9c8dc]">(Max size - 2 MB)</span>
            </span>
          </button>

          {preferences.chartBackgroundImage ? (
            <button
              type="button"
              onClick={() => updatePreferences({ chartBackgroundImage: null })}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-[3px] border border-white/10 bg-white/5 text-[11px] font-bold text-slate-200 hover:bg-white/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove chart background
            </button>
          ) : null}

          <button
            type="button"
            onClick={resetPreferences}
            className="mt-2 h-9 w-full rounded-[3px] border border-white/10 bg-[#242b3b] text-[11px] font-black uppercase tracking-[0.12em] text-slate-200 hover:bg-[#2d3548]"
          >
            Restore defaults
          </button>
        </div>
      </div>
    </div>
  );
};

const SectionLabel = ({ children }: { children: string }) => (
  <div className="pt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white">{children}</div>
);

const FieldLabel = ({ children }: { children: string }) => (
  <div className="ml-2 bg-[#181d2b] px-1 text-[9px] font-semibold text-[#7f8b99]">{children}</div>
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
      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border ${
        checked ? "border-[#429dff] bg-[#203a5f]" : "border-[#8a93a4] bg-transparent"
      }`}
    >
      {checked ? <Check className="h-3 w-3 text-[#73b7ff]" strokeWidth={3} /> : null}
    </span>
    <span>
      <span className="block text-[12px] font-bold leading-tight text-white">{title}</span>
      <span className="mt-0.5 block text-[9px] font-medium leading-tight text-[#8a94a7]">{caption}</span>
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
      <span className="text-[11px] font-bold text-white">{label}</span>
    </div>
    <div className="flex w-max gap-2 rounded-[3px] bg-[#62697a] p-2">
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
