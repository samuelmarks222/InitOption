import { Headset, User, Trophy, Grid, Handshake, HelpCircle, BarChart, Settings } from "lucide-react";
import { TradeDeskShortcut } from "@/components/navigation/TradeDeskShortcut";

export type WorkspaceModule = "support" | "account" | "tournaments" | "leaderboard" | "more" | "settings" | "join" | "help" | null;

interface NavigationSidebarProps {
  activeWorkspace: WorkspaceModule;
  onSelectWorkspace: (module: WorkspaceModule) => void;
}

export const NavigationSidebar = ({ activeWorkspace, onSelectWorkspace }: NavigationSidebarProps) => {
  const MENU_ITEMS = [
    { id: "support",      label: "CHAT",        icon: Headset },
    { id: "account",      label: "ACCOUNT",     icon: User },
    { id: "tournaments",  label: "TOURNAMENTS", icon: Trophy },
    { id: "leaderboard",  label: "LEADERS",     icon: BarChart },
    { id: "more",         label: "... MORE",    icon: Grid },
  ] as const;

  const BOTTOM_ITEMS = [
    { id: "settings", label: "SETTINGS", icon: Settings },
    { id: "join", label: "JOIN US", icon: Handshake },
    { id: "help", label: "HELP", icon: HelpCircle },
  ] as const;

  return (
    <div
      className="relative w-[85px] h-full flex flex-col items-center border-r border-[#ffffff10] z-40 shrink-0 pb-4 overflow-hidden"
      style={{ background: "var(--trading-sidebar-bg)", borderRightColor: "var(--trading-border-color)" }}
    >
      <div className="absolute inset-0" style={{ background: "var(--trading-sidebar-bg)" }} />
      <div className="relative z-10 flex h-full w-full flex-col items-center">
      
      {/* Quick Trade Widget */}
      <TradeDeskShortcut onClick={() => onSelectWorkspace(null)} />

      {/* Middle Navigation Menu */}
      <div className="flex-1 w-full flex flex-col items-center space-y-2 overflow-y-auto no-scrollbar mt-3">
        {MENU_ITEMS.map((item) => {
          const isActive = activeWorkspace === item.id;
          return (
            <button
              key={item.id}
              id={`tour-${item.id}`}
              onClick={() => onSelectWorkspace(isActive ? null : item.id)}
              className={`w-full flex flex-col items-center justify-center py-3 group relative transition-all ${
                isActive ? "text-[#00C076]" : "text-gray-400 hover:text-white"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--trading-success-color)] shadow-[0_0_8px_var(--trading-success-color)]" />
              )}
              <item.icon className={`w-[26px] h-[26px] mb-1.5 text-white/90 transition-transform duration-200 ${isActive ? "scale-110 text-white" : "group-hover:scale-110 group-hover:text-white"}`} strokeWidth={2.6} />
              <span className="text-[9px] font-extrabold tracking-wider relative top-[1px] text-white/90">{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* Bottom User Engagement Widgets */}
      <div className="w-full flex items-center justify-center">
        <div className="w-[50px] h-[1px] mb-4" style={{ background: "var(--trading-border-color)" }} />
      </div>
      
      <div className="w-full flex flex-col items-center space-y-3 pb-2">
        {BOTTOM_ITEMS.map((item) => {
          const isActive = activeWorkspace === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectWorkspace(isActive ? null : item.id)}
              className={`w-full flex flex-col items-center justify-center py-2 group relative transition-all ${
                isActive ? "text-[#00C076]" : "text-gray-400 hover:text-white"
              }`}
            >
              <item.icon className="w-[24px] h-[24px] mb-1 text-white/85 transition-transform group-hover:scale-110 group-hover:text-white" strokeWidth={2.4} />
              <span className="text-[8px] font-extrabold tracking-wider text-white/85">{item.label}</span>
            </button>
          )
        })}
      </div>

      </div>
    </div>
  );
};
