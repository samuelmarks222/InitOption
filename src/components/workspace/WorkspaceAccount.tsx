import { useState } from "react";
import { Camera, User, BadgeDollarSign, Clock, History, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileUploadPhoto } from "../profile/ProfileUploadPhoto";
import { ProfilePersonalData } from "../profile/ProfilePersonalData";
import { ProfileDeposit } from "../profile/ProfileDeposit";
import { ProfileBalanceHistory } from "../profile/ProfileBalanceHistory";
import { ProfileTradingHistory } from "../profile/ProfileTradingHistory";
import { ProfileSettings } from "../profile/ProfileSettings";

type AccountTab = "upload" | "personal" | "deposit" | "balance_history" | "trading_history" | "settings";

export const WorkspaceAccount = () => {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AccountTab>("personal");

  const MENU_ITEMS = [
    { id: "personal", icon: User, label: "Personal Data" },
    { id: "upload", icon: Camera, label: "Upload a Photo" },
    { id: "deposit", icon: BadgeDollarSign, label: "Deposit Funds" },
    { id: "balance_history", icon: Clock, label: "Balance History" },
    { id: "trading_history", icon: History, label: "Trading History" },
    { id: "settings", icon: Settings, label: "Settings" },
  ] as const;

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{ background: "var(--trading-workspace-bg)" }}
    >
      {/* Sub-navigation Tabs */}
      <div
        className="w-full overflow-x-auto border-b no-scrollbar"
        style={{ background: "var(--trading-header-bg)", borderBottomColor: "var(--trading-border-color)" }}
      >
        <div className="flex w-max px-2 py-1">
          {MENU_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors mx-1 whitespace-nowrap text-[12px] font-bold ${
                  isActive ? "bg-white/[0.07] text-white" : "text-[var(--trading-muted-color)] hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            )
          })}
          
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors mx-1 whitespace-nowrap text-[12px] font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </div>

      {/* Dynamic Tab Content (Reusing Profile Components) */}
      <div className="relative w-full flex-1 overflow-y-auto p-4">
        {activeTab === "upload" && <ProfileUploadPhoto />}
        {activeTab === "personal" && <ProfilePersonalData compact />}
        {activeTab === "deposit" && <ProfileDeposit />}
        {activeTab === "balance_history" && <ProfileBalanceHistory />}
        {activeTab === "trading_history" && <ProfileTradingHistory />}
        {activeTab === "settings" && <ProfileSettings />}
      </div>
    </div>
  );
};
