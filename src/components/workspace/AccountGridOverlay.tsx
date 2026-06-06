import { useEffect, useState } from "react";
import { Camera, User, BadgeDollarSign, Clock, History, Settings, LogOut, X } from "lucide-react";
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
        className="grid shrink-0 grid-cols-3 gap-1.5 border-b border-white/8 px-2 py-2 md:hidden"
        style={{ background: "var(--trading-header-bg)" }}
      >
        {MENU_ITEMS.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => changeTab(item.id as AccountTab)}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-1.5 text-center transition-colors ${
                isActive ? "border border-[#2f80ed]/35 bg-[#263044] text-white" : "border border-white/[0.04] bg-white/[0.035] text-[var(--trading-muted-color)]"
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[10px] font-bold leading-tight">
                {item.id === "balance_history"
                  ? "Balance"
                  : item.id === "trading_history"
                    ? "Trading"
                    : item.label.split(" ")[0]}
              </span>
              {isActive && <div className="h-[2px] w-4 rounded-full bg-[#2f80ed]" />}
            </button>
          );
        })}
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Desktop Sidebar */}
        <div
          className="hidden w-[244px] shrink-0 flex-col overflow-y-auto border-r border-[var(--trading-border-color)] py-3 md:flex"
          style={{ background: "var(--trading-header-bg)" }}
        >
          {MENU_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => changeTab(item.id as AccountTab)}
                className={`mx-2 my-0.5 flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? "border-[#2f80ed]/35 bg-[var(--trading-header-bg)] text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)]"
                    : "border-transparent text-[var(--trading-muted-color)] hover:border-white/8 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-[linear-gradient(145deg,#1f3b53,#183144)] text-[#8ecbff]" : "bg-white/[0.04] text-[#9eb2cc]"}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-[13px] font-bold ${isActive ? "text-white" : ""}`}>{item.label}</div>
                  <div className="mt-0.5 text-[11px] leading-4 text-[#6f7b91]">{item.desc}</div>
                </div>
                {isActive && <div className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#78b8ff]" />}
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
