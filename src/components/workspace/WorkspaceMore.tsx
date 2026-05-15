import { useState } from "react";
import { ArrowLeft, BellRing, BookOpen, LineChart, PlayCircle, Trophy } from "lucide-react";

import { ProfileTradingHistory } from "../profile/ProfileTradingHistory";
import { WorkspaceLeaderboard } from "./WorkspaceLeaderboard";

type MoreTab = "grid" | "analytics" | "leaderboard" | "signals" | "webinars" | "tutorials";

export const WorkspaceMore = () => {
  const [activeTab, setActiveTab] = useState<MoreTab>("grid");

  const tiles = [
    { id: "analytics", title: "Analytics", desc: "Deep dive into your stats", icon: LineChart, color: "text-[#0fa053]", bg: "bg-[#0fa053]/10" },
    { id: "leaderboard", title: "Leaderboard", desc: "Global & Local rankings", icon: Trophy, color: "text-[#0fa053]", bg: "bg-[#0fa053]/10" },
    { id: "signals", title: "Trading Signals", desc: "Live signal feed status", icon: BellRing, color: "text-green-500", bg: "bg-green-500/10" },
    { id: "webinars", title: "Live Webinars", desc: "Learn from pros", icon: PlayCircle, color: "text-[#1e2330]", bg: "bg-[#1e2330]/25" },
    { id: "tutorials", title: "Tutorials", desc: "Master the platform", icon: BookOpen, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  ] as const;

  if (activeTab === "grid") {
    return (
      <div className="no-scrollbar h-full w-full overflow-y-auto p-4 text-white sm:p-6" style={{ background: "var(--trading-workspace-bg)" }}>
        <h3 className="mb-6 text-[15px] font-bold">Explore More Features</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tiles.map((tile) => (
            <button
              key={tile.id}
              onClick={() => setActiveTab(tile.id as MoreTab)}
              className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-white/5 p-6 transition-all hover:scale-[1.03] hover:border-white/20 ${
                tile.id === "analytics" ? "sm:col-span-2 sm:aspect-[3/1] sm:min-h-[160px]" : "min-h-[180px] sm:aspect-square"
              }`}
              style={{ background: "var(--trading-panel-bg)" }}
            >
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${tile.bg} transition-transform group-hover:scale-110`}>
                <tile.icon className={`h-6 w-6 ${tile.color}`} />
              </div>
              <div className="mb-1 text-[14px] font-bold">{tile.title}</div>
              <div className="px-2 text-center text-[11px] leading-tight text-gray-500">{tile.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col text-white" style={{ background: "var(--trading-workspace-bg)" }}>
      <div
        className="flex items-center gap-3 border-b border-white/5 p-4"
        style={{ background: "var(--trading-header-bg)", borderBottomColor: "var(--trading-border-color)" }}
      >
        <button
          onClick={() => setActiveTab("grid")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-[14px] font-bold capitalize">{activeTab}</span>
      </div>

      <div className="relative flex-1 overflow-y-auto no-scrollbar">
        {activeTab === "analytics" && (
          <div className="p-4">
            <ProfileTradingHistory />
          </div>
        )}

        {activeTab === "leaderboard" && <WorkspaceLeaderboard />}

        {activeTab === "signals" && (
          <div className="p-4 sm:p-6">
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center" style={{ background: "var(--trading-panel-bg)" }}>
              <BellRing className="mx-auto mb-4 h-12 w-12 text-green-500/50" />
              <h3 className="text-xl font-bold text-white">No Live Signal Feed Connected</h3>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                This panel no longer generates random buy or sell calls. Connect a real signal engine before showing signal
                accuracy or actionable alerts here.
              </p>
            </div>
          </div>
        )}

        {activeTab === "webinars" && (
          <div className="p-4 text-center text-gray-400 sm:p-6">
            <PlayCircle className="mx-auto mb-4 h-12 w-12 text-[#1e2330]/50" />
            No live webinars are currently scheduled. Check back later.
          </div>
        )}

        {activeTab === "tutorials" && (
          <div className="p-4 text-center text-gray-400 sm:p-6">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-yellow-500/50" />
            Academy and video tutorials will appear here once they are published.
          </div>
        )}
      </div>
    </div>
  );
};

