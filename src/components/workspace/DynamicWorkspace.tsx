import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { type WorkspaceModule } from "../navigation/NavigationSidebar";
import { WorkspaceAccount } from "./WorkspaceAccount";
import { WorkspaceTournaments } from "./WorkspaceTournaments";
import { WorkspaceMore } from "./WorkspaceMore";
import { WorkspaceReferral } from "./WorkspaceReferral";
import { WorkspaceHelp } from "./WorkspaceHelp";
import { WorkspaceLeaderboard } from "./WorkspaceLeaderboard";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { WorkspaceSocial } from "../social/WorkspaceSocial";

interface DynamicWorkspaceProps {
  activeWorkspace: WorkspaceModule;
  onClose: () => void;
  onOpenTournament?: (id: string) => void;
  onSelectWorkspace?: (workspace: WorkspaceModule) => void;
}

export const DynamicWorkspace = ({ activeWorkspace, onClose, onOpenTournament, onSelectWorkspace }: DynamicWorkspaceProps) => {
  const [supportImmersive, setSupportImmersive] = useState(false);

  useEffect(() => {
    if (activeWorkspace !== "support") {
      setSupportImmersive(false);
    }
  }, [activeWorkspace]);

  if (!activeWorkspace) return null;

  const isImmersiveSupport = activeWorkspace === "support" && supportImmersive;
  const isEmbeddedTournaments = activeWorkspace === "tournaments";
  const isDedicatedLeaderboard = activeWorkspace === "leaderboard";
  const workspaceTitleMap: Record<Exclude<WorkspaceModule, null>, string> = {
    support: "social",
    account: "account",
    tournaments: "tournaments",
    leaderboard: "leaders",
    more: "more",
    settings: "settings",
    join: "join us",
    help: "help",
  };
  const workspaceTitle = workspaceTitleMap[activeWorkspace];
  const workspaceWidthClass = isImmersiveSupport
    ? "w-[318px] max-w-[calc(100vw-85px)]"
    : activeWorkspace === "support"
      ? "w-[318px] max-w-[calc(100vw-85px)]"
      : activeWorkspace === "tournaments"
      ? "w-[430px] max-w-[calc(100vw-85px)]"
      : isDedicatedLeaderboard
        ? "w-[304px] max-w-[calc(100vw-85px)]"
      : activeWorkspace === "settings"
          ? "w-[260px] max-w-[calc(100vw-85px)]"
          : activeWorkspace === "help"
            ? "w-[360px] max-w-[calc(100vw-85px)]"
          : "w-[350px] max-w-[calc(100vw-85px)]";

  return (
    <div
      className={`h-full flex flex-col border-r z-30 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)] transform transition-transform duration-300 ${workspaceWidthClass}`}
      style={{ background: "var(--trading-workspace-panel-bg)", borderRightColor: "var(--trading-border-color)" }}
    >
      
      {/* Workspace Header Component */}
      {!isImmersiveSupport && !isEmbeddedTournaments && !isDedicatedLeaderboard && activeWorkspace !== "help" ? (
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{ background: "var(--trading-header-bg)", borderBottomColor: "var(--trading-border-color)" }}
      >
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
      ) : null}

      {/* Scrollable Body */}
      <div className="flex-1 flex flex-col w-full relative overflow-hidden">
        {activeWorkspace === "support" && (
          <div className="flex-1 w-full h-full overflow-hidden">
            <WorkspaceSocial onClose={onClose} onImmersiveChange={setSupportImmersive} />
          </div>
        )}
        {activeWorkspace === "account" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceAccount />
          </div>
        )}
        {activeWorkspace === "tournaments" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceTournaments onOpenDetails={onOpenTournament} onClose={onClose} />
          </div>
        )}
        {activeWorkspace === "more" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceMore />
          </div>
        )}
        {activeWorkspace === "settings" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceSettings />
          </div>
        )}
        {activeWorkspace === "join" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceReferral onSelectWorkspace={onSelectWorkspace} />
          </div>
        )}
        {activeWorkspace === "referrals" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceReferral onSelectWorkspace={onSelectWorkspace} />
          </div>
        )}
        {activeWorkspace === "help" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceHelp onOpenSupport={() => onSelectWorkspace?.("support")} />
          </div>
        )}
        {activeWorkspace === "leaderboard" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceLeaderboard onClose={onClose} />
          </div>
        )}
      </div>
      
    </div>
  );
};
