import {
  BarChart3,
  Gift,
  Grid,
  HelpCircle,
  Image,
  Menu,
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
  `group relative flex w-full flex-col items-center justify-center rounded-[4px] transition-colors ${
    collapsed ? "h-[48px] gap-0" : "h-[62px] gap-1"
  }`;
const navIconClassName = "h-[22px] w-[22px] transition-transform duration-200 group-hover:-translate-y-0.5";
const navLabelClassName = "max-w-[62px] text-center text-[10px] font-black uppercase leading-[1.05]";

export const NavigationSidebar = ({
  activeWorkspace,
  onSelectWorkspace,
  collapsed = false,
  onToggleCollapsed,
}: NavigationSidebarProps) => {
  const PRIMARY_ITEMS = [
    { key: "trading", label: "Trade", icon: Image, workspace: null },
  ] as const;

  const SECONDARY_ITEMS = [
    { id: "support", label: "Support", icon: HelpCircle },
    { id: "account", label: "Account", icon: User },
    { id: "tournaments", label: "Tourna- ments", icon: Trophy, badge: "4" },
    { id: "leaderboard", label: "Market", icon: BarChart3, badge: "5" },
    { id: "more", label: "More", icon: Grid },
  ] as const;

  const UTILITY_ITEMS = [
    { id: "referrals", label: "Join us", icon: Gift },
    { id: "help", label: "Help", icon: HelpCircle },
  ] as const;

  const selectPrimaryItem = (item: (typeof PRIMARY_ITEMS)[number]) => {
    onSelectWorkspace(item.workspace);
  };

  const getPrimaryActiveKey = (): PrimaryNavKey | null => {
    if (activeWorkspace === null) return "trading";
    return null;
  };

  const primaryActiveKey = getPrimaryActiveKey();

  return (
    <div
      className={`relative z-40 flex h-full shrink-0 flex-col items-center overflow-hidden border-r transition-[width] duration-300 ease-out ${
        collapsed ? "w-[62px]" : "w-[78px]"
      }`}
      style={{ background: "#1b2030", borderRightColor: "#101522" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
      <div className="relative z-10 flex h-full w-full flex-col items-center">
        <div className={`w-full ${collapsed ? "px-1 pt-1.5" : "px-2 pt-1.5"}`}>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand navigation menu" : "Collapse navigation menu"}
            title={collapsed ? "Expand navigation menu" : "Collapse navigation menu"}
            className="group flex h-9 w-full items-center justify-center rounded-[4px] text-white transition-colors hover:bg-white/[0.055] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa6d6]/45"
          >
            <Menu className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" strokeWidth={2.45} />
          </button>
        </div>

        <nav className={`w-full space-y-2 ${collapsed ? "px-1 pt-1" : "px-2 pt-1"}`} aria-label="Primary workspace navigation">
          {PRIMARY_ITEMS.map((item) => {
            const isActive = primaryActiveKey === item.key;
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                id={item.key === "trading" ? "tour-trading" : item.key === "finance" ? "tour-account" : undefined}
                type="button"
                onClick={() => selectPrimaryItem(item)}
                aria-pressed={isActive}
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
                className={`${getNavItemClassName(collapsed)} ${
                  isActive
                    ? "bg-[#0f83e6] text-white shadow-[0_6px_14px_rgba(15,131,230,0.22)]"
                    : "text-white hover:bg-white/[0.045]"
                }`}
              >
                <Icon
                  className={`${navIconClassName} ${isActive ? "text-white" : "text-current"}`}
                  strokeWidth={2.35}
                />
                <span className={`${collapsed ? "sr-only" : navLabelClassName} ${isActive ? "font-bold text-white" : ""}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <nav className={`flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto pb-3 pt-2 no-scrollbar ${collapsed ? "px-1" : "px-2"}`} aria-label="Secondary workspace navigation">
          {SECONDARY_ITEMS.map((item) => {
            const isActive = activeWorkspace === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectWorkspace(isActive ? null : item.id)}
                aria-label={item.label}
                aria-pressed={isActive}
                title={collapsed ? item.label : undefined}
                className={`${getNavItemClassName(collapsed)} ${
                  isActive
                    ? "bg-white/[0.06] text-white"
                    : "text-white hover:bg-white/[0.04]"
                }`}
              >
                {"badge" in item && item.badge && (
                  <span className="absolute right-2 top-2 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#1c9cff] px-1 text-[10px] font-black text-white">
                    {item.badge}
                  </span>
                )}
                <Icon className={navIconClassName} strokeWidth={2.35} />
                <span className={collapsed ? "sr-only" : navLabelClassName}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={`w-full shrink-0 pb-3 pt-1 ${collapsed ? "px-1" : "px-2"}`}>
          <nav className="flex w-full flex-col items-center gap-1" aria-label="Utility workspace navigation">
            {UTILITY_ITEMS.map((item) => {
              const isActive = activeWorkspace === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectWorkspace(isActive ? null : item.id)}
                  aria-label={item.label}
                  aria-pressed={isActive}
                  title={collapsed ? item.label : undefined}
                  className={`${getNavItemClassName(collapsed)} ${
                    isActive
                      ? "bg-[#12b76a] text-white"
                      : item.id === "help"
                        ? "bg-[#12b76a] text-white hover:bg-[#18c976]"
                        : "text-white hover:bg-white/[0.045]"
                  }`}
                >
                  <Icon className={navIconClassName} strokeWidth={2.35} />
                  <span className={collapsed ? "sr-only" : navLabelClassName}>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};
