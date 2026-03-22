import { Headset, User, Trophy, Globe, Grid, Handshake, HelpCircle } from "lucide-react";

export type WorkspaceModule = "support" | "account" | "tournaments" | "leaderboard" | "market" | "more" | "join" | "help" | null;

interface NavigationSidebarProps {
  activeWorkspace: WorkspaceModule;
  onSelectWorkspace: (module: WorkspaceModule) => void;
}

export const NavigationSidebar = ({ activeWorkspace, onSelectWorkspace }: NavigationSidebarProps) => {
  const MENU_ITEMS = [
    { id: "support",      label: "CHAT",        icon: Headset },
    { id: "account",      label: "ACCOUNT",     icon: User },
    { id: "tournaments",  label: "TOURNAMENTS", icon: Trophy },
    { id: "leaderboard",  label: "LEADERS",     icon: Trophy },
    { id: "market",       label: "MARKET",      icon: Globe },
    { id: "more",         label: "... MORE",    icon: Grid },
  ] as const;

  const BOTTOM_ITEMS = [
    { id: "join", label: "JOIN US", icon: Handshake },
    { id: "help", label: "HELP", icon: HelpCircle },
  ] as const;

  return (
    <div className="w-[85px] h-full flex flex-col items-center py-4 border-r border-[#ffffff10] z-40 shrink-0" style={{ background: "#1c1f2d" }}>
      
      {/* Quick Trade Widget */}
      <div 
        className="w-[54px] h-[54px] rounded-[10px] flex flex-col items-center justify-center cursor-pointer mb-3 transition-all hover:brightness-110 active:scale-95 shadow-[0_4px_12px_rgba(14,117,225,0.25)] mx-auto mt-2"
        style={{ background: "#0e75e1" }}
        onClick={() => onSelectWorkspace(null)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <path d="M3 17l4-4 4 4 8-8"/>
          <path d="M14 6h5v5"/>
        </svg>
        <div className="text-[9px] font-extrabold text-white tracking-widest mt-0.5">TRADE</div>
      </div>

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
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-[#00C076] rounded-r-full shadow-[0_0_8px_#00c076]" />
              )}
              <item.icon className={`w-[24px] h-[24px] mb-1.5 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`} strokeWidth={1.5} />
              <span className="text-[9px] font-bold tracking-wider relative top-[1px]">{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* Bottom User Engagement Widgets */}
      <div className="w-full flex items-center justify-center">
        <div className="w-[50px] h-[1px] bg-[#ffffff1a] mb-4" />
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
              <item.icon className="w-[22px] h-[22px] mb-1 transition-transform group-hover:scale-110" strokeWidth={1.5} />
              <span className="text-[8px] font-bold tracking-wider">{item.label}</span>
            </button>
          )
        })}
      </div>

    </div>
  );
};
