import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Monitor, BarChart2, Keyboard, Bell, Shield, UserCog, ChevronDown } from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { useDrawingPreferences } from "@/hooks/useDrawingPreferences";
import { getDrawingToolFillColor, resolveDrawingToolColor } from "@/components/trading/drawings/toolCatalog";
import { getTradeSoundEffectsEnabled, playTradeOpenSound, setTradeSoundEffectsEnabled } from "@/lib/tradeSounds";
import { TRADING_TEMPLATE_OPTIONS, useTradingPreferences } from "@/lib/tradingPreferences";

const DRAWING_COLOR_PRESETS = [
  "#52d38c",
  "#5dd5d8",
  "#7ea4ff",
  "#f6cb68",
  "#ff8673",
  "#ad8cff",
  "#e74c3c",
  "#e67e22",
  "#f1c40f",
  "#2ecc71",
  "#3498db",
  "#ffffff",
];

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

const Settings = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("appearance");
  const [scale, setScale] = useState("100%");
  const { preferences: tradingPreferences, updatePreferences: updateTradingPreferences } = useTradingPreferences();
  const [timezone, setTimezone] = useState(() => {
    return TIMEZONE_OPTIONS.find(tz => tz.value === tradingPreferences.timezone)
      ? tradingPreferences.timezone
      : "UTC+03:00";
  });
  const [language, setLanguage] = useState(tradingPreferences.language);
  const [tradeSoundEffectsEnabled, setTradeSoundEffectsEnabledState] = useState(() => getTradeSoundEffectsEnabled());
  const { preferences: drawingPreferences, updatePreferences: updateDrawingPreferences, resetPreferences: resetDrawingPreferences } = useDrawingPreferences();

  const LEFT_TABS = [
    { id: "appearance", label: t("settings.leftTabs.appearance"), icon: Monitor },
    { id: "trading", label: t("settings.leftTabs.trading"), icon: BarChart2 },
    { id: "shortcuts", label: t("settings.leftTabs.shortcuts"), icon: Keyboard },
    { id: "notifications", label: t("settings.leftTabs.notifications"), icon: Bell },
    { id: "privacy", label: t("settings.leftTabs.privacy"), icon: Shield },
    { id: "account", label: t("settings.leftTabs.account"), icon: UserCog },
  ];

  const SCALES = ["80%", "90%", "100%", "110%", "120%"];
  const activeLinePreviewColor = resolveDrawingToolColor("trend", drawingPreferences.defaultColor);
  const activeZonePreviewColor = resolveDrawingToolColor("rect", drawingPreferences.defaultColor);
  const handleTradeSoundEffectsToggle = () => {
    const nextValue = !tradeSoundEffectsEnabled;
    setTradeSoundEffectsEnabledState(nextValue);
    setTradeSoundEffectsEnabled(nextValue);

    if (nextValue) {
      void playTradeOpenSound();
    }
  };

  return (
    <div
      className="trading-terminal flex min-h-screen flex-col text-[var(--trading-text-color)]"
      style={{ background: "var(--trading-workspace-bg)" }}
    >
      {/* Header */}
      <div
        className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b px-4 py-3 sm:px-6"
        style={{ background: "var(--trading-header-bg)", borderColor: "var(--trading-border-color)" }}
      >
        <SiteLogo to="/" variant="dark" subtitle={t("settings.platformSettings")} />
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/trade")}
            className="flex items-center gap-2 transition-colors hover:text-[var(--trading-text-color)]"
            style={{ color: "var(--trading-muted-color)" }}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">{t("settings.backToTrading")}</span>
          </button>
          <span className="font-semibold text-[var(--trading-text-color)]">{t("settings.pageTitle")}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div
          className="flex w-[260px] shrink-0 flex-col border-r"
          style={{ background: "var(--trading-sidebar-bg)", borderColor: "var(--trading-border-color)" }}
        >
          <nav className="flex-1 py-4">
            {LEFT_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex w-full items-center gap-3 border-l-2 px-6 py-4 text-left text-sm transition-colors hover:bg-[var(--trading-control-hover-bg)]"
                style={{
                  background: activeTab === tab.id ? "var(--trading-panel-soft-bg)" : "transparent",
                  borderLeftColor: activeTab === tab.id ? "var(--trading-accent-color)" : "transparent",
                  color: activeTab === tab.id ? "var(--trading-text-color)" : "var(--trading-muted-color)",
                }}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
          <div
            className="border-t p-4 text-xs"
            style={{ borderColor: "var(--trading-border-color)", color: "var(--trading-muted-color)" }}
          >
            {t("settings.siteVersion")}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 overflow-y-auto p-10" style={{ background: "var(--trading-workspace-bg)" }}>
          {activeTab === "appearance" && (
            <div className="max-w-[700px]">
              {/* Timezone + Language */}
              <div className="flex gap-4 mb-8">
                <div className="flex-1">
                  <select
                    value={timezone}
                    onChange={(e) => {
                      setTimezone(e.target.value);
                      updateTradingPreferences({ timezone: e.target.value });
                    }}
                    className="w-full cursor-pointer rounded border p-3 text-sm transition-colors hover:bg-[var(--trading-control-hover-bg)]"
                    style={{ background: "var(--trading-control-bg)", borderColor: "var(--trading-control-border)", color: "var(--trading-text-color)" }}
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.value} value={tz.value} className="bg-[#1c1f2d]">{tz.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <select
                    value={language}
                    onChange={(e) => {
                      const lang = e.target.value;
                      setLanguage(lang);
                      i18n.changeLanguage(lang);
                      updateTradingPreferences({ language: lang as any });
                    }}
                    className="w-full cursor-pointer rounded border p-3 text-sm transition-colors hover:bg-[var(--trading-control-hover-bg)]"
                    style={{ background: "var(--trading-control-bg)", borderColor: "var(--trading-control-border)", color: "var(--trading-text-color)" }}
                  >
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <option key={lang.code} value={lang.code} className="bg-[#1c1f2d]">{lang.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Theme Settings */}
              <div className="mb-8">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[var(--trading-text-color)]">{t("settings.appearance.themeSettings")}</h3>
                <div className="flex gap-4">
                  {TRADING_TEMPLATE_OPTIONS.map((theme) => {
                    const selected = tradingPreferences.template === theme.id;

                    return (
                      <button
                        key={theme.id}
                        type="button"
                        title={theme.label}
                        onClick={() => updateTradingPreferences({ template: theme.id })}
                        className="relative h-[90px] w-[140px] overflow-hidden rounded-lg border-2 transition-colors"
                        style={{
                          borderColor: selected ? theme.line : "var(--trading-control-border)",
                          background: theme.surface,
                        }}
                      >
                        <div
                          className="flex h-full w-full items-center justify-center"
                          style={{ background: `linear-gradient(135deg, ${theme.surface} 0%, ${theme.panel} 100%)` }}
                        >
                          <svg viewBox="0 0 120 60" className="h-full w-full p-2 opacity-90">
                            <polyline
                              points="0,45 15,35 30,42 45,25 60,38 75,20 90,30 105,15 120,25"
                              fill="none"
                              stroke={theme.line}
                              strokeWidth="2"
                            />
                            <line x1="0" y1="38" x2="120" y2="38" stroke={theme.grid} strokeWidth="1" strokeDasharray="4" opacity="0.7" />
                            <circle cx="108" cy="22" r="4" fill={theme.line} opacity="0.85" />
                          </svg>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interface Scale */}
              <div className="mb-8">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[var(--trading-text-color)]">{t("settings.appearance.interfaceScale")}</h3>
                <div className="flex gap-4">
                  {SCALES.map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => setScale(s)}
                        className="flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors"
                        style={{ borderColor: scale === s ? "var(--trading-accent-color)" : "var(--trading-muted-color)" }}
                      >
                        {scale === s && <div className="h-2 w-2 rounded-full" style={{ background: "var(--trading-accent-color)" }} />}
                      </div>
                      <span
                        className={`text-sm ${scale === s ? "font-medium" : ""}`}
                        style={{ color: scale === s ? "var(--trading-text-color)" : "var(--trading-muted-color)" }}
                      >
                        {s}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Customize Menu */}
              <div className="flex items-center gap-4">
                <button
                  className="rounded px-5 py-2 text-sm transition-colors hover:bg-[var(--trading-control-hover-bg)]"
                  style={{ background: "var(--trading-panel-soft-bg)", color: "var(--trading-text-color)" }}
                >
                  {t("settings.appearance.customizeMenu")}
                </button>
                <span className="text-sm text-[var(--trading-muted-color)]">{t("settings.appearance.customizeMenuDesc")}</span>
              </div>
            </div>
          )}

          {activeTab === "trading" && (
            <div className="max-w-[600px]">
              <h2 className="text-xl font-semibold text-foreground mb-6">{t("settings.trading.heading")}</h2>
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/5 bg-[#22242a] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">{t("settings.trading.drawingToolColor")}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t("settings.trading.drawingToolColorDesc")}
                      </div>
                    </div>
                    <span
                      className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                      style={{
                        background: drawingPreferences.defaultColor
                          ? "var(--trading-accent-soft-color)"
                          : "var(--trading-control-bg)",
                        borderColor: drawingPreferences.defaultColor
                          ? "var(--trading-accent-color)"
                          : "var(--trading-border-color)",
                        color: drawingPreferences.defaultColor
                          ? "var(--trading-accent-color)"
                          : "var(--trading-muted-color)",
                      }}
                    >
                      {drawingPreferences.defaultColor ? t("settings.trading.custom") : t("settings.trading.auto")}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-white/10">
                      <div
                        className="absolute inset-0"
                        style={{ backgroundColor: drawingPreferences.defaultColor ?? activeLinePreviewColor }}
                      />
                      <input
                        type="color"
                        value={drawingPreferences.defaultColor ?? activeLinePreviewColor}
                        onChange={(event) => updateDrawingPreferences({ defaultColor: event.target.value })}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground">
                        {drawingPreferences.defaultColor ? drawingPreferences.defaultColor.toUpperCase() : t("settings.trading.autoColorDesc")}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {t("settings.trading.colorHelper")}
                      </div>
                    </div>
                    <button
                      onClick={resetDrawingPreferences}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-white/10"
                    >
                      {t("settings.trading.useAutomatic")}
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-6 gap-2">
                    {DRAWING_COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        onClick={() => updateDrawingPreferences({ defaultColor: color })}
                        className={`h-9 rounded-xl border-2 transition-transform hover:scale-[1.03] ${
                          drawingPreferences.defaultColor === color ? "border-white" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Use ${color} for ${t("settings.trading.drawingToolColor")}`}
                      />
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/5 bg-[#1b1e25] p-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{t("settings.trading.linePreview")}</div>
                      <svg viewBox="0 0 120 48" className="mt-2 h-14 w-full">
                        <path d="M12 34L102 14" stroke={activeLinePreviewColor} strokeWidth="3" strokeLinecap="round" />
                        <circle cx="12" cy="34" r="4" fill="#ffffff" stroke={activeLinePreviewColor} strokeWidth="2" />
                        <circle cx="102" cy="14" r="4" fill="#ffffff" stroke={activeLinePreviewColor} strokeWidth="2" />
                      </svg>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-[#1b1e25] p-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{t("settings.trading.zonePreview")}</div>
                      <svg viewBox="0 0 120 48" className="mt-2 h-14 w-full">
                        <rect
                          x="16"
                          y="10"
                          width="88"
                          height="24"
                          rx="8"
                          fill={getDrawingToolFillColor("rect", activeZonePreviewColor) ?? "transparent"}
                          stroke={activeZonePreviewColor}
                          strokeWidth="3"
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground">
                    {drawingPreferences.defaultColor
                      ? t("settings.trading.customColorActive")
                      : t("settings.trading.autoModeActive")}
                  </div>
                </div>

                {[
                  { label: t("settings.trading.confirmTrades"), desc: t("settings.trading.confirmTradesDesc"), enabled: true },
                  { label: t("settings.trading.showNotifications"), desc: t("settings.trading.showNotificationsDesc"), enabled: true },
                  {
                    label: t("settings.trading.soundEffects"),
                    desc: t("settings.trading.soundEffectsDesc"),
                    enabled: tradeSoundEffectsEnabled,
                    onToggle: handleTradeSoundEffectsToggle,
                  },
                  { label: t("settings.trading.autoInvest"), desc: t("settings.trading.autoInvestDesc"), enabled: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-[#22242a] rounded-lg border border-white/5">
                    <div>
                      <div className="text-sm font-medium text-foreground">{item.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={item.onToggle}
                      className={`flex h-6 w-10 items-center rounded-full px-1 transition-colors ${
                        item.enabled ? "justify-end bg-trading-orange" : "justify-start bg-[#2a2d35]"
                      } ${item.onToggle ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <div className="h-4 w-4 rounded-full bg-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="max-w-[600px]">
              <h2 className="text-xl font-semibold text-foreground mb-6">{t("settings.notifications.heading")}</h2>
              <div className="space-y-4">
                {[
                  t("settings.notifications.depositEmails"),
                  t("settings.notifications.tradeResultEmails"),
                  t("settings.notifications.tournamentEmails"),
                  t("settings.notifications.promoEmails"),
                  t("settings.notifications.kycEmails"),
                  t("settings.notifications.inAppAlerts"),
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-[#22242a] rounded-lg border border-white/5">
                    <span className="text-sm text-foreground">{item}</span>
                    <div className={`w-10 h-6 rounded-full flex items-center px-1 cursor-pointer ${i % 2 === 0 ? "bg-trading-orange justify-end" : "bg-[#2a2d35] justify-start"}`}>
                      <div className="w-4 h-4 rounded-full bg-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeTab === "shortcuts" || activeTab === "privacy" || activeTab === "account") && (
            <div className="max-w-[600px]">
              <h2 className="text-xl font-semibold text-foreground mb-4 capitalize">
                {LEFT_TABS.find(t => t.id === activeTab)?.label}
              </h2>
              <div className="p-6 bg-[#22242a] rounded-lg border border-white/5 text-muted-foreground text-sm">
                {t("settings.appearance.comingSoon")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;

