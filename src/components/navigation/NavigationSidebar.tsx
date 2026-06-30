import { useEffect, useState } from "react";
import {
  BarChart3,
  Gift,
  Grid,
  Headset,
  HelpCircle,
  LineChart,
  Menu,
  Settings,
  Trophy,
  User,
  Wifi,
} from "lucide-react";

export type WorkspaceModule = "support" | "account" | "tournaments" | "leaderboard" | "referrals" | "more" | "settings" | "help" | "guides" | "signals" | null;

interface NavigationSidebarProps {
  activeWorkspace: WorkspaceModule;
  onSelectWorkspace: (module: WorkspaceModule) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

type AccountTabTarget = "personal";
type PrimaryNavKey = "trading" | "profile";

const ACCOUNT_TAB_STORAGE_KEY = "initoption:account-tab";
const ACCOUNT_TAB_CHANGE_EVENT = "initoption:account-tab-change";
const getNavItemClassName = (collapsed: boolean) =>
  `group relative flex w-full flex-col items-center justify-center rounded-[2px] transition-colors ${
    collapsed ? "h-[48px] gap-0" : "h-[62px] gap-1.5"
  }`;
const navIconClassName = "h-[25px] w-[25px] transition-transform duration-200 group-hover:-translate-y-0.5";
const navLabelClassName = "text-center text-[12px] font-semibold leading-tight";

const getStoredAccountPrimaryKey = (): PrimaryNavKey => {
  return "profile";
};

export const NavigationSidebar = ({
  activeWorkspace,
  onSelectWorkspace,
  collapsed = false,
  onToggleCollapsed,
}: NavigationSidebarProps) => {
  const [accountPrimaryKey] = useState<PrimaryNavKey>(getStoredAccountPrimaryKey);

  const PRIMARY_ITEMS = [
    { key: "trading", label: "Trading", icon: LineChart, workspace: null },
    { key: "profile", label: "Profile", icon: User, workspace: "account", accountTab: "personal" },
  ] as const;

  const SECONDARY_ITEMS = [
    { id: "tournaments", label: "Tournament", icon: Trophy },
    { id: "support", label: "Chat", icon: Headset },
    { id: "leaderboard", label: "Leaders", icon: BarChart3 },
    { id: "signals", label: "Signals", icon: Wifi },
    { id: "more", label: "More", icon: Grid },
  ] as const;

  const UTILITY_ITEMS = [
    { id: "settings", label: "Settings", icon: Settings },
    { id: "referrals", label: "Referral", icon: Gift },
    { id: "help", label: "Help", icon: HelpCircle },
  ] as const;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAccountTabChange = (event: Event) => {
      const tab = (event as CustomEvent<AccountTabTarget>).detail;
      setAccountPrimaryKey(tab === "deposit" ? "finance" : "profile");
    };

    window.addEventListener(ACCOUNT_TAB_CHANGE_EVENT, handleAccountTabChange);
    return () => window.removeEventListener(ACCOUNT_TAB_CHANGE_EVENT, handleAccountTabChange);
  }, []);

  const selectPrimaryItem = (item: (typeof PRIMARY_ITEMS)[number]) => {
    onSelectWorkspace(item.workspace);
  };

  const getPrimaryActiveKey = (): PrimaryNavKey | null => {
    if (activeWorkspace === null) return "trading";
    if (activeWorkspace === "account") return accountPrimaryKey;
    return null;
  };

  const primaryActiveKey = getPrimaryActiveKey();

  return (
    <div
      className={`relative z-40 flex h-full shrink-0 flex-col items-center overflow-hidden border-r transition-[width] duration-300 ease-out ${
        collapsed ? "w-[56px]" : "w-[92px]"
      }`}
      style={{ background: "#202638", borderRightColor: "#101522" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
      <div className="relative z-10 flex h-full w-full flex-col items-center">
        <div className={`w-full ${collapsed ? "px-1 pt-2" : "px-1.5 pt-2"}`}>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand navigation menu" : "Collapse navigation menu"}
            title={collapsed ? "Expand navigation menu" : "Collapse navigation menu"}
            className="group flex h-10 w-full items-center justify-center rounded-[2px] text-[#a7b9df] transition-colors hover:bg-white/[0.055] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa6d6]/45"
          >
            <Menu className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" strokeWidth={2.45} />
          </button>
        </div>

        <nav className={`w-full space-y-1 ${collapsed ? "px-1 pt-1" : "px-1.5 pt-2"}`} aria-label="Primary workspace navigation">
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
                    ? "bg-[#2a3144] text-white"
                    : "text-[#8fa6d6] hover:bg-white/[0.045] hover:text-white"
                }`}
              >
                {isActive && (
                  <>
                    <span className="absolute left-0 top-0 h-full w-[3px] rounded-r-full bg-[#f5f8ff]" />
                    <span className="absolute inset-x-0 top-0 h-px bg-[#6f86ba]" />
                  </>
                )}
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

        <div className={`my-2 h-px shrink-0 bg-[#111827] ${collapsed ? "w-[36px]" : "w-[68px]"}`} />
        <nav className={`flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto pb-3 no-scrollbar ${collapsed ? "px-1" : "px-1.5"}`} aria-label="Secondary workspace navigation">
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
                    : "text-[#7f91bd] hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {isActive && <span className="absolute left-0 top-1/2 h-9 w-[2px] -translate-y-1/2 rounded-r-full bg-[#6f86ba]" />}
                <Icon className={navIconClassName} strokeWidth={2.35} />
                <span className={collapsed ? "sr-only" : navLabelClassName}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={`w-full shrink-0 border-t border-[#111827] pb-2 pt-2 ${collapsed ? "px-1" : "px-1.5"}`}>
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
                      ? "bg-[#2a3144] text-white"
                      : "text-[#93a7d3] hover:bg-white/[0.045] hover:text-white"
                  }`}
                >
                  {isActive && <span className="absolute left-0 top-1/2 h-9 w-[2px] -translate-y-1/2 rounded-r-full bg-[#f5f8ff]" />}
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
