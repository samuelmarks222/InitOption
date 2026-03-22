import { useState } from "react";
import { Trophy, Globe, ChevronDown, Award, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const INSTRUMENTS = ["All instruments", "Forex", "CFD", "Crypto", "Options"];

export const WorkspaceLeaderboard = () => {
  const [tab, setTab] = useState<"weekly" | "monthly" | "all">("weekly");
  const [instrument, setInstrument] = useState("All instruments");
  const [showInstrDrop, setShowInstrDrop] = useState(false);
  const [traders, setTraders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaders() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("trades")
          .select("user_id, profit, profiles(username, avatar_url)")
          .eq("status", "closed")
          .gt("profit", 0)
          .order("profit", { ascending: false })
          .limit(20);

        if (data && data.length > 0) {
          // Aggregate by user
          const agg: Record<string, { username: string; avatar_url: string | null; totalProfit: number; count: number }> = {};
          data.forEach((row: any) => {
            const uid = row.user_id;
            const uname = row.profiles?.username ?? "Trader";
            const avatar = row.profiles?.avatar_url ?? null;
            if (!agg[uid]) agg[uid] = { username: uname, avatar_url: avatar, totalProfit: 0, count: 0 };
            agg[uid].totalProfit += row.profit ?? 0;
            agg[uid].count += 1;
          });
          const sorted = Object.values(agg).sort((a, b) => b.totalProfit - a.totalProfit);
          setTraders(sorted);
        } else {
          setTraders([]);
        }
      } catch {
        setTraders([]);
      }
      setLoading(false);
    }
    fetchLeaders();
  }, [tab]);

  const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
  const RANK_LABELS = ["🥇", "🥈", "🥉"];

  return (
    <div className="flex flex-col h-full bg-[#0E1217]">
      {/* Icon Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-[#111518] shrink-0">
        <div className="w-9 h-9 rounded-xl bg-yellow-400/10 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <div className="text-[15px] font-bold text-white">Leaderboard</div>
          <div className="text-[11px] text-gray-500">Top traders ranked by profit</div>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex items-center border-b border-white/5 px-4 shrink-0 bg-[#111518]">
        {(["weekly", "monthly", "all"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[11px] font-bold py-3 mr-5 border-b-2 transition-colors capitalize ${
              tab === t ? "text-yellow-400 border-yellow-400" : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            {t === "weekly" ? "This Week" : t === "monthly" ? "This Month" : "All Time"}
          </button>
        ))}
      </div>

      {/* Instrument Filter */}
      <div className="px-4 py-3 border-b border-white/5 shrink-0 relative">
        <button
          onClick={() => setShowInstrDrop(v => !v)}
          className="w-full flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-[12px] text-white hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-400" />
            {instrument}
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showInstrDrop ? "rotate-180" : ""}`} />
        </button>
        {showInstrDrop && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowInstrDrop(false)} />
            <div className="absolute left-4 right-4 top-full mt-1 rounded-lg shadow-xl z-20 border border-white/10 overflow-hidden bg-[#1a1f26]">
              {INSTRUMENTS.map(ins => (
                <button
                  key={ins}
                  onClick={() => { setInstrument(ins); setShowInstrDrop(false); }}
                  className={`w-full flex items-center px-4 py-2.5 text-[12px] transition-colors hover:bg-white/5 ${instrument === ins ? "text-white bg-white/5" : "text-gray-400"}`}
                >
                  {ins}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Leaderboard List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : traders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Award className="w-8 h-8 text-yellow-500/40" />
            </div>
            <div>
              <h3 className="text-white font-bold text-[14px] mb-1">No traders yet</h3>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                Be the first to appear<br />on the leaderboard!
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {traders.map((trader, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
                {/* Rank */}
                <div className="w-7 text-center shrink-0">
                  {i < 3 ? (
                    <span className="text-[16px]">{RANK_LABELS[i]}</span>
                  ) : (
                    <span className="text-[11px] font-bold text-gray-500">#{i + 1}</span>
                  )}
                </div>
                {/* Avatar */}
                {trader.avatar_url ? (
                  <img src={trader.avatar_url} alt={trader.username} className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10" />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                    style={{ background: i === 0 ? "#b8860b" : i === 1 ? "#808080" : i === 2 ? "#8B4513" : "#1a2035" }}
                  >
                    {trader.username.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-semibold truncate ${i < 3 ? "text-white" : "text-gray-300"}`}>
                    {trader.username}
                  </div>
                  <div className="text-[10px] text-gray-500">{trader.count} trade{trader.count !== 1 ? "s" : ""}</div>
                </div>
                {/* Profit */}
                <div className="text-right shrink-0">
                  <div className="text-[13px] font-bold text-green-400">
                    +${trader.totalProfit.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
