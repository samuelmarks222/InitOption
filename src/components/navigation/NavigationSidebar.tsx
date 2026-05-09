import { Headset, User, Trophy, Grid, Handshake, HelpCircle, BarChart } from "lucide-react";

export type WorkspaceModule = "support" | "account" | "tournaments" | "leaderboard" | "more" | "join" | "help" | null;

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
    { id: "join", label: "JOIN US", icon: Handshake },
    { id: "help", label: "HELP", icon: HelpCircle },
  ] as const;

  return (
    <div
      className="relative w-[85px] h-full flex flex-col items-center border-r border-[#ffffff10] z-40 shrink-0 pb-4 overflow-hidden"
      style={{ background: "#1a1e2b" }}
    >
      <div className="absolute inset-0 bg-[#1a1e2b]" />
      <div className="relative z-10 flex h-full w-full flex-col items-center">
      
      {/* Quick Trade Widget */}
      <div className="flex h-[70px] w-full items-start justify-center overflow-visible pt-[10px]">
        <button
          type="button"
          className="group relative flex h-[60px] w-[58px] flex-col items-center overflow-hidden rounded-[16px] border px-2.5 py-2 text-center transition-transform duration-200 hover:-translate-y-[1px] active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(180deg, rgba(42,168,122,0.98) 0%, rgba(20,112,94,0.98) 52%, rgba(12,58,73,0.98) 100%)",
            borderColor: "rgba(167, 255, 223, 0.24)",
            boxShadow: "0 16px 24px rgba(8, 87, 82, 0.24), inset 0 1px 0 rgba(255,255,255,0.14)",
          }}
          onClick={() => onSelectWorkspace(null)}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 34%), radial-gradient(circle at bottom left, rgba(8,37,48,0.34), transparent 46%)",
              }}
          />
          <div className="relative mt-[2px] flex h-7 w-7 items-center justify-center rounded-[10px] border border-white/14 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-sm">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 13.5L7.1 9.9L9.8 12.6L14.6 7.8" stroke="#F7FFFC" strokeWidth="1.6" />
              <circle cx="14.6" cy="7.8" r="1.6" fill="#D8FFE7" />
              <path d="M12.7 7.8H16.2V11.3" stroke="#F7FFFC" strokeWidth="1.3" />
            </svg>
          </div>

          <div className="relative mt-2">
            <div className="text-[10px] font-black tracking-[0.16em] text-white">TRADE</div>
            <div className="mt-0.5 text-[5px] font-bold uppercase tracking-[0.24em] text-white/68">Desk</div>
          </div>
        </button>
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
              <item.icon className={`w-[26px] h-[26px] mb-1.5 text-white/90 transition-transform duration-200 ${isActive ? "scale-110 text-white" : "group-hover:scale-110 group-hover:text-white"}`} strokeWidth={2.6} />
              <span className="text-[9px] font-extrabold tracking-wider relative top-[1px] text-white/90">{item.label}</span>
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
