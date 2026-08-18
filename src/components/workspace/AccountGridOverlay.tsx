import { useEffect, useState } from "react";
import { Camera, User, BadgeDollarSign, Clock, History, Settings, LogOut, X, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileUploadPhoto } from "../profile/ProfileUploadPhoto";
import { ProfilePersonalData } from "../profile/ProfilePersonalData";
import { ProfileDeposit } from "../profile/ProfileDeposit";
import { ProfileBalanceHistory } from "../profile/ProfileBalanceHistory";
import { ProfileTradingHistory } from "../profile/ProfileTradingHistory";
import { ProfileSettings } from "../profile/ProfileSettings";

type AccountTab = "upload" | "personal" | "deposit" | "balance_history" | "trading_history" | "settings";
const ACCOUNT_TAB_STORAGE_KEY = "initoption:account-tab";
const ACCOUNT_TAB_CHANGE_EVENT = "initoption:account-tab-change";

const isAccountTab = (value: string | null): value is AccountTab =>
  value === "upload" ||
  value === "personal" ||
  value === "deposit" ||
  value === "balance_history" ||
  value === "trading_history" ||
  value === "settings";

interface AccountGridOverlayProps {
  onClose?: () => void;
  initialTab?: AccountTab;
}

export const AccountGridOverlay = ({ onClose, initialTab = "personal" }: AccountGridOverlayProps) => {
  const { profile, user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AccountTab>(() => {
    if (typeof window === "undefined") return initialTab;
    const storedTab = window.sessionStorage.getItem(ACCOUNT_TAB_STORAGE_KEY);
    return isAccountTab(storedTab) ? storedTab : initialTab;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAccountTabChange = (event: Event) => {
      const nextTab = (event as CustomEvent<string>).detail;
      if (isAccountTab(nextTab)) {
        setActiveTab(nextTab);
      }
    };

    window.addEventListener(ACCOUNT_TAB_CHANGE_EVENT, handleAccountTabChange);
    return () => window.removeEventListener(ACCOUNT_TAB_CHANGE_EVENT, handleAccountTabChange);
  }, []);

  const changeTab = (tab: AccountTab) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(ACCOUNT_TAB_STORAGE_KEY, tab);
      window.dispatchEvent(new CustomEvent(ACCOUNT_TAB_CHANGE_EVENT, { detail: tab }));
    }
    setActiveTab(tab);
  };

  const MENU_ITEMS = [
    { id: "personal", icon: User, label: "Personal Data", desc: "View and edit your profile information" },
    { id: "upload", icon: Camera, label: "Upload Photo", desc: "Update your profile picture" },
    { id: "deposit", icon: BadgeDollarSign, label: "Deposit Funds", desc: "Add funds to your trading account" },
    { id: "balance_history", icon: Clock, label: "Balance History", desc: "View all balance transactions" },
    { id: "trading_history", icon: History, label: "Trading History", desc: "Review your past trades" },
    { id: "settings", icon: Settings, label: "Settings", desc: "Configure account preferences" },
  ] as const;

  return (
    <div
      className="quotex-glow-home trading-terminal relative z-40 flex h-full w-full flex-col overflow-hidden text-[var(--trading-text-color)]"
      style={{ background: "var(--trading-workspace-bg)" }}
    >

      {/* ── TOP HEADER ── */}
      <div
        className="flex shrink-0 items-center justify-end border-b border-white/8 px-3 py-3 md:px-5"
        style={{ background: "var(--trading-header-bg)" }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => { signOut(); onClose?.(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20"
          >
            <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Sign Out</span>
          </button>
          {onClose && (
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/8 bg-white/[0.06] text-gray-300 transition-colors hover:bg-white/[0.1] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>



      {/* ── MOBILE: Scrollable Tab Strip ── */}
      <div
        className="flex shrink-0 overflow-x-auto gap-2 border-b px-3 py-3 md:hidden"
        style={{ background: "var(--trading-header-bg)", borderColor: "rgba(255,255,255,0.04)", scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {MENU_ITEMS.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => changeTab(item.id as AccountTab)}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-center transition-all duration-200 shrink-0 min-w-[88px] ${
                isActive
                  ? "bg-[var(--admin-green)]/10 text-white border border-[var(--admin-green)]/20"
                  : "bg-white/[0.02] text-[var(--trading-muted-color)] hover:bg-white/[0.05] hover:text-white"
              }`}
              style={{
                borderWidth: isActive ? 1 : 0,
                borderStyle: "solid",
                borderColor: isActive ? "rgba(0,192,118,0.2)" : "transparent",
              }}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 ${isActive ? "bg-[var(--admin-green)]/15 text-[var(--admin-green)]" : "bg-white/[0.03] text-[#8b9bb0]"}`}>
                <item.icon className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] font-semibold leading-tight">
                {item.id === "balance_history"
                  ? "Balance"
                  : item.id === "trading_history"
                    ? "Trading"
                    : item.label.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Desktop Sidebar */}
        <div
          className="hidden w-[288px] shrink-0 flex-col overflow-y-auto border-r py-4 md:flex"
          style={{ background: "var(--trading-header-bg)", borderColor: "rgba(255,255,255,0.04)" }}
        >
          <div className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.35)" }}>
            Account
          </div>
          {MENU_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => changeTab(item.id as AccountTab)}
                className={`mx-3 my-1.5 flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-left transition-all duration-200 ${
                  isActive
                    ? "bg-white/[0.04] text-white"
                    : "text-[var(--trading-muted-color)] hover:bg-white/[0.03] hover:text-white"
                }`}
                style={{
                  backgroundColor: isActive ? "rgba(0, 192, 118, 0.08)" : "transparent",
                  borderColor: isActive ? "rgba(0, 192, 118, 0.15)" : "transparent",
                  borderWidth: isActive ? 1 : 0,
                  borderStyle: "solid",
                }}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                  isActive
                    ? "bg-[var(--admin-green)]/15 text-[var(--admin-green)]"
                    : "bg-white/[0.03] text-[#8b9bb0]"
                }`}>
                  <item.icon className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-semibold tracking-tight ${isActive ? "text-white" : "text-[#c8d2e6]"}`}>{item.label}</div>
                  <div className="mt-1 text-[11px] leading-4" style={{ color: isActive ? "rgba(255,255,255,0.55)" : "rgba(139,155,176,0.8)" }}>{item.desc}</div>
                </div>
                {isActive && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-[var(--admin-green)] shadow-[0_0_6px_rgba(0,192,118,0.6)]" />
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--admin-green)]" />
                  </div>
                )}
                {!isActive && <div className="w-7" />}
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-2 md:p-3">
            {activeTab === "upload" && <ProfileUploadPhoto />}
            {activeTab === "personal" && <ProfilePersonalData compact />}
            {activeTab === "deposit" && <ProfileDeposit />}
            {activeTab === "balance_history" && <ProfileBalanceHistory />}
            {activeTab === "trading_history" && <ProfileTradingHistory />}
            {activeTab === "settings" && <ProfileSettings />}
          </div>
        </div>
      </div>
    </div>
  );
};
