import { BarChart3, ChevronRight, RadioTower, Trophy, X } from "lucide-react";
import { WorkspaceLeaderboard } from "./WorkspaceLeaderboard";

interface MobileMoreMenuProps {
  onClose: () => void;
  onOpenOverlay: (overlay: string) => void;
}

const sections = [
  { id: "analytics", icon: BarChart3, label: "Analytics", action: "analytics" },
  { id: "leaderboard", icon: Trophy, label: "TOP", action: "leaderboard" },
  { id: "signals", icon: RadioTower, label: "Signals", action: "signals" },
] as const;

export const MobileMoreMenu = ({ onClose, onOpenOverlay }: MobileMoreMenuProps) => {
  const handleSection = (action: string) => {
    onClose();
    onOpenOverlay(action);
  };

  return (
    <div className="trading-terminal flex h-full flex-col bg-[#1b2030]">
      <div className="flex h-[50px] shrink-0 items-center justify-between px-4">
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

      <div className="space-y-3 px-4 pt-1">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => handleSection(section.action)}
              className="flex h-[50px] w-full items-center gap-3 rounded-[4px] bg-[#2a2f40] px-4 text-left transition-colors hover:bg-[#33394d]"
            >
              <Icon className="h-5 w-5 text-white" strokeWidth={2.4} />
              <span className="flex-1 text-[14px] font-black text-white">{section.label}</span>
              <ChevronRight className="h-5 w-5 text-white/70" strokeWidth={2.4} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const MobileLeaderboardOverlay = ({ onClose }: { onClose: () => void }) => (
  <WorkspaceLeaderboard onClose={onClose} />
);
