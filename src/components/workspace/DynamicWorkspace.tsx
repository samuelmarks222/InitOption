import { X } from "lucide-react";
import { type WorkspaceModule } from "../navigation/NavigationSidebar";
import { WorkspaceAccount } from "./WorkspaceAccount";
import { ProfileSupport } from "../profile/ProfileSupport";
import { WorkspaceTournaments } from "./WorkspaceTournaments";
import { WorkspaceMarket } from "./WorkspaceMarket";
import { WorkspaceMore } from "./WorkspaceMore";
import { WorkspaceReferral } from "./WorkspaceReferral";
import { WorkspaceHelp } from "./WorkspaceHelp";
import { WorkspaceLeaderboard } from "./WorkspaceLeaderboard";

interface DynamicWorkspaceProps {
  activeWorkspace: WorkspaceModule;
  onClose: () => void;
  onOpenTournament?: (id: string) => void;
}

export const DynamicWorkspace = ({ activeWorkspace, onClose, onOpenTournament }: DynamicWorkspaceProps) => {
  if (!activeWorkspace) return null;

  const workspaceTitle = activeWorkspace === "support" ? "chat" : activeWorkspace.replace("_", " ");

  return (
    <div className="w-[350px] h-full flex flex-col border-r border-[#ffffff10] z-30 shrink-0 bg-[#0E1217] shadow-[4px_0_24px_rgba(0,0,0,0.5)] transform transition-transform duration-300">
      
      {/* Workspace Header Component */}
      <div className="flex items-center justify-between p-4 border-b border-[#ffffff10] bg-[#1A1F26]">
        <h2 className="text-[14px] font-bold text-white uppercase tracking-wider">
          {workspaceTitle}
        </h2>
        <button 
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 flex flex-col w-full relative overflow-hidden">
        {activeWorkspace === "support" && (
          <div className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden p-6">
            <ProfileSupport />
          </div>
        )}
        {activeWorkspace === "account" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceAccount />
          </div>
        )}
        {activeWorkspace === "tournaments" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceTournaments onOpenDetails={onOpenTournament} />
          </div>
        )}
        {activeWorkspace === "market" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceMarket />
          </div>
        )}
        {activeWorkspace === "more" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceMore />
          </div>
        )}
        {activeWorkspace === "join" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceReferral />
          </div>
        )}
        {activeWorkspace === "help" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceHelp />
          </div>
        )}
        {activeWorkspace === "leaderboard" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceLeaderboard />
          </div>
        )}
      </div>
      
    </div>
  );
};
