import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Monitor, BarChart2, Keyboard, Bell, Shield, UserCog, ChevronDown } from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { useDrawingPreferences } from "@/hooks/useDrawingPreferences";
import { getDrawingToolFillColor, resolveDrawingToolColor } from "@/components/trading/drawings/toolCatalog";
import { getTradeSoundEffectsEnabled, playTradeOpenSound, setTradeSoundEffectsEnabled } from "@/lib/tradeSounds";

const LEFT_TABS = [
  { id: "appearance", label: "Appearance", icon: Monitor },
  { id: "trading", label: "Trading", icon: BarChart2 },
  { id: "shortcuts", label: "Keyboard shortcuts", icon: Keyboard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "account", label: "Account settings", icon: UserCog },
];

const THEMES = [
  { id: "dark", name: "Dark", preview: "bg-gradient-to-br from-[#1a1a1a] to-[#252525]", chartColor: "#ff6200" },
  { id: "darker", name: "Very Dark", preview: "bg-gradient-to-br from-[#0d0d0d] to-[#141414]", chartColor: "#ffffff" },
  { id: "dark-orange", name: "Dark Orange", preview: "bg-gradient-to-br from-[#1a1200] to-[#2a1e00]", chartColor: "#ff6200" },
  { id: "light", name: "Light", preview: "bg-gradient-to-br from-[#f0ebe0] to-[#e8e0d0]", chartColor: "#ff6200" },
];

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

const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("appearance");
  const [selectedTheme, setSelectedTheme] = useState("dark");
  const [scale, setScale] = useState("100%");
  const [timezone, setTimezone] = useState("(UTC+3) Nairobi");
  const [language, setLanguage] = useState("English");
  const [tradeSoundEffectsEnabled, setTradeSoundEffectsEnabledState] = useState(() => getTradeSoundEffectsEnabled());
  const { preferences, updatePreferences, resetPreferences } = useDrawingPreferences();

  const SCALES = ["80%", "90%", "100%", "110%", "120%"];
  const activeLinePreviewColor = resolveDrawingToolColor("trend", preferences.defaultColor);
  const activeZonePreviewColor = resolveDrawingToolColor("rect", preferences.defaultColor);
  const handleTradeSoundEffectsToggle = () => {
    const nextValue = !tradeSoundEffectsEnabled;
    setTradeSoundEffectsEnabledState(nextValue);
    setTradeSoundEffectsEnabled(nextValue);

    if (nextValue) {
      void playTradeOpenSound();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b border-white/5 bg-[#1a1a1a] px-4 py-3 sm:px-6">
        <SiteLogo to="/" subtitle="Platform settings" />
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/trade")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back to Trading</span>
          </button>
          <span className="text-foreground font-semibold">Settings</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[260px] bg-[#1a1b20] border-r border-white/5 flex flex-col shrink-0">
          <nav className="flex-1 py-4">
            {LEFT_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-6 py-4 text-sm transition-colors text-left ${
                  activeTab === tab.id
                    ? "bg-[#2a2d35] text-foreground border-l-2 border-trading-orange"
                    : "text-muted-foreground hover:bg-[#22242a] hover:text-foreground border-l-2 border-transparent"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-white/5 text-xs text-muted-foreground">
            Site version: 3452.4.8216 (official build)
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 overflow-y-auto p-10 bg-background">
          {activeTab === "appearance" && (
            <div className="max-w-[700px]">
              {/* Timezone + Language */}
              <div className="flex gap-4 mb-8">
                <div className="flex-1">
                  <button className="w-full bg-[#22242a] border border-white/10 rounded p-3 flex items-center justify-between hover:border-white/20 transition-colors">
                    <span className="text-sm text-foreground">{timezone}</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex-1">
                  <button className="w-full bg-[#22242a] border border-white/10 rounded p-3 flex items-center justify-between hover:border-white/20 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🇬🇧</span>
                      <span className="text-sm text-foreground">{language}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Theme Settings */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-4">THEME SETTINGS</h3>
                <div className="flex gap-4">
                  {THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`w-[140px] h-[90px] rounded-lg overflow-hidden border-2 transition-colors relative ${
                        selectedTheme === theme.id ? "border-trading-orange" : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className={`w-full h-full ${theme.preview} flex items-center justify-center`}>
                        {/* Mini chart preview */}
                        <svg viewBox="0 0 120 60" className="w-full h-full p-2 opacity-80">
                          <polyline
                            points="0,45 15,35 30,42 45,25 60,38 75,20 90,30 105,15 120,25"
                            fill="none"
                            stroke={theme.chartColor}
                            strokeWidth="2"
                          />
                          <line x1="0" y1="38" x2="120" y2="38" stroke={theme.chartColor} strokeWidth="1" strokeDasharray="4" opacity="0.4" />
                          <circle cx="108" cy="22" r="4" fill={theme.chartColor} opacity="0.8" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interface Scale */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-4">INTERFACE SCALE</h3>
                <div className="flex gap-4">
                  {SCALES.map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => setScale(s)}
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                          scale === s ? "border-trading-orange" : "border-muted-foreground"
                        }`}
                      >
                        {scale === s && <div className="w-2 h-2 rounded-full bg-trading-orange" />}
                      </div>
                      <span className={`text-sm ${scale === s ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Customize Menu */}
              <div className="flex items-center gap-4">
                <button className="px-5 py-2 bg-[#2a2d35] hover:bg-[#32363e] text-foreground text-sm rounded transition-colors">
                  Customize Menu...
                </button>
                <span className="text-sm text-muted-foreground">Location and visibility of menu items for quick access to the desired sections</span>
              </div>
            </div>
          )}

          {activeTab === "trading" && (
            <div className="max-w-[600px]">
              <h2 className="text-xl font-semibold text-foreground mb-6">Trading Preferences</h2>
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/5 bg-[#22242a] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">Drawing tool color</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        New chart tools now inherit this color automatically, and filled tools keep a matching background tint.
                      </div>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                      preferences.defaultColor
                        ? "border-[#0fa053]/30 bg-[#0fa053]/10 text-[#d8f6e5]"
                        : "border-white/10 bg-white/5 text-muted-foreground"
                    }`}>
                      {preferences.defaultColor ? "Custom" : "Auto"}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-white/10">
                      <div
                        className="absolute inset-0"
                        style={{ backgroundColor: preferences.defaultColor ?? activeLinePreviewColor }}
                      />
                      <input
                        type="color"
                        value={preferences.defaultColor ?? activeLinePreviewColor}
                        onChange={(event) => updatePreferences({ defaultColor: event.target.value })}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground">
                        {preferences.defaultColor ? preferences.defaultColor.toUpperCase() : "Automatic per-tool colors"}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Pick a single default here, or switch back to automatic colors at any time.
                      </div>
                    </div>
                    <button
                      onClick={resetPreferences}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-white/10"
                    >
                      Use automatic
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-6 gap-2">
                    {DRAWING_COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        onClick={() => updatePreferences({ defaultColor: color })}
                        className={`h-9 rounded-xl border-2 transition-transform hover:scale-[1.03] ${
                          preferences.defaultColor === color ? "border-white" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Use ${color} for drawing tools`}
                      />
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/5 bg-[#1b1e25] p-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Line Preview</div>
                      <svg viewBox="0 0 120 48" className="mt-2 h-14 w-full">
                        <path d="M12 34L102 14" stroke={activeLinePreviewColor} strokeWidth="3" strokeLinecap="round" />
                        <circle cx="12" cy="34" r="4" fill="#ffffff" stroke={activeLinePreviewColor} strokeWidth="2" />
                        <circle cx="102" cy="14" r="4" fill="#ffffff" stroke={activeLinePreviewColor} strokeWidth="2" />
                      </svg>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-[#1b1e25] p-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Zone Preview</div>
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
                    {preferences.defaultColor
                      ? "Your custom color is now used for newly placed drawing tools."
                      : "Automatic mode keeps each tool on its own default accent until a user chooses an override."}
                  </div>
                </div>

                {[
                  { label: "Confirm trades before executing", desc: "Show a confirmation dialog before placing each trade", enabled: true },
                  { label: "Show trade notifications", desc: "Display desktop notifications for trade results", enabled: true },
                  {
                    label: "Sound effects",
                    desc: "Play sounds on trade open and close events",
                    enabled: tradeSoundEffectsEnabled,
                    onToggle: handleTradeSoundEffectsToggle,
                  },
                  { label: "Auto-invest same amount", desc: "Automatically use the same investment for each trade", enabled: true },
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
              <h2 className="text-xl font-semibold text-foreground mb-6">Notification Settings</h2>
              <div className="space-y-4">
                {[
                  "Deposit and withdrawal emails",
                  "Trade result emails",
                  "Tournament lifecycle emails",
                  "Promo and bonus emails",
                  "KYC and security emails",
                  "In-app bell alerts",
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
                Settings for this section are coming soon. Contact support for any questions.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;

