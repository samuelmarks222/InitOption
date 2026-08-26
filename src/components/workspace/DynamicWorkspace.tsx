import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { type WorkspaceModule } from "../navigation/NavigationSidebar";
import { WorkspaceTournaments } from "./WorkspaceTournaments";
import { WorkspaceMore } from "./WorkspaceMore";
import { WorkspaceReferral } from "./WorkspaceReferral";
import { WorkspaceHelp } from "./WorkspaceHelp";
import { WorkspaceLeaderboard } from "./WorkspaceLeaderboard";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { WorkspaceSocial } from "../social/WorkspaceSocial";
import { WorkspaceSignals } from "./WorkspaceSignals";
import { GeneralChat } from "./GeneralChat";

interface DynamicWorkspaceProps {
  activeWorkspace: WorkspaceModule;
  onClose: () => void;
  onOpenTournament?: (id: string) => void;
  onEnterTournament?: (id: string) => void;
  onSelectWorkspace?: (workspace: WorkspaceModule) => void;
  directoryRefreshKey?: number;
}

export const DynamicWorkspace = ({ activeWorkspace, onClose, onOpenTournament, onEnterTournament, onSelectWorkspace, directoryRefreshKey }: DynamicWorkspaceProps) => {
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
    support: "support",
    account: "account",
    analytics: "analytics",
    tournaments: "tournaments",
    leaderboard: "leaders",
    more: "more",
    settings: "settings",
    join: "join us",
    help: "help",
    referrals: "referrals",
    guides: "guides",
    signals: "signals",
    generalchat: "general",
  };
  const workspaceTitle = workspaceTitleMap[activeWorkspace];
  const workspaceWidthClass = isImmersiveSupport
    ? "w-full max-w-full lg:w-[318px] lg:max-w-[calc(100vw-85px)]"
    : activeWorkspace === "support"
      ? "w-full max-w-full lg:w-[318px] lg:max-w-[calc(100vw-85px)]"
      : activeWorkspace === "tournaments"
      ? "w-full max-w-full lg:w-[430px] lg:max-w-[calc(100vw-85px)]"
      : isDedicatedLeaderboard
        ? "w-full max-w-full lg:w-[340px] lg:max-w-[calc(100vw-85px)]"
      : activeWorkspace === "settings"
          ? "w-full max-w-full lg:w-[260px] lg:max-w-[calc(100vw-85px)]"
          : activeWorkspace === "help"
            ? "w-full max-w-full lg:w-[360px] lg:max-w-[calc(100vw-85px)]"
      : activeWorkspace === "generalchat"
          ? "w-full max-w-full lg:w-[380px] lg:max-w-[calc(100vw-85px)]"
          : "w-full max-w-full lg:w-[350px] lg:max-w-[calc(100vw-85px)]";

  return (
    <div
      className={`h-full flex flex-col border-r z-30 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)] max-lg:w-full max-lg:max-w-none ${workspaceWidthClass}`}
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
        {activeWorkspace === "tournaments" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceTournaments onOpenDetails={onOpenTournament} onEnterTournament={onEnterTournament} onClose={onClose} directoryRefreshKey={directoryRefreshKey} />
          </div>
        )}
        {activeWorkspace === "more" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceMore onSelectWorkspace={onSelectWorkspace} />
          </div>
        )}
        {activeWorkspace === "settings" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceSettings />
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
        {activeWorkspace === "signals" && (
          <div className="flex-1 w-full h-full">
            <WorkspaceSignals onClose={onClose} />
          </div>
        )}
        {activeWorkspace === "generalchat" && (
          <div className="flex-1 w-full h-full">
            <GeneralChat onClose={onClose} />
          </div>
        )}
      </div>
      
    </div>
  );
};
