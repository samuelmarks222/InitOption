import { useState } from "react";
import { LineChart, Trophy, BellRing, PlayCircle, BookOpen, ArrowLeft } from "lucide-react";

// Sub-modules
import { ProfileTradingHistory } from "../profile/ProfileTradingHistory";

type MoreTab = "grid" | "analytics" | "leaderboard" | "signals" | "webinars" | "tutorials";

export const WorkspaceMore = () => {
  const [activeTab, setActiveTab] = useState<MoreTab>("grid");

  const TILES = [
    { id: "analytics", title: "Analytics", desc: "Deep dive into your stats", icon: LineChart, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: "leaderboard", title: "Leaderboard", desc: "Global & Local rankings", icon: Trophy, color: "text-orange-500", bg: "bg-orange-500/10" },
    { id: "signals", title: "Trading Signals", desc: "Real-time AI alerts", icon: BellRing, color: "text-green-500", bg: "bg-green-500/10" },
    { id: "webinars", title: "Live Webinars", desc: "Learn from pros", icon: PlayCircle, color: "text-purple-500", bg: "bg-purple-500/10" },
    { id: "tutorials", title: "Tutorials", desc: "Master the platform", icon: BookOpen, color: "text-yellow-500", bg: "bg-yellow-500/10" }
  ] as const;

  if (activeTab === "grid") {
    return (
      <div className="w-full h-full p-4 sm:p-6 text-white overflow-y-auto no-scrollbar">
        <h3 className="text-[15px] font-bold mb-6">Explore More Features</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TILES.map((tile) => (
            <button 
              key={tile.id}
              onClick={() => setActiveTab(tile.id as MoreTab)}
              className={`flex flex-col items-center justify-center p-6 rounded-2xl border border-white/5 hover:border-white/20 transition-all hover:scale-[1.03] group cursor-pointer ${
                tile.id === "analytics" ? "sm:col-span-2 aspect-auto sm:aspect-[3/1] min-h-[160px]" : "min-h-[180px] sm:aspect-square"
              }`}
              style={{ background: "#1A1F26" }}
            >
              <div className={`w-12 h-12 rounded-full mb-3 flex items-center justify-center ${tile.bg} group-hover:scale-110 transition-transform`}>
                <tile.icon className={`w-6 h-6 ${tile.color}`} />
              </div>
              <div className="text-[14px] font-bold mb-1">{tile.title}</div>
              <div className="text-[11px] text-gray-500 text-center px-2 leading-tight">{tile.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Render sub-views with a "Back" header
  return (
    <div className="flex flex-col w-full h-full text-white bg-[#0E1217]">
      <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-[#1A1F26]">
        <button 
          onClick={() => setActiveTab("grid")}
          className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="font-bold text-[14px] capitalize">{activeTab}</span>
      </div>

      <div className="flex-1 overflow-y-auto relative no-scrollbar">
        {activeTab === "analytics" && (
          <div className="p-4"><ProfileTradingHistory /></div>
        )}
        
        {activeTab === "leaderboard" && (
          <div className="p-4 sm:p-6">
            <h3 className="text-xl font-bold mb-4 text-[#00C076]">Global Top Traders</h3>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex justify-between items-center p-4 bg-[#1A1F26] rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-xs">{i}</div>
                    <div>
                      <div className="font-bold text-sm">Trader_{Math.floor(Math.random() * 9999)}</div>
                      <div className="text-xs text-gray-500">Win Rate: {Math.floor(60 + Math.random() * 30)}%</div>
                    </div>
                  </div>
                  <div className="font-bold text-[#00C076]">+${(Math.random() * 50000).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "signals" && (
          <div className="p-4 sm:p-6">
            <h3 className="text-xl font-bold mb-4 text-[#00C076]">Live Market Signals</h3>
            <div className="text-sm text-gray-400 mb-6">AI-generated trading signals based on technical analysis.</div>
            <div className="space-y-4">
              {['EUR/USD', 'GBP/JPY', 'TSLA', 'AAPL'].map((asset) => (
                <div key={asset} className="flex flex-col gap-2 p-4 bg-[#1A1F26] rounded-xl border border-white/5">
                  <div className="flex justify-between font-bold">
                    <span>{asset}</span>
                    <span className={Math.random() > 0.5 ? "text-[#00C076]" : "text-red-500"}>
                      {Math.random() > 0.5 ? "BUY CALL" : "BUY PUT"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 flex justify-between">
                    <span>Confidence: {Math.floor(70 + Math.random() * 25)}%</span>
                    <span>Expiry: 5m</span>
                  </div>
                  <button className="mt-2 w-full py-2 bg-[#00C076]/20 text-[#00C076] font-bold rounded hover:bg-[#00C076]/30">Auto-Trade Signal</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "webinars" && (
          <div className="p-4 sm:p-6 text-center text-gray-400">
            <PlayCircle className="w-12 h-12 mx-auto mb-4 text-purple-500/50" />
            No live webinars currently scheduled. Check back later!
          </div>
        )}

        {activeTab === "tutorials" && (
          <div className="p-4 sm:p-6 text-center text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-yellow-500/50" />
            Academy & Video Tutorials Module Coming Soon
          </div>
        )}
      </div>

    </div>
  );
};
