import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, User, DollarSign, HelpCircle, Clock, History, Settings, LogOut, ChevronDown, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileDropdownProps {
  balance: number;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

const MENU_ITEMS = [
  { icon: Camera, label: "Upload a Photo", action: "photo" },
  { icon: User, label: "Personal Data", action: "personal" },
  { icon: DollarSign, label: "Deposit Funds", action: "deposit" },
  { icon: HelpCircle, label: "Contact Support", action: "support" },
  { icon: Clock, label: "Balance History", action: "balance" },
  { icon: History, label: "Trading History", action: "history" },
  { icon: Settings, label: "Settings", action: "settings" },
  { icon: LogOut, label: "Log Out", action: "logout" },
];

const ProfileDropdown = ({ balance, onClose, onOpenSettings, onOpenHistory }: ProfileDropdownProps) => {
  const { signOut, profile, user } = useAuth();
  const navigate = useNavigate();
  const completionPercent = 20;

  const handleAction = async (action: string) => {
    switch (action) {
      case "deposit":
        navigate("/deposit");
        onClose();
        break;
      case "settings":
        onOpenSettings();
        onClose();
        break;
      case "history":
        onOpenHistory();
        onClose();
        break;
      case "logout":
        await signOut();
        navigate("/login");
        break;
      default:
        onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 w-[320px] bg-[#1a1b20] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden">
        {/* Profile Info Section */}
        <div className="p-5 border-b border-white/5 bg-gradient-to-br from-[#22242a] to-[#1a1b20]">
          {/* Progress Ring + Email */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="#2a2d35" strokeWidth="4" />
                <circle
                  cx="28" cy="28" r="24" fill="none"
                  stroke="#ff6200" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 24 * completionPercent / 100} ${2 * Math.PI * 24 * (1 - completionPercent / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-foreground">{completionPercent}%</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{profile?.username || user?.email || "user@example.com"}</div>
              <div className="flex items-center gap-2 mt-2">
                <ChevronDown className="w-4 h-4 text-trading-orange" />
                <span className="text-trading-orange font-bold text-lg">${balance.toFixed(2)}</span>
                <ChevronDown className="w-4 h-4 text-trading-orange" />
              </div>
            </div>
          </div>

          {/* Platform Tour Banner */}
          <div className="bg-[#2a2d35] rounded-lg p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-trading-orange/10 border-2 border-trading-orange/30 flex items-center justify-center text-xs font-bold text-trading-orange">
              {completionPercent}%
            </div>
            <div>
              <div className="text-sm text-foreground">Take the platform tour before</div>
              <div className="text-sm font-semibold text-foreground">your first real trade</div>
            </div>
          </div>

          {/* User Meta */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-base">🇬🇪</span>
            <span className="text-sm text-muted-foreground">Georgia</span>
          </div>
          <div className="mt-2 flex gap-8 text-xs">
            <div>
              <div className="text-muted-foreground">Date registered</div>
              <div className="text-foreground mt-0.5">3 Dec 2024</div>
            </div>
            <div>
              <div className="text-muted-foreground">User ID</div>
              <div className="text-foreground mt-0.5 flex items-center gap-1">
                1734515
                <button className="text-muted-foreground hover:text-foreground transition-colors text-[10px]">⧉</button>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div>
          {MENU_ITEMS.map(item => (
            <button
              key={item.action}
              onClick={() => handleAction(item.action)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                item.action === "logout"
                  ? "text-red-400 hover:bg-red-400/10"
                  : "text-foreground hover:bg-white/5"
              } border-b border-white/5 last:border-0`}
            >
              <item.icon className="w-4 h-4 text-muted-foreground" />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default ProfileDropdown;
