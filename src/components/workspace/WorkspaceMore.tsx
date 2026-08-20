import { BarChart3, ChevronRight, RadioTower, Trophy } from "lucide-react";
import type { WorkspaceModule } from "../navigation/NavigationSidebar";

interface WorkspaceMoreProps {
  onSelectWorkspace?: (workspace: WorkspaceModule) => void;
}

const menuItems: Array<{
  label: string;
  icon: typeof BarChart3;
  target: WorkspaceModule;
}> = [
  { label: "Analytics", icon: BarChart3, target: "analytics" },
  { label: "TOP", icon: Trophy, target: "leaderboard" },
  { label: "Signals", icon: RadioTower, target: "signals" },
];

export const WorkspaceMore = ({ onSelectWorkspace }: WorkspaceMoreProps) => (
  <div
    className="flex h-full w-full flex-col px-4 py-4 text-white"
    style={{ background: "var(--trading-workspace-panel-bg)" }}
  >
    <div className="space-y-3">
      {menuItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onSelectWorkspace?.(item.target)}
            className="flex h-[50px] w-full items-center gap-3 rounded-[4px] bg-[#2a2f40] px-4 text-left transition-colors hover:bg-[#33394d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1689e8]/60"
          >
            <Icon className="h-5 w-5 shrink-0 text-white" strokeWidth={2.4} />
            <span className="flex-1 text-[14px] font-black text-white">{item.label}</span>
            <ChevronRight className="h-5 w-5 shrink-0 text-white/70" strokeWidth={2.4} />
          </button>
        );
      })}
    </div>
  </div>
);
