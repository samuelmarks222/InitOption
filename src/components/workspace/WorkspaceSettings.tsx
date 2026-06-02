import { useTranslation } from "react-i18next";
import { useRef } from "react";
import { Check, Image, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  TRADING_TEMPLATE_OPTIONS,
  useTradingPreferences,
} from "@/lib/tradingPreferences";

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English", flag: "GB" },
  { code: "zh", label: "中文 (Mandarin)", flag: "CN" },
  { code: "hi", label: "हिन्दी (Hindi)", flag: "IN" },
  { code: "es", label: "Español (Spanish)", flag: "ES" },
  { code: "fr", label: "Français (French)", flag: "FR" },
  { code: "ar", label: "العربية (Arabic)", flag: "SA" },
  { code: "bn", label: "বাংলা (Bengali)", flag: "BD" },
  { code: "pt", label: "Português (Portuguese)", flag: "PT" },
  { code: "ru", label: "Русский (Russian)", flag: "RU" },
  { code: "ur", label: "اردو (Urdu)", flag: "PK" },
  { code: "id", label: "Bahasa Indonesia", flag: "ID" },
  { code: "de", label: "Deutsch (German)", flag: "DE" },
  { code: "ja", label: "日本語 (Japanese)", flag: "JP" },
  { code: "sw", label: "Kiswahili (Swahili)", flag: "KE" },
  { code: "tr", label: "Türkçe (Turkish)", flag: "TR" },
];

const TIMEZONE_OPTIONS = [
  { value: "UTC-12:00", label: "(UTC-12) Baker Island" },
  { value: "UTC-11:00", label: "(UTC-11) American Samoa" },
  { value: "UTC-10:00", label: "(UTC-10) Hawaii" },
  { value: "UTC-09:00", label: "(UTC-9) Alaska" },
  { value: "UTC-08:00", label: "(UTC-8) Los Angeles, Vancouver" },
  { value: "UTC-07:00", label: "(UTC-7) Denver, Phoenix" },
  { value: "UTC-06:00", label: "(UTC-6) Chicago, Mexico City" },
  { value: "UTC-05:00", label: "(UTC-5) New York, Miami, Toronto" },
  { value: "UTC-04:00", label: "(UTC-4) Santiago, Caracas" },
  { value: "UTC-03:00", label: "(UTC-3) Buenos Aires, São Paulo" },
  { value: "UTC-02:00", label: "(UTC-2) Fernando de Noronha" },
  { value: "UTC-01:00", label: "(UTC-1) Azores" },
  { value: "UTC+00:00", label: "(UTC+0) London, Lisbon, Accra" },
  { value: "UTC+01:00", label: "(UTC+1) Paris, Berlin, Rome, Madrid, Lagos" },
  { value: "UTC+02:00", label: "(UTC+2) Cairo, Johannesburg, Athens, Istanbul" },
  { value: "UTC+03:00", label: "(UTC+3) Nairobi, Moscow, Riyadh, Baghdad" },
  { value: "UTC+03:30", label: "(UTC+3:30) Tehran" },
  { value: "UTC+04:00", label: "(UTC+4) Dubai, Baku" },
  { value: "UTC+04:30", label: "(UTC+4:30) Kabul" },
  { value: "UTC+05:00", label: "(UTC+5) Karachi, Islamabad, Tashkent" },
  { value: "UTC+05:30", label: "(UTC+5:30) Mumbai, New Delhi, Colombo" },
  { value: "UTC+05:45", label: "(UTC+5:45) Kathmandu" },
  { value: "UTC+06:00", label: "(UTC+6) Dhaka, Almaty" },
  { value: "UTC+06:30", label: "(UTC+6:30) Yangon" },
  { value: "UTC+07:00", label: "(UTC+7) Bangkok, Jakarta, Hanoi" },
  { value: "UTC+08:00", label: "(UTC+8) Beijing, Singapore, Perth, Manila" },
  { value: "UTC+09:00", label: "(UTC+9) Tokyo, Seoul" },
  { value: "UTC+09:30", label: "(UTC+9:30) Adelaide, Darwin" },
  { value: "UTC+10:00", label: "(UTC+10) Sydney, Melbourne, Guam" },
  { value: "UTC+11:00", label: "(UTC+11) Solomon Islands, Nouméa" },
  { value: "UTC+12:00", label: "(UTC+12) Auckland, Fiji" },
  { value: "UTC+13:00", label: "(UTC+13) Samoa, Tonga" },
  { value: "UTC+14:00", label: "(UTC+14) Kiribati" },
];

const UP_COLOR_OPTIONS = ["#10a055", "#0faf59", "#21a566", "#35b977", "#6fa7e8", "#54c8c6"];
const DOWN_COLOR_OPTIONS = ["#e85b4e", "#db4635", "#d96059", "#e47670", "#d8a441", "#c474d6"];
const MAX_BACKGROUND_BYTES = 2 * 1024 * 1024;

export const WorkspaceSettings = () => {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { preferences, updatePreferences, resetPreferences } = useTradingPreferences();

  const updateGridOpacity = (delta: number) => {
    updatePreferences({ gridOpacity: Math.max(0, Math.min(10, preferences.gridOpacity + delta)) });
  };

  const handleBackgroundUpload = (file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: t("workspace.bgNotChanged"), description: t("workspace.bgNotChangedDesc") });
      return;
    }

    if (file.size > MAX_BACKGROUND_BYTES) {
      toast({ title: t("workspace.bgTooLarge"), description: t("workspace.bgTooLargeDesc") });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updatePreferences({ chartBackgroundImage: reader.result });
        toast({ title: t("workspace.bgUpdated") });
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
          <FieldLabel>{t("workspace.language")}</FieldLabel>
          <select
            value={preferences.language}
            onChange={(event) => {
              const lang = event.target.value;
              i18n.changeLanguage(lang);
              updatePreferences({ language: lang });
            }}
            className="h-10 w-full rounded-[3px] border px-3 text-[12px] font-semibold outline-none"
            style={{
              background: "var(--trading-panel-bg)",
              borderColor: "var(--trading-tool-border)",
              color: "var(--trading-text-color)",
            }}
          >
            {LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <FieldLabel>{t("workspace.timezone")}</FieldLabel>
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
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <SectionLabel>{t("workspace.themeSettings")}</SectionLabel>
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

        <SectionLabel>{t("workspace.platform")}</SectionLabel>
        <div className="space-y-3">
          <div>
            <FieldLabel>{t("workspace.gridOpacity")}</FieldLabel>
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
            title={t("workspace.autoScrolling")}
            caption={t("workspace.autoScrollingCaption")}
            onClick={() => updatePreferences({ autoScrolling: !preferences.autoScrolling })}
          />
          <SettingsCheck
            checked={preferences.oneClickTrade}
            title={t("workspace.oneClickTrade")}
            caption={t("workspace.oneClickTradeCaption")}
            onClick={() => updatePreferences({ oneClickTrade: !preferences.oneClickTrade })}
          />
          <SettingsCheck
            checked={preferences.performanceMode}
            title={t("workspace.performanceMode")}
            caption={t("workspace.performanceModeCaption")}
            onClick={() => updatePreferences({ performanceMode: !preferences.performanceMode })}
          />
          <SettingsCheck
            checked={preferences.shortOrderLabel}
            title={t("workspace.shortOrderLabel")}
            caption={t("workspace.shortOrderLabelCaption")}
            onClick={() => updatePreferences({ shortOrderLabel: !preferences.shortOrderLabel })}
          />
        </div>

        <SectionLabel>{t("workspace.tradeButtonColors")}</SectionLabel>
        <ColorPalette
          label={t("workspace.upButton")}
          activeColor={preferences.upTrendColor}
          colors={UP_COLOR_OPTIONS}
          onSelect={(color) => updatePreferences({ upTrendColor: color })}
        />
        <ColorPalette
          label={t("workspace.downButton")}
          activeColor={preferences.downTrendColor}
          colors={DOWN_COLOR_OPTIONS}
          onSelect={(color) => updatePreferences({ downTrendColor: color })}
        />

        <SectionLabel>{t("workspace.background")}</SectionLabel>
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
              {t("workspace.chooseFile")}
              <span className="ml-1 text-[10px] font-semibold text-[var(--trading-muted-color)]">{t("workspace.maxSizeHint")}</span>
            </span>
          </button>

          {preferences.chartBackgroundImage ? (
            <>
              <div className="space-y-1.5">
                <FieldLabel>{t("workspace.imageOpacity")}</FieldLabel>
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
                {t("workspace.removeBackground")}
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
            {t("workspace.restoreDefaults")}
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
