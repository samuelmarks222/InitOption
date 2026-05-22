import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Monitor, BarChart2, Keyboard, Bell, Shield, UserCog, ChevronDown } from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { useDrawingPreferences } from "@/hooks/useDrawingPreferences";
import { getDrawingToolFillColor, resolveDrawingToolColor } from "@/components/trading/drawings/toolCatalog";
import { getTradeSoundEffectsEnabled, playTradeOpenSound, setTradeSoundEffectsEnabled } from "@/lib/tradeSounds";
import { TRADING_TEMPLATE_OPTIONS, useTradingPreferences } from "@/lib/tradingPreferences";

const LEFT_TABS = [
  { id: "appearance", label: "Appearance", icon: Monitor },
  { id: "trading", label: "Trading", icon: BarChart2 },
  { id: "shortcuts", label: "Keyboard shortcuts", icon: Keyboard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "account", label: "Account settings", icon: UserCog },
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
  const [scale, setScale] = useState("100%");
  const [timezone, setTimezone] = useState("(UTC+3) Nairobi");
  const [language, setLanguage] = useState("English");
  const [tradeSoundEffectsEnabled, setTradeSoundEffectsEnabledState] = useState(() => getTradeSoundEffectsEnabled());
  const { preferences: drawingPreferences, updatePreferences: updateDrawingPreferences, resetPreferences: resetDrawingPreferences } = useDrawingPreferences();
  const { preferences: tradingPreferences, updatePreferences: updateTradingPreferences } = useTradingPreferences();

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
        <SiteLogo to="/" subtitle="Platform settings" />
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/trade")}
            className="flex items-center gap-2 transition-colors hover:text-[var(--trading-text-color)]"
            style={{ color: "var(--trading-muted-color)" }}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back to Trading</span>
          </button>
          <span className="font-semibold text-[var(--trading-text-color)]">Settings</span>
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
            Site version: 3452.4.8216 (official build)
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 overflow-y-auto p-10" style={{ background: "var(--trading-workspace-bg)" }}>
          {activeTab === "appearance" && (
            <div className="max-w-[700px]">
              {/* Timezone + Language */}
              <div className="flex gap-4 mb-8">
                <div className="flex-1">
                  <button
                    className="flex w-full items-center justify-between rounded border p-3 transition-colors hover:bg-[var(--trading-control-hover-bg)]"
                    style={{ background: "var(--trading-control-bg)", borderColor: "var(--trading-control-border)" }}
                  >
                    <span className="text-sm text-[var(--trading-text-color)]">{timezone}</span>
                    <ChevronDown className="w-4 h-4 text-[var(--trading-muted-color)]" />
                  </button>
                </div>
                <div className="flex-1">
                  <button
                    className="flex w-full items-center justify-between rounded border p-3 transition-colors hover:bg-[var(--trading-control-hover-bg)]"
                    style={{ background: "var(--trading-control-bg)", borderColor: "var(--trading-control-border)" }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--trading-muted-color)]">GB</span>
                      <span className="text-sm text-[var(--trading-text-color)]">{language}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-[var(--trading-muted-color)]" />
                  </button>
                </div>
              </div>

              {/* Theme Settings */}
              <div className="mb-8">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[var(--trading-text-color)]">THEME SETTINGS</h3>
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
                <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[var(--trading-text-color)]">INTERFACE SCALE</h3>
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
                  Customize Menu...
                </button>
                <span className="text-sm text-[var(--trading-muted-color)]">Location and visibility of menu items for quick access to the desired sections</span>
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
                      {drawingPreferences.defaultColor ? "Custom" : "Auto"}
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
                        {drawingPreferences.defaultColor ? drawingPreferences.defaultColor.toUpperCase() : "Automatic per-tool colors"}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Pick a single default here, or switch back to automatic colors at any time.
                      </div>
                    </div>
                    <button
                      onClick={resetDrawingPreferences}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-white/10"
                    >
                      Use automatic
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
                    {drawingPreferences.defaultColor
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

