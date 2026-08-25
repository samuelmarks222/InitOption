import {
  BarChart3,
  BarChart2,
  ChevronRight,
  Download,
  LogOut,
  MessageCircle,
  RadioTower,
  Settings,
  Trophy,
  X,
} from "lucide-react";
import { WorkspaceLeaderboard } from "./WorkspaceLeaderboard";
import { useAuth } from "@/contexts/AuthContext";

interface MobileMoreMenuProps {
  onClose: () => void;
  onOpenOverlay: (overlay: string) => void;
  onOpenDeposit?: () => void;
}

const iconSections = [
  { id: "leaderboard", icon: BarChart2, label: "Market", action: "leaderboard", badge: "6" },
  { id: "analytics",  icon: BarChart3, label: "Analytics", action: "analytics",  badge: null },
  { id: "leaderboard2", icon: Trophy,  label: "TOP",      action: "leaderboard", badge: null },
  { id: "signals",   icon: RadioTower, label: "Signals",  action: "signals",     badge: null },
] as const;

const linkSections = [
  { id: "deposit",         label: "Deposit",    action: "deposit",          color: "text-white" },
  { id: "withdrawal",      label: "Withdrawal", action: "withdrawal",        color: "text-[#1689e8]" },
  { id: "balance_history", label: "Payments",   action: "balance_history",   color: "text-white" },
  { id: "trading_history", label: "Trades",     action: "trading_history",   color: "text-white" },
] as const;

export const MobileMoreMenu = ({ onClose, onOpenOverlay, onOpenDeposit }: MobileMoreMenuProps) => {
  const { signOut } = useAuth();

  const handleSection = (action: string) => {
    if (action === "deposit") {
      onClose();
      onOpenDeposit?.();
      return;
    }
    if (action === "analytics") {
      onClose();
      onOpenOverlay("analytics_detail");
      return;
    }
    onClose();
    onOpenOverlay(action);
  };

  const handleLogout = async () => {
    onClose();
    await signOut();
  };

  const handleInstallApp = () => {
    if ("standalone" in window.navigator && (window.navigator as any).standalone) return;
    // PWA install prompt or open store link
    window.open("https://play.google.com/store", "_blank");
  };

  const handleJoinUs = () => {
    onClose();
    onOpenOverlay("referrals");
  };

  return (
    <div className="trading-terminal flex h-full flex-col bg-[#1b2030]">
      {/* Header */}
      <div className="flex h-[52px] shrink-0 items-center justify-between px-4 border-b border-white/[0.07]">
        <h2 className="text-[20px] font-black text-white">More</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-[4px] text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
          aria-label="Close more menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Icon rows: Market / Analytics / TOP / Signals */}
        <div className="space-y-2">
          {iconSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id + section.action}
                type="button"
                onClick={() => handleSection(section.action)}
                className="relative flex h-[52px] w-full items-center gap-3 rounded-[6px] bg-[#222736] px-4 text-left transition-colors hover:bg-[#2a3048] active:bg-[#2a3048]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2d3448]">
                  <Icon className="h-5 w-5 text-white" strokeWidth={2.3} />
                </span>
                <span className="flex-1 text-[15px] font-bold text-white">{section.label}</span>
                {section.badge && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#1689e8] px-1.5 text-[11px] font-black text-white">
                    {section.badge}
                  </span>
                )}
                <ChevronRight className="h-5 w-5 shrink-0 text-white/50" strokeWidth={2.3} />
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-white/[0.07]" />

        {/* Plain text links: Deposit / Withdrawal / Payments / Trades */}
        <div className="space-y-0">
          {linkSections.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => handleSection(link.action)}
              className={`block w-full py-3 text-left text-[15px] font-bold transition-opacity hover:opacity-80 ${link.color}`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-white/[0.07]" />

        {/* Settings | Logout */}
        <div className="flex items-center justify-between py-1">
          <button
            type="button"
            onClick={() => { onClose(); onOpenOverlay("account"); }}
            className="flex items-center gap-2 text-[15px] font-bold text-[#1689e8] hover:text-[#2fa3ff] transition-colors"
          >
            <Settings className="h-4 w-4" strokeWidth={2.3} />
            Settings
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-[15px] font-bold text-[#ef4444] hover:text-[#ff6060] transition-colors"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.3} />
            Logout
          </button>
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-white/[0.07]" />

        {/* Install App | Join Us */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleInstallApp}
            className="flex flex-1 items-center justify-center gap-2 rounded-[6px] bg-[#1689e8] py-3 text-[14px] font-black text-white transition-colors hover:bg-[#1e9fff]"
          >
            <Download className="h-4 w-4" strokeWidth={2.3} />
            Install App
          </button>
          <button
            type="button"
            onClick={handleJoinUs}
            className="flex flex-1 items-center justify-center gap-2 rounded-[6px] bg-[#1689e8] py-3 text-[14px] font-black text-white transition-colors hover:bg-[#1e9fff]"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={2.3} />
            Join Us
          </button>
        </div>
      </div>
    </div>
  );
};

export const MobileLeaderboardOverlay = ({ onClose }: { onClose: () => void }) => (
  <WorkspaceLeaderboard onClose={onClose} />
);
