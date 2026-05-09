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
    <div className="w-full h-full flex flex-col bg-[#0E1217]">
      {/* Sub-navigation Tabs */}
      <div className="w-full overflow-x-auto border-b border-[#ffffff10] bg-[#1A1F26] no-scrollbar">
        <div className="flex w-max px-2 py-1">
          {MENU_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors mx-1 whitespace-nowrap text-[12px] font-bold ${
                  isActive ? "bg-[#ffffff15] text-[#0b65c2]" : "text-gray-400 hover:text-white hover:bg-[#ffffff0a]"
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
      <div className="flex-1 overflow-y-auto p-6 w-full relative">
        {activeTab === "upload" && <ProfileUploadPhoto />}
        {activeTab === "personal" && <ProfilePersonalData />}
        {activeTab === "deposit" && <ProfileDeposit />}
        {activeTab === "balance_history" && <ProfileBalanceHistory />}
        {activeTab === "trading_history" && <ProfileTradingHistory />}
        {activeTab === "settings" && <ProfileSettings />}
      </div>
    </div>
  );
};
