import { useEffect, useState } from "react";
import {
  BarChart3,
  DollarSign,
  Grid,
  Handshake,
  Headset,
  HelpCircle,
  LineChart,
  Settings,
  Trophy,
  User,
} from "lucide-react";

export type WorkspaceModule = "support" | "account" | "tournaments" | "leaderboard" | "more" | "settings" | "join" | "help" | null;

interface NavigationSidebarProps {
  activeWorkspace: WorkspaceModule;
  onSelectWorkspace: (module: WorkspaceModule) => void;
}

type AccountTabTarget = "personal" | "deposit";
type PrimaryNavKey = "trading" | "finance" | "profile";

const ACCOUNT_TAB_STORAGE_KEY = "initoption:account-tab";
const ACCOUNT_TAB_CHANGE_EVENT = "initoption:account-tab-change";

const getStoredAccountPrimaryKey = (): Exclude<PrimaryNavKey, "trading"> => {
  if (typeof window === "undefined") return "profile";
  return window.sessionStorage.getItem(ACCOUNT_TAB_STORAGE_KEY) === "deposit" ? "finance" : "profile";
};

export const NavigationSidebar = ({ activeWorkspace, onSelectWorkspace }: NavigationSidebarProps) => {
  const [accountPrimaryKey, setAccountPrimaryKey] = useState<Exclude<PrimaryNavKey, "trading">>(getStoredAccountPrimaryKey);

  const PRIMARY_ITEMS = [
    { key: "trading", label: "Trading", icon: LineChart, workspace: null },
    { key: "finance", label: "Finance", icon: DollarSign, workspace: "account", accountTab: "deposit" },
    { key: "profile", label: "Profile", icon: User, workspace: "account", accountTab: "personal" },
  ] as const;

  const SECONDARY_ITEMS = [
    { id: "tournaments", label: "Tournament", icon: Trophy },
    { id: "support", label: "Chat", icon: Headset },
    { id: "leaderboard", label: "Leaders", icon: BarChart3 },
    { id: "more", label: "More", icon: Grid },
  ] as const;

  const UTILITY_ITEMS = [
    { id: "settings", label: "Settings", icon: Settings },
    { id: "join", label: "Join Us", icon: Handshake },
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
    if (item.accountTab && typeof window !== "undefined") {
      const accountTab = item.accountTab as AccountTabTarget;
      setAccountPrimaryKey(accountTab === "deposit" ? "finance" : "profile");
      window.sessionStorage.setItem(ACCOUNT_TAB_STORAGE_KEY, accountTab);
      window.dispatchEvent(new CustomEvent(ACCOUNT_TAB_CHANGE_EVENT, { detail: accountTab }));
    }

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
      className="relative z-40 flex h-full w-[92px] shrink-0 flex-col items-center overflow-hidden border-r"
      style={{ background: "#202638", borderRightColor: "#101522" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
      <div className="relative z-10 flex h-full w-full flex-col items-center">
        <nav className="w-full space-y-1.5 px-1.5 pt-2" aria-label="Primary workspace navigation">
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
                className={`group relative flex h-[84px] w-full flex-col items-center justify-center gap-2 rounded-[2px] transition-colors ${
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
                  className={`h-[32px] w-[32px] transition-transform duration-200 ${isActive ? "text-white" : "text-current group-hover:-translate-y-0.5"}`}
                  strokeWidth={item.key === "finance" ? 2.65 : 2.35}
                />
                <span className={`text-[14px] leading-none ${isActive ? "font-bold" : "font-semibold"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="my-2.5 h-px w-[68px] shrink-0 bg-[#111827]" />
        <nav className="flex w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto px-1.5 pb-4 no-scrollbar" aria-label="Secondary workspace navigation">
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
                className={`group relative flex min-h-[56px] w-full flex-col items-center justify-center gap-1.5 rounded-[2px] transition-colors ${
                  isActive
                    ? "bg-white/[0.06] text-white"
                    : "text-[#7f91bd] hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {isActive && <span className="absolute left-0 top-1/2 h-9 w-[2px] -translate-y-1/2 rounded-r-full bg-[#6f86ba]" />}
                <Icon className="h-[23px] w-[23px] transition-transform duration-200 group-hover:-translate-y-0.5" strokeWidth={2.3} />
                <span className="text-center text-[11px] font-semibold leading-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="w-full shrink-0 border-t border-[#111827] px-1.5 pb-3 pt-2">
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
                  className={`group relative flex min-h-[54px] w-full flex-col items-center justify-center gap-1.5 rounded-[2px] transition-colors ${
                    isActive
                      ? "bg-[#2a3144] text-white"
                      : "text-[#93a7d3] hover:bg-white/[0.045] hover:text-white"
                  }`}
                >
                  {isActive && <span className="absolute left-0 top-1/2 h-9 w-[2px] -translate-y-1/2 rounded-r-full bg-[#f5f8ff]" />}
                  <Icon className="h-[24px] w-[24px] transition-transform duration-200 group-hover:-translate-y-0.5" strokeWidth={2.35} />
                  <span className="text-center text-[11px] font-semibold leading-tight">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};
