import { useState } from "react";
import { Camera, User, BadgeDollarSign, Clock, History, Settings, LogOut, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileUploadPhoto } from "../profile/ProfileUploadPhoto";
import { ProfilePersonalData } from "../profile/ProfilePersonalData";
import { ProfileDeposit } from "../profile/ProfileDeposit";
import { ProfileBalanceHistory } from "../profile/ProfileBalanceHistory";
import { ProfileTradingHistory } from "../profile/ProfileTradingHistory";
import { ProfileSettings } from "../profile/ProfileSettings";

type AccountTab = "upload" | "personal" | "deposit" | "balance_history" | "trading_history" | "settings";

interface AccountGridOverlayProps {
  onClose?: () => void;
  initialTab?: AccountTab;
}

export const AccountGridOverlay = ({ onClose, initialTab = "personal" }: AccountGridOverlayProps) => {
  const { profile, user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AccountTab>(initialTab);

  const MENU_ITEMS = [
    { id: "personal", icon: User, label: "Personal Data", desc: "View and edit your profile information" },
    { id: "upload", icon: Camera, label: "Upload Photo", desc: "Update your profile picture" },
    { id: "deposit", icon: BadgeDollarSign, label: "Deposit Funds", desc: "Add funds to your trading account" },
    { id: "balance_history", icon: Clock, label: "Balance History", desc: "View all balance transactions" },
    { id: "trading_history", icon: History, label: "Trading History", desc: "Review your past trades" },
    { id: "settings", icon: Settings, label: "Settings", desc: "Configure account preferences" },
  ] as const;

  const activeItem = MENU_ITEMS.find(m => m.id === activeTab);

  return (
    <div className="absolute inset-0 z-40 bg-[#121f27] flex flex-col overflow-hidden">

      {/* ── TOP HEADER ── */}
      <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-5 border-b border-[#0b2f3a] bg-[#13232d] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#0b2f3a] flex items-center justify-center text-white font-bold text-[14px] shrink-0">
            {profile?.username?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] md:text-[18px] font-bold text-white truncate">{profile?.username ?? "Your Account"}</h1>
            <p className="text-[11px] text-gray-500 truncate hidden md:block">{user?.email ?? "Manage your profile & settings"}</p>
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
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#0b2f3a] hover:bg-[#15404e] flex items-center justify-center text-gray-300 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── MOBILE: Scrollable Tab Strip ── */}
      <div className="md:hidden shrink-0 flex overflow-x-auto gap-1 px-2 py-2 bg-[#13232d] border-b border-[#0b2f3a] scrollbar-hide">
        {MENU_ITEMS.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as AccountTab)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl shrink-0 whitespace-nowrap transition-colors ${isActive ? "bg-[#0b2f3a] text-[#86c9d4]" : "text-gray-500"}`}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[10px] font-bold">{item.label.split(" ")[0]}</span>
              {isActive && <div className="w-4 h-[2px] bg-[#86c9d4] rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-[260px] shrink-0 border-r border-[#0b2f3a] bg-[#13232d] flex-col py-4 overflow-y-auto">
          {MENU_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as AccountTab)}
                className={`flex items-center gap-3 px-5 py-3.5 mx-2 my-0.5 rounded-xl text-left transition-all ${
                  isActive
                    ? "bg-[#0b2f3a] text-white border border-[#1b4f60]"
                    : "text-gray-400 hover:text-white hover:bg-[#0b2f3a]/50"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-[#15404e] text-[#86c9d4]" : "bg-[#121f27] text-gray-500"}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-[13px] font-bold ${isActive ? "text-white" : ""}`}>{item.label}</div>
                  <div className="text-[11px] text-gray-600 mt-0.5">{item.desc}</div>
                </div>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#86c9d4] shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="hidden md:block px-8 py-4 border-b border-[#0b2f3a] bg-[#13232d] shrink-0">
            <h2 className="text-[17px] font-bold text-white">{activeItem?.label}</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">{activeItem?.desc}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {activeTab === "upload" && <ProfileUploadPhoto />}
            {activeTab === "personal" && <ProfilePersonalData />}
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
