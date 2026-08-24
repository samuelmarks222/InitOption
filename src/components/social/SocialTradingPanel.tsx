import { useEffect, useMemo, useState } from "react";
import { api } from "@/integrations/api/client";
import { Copy, Eye, Search, TrendingDown, TrendingUp, Users, X, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialTrading } from "@/contexts/SocialTradingContext";
import { VipBadge } from "@/components/vip/VipBadge";
import { TraderProfileModal } from "@/components/social/TraderProfileModal";
import {
  computeTraderWinRate,
  formatSocialCurrency,
  getTraderDisplayName,
  type TraderSummary,
} from "@/lib/social";

interface SocialTradingPanelProps {
  onClose?: () => void;
}

type SortBy = "profit" | "winrate" | "followers";

interface TraderLeader extends TraderSummary {
  rank: number;
}

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: "profit", label: "Profit" },
  { key: "winrate", label: "Win %" },
  { key: "followers", label: "Followers" },
];

export const SocialTradingPanel = ({ onClose }: SocialTradingPanelProps) => {
  const { profile: currentProfile } = useAuth();
  const { isFollowing, followTrader, unfollowTrader, copySettings } = useSocialTrading();

  const [traders, setTraders] = useState<TraderLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("profit");
  const [selectedTrader, setSelectedTrader] = useState<TraderSummary | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await api
        .from("profiles")
        .select("id, username, display_name, avatar_url, vip_tier, total_profit, total_trades, total_wins, followers_count, social_trading_disabled")
        .gt("total_trades", 0)
        .order("total_profit", { ascending: false })
        .limit(100);

      const rows = ((data ?? []) as TraderSummary[]).map((t, i) => ({
        ...t,
        rank: i + 1,
      }));
      setTraders(rows);
      setLoading(false);
    };
    void load();
  }, []);

  const sorted = useMemo(() => {
    let list = [...traders];
    if (sortBy === "winrate") {
      list.sort((a, b) => computeTraderWinRate(b.total_wins, b.total_trades) - computeTraderWinRate(a.total_wins, a.total_trades));
    } else if (sortBy === "followers") {
      list.sort((a, b) => (b.followers_count ?? 0) - (a.followers_count ?? 0));
    }
    return list;
  }, [traders, sortBy]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (t) =>
        (t.username?.toLowerCase() ?? "").includes(q) ||
        (t.display_name?.toLowerCase() ?? "").includes(q)
    );
  }, [search, sorted]);

  const isCopying = (traderId: string) => copySettings.some((s) => s.target_user_id === traderId && s.enabled);

  return (
    <div className="flex h-full flex-col bg-[#10131b] text-white">
      {/* Header */}
      <div className="shrink-0 border-b border-white/[0.08] bg-[#121622] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0fa053]/15 text-[#0fa053]">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white">Social Trading</h2>
              <p className="text-[10px] text-gray-500">Copy expert traders automatically</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search traders..."
            className="w-full rounded-xl border border-white/8 bg-black/30 py-2 pl-9 pr-3 text-xs text-white outline-none transition-colors placeholder:text-gray-600 focus:border-[#0fa053]/50"
          />
        </div>

        {/* Sort tabs */}
        <div className="mt-2.5 flex gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                sortBy === opt.key
                  ? "bg-[#0fa053] text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-xs text-gray-500">
            Loading traders...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Users className="h-8 w-8 text-gray-600" />
            <p className="text-xs text-gray-500">{search ? "No traders match your search" : "No traders found yet"}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {filtered.map((trader, idx) => {
              const winRate = computeTraderWinRate(trader.total_wins, trader.total_trades);
              const isSelf = trader.id === currentProfile?.id;
              const following = isFollowing(trader.id);
              const copying = isCopying(trader.id);
              const profit = trader.total_profit ?? 0;

              return (
                <div
                  key={trader.id}
                  className="group cursor-pointer px-4 py-3 transition-colors hover:bg-white/[0.03]"
                  onClick={() => setSelectedTrader(trader)}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${
                      idx < 3 ? "bg-[#0fa053]/20 text-[#0fa053]" : "text-gray-600"
                    }`}>
                      {idx < 3 ? ["🥇", "🥈", "🥉"][idx] : idx + 1}
                    </span>

                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {trader.avatar_url ? (
                        <img src={trader.avatar_url} alt="" className="h-9 w-9 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0fa053] to-purple-600 text-sm font-black text-white">
                          {getTraderDisplayName(trader).charAt(0).toUpperCase()}
                        </div>
                      )}
                      {copying && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#10131b] bg-[#0fa053]">
                          <Copy className="h-2 w-2 text-white" />
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-bold text-white">{getTraderDisplayName(trader)}</span>
                        <VipBadge tierId={(trader.vip_tier as any) ?? "standard"} size={13} />
                      </div>
                      <div className="mt-0.5 flex items-center gap-2.5">
                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                          <Users className="h-2.5 w-2.5" />
                          {trader.followers_count ?? 0}
                        </span>
                        <span className="text-[10px] text-gray-600">•</span>
                        <span className={`text-[10px] font-semibold ${winRate >= 50 ? "text-[#00C076]" : "text-[#F6465D]"}`}>
                          {winRate}% win
                        </span>
                        <span className="text-[10px] text-gray-600">•</span>
                        <span className="text-[10px] text-gray-500">{trader.total_trades ?? 0} trades</span>
                      </div>
                    </div>

                    {/* P&L */}
                    <div className="shrink-0 text-right">
                      <div className={`flex items-center gap-0.5 justify-end text-xs font-black ${profit >= 0 ? "text-[#00C076]" : "text-[#F6465D]"}`}>
                        {profit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {profit >= 0 ? "+" : ""}{formatSocialCurrency(profit)}
                      </div>
                      {!isSelf && (
                        <div className="mt-1 flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTrader(trader);
                            }}
                            className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider transition-colors ${
                              copying
                                ? "bg-[#0fa053]/20 text-[#0fa053]"
                                : "border border-[#0fa053]/40 text-[#0fa053] hover:bg-[#0fa053] hover:text-white"
                            }`}
                            title="Copy trader"
                          >
                            {copying ? "Copying" : "Copy"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void (following ? unfollowTrader(trader.id) : followTrader(trader.id));
                            }}
                            className={`rounded-md p-0.5 text-[10px] transition-colors ${
                              following ? "text-[#00C076]" : "text-gray-500 hover:text-gray-300"
                            }`}
                            title={following ? "Unwatch" : "Watch"}
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Win Rate Bar */}
                  <div className="ml-[60px] mt-1.5">
                    <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full transition-all ${winRate >= 50 ? "bg-[#00C076]" : "bg-[#F6465D]"}`}
                        style={{ width: `${Math.min(winRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="shrink-0 border-t border-white/[0.08] px-4 py-3">
        <a
          href="/social/traders"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0fa053] to-[#0d8f47] py-2.5 text-xs font-black text-white uppercase tracking-wider transition-opacity hover:opacity-90"
        >
          <Users className="h-3.5 w-3.5" />
          View All Top Traders
        </a>
        <a
          href="/copy-trading"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-2 text-xs font-semibold text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <Copy className="h-3 w-3" />
          My Copy Settings
        </a>
      </div>

      {/* Trader Profile Modal */}
      {selectedTrader && (
        <TraderProfileModal
          trader={selectedTrader}
          onClose={() => setSelectedTrader(null)}
        />
      )}
    </div>
  );
};
