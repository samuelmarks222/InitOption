import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, User, BadgeDollarSign, Clock, History, Settings, LogOut, X, Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";
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
  const navigate = useNavigate();
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
      style={{ background: "radial-gradient(circle at top, rgba(38, 75, 120, 0.18), transparent 30%), linear-gradient(180deg, #161d2b 0%, #0f1723 45%, #0a0f17 100%)" }}
    >

      {/* ── TOP HEADER ── */}
      <div
        className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-3 md:px-5"
        style={{ background: "linear-gradient(135deg, rgba(9,13,20,0.98) 0%, rgba(17,24,39,0.98) 45%, rgba(10,14,22,0.98) 100%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#4ddf96]/25 bg-[linear-gradient(145deg,#113328,#081a12)] text-[14px] font-black text-[#d8ffe9] shadow-[0_14px_24px_rgba(16,185,129,0.16)] ring-1 ring-white/6">
            {profile?.username?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#87e4af]">Premium account</p>
            <h1 className="truncate text-[16px] font-black text-white md:text-[18px]">{profile?.username ?? "Your Account"}</h1>
            <p className="hidden truncate text-[11px] text-[#a8b4c8] md:block">{user?.email ?? "Manage your profile & settings"}</p>
          </div>
        </div>
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

      <div className="border-b border-white/8 px-3 py-3 md:px-5" style={{ background: "linear-gradient(180deg, rgba(14,20,31,0.96), rgba(10,14,21,0.98))" }}>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { label: "Deposit", icon: Wallet, action: () => { onClose?.(); navigate("/deposit"); }, accent: "from-[#1f8d5d] to-[#0ea86a]" },
            { label: "Withdraw", icon: ArrowDownLeft, action: () => { onClose?.(); navigate("/withdraw"); }, accent: "from-[#2a6dbe] to-[#4c90ff]" },
            { label: "Transactions", icon: ArrowUpRight, action: () => changeTab("balance_history"), accent: "from-[#8b5cf6] to-[#a78bfa]" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className={`rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(16,23,36,0.96),rgba(8,12,19,0.98))] p-2.5 text-left shadow-[0_12px_24px_rgba(0,0,0,0.26)] transition duration-200 hover:-translate-y-0.5 hover:border-[#4ddf96]/25 hover:bg-[linear-gradient(145deg,rgba(21,31,46,0.98),rgba(11,15,23,0.99))] hover:shadow-[0_14px_28px_rgba(16,185,129,0.10)]`}
              >
                <div className={`mb-1.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent} text-white shadow-[0_8px_14px_rgba(15,23,42,0.30)]`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-[13px] font-semibold text-white">{item.label}</div>
                <div className="text-[11px] text-[#9eb0cb]">Quick access</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MOBILE: Scrollable Tab Strip ── */}
      <div
        className="grid shrink-0 grid-cols-3 gap-1.5 border-b border-white/8 px-2 py-2 md:hidden"
        style={{ background: "linear-gradient(180deg, rgba(16,24,38,0.98), rgba(12,17,27,0.98))" }}
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
                    ? "border-[#2f80ed]/35 bg-[linear-gradient(135deg,rgba(30,41,59,0.98),rgba(18,25,38,0.98))] text-white shadow-[0_16px_30px_rgba(15,23,42,0.35)]"
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
