import { useEffect, useMemo, useState } from "react";
import { api } from "@/integrations/api/client";
import { Link } from "react-router-dom";
import {
  ArrowLeft, BarChart3, Copy, Eye, MessageCircle, Search,
  TrendingUp, TrendingDown, Users,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialTrading } from "@/contexts/SocialTradingContext";
import { VipBadge } from "@/components/vip/VipBadge";
import { CopyTraderDialog } from "@/components/social/CopyTraderDialog";
import {
  computeTraderWinRate,
  formatSocialCurrency,
  getTraderDisplayName,
  type TraderSummary,
} from "@/lib/social";

type Period = "today" | "week" | "month" | "all";

interface TraderLeader {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  vip_tier: string | null;
  total_profit: number;
  total_trades: number;
  total_wins: number;
  followers_count: number;
  social_trading_disabled: boolean;
  rank: number;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

const SocialTopTraders = () => {
  const { profile: currentProfile } = useAuth();
  const { followTrader, isFollowing, unfollowTrader, saveCopySetting, getCopySetting } = useSocialTrading();
  const [traders, setTraders] = useState<TraderLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [copyDialogTrader, setCopyDialogTrader] = useState<TraderSummary | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 15;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await api.from("profiles")
        .select("id, username, display_name, avatar_url, vip_tier, total_profit, total_trades, total_wins, followers_count, social_trading_disabled")
        .gt("total_trades", 0)
        .order("total_profit", { ascending: false })
        .limit(200);

      if (error) {
        console.error("Failed to load traders", error);
        setTraders([]);
      } else {
        setTraders(
          ((data ?? []) as TraderLeader[]).map((t, i) => ({ ...t, rank: i + 1 }))
        );
      }
      setLoading(false);
    };
    void load();
  }, [period]);

  const filtered = useMemo(() => {
    if (!search.trim()) return traders;
    const q = search.toLowerCase();
    return traders.filter(
      (t) =>
        (t.username?.toLowerCase() ?? "").includes(q) ||
        (t.display_name?.toLowerCase() ?? "").includes(q)
    );
  }, [search, traders]);

  const paginated = filtered.slice(0, page * perPage);

  return (
    <div className="min-h-screen bg-[#0b1018] px-4 py-8 text-white md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Link to="/trade" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </div>
            <h1 className="mt-4 text-3xl font-black text-white">Top Traders</h1>
            <p className="mt-1 text-sm text-gray-400">Copy the best traders and automatically mirror their trades</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => { setPeriod(p.key); setPage(1); }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                period === p.key
                  ? "bg-[#0fa053] text-white"
                  : "border border-white/10 bg-white/[0.03] text-gray-400 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search traders by username..."
            className="w-full rounded-xl border border-white/10 bg-[#111823] py-3 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[#0fa053]"
          />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111823]">
          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-gray-400">Loading traders...</div>
          ) : paginated.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-gray-400">
              {search ? "No traders match your search." : "No traders found with trades yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-gray-500">
                    <th className="px-5 py-4">#</th>
                    <th className="px-5 py-4">Trader</th>
                    <th className="px-5 py-4">Profit</th>
                    <th className="px-5 py-4">Trades</th>
                    <th className="px-5 py-4">Win Rate</th>
                    <th className="px-5 py-4">Followers</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginated.map((trader, idx) => {
                    const winRate = computeTraderWinRate(trader.total_wins, trader.total_trades);
                    const isSelf = trader.id === currentProfile?.id;
                    const following = isFollowing(trader.id);
                    const copySetting = getCopySetting(trader.id);

                    return (
                      <tr key={trader.id} className={`transition-colors hover:bg-white/[0.03] ${idx % 2 === 1 ? "bg-white/[0.02]" : ""}`}>
                        <td className="px-5 py-4">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                            trader.rank <= 3 ? "bg-[#0fa053]/20 text-[#0fa053]" : "text-gray-400"
                          }`}>
                            {trader.rank <= 3 ? ["🥇", "🥈", "🥉"][trader.rank - 1] : trader.rank}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Link to={`/traders/${trader.username ?? trader.id}`} className="flex items-center gap-3">
                            {trader.avatar_url ? (
                              <img src={trader.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#0fa053] to-purple-600 text-sm font-bold text-white">
                                {getTraderDisplayName(trader).charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">{getTraderDisplayName(trader)}</span>
                                <VipBadge tierId={(trader.vip_tier as any) ?? "standard"} size={16} />
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`font-mono font-bold ${trader.total_profit >= 0 ? "text-[#00C076]" : "text-[#F6465D]"}`}>
                            {trader.total_profit >= 0 ? "+" : ""}{formatSocialCurrency(trader.total_profit)}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-gray-300">{trader.total_trades}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                              <div
                                className={`h-full rounded-full ${winRate >= 50 ? "bg-[#00C076]" : "bg-[#F6465D]"}`}
                                style={{ width: `${Math.min(winRate, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold ${winRate >= 50 ? "text-[#00C076]" : "text-[#F6465D]"}`}>
                              {winRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
                            <Users className="h-3.5 w-3.5" />
                            {trader.followers_count}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {!isSelf && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setCopyDialogTrader(trader)}
                                className="rounded-lg border border-[#0fa053]/40 px-3 py-1.5 text-xs font-semibold text-[#0fa053] transition-colors hover:bg-[#0fa053] hover:text-white"
                                title="Copy Trader"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => void (following ? unfollowTrader(trader.id) : followTrader(trader.id))}
                                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                  following
                                    ? "border-[#00C076]/40 text-[#00C076] hover:bg-[#00C076] hover:text-white"
                                    : "border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                                }`}
                                title={following ? "Watching" : "Watch"}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {paginated.length < filtered.length && (
            <div className="border-t border-white/10 px-6 py-4 text-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl bg-[#0fa053] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0d8f47]"
              >
                Load More ({filtered.length - paginated.length} remaining)
              </button>
            </div>
          )}
        </div>
      </div>

      {copyDialogTrader && (
        <CopyTraderDialog
          existingSetting={copyDialogTrader ? getCopySetting(copyDialogTrader.id) : undefined}
          open={!!copyDialogTrader}
          trader={copyDialogTrader}
          onOpenChange={(open) => { if (!open) setCopyDialogTrader(null); }}
          onSave={(input) => copyDialogTrader ? saveCopySetting(copyDialogTrader.id, input) : Promise.resolve()}
        />
      )}
    </div>
  );
};

export default SocialTopTraders;
