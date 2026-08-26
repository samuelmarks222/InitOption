import {
  BarChart3,
  Gift,
  Grid,
  HelpCircle,
  Image,
  Menu,
  Settings,
  Trophy,
  User,
} from "lucide-react";

export type WorkspaceModule = "support" | "account" | "analytics" | "tournaments" | "leaderboard" | "referrals" | "more" | "settings" | "help" | "guides" | "signals" | "generalchat" | null;

interface NavigationSidebarProps {
  activeWorkspace: WorkspaceModule;
  onSelectWorkspace: (module: WorkspaceModule) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

type PrimaryNavKey = "trading";

const getNavItemClassName = (collapsed: boolean) =>
  `group relative flex w-full flex-col items-center justify-center rounded-lg transition-all duration-150 ${
    collapsed ? "h-[48px] gap-0" : "h-[62px] gap-1"
  }`;
const navIconClassName = "h-[22px] w-[22px] transition-transform duration-150 group-hover:scale-110";
const navLabelClassName = "max-w-[62px] text-center text-[10px] font-black uppercase leading-[1.05]";

const COLORS = {
  trade:     { bg: "#1a2332", bgActive: "#0f83e6", icon: "#3b82f6", iconActive: "#ffffff", glow: "rgba(15,131,230,0.35)" },
  support:   { bg: "transparent", bgActive: "#1e293b", icon: "#94a3b8", iconActive: "#38bdf8", glow: "rgba(56,189,248,0.3)" },
  account:   { bg: "transparent", bgActive: "#1e293b", icon: "#94a3b8", iconActive: "#a78bfa", glow: "rgba(167,139,250,0.3)" },
  tournaments: { bg: "transparent", bgActive: "#1e293b", icon: "#94a3b8", iconActive: "#fbbf24", glow: "rgba(251,191,36,0.3)" },
  market:    { bg: "transparent", bgActive: "#1e293b", icon: "#94a3b8", iconActive: "#34d399", glow: "rgba(52,211,153,0.3)" },
  more:      { bg: "transparent", bgActive: "#1e293b", icon: "#94a3b8", iconActive: "#f472b6", glow: "rgba(244,114,182,0.3)" },
  referrals: { bg: "transparent", bgActive: "#1e293b", icon: "#6ee7b7", iconActive: "#34d399", glow: "rgba(52,211,153,0.3)" },
  help:      { bg: "#065f46", bgActive: "#10b981", icon: "#6ee7b7", iconActive: "#ffffff", glow: "rgba(16,185,129,0.4)" },
  settings:  { bg: "transparent", bgActive: "#1e293b", icon: "#94a3b8", iconActive: "#e2e8f0", glow: "rgba(226,232,240,0.2)" },
} as const;

type ColorKey = keyof typeof COLORS;

export const NavigationSidebar = ({
  activeWorkspace,
  onSelectWorkspace,
  collapsed = false,
  onToggleCollapsed,
}: NavigationSidebarProps) => {
  const PRIMARY_ITEMS = [
    { key: "trading", label: "Trade", icon: Image, workspace: null, colorKey: "trade" as ColorKey },
  ] as const;

  const SECONDARY_ITEMS = [
    { id: "support", label: "Support", icon: HelpCircle, colorKey: "support" as ColorKey },
    { id: "account", label: "Account", icon: User, colorKey: "account" as ColorKey },
    { id: "tournaments", label: "Tourna- ments", icon: Trophy, colorKey: "tournaments" as ColorKey, badge: "4" },
    { id: "leaderboard", label: "Market", icon: BarChart3, colorKey: "market" as ColorKey, badge: "5" },
    { id: "more", label: "More", icon: Grid, colorKey: "more" as ColorKey },
  ] as const;

  const UTILITY_ITEMS = [
    { id: "referrals", label: "Join us", icon: Gift, colorKey: "referrals" as ColorKey },
    { id: "help", label: "Help", icon: HelpCircle, colorKey: "help" as ColorKey },
    { id: "settings", label: "Settings", icon: Settings, colorKey: "settings" as ColorKey },
  ] as const;

  const selectPrimaryItem = (item: (typeof PRIMARY_ITEMS)[number]) => {
    onSelectWorkspace(item.workspace);
  };

  const getPrimaryActiveKey = (): PrimaryNavKey | null => {
    if (activeWorkspace === null) return "trading";
    return null;
  };

  const primaryActiveKey = getPrimaryActiveKey();

  const renderNavButton = (
    item: { id: string; label: string; icon: typeof Image; colorKey: ColorKey; badge?: string },
    isActive: boolean,
    onClick: () => void,
  ) => {
    const c = COLORS[item.colorKey];
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        onClick={onClick}
        aria-label={item.label}
        aria-pressed={isActive}
        title={collapsed ? item.label : undefined}
        className={`${getNavItemClassName(collapsed)} transition-all duration-150`}
        style={{
          backgroundColor: isActive ? c.bgActive : c.bg,
          color: isActive ? c.iconActive : c.icon,
          boxShadow: isActive ? `0 0 16px ${c.glow}` : "none",
        }}
      >
        {"badge" in item && item.badge && (
          <span
            className="absolute right-2 top-2 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-black text-white"
            style={{ backgroundColor: isActive ? c.iconActive : c.icon }}
          >
            {item.badge}
          </span>
        )}
        <Icon className={navIconClassName} strokeWidth={2.3} />
        <span className={`${collapsed ? "sr-only" : navLabelClassName} ${isActive ? "font-bold" : ""}`}>
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <div
      className={`relative z-40 flex h-full shrink-0 flex-col items-center overflow-hidden border-r transition-[width] duration-300 ease-out ${
        collapsed ? "w-[62px]" : "w-[78px]"
      }`}
      style={{ background: "#0f1219", borderRightColor: "#1a2030" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="relative z-10 flex h-full w-full flex-col items-center">
        {/* Collapse toggle */}
        <div className={`w-full ${collapsed ? "px-1 pt-1.5" : "px-2 pt-1.5"}`}>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand navigation menu" : "Collapse navigation menu"}
            title={collapsed ? "Expand navigation menu" : "Collapse navigation menu"}
            className="group flex h-9 w-full items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/[0.04] hover:text-white/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            <Menu className="h-5 w-5 transition-transform duration-150 group-hover:scale-110" strokeWidth={2.45} />
          </button>
        </div>

        {/* Primary nav */}
        <nav className={`w-full space-y-2 ${collapsed ? "px-1 pt-1" : "px-2 pt-1"}`} aria-label="Primary workspace navigation">
          {PRIMARY_ITEMS.map((item) => {
            const isActive = primaryActiveKey === item.key;
            const c = COLORS[item.colorKey];
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                id={item.key === "trading" ? "tour-trading" : undefined}
                type="button"
                onClick={() => selectPrimaryItem(item)}
                aria-pressed={isActive}
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
                className={`${getNavItemClassName(collapsed)} transition-all duration-150`}
                style={{
                  backgroundColor: isActive ? c.bgActive : c.bg,
                  color: isActive ? c.iconActive : c.icon,
                  boxShadow: isActive ? `0 4px 20px ${c.glow}` : "none",
                }}
              >
                <Icon className={navIconClassName} strokeWidth={2.3} />
                <span className={`${collapsed ? "sr-only" : navLabelClassName} ${isActive ? "font-bold" : ""}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Secondary nav */}
        <nav className={`flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto pb-3 pt-2 no-scrollbar ${collapsed ? "px-1" : "px-2"}`} aria-label="Secondary workspace navigation">
          {SECONDARY_ITEMS.map((item) => {
            const isActive = activeWorkspace === item.id;
            return renderNavButton(item, isActive, () => onSelectWorkspace(isActive ? null : item.id));
          })}
        </nav>

        {/* Utility nav */}
        <div className={`w-full shrink-0 pb-3 pt-1 ${collapsed ? "px-1" : "px-2"}`}>
          <nav className="flex w-full flex-col items-center gap-1" aria-label="Utility workspace navigation">
            {UTILITY_ITEMS.map((item) => {
              const isActive = activeWorkspace === item.id;
              return renderNavButton(item, isActive, () => onSelectWorkspace(isActive ? null : item.id));
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};
