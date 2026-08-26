import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/integrations/api/client";
import {
  ArrowLeft,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  Filter,
  History,
  Layers,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  StopCircle,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialTrading } from "@/contexts/SocialTradingContext";
import { VipBadge } from "@/components/vip/VipBadge";
import { CopyTraderDialog } from "@/components/social/CopyTraderDialog";
import {
  computeTraderWinRate,
  formatCopySettingSummary,
  formatSocialCurrency,
  getTraderDisplayName,
  type TraderSummary,
} from "@/lib/social";

type TabType = "explore" | "active" | "history";
type PeriodFilter = "all" | "month" | "week" | "today";

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

interface CopiedHistoryItem {
  id: string;
  actual_amount: number;
  calculated_amount: number;
  copied_trade_id: string | null;
  copy_percentage: number;
  created_at: string;
  master: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
  master_trade: { asset_symbol: string; direction: string; amount: number; profit: number; status: string } | null;
  master_trade_id: string;
  master_user_id: string;
  original_amount: number;
  skip_reason: string | null;
  status: string;
}

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  all: "All Time",
  month: "30 Days",
  week: "7 Days",
  today: "Today",
};

export const SocialTopTraders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabType) || "explore";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  const { profile: currentProfile } = useAuth();
  const {
    copySettings,
    followTrader,
    getCopySetting,
    isFollowing,
    refreshSocial,
    saveCopySetting,
    stopCopying,
    unfollowTrader,
  } = useSocialTrading();

  const [traders, setTraders] = useState<TraderLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [copyDialogTrader, setCopyDialogTrader] = useState<TraderSummary | null>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<CopiedHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "won" | "lost" | "skipped">("all");

  // Keep search params in sync
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Load top traders
  useEffect(() => {
    let cancelled = false;
    const loadTraders = async () => {
      setLoading(true);
      try {
        const { data, error } = await api
          .from("profiles")
          .select("id, username, display_name, avatar_url, vip_tier, total_profit, total_trades, total_wins, followers_count, social_trading_disabled")
          .gt("total_trades", 0)
          .order("total_profit", { ascending: false })
          .limit(100);

        if (cancelled) return;

        if (error) {
          console.error("Failed to load top traders:", error);
          setTraders([]);
        } else {
          setTraders(((data ?? []) as TraderLeader[]).map((t, i) => ({ ...t, rank: i + 1 })));
        }
      } catch (err) {
        console.error("Error loading traders:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadTraders();
    return () => {
      cancelled = true;
    };
  }, [period]);

  // Load copy execution logs for history tab
  useEffect(() => {
    if (!currentProfile?.id || activeTab !== "history") return;
    let cancelled = false;

    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const { data: logs } = await api
          .from("copied_trades")
          .select("*")
          .eq("follower_user_id", currentProfile.id)
          .order("created_at", { ascending: false })
          .limit(80);

        if (cancelled) return;

        if (logs && logs.length > 0) {
          const masterIds = [...new Set(logs.map((l: any) => l.master_user_id))];
          const tradeIds = [...new Set(logs.map((l: any) => l.master_trade_id))];

          const [{ data: masters }, { data: trades }] = await Promise.all([
            api.from("profiles").select("id, username, display_name, avatar_url").in("id", masterIds),
            api.from("trades").select("id, asset_symbol, direction, amount, profit, status").in("id", tradeIds),
          ]);

          if (cancelled) return;

          const masterMap = Object.fromEntries((masters ?? []).map((m: any) => [m.id, m]));
          const tradeMap = Object.fromEntries((trades ?? []).map((t: any) => [t.id, t]));

          setHistoryItems(
            logs.map((l: any) => ({
              ...l,
              master: masterMap[l.master_user_id] ?? null,
              master_trade: tradeMap[l.master_trade_id] ?? null,
            }))
          );
        } else {
          setHistoryItems([]);
        }
      } catch (err) {
        console.error("Failed to load copy history:", err);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [activeTab, currentProfile?.id]);

  // Filtered traders list
  const filteredTraders = useMemo(() => {
    if (!search.trim()) return traders;
    const q = search.toLowerCase();
    return traders.filter(
      (t) =>
        (t.username?.toLowerCase() ?? "").includes(q) ||
        (t.display_name?.toLowerCase() ?? "").includes(q)
    );
  }, [search, traders]);

  // Filtered copy history
  const filteredHistory = useMemo(() => {
    return historyItems.filter((item) => {
      if (historyFilter === "won" && item.master_trade?.status !== "won") return false;
      if (historyFilter === "lost" && item.master_trade?.status !== "lost") return false;
      if (historyFilter === "skipped" && item.status !== "skipped") return false;
      return true;
    });
  }, [historyFilter, historyItems]);

  // Overall metrics summary
  const summaryMetrics = useMemo(() => {
    let activeCopiesCount = 0;
    let totalCopiedVolume = 0;
    let totalNetProfit = 0;

    for (const s of copySettings) {
      if (s.enabled) activeCopiesCount++;
    }

    for (const item of historyItems) {
      if (item.status === "executed" && item.actual_amount) {
        totalCopiedVolume += Number(item.actual_amount);
        if (item.master_trade) {
          const profit = Number(item.master_trade.profit ?? 0);
          const net = item.master_trade.status === "won" ? profit - item.actual_amount : -item.actual_amount;
          totalNetProfit += net;
        }
      }
    }

    return {
      activeCopiesCount,
      totalCopiedVolume,
      totalNetProfit,
    };
  }, [copySettings, historyItems]);

  return (
    <div className="min-h-screen bg-[#0b1018] text-white">
      {/* ── Top Header Bar ── */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#0d131f]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 md:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/trade"
              className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-gray-300 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Trading</span>
            </Link>
            <div className="h-5 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#1689e8]" />
              <h1 className="text-lg font-black tracking-tight text-white md:text-xl">Copy Trading</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void refreshSocial()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-gray-400 transition hover:bg-white/10 hover:text-white"
            title="Refresh Social Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 space-y-6">
        {/* ── Metric Summary Cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
          <div className="rounded-xl border border-white/10 bg-[#131a27] p-4 shadow-lg">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400">
              <span>Active Copying</span>
              <Users className="h-4 w-4 text-[#1689e8]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white md:text-3xl">{summaryMetrics.activeCopiesCount}</span>
              <span className="text-xs text-gray-400">traders</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#131a27] p-4 shadow-lg">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400">
              <span>Copied Volume</span>
              <Layers className="h-4 w-4 text-[#f5a13d]" />
            </div>
            <div className="mt-2 text-2xl font-black text-white md:text-3xl">
              {formatSocialCurrency(summaryMetrics.totalCopiedVolume)}
            </div>
          </div>

          <div className="col-span-2 rounded-xl border border-white/10 bg-[#131a27] p-4 shadow-lg sm:col-span-1">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400">
              <span>Copy Profit</span>
              <TrendingUp className="h-4 w-4 text-[#00c878]" />
            </div>
            <div
              className={`mt-2 text-2xl font-black md:text-3xl ${
                summaryMetrics.totalNetProfit >= 0 ? "text-[#00c878]" : "text-[#ff4a5a]"
              }`}
            >
              {summaryMetrics.totalNetProfit >= 0 ? "+" : ""}
              {formatSocialCurrency(summaryMetrics.totalNetProfit)}
            </div>
          </div>
        </div>

        {/* ── Main Navigation Tabs ── */}
        <div className="flex border-b border-white/10">
          <button
            type="button"
            onClick={() => handleTabChange("explore")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all ${
              activeTab === "explore"
                ? "border-[#1689e8] text-[#1689e8]"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Discover Top Traders</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("active")}
            className={`relative flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all ${
              activeTab === "active"
                ? "border-[#1689e8] text-[#1689e8]"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>My Active Copies</span>
            {copySettings.length > 0 && (
              <span className="ml-1.5 rounded-full bg-[#1689e8]/20 px-2 py-0.5 text-xs font-black text-[#1689e8]">
                {copySettings.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("history")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all ${
              activeTab === "history"
                ? "border-[#1689e8] text-[#1689e8]"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <History className="h-4 w-4" />
            <span>Copy History</span>
          </button>
        </div>

        {/* ── TAB 1: DISCOVER TOP TRADERS ── */}
        {activeTab === "explore" && (
          <div className="space-y-4">
            {/* Search & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search traders by username..."
                  className="w-full rounded-xl border border-white/10 bg-[#131a27] py-2.5 pl-9 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-[#1689e8]"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      period === p
                        ? "bg-[#1689e8] text-white"
                        : "border border-white/10 bg-white/[0.03] text-gray-400 hover:text-white"
                    }`}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Traders Table / Cards */}
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#131a27] shadow-xl">
              {loading ? (
                <div className="p-12 text-center text-sm font-semibold text-gray-400">Loading top master traders...</div>
              ) : filteredTraders.length === 0 ? (
                <div className="p-12 text-center text-sm font-semibold text-gray-400">
                  {search ? "No traders match your search query." : "No ranked traders available yet."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-[#0d131f]/60 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <th className="px-4 py-3.5">Rank</th>
                        <th className="px-4 py-3.5">Master Trader</th>
                        <th className="px-4 py-3.5">Total Profit</th>
                        <th className="px-4 py-3.5">Win Rate</th>
                        <th className="px-4 py-3.5">Trades</th>
                        <th className="px-4 py-3.5">Followers</th>
                        <th className="px-4 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredTraders.map((trader) => {
                        const winRate = computeTraderWinRate(trader.total_wins, trader.total_trades);
                        const isSelf = trader.id === currentProfile?.id;
                        const following = isFollowing(trader.id);
                        const copySetting = getCopySetting(trader.id);

                        return (
                          <tr key={trader.id} className="transition hover:bg-white/[0.02]">
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${
                                  trader.rank === 1
                                    ? "bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30"
                                    : trader.rank === 2
                                      ? "bg-slate-300/20 text-slate-200 ring-1 ring-slate-300/30"
                                      : trader.rank === 3
                                        ? "bg-amber-700/20 text-amber-500 ring-1 ring-amber-700/30"
                                        : "text-gray-400"
                                }`}
                              >
                                {trader.rank <= 3 ? ["🥇", "🥈", "🥉"][trader.rank - 1] : `#${trader.rank}`}
                              </span>
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  {trader.avatar_url ? (
                                    <img
                                      src={trader.avatar_url}
                                      alt=""
                                      className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10"
                                    />
                                  ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#1689e8] to-purple-600 text-sm font-black text-white">
                                      {getTraderDisplayName(trader).charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white truncate max-w-[140px]">
                                      {getTraderDisplayName(trader)}
                                    </span>
                                    <VipBadge tierId={(trader.vip_tier as any) ?? "standard"} size={16} />
                                  </div>
                                  <span className="text-xs font-semibold text-gray-400">Verified Master</span>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              <span
                                className={`font-mono font-black text-sm ${
                                  trader.total_profit >= 0 ? "text-[#00c878]" : "text-[#ff4a5a]"
                                }`}
                              >
                                {trader.total_profit >= 0 ? "+" : ""}
                                {formatSocialCurrency(trader.total_profit)}
                              </span>
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className={`h-full rounded-full ${winRate >= 50 ? "bg-[#00c878]" : "bg-[#ff4a5a]"}`}
                                    style={{ width: `${Math.min(winRate, 100)}%` }}
                                  />
                                </div>
                                <span className={`font-mono text-xs font-bold ${winRate >= 50 ? "text-[#00c878]" : "text-[#ff4a5a]"}`}>
                                  {winRate}%
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 font-mono text-xs font-semibold text-gray-300">
                              {trader.total_trades}
                            </td>

                            <td className="px-4 py-3.5 text-xs text-gray-400">
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-3.5 w-3.5 text-gray-500" />
                                {trader.followers_count}
                              </span>
                            </td>

                            <td className="px-4 py-3.5 text-right">
                              {!isSelf && (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setCopyDialogTrader(trader)}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                      copySetting?.enabled
                                        ? "border border-[#00c878]/40 bg-[#00c878]/15 text-[#00c878] hover:bg-[#00c878] hover:text-black"
                                        : "bg-[#1689e8] text-white hover:bg-[#1272c4]"
                                    }`}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                    {copySetting?.enabled ? "Copying" : "Copy Trade"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void (following ? unfollowTrader(trader.id) : followTrader(trader.id))}
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                                      following
                                        ? "border-[#1689e8]/40 bg-[#1689e8]/10 text-[#1689e8]"
                                        : "border-white/10 bg-white/[0.03] text-gray-400 hover:text-white"
                                    }`}
                                    title={following ? "Watching" : "Watch"}
                                  >
                                    <Eye className="h-4 w-4" />
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
            </div>
          </div>
        )}

        {/* ── TAB 2: MY ACTIVE COPIES ── */}
        {activeTab === "active" && (
          <div className="space-y-4">
            {copySettings.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-[#131a27] p-12 text-center">
                <Copy className="mx-auto h-12 w-12 text-gray-500 opacity-40" />
                <h3 className="mt-3 text-lg font-bold text-white">No active copy trades</h3>
                <p className="mt-1 text-sm text-gray-400 max-w-md mx-auto">
                  Browse top master traders and start mirroring their winning trades automatically with custom risk limits.
                </p>
                <button
                  type="button"
                  onClick={() => handleTabChange("explore")}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1689e8] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1272c4]"
                >
                  <Sparkles className="h-4 w-4" />
                  Explore Top Traders
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {copySettings.map((setting) => {
                  const trader = setting.target;
                  return (
                    <div
                      key={setting.id}
                      className="rounded-xl border border-white/10 bg-[#131a27] p-5 shadow-lg space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {trader?.avatar_url ? (
                            <img src={trader.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#1689e8] to-purple-600 text-sm font-black text-white">
                              {getTraderDisplayName(trader).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{getTraderDisplayName(trader)}</span>
                              <VipBadge tierId={(trader?.vip_tier as any) ?? "standard"} size={16} />
                            </div>
                            <span className="text-xs text-gray-400">
                              Win Rate: {trader ? computeTraderWinRate(trader.total_wins, trader.total_trades) : 0}%
                            </span>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                            setting.enabled
                              ? "bg-[#00c878]/15 text-[#00c878] border border-[#00c878]/30"
                              : "bg-gray-500/15 text-gray-400 border border-gray-500/30"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${setting.enabled ? "bg-[#00c878] animate-pulse" : "bg-gray-500"}`}
                          />
                          {setting.enabled ? "Active" : "Paused"}
                        </span>
                      </div>

                      <div className="rounded-lg border border-white/5 bg-black/20 p-3 text-xs space-y-1.5">
                        <div className="flex justify-between text-gray-400">
                          <span>Copy Setup:</span>
                          <span className="font-semibold text-white">{formatCopySettingSummary(setting)}</span>
                        </div>
                        {setting.max_daily && (
                          <div className="flex justify-between text-gray-400">
                            <span>Max Daily Limit:</span>
                            <span className="font-semibold text-white">${setting.max_daily}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            if (trader) setCopyDialogTrader(trader);
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-gray-300 transition hover:bg-white/10 hover:text-white"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          Edit Setup
                        </button>

                        <button
                          type="button"
                          onClick={() => void stopCopying(setting.target_user_id)}
                          className="flex items-center gap-1.5 rounded-lg border border-[#ff4a5a]/30 bg-[#ff4a5a]/10 px-3 py-1.5 text-xs font-bold text-[#ff4a5a] transition hover:bg-[#ff4a5a] hover:text-white"
                        >
                          <StopCircle className="h-3.5 w-3.5" />
                          Stop Copying
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: COPY HISTORY LOG ── */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-400">Copied Executions</h3>

              <div className="flex items-center gap-1">
                {(["all", "won", "lost", "skipped"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setHistoryFilter(filter)}
                    className={`rounded-lg px-3 py-1 text-xs font-bold capitalize transition ${
                      historyFilter === filter
                        ? "bg-[#1689e8] text-white"
                        : "border border-white/10 bg-white/[0.03] text-gray-400 hover:text-white"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#131a27] shadow-xl">
              {loadingHistory ? (
                <div className="p-12 text-center text-sm font-semibold text-gray-400">Loading copy trade history...</div>
              ) : filteredHistory.length === 0 ? (
                <div className="p-12 text-center text-sm font-semibold text-gray-400">No copy trade executions recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-[#0d131f]/60 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <th className="px-4 py-3.5">Master Trader</th>
                        <th className="px-4 py-3.5">Asset</th>
                        <th className="px-4 py-3.5">Type</th>
                        <th className="px-4 py-3.5">Copied Amount</th>
                        <th className="px-4 py-3.5">Result</th>
                        <th className="px-4 py-3.5 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredHistory.map((item) => {
                        const status = item.master_trade?.status ?? item.status;
                        const isWin = status === "won";
                        const isLoss = status === "lost";

                        return (
                          <tr key={item.id} className="transition hover:bg-white/[0.02]">
                            <td className="px-4 py-3.5">
                              <span className="font-bold text-white">
                                {getTraderDisplayName(item.master)}
                              </span>
                            </td>

                            <td className="px-4 py-3.5 font-mono text-xs font-semibold text-gray-300">
                              {item.master_trade?.asset_symbol ?? "Market Trade"}
                            </td>

                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1 font-mono text-xs font-bold ${
                                  item.master_trade?.direction === "CALL" ? "text-[#00c878]" : "text-[#ff4a5a]"
                                }`}
                              >
                                {item.master_trade?.direction === "CALL" ? "CALL ⬆" : "PUT ⬇"}
                              </span>
                            </td>

                            <td className="px-4 py-3.5 font-mono text-xs font-semibold text-white">
                              {formatSocialCurrency(item.actual_amount)}
                            </td>

                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                                  isWin
                                    ? "bg-[#00c878]/15 text-[#00c878]"
                                    : isLoss
                                      ? "bg-[#ff4a5a]/15 text-[#ff4a5a]"
                                      : "bg-gray-500/15 text-gray-400"
                                }`}
                              >
                                {status}
                              </span>
                            </td>

                            <td className="px-4 py-3.5 text-right font-mono text-xs text-gray-400">
                              {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Copy Trader Config Dialog */}
      {copyDialogTrader && (
        <CopyTraderDialog
          existingSetting={getCopySetting(copyDialogTrader.id)}
          open={!!copyDialogTrader}
          trader={copyDialogTrader}
          onOpenChange={(open) => {
            if (!open) setCopyDialogTrader(null);
          }}
          onSave={(input) => saveCopySetting(copyDialogTrader.id, input)}
        />
      )}
    </div>
  );
};

export default SocialTopTraders;
