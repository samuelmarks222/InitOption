import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "@/integrations/api/client";
import {
  Activity, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, Filter, RefreshCw, Search, Users, XCircle, DollarSign, Target, CandlestickChart,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type TradeRow = Tables<"trades">;
type ProfileRow = Pick<Tables<"profiles">, "id" | "username" | "display_name">;

type TradeWithUser = TradeRow & {
  userLabel: string;
};

const BORDER = "#1b2333";
const formatMoney = (value: number) => `$${value.toFixed(2)}`;

const formatTimeRemaining = (trade: TradeRow, nowMs: number) => {
  const expiryMs = new Date(trade.opened_at).getTime() + trade.expiry_seconds * 1000;
  const remainingMs = Math.max(0, expiryMs - nowMs);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const getUserLabel = (profilesById: Map<string, ProfileRow>, userId: string) => {
  const profile = profilesById.get(userId);
  return profile?.display_name || profile?.username || `User ${userId.slice(0, 8).toUpperCase()}`;
};

const TradeManagement = () => {
  const [activeTab, setActiveTab] = useState<"live" | "history">("live");
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState<string>("");
  const [assetFilter, setAssetFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<TradeWithUser[]>([]);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    const [openRes, histRes] = await Promise.all([
      api.from("trades").select("*").eq("status", "open").order("opened_at", { ascending: false }).limit(500),
      api.from("trades").select("*").neq("status", "open").order("closed_at", { ascending: false }).limit(500),
    ]);

    const tradeRows = [...(openRes.data ?? []), ...(histRes.data ?? [])];
    const userIds = Array.from(new Set(tradeRows.map((t) => t.user_id)));

    let profilesById = new Map<string, ProfileRow>();
    if (userIds.length > 0) {
      const { data: profiles } = await api.from("profiles").select("id, username, display_name").in("id", userIds);
      profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));
    }

    setTrades(tradeRows.map((t) => ({ ...t, userLabel: getUserLabel(profilesById, t.user_id) })));
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchTrades();
    const interval = window.setInterval(() => void fetchTrades(), 8000);
    return () => window.clearInterval(interval);
  }, [fetchTrades]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const availableAssets = useMemo(() => {
    const set = new Set<string>();
    trades.forEach((t) => set.add(t.asset_symbol));
    return Array.from(set);
  }, [trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (activeTab === "live" && t.status !== "open") return false;
      if (activeTab === "history" && t.status === "open") return false;
      if (userFilter && t.user_id !== userFilter) return false;
      if (assetFilter !== "all" && t.asset_symbol !== assetFilter) return false;
      if (normalizedSearch) {
        return [t.userLabel, t.asset_symbol, t.id].some((v) => v.toLowerCase().includes(normalizedSearch));
      }
      return true;
    });
  }, [activeTab, assetFilter, normalizedSearch, trades, userFilter]);

  const stats = useMemo(() => {
    const openTrades = trades.filter((t) => t.status === "open");
    const totalVolume = openTrades.reduce((sum, t) => sum + t.amount, 0);
    const totalPayout = openTrades.reduce((sum, t) => sum + t.amount * t.payout_rate, 0);
    const uniqueUsers = new Set(openTrades.map((t) => t.user_id)).size;

    return {
      openCount: openTrades.length,
      totalVolume,
      totalPayout,
      uniqueUsers,
    };
  }, [trades]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#131a27] p-6 shadow-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <CandlestickChart className="h-6 w-6 text-[#1689e8]" />
            <h1 className="text-xl font-black text-white uppercase tracking-wider">Live Trading Supervision Console</h1>
          </div>
          <p className="mt-1 text-xs font-bold text-gray-400">
            Realtime monitoring of open positions, risk exposure, settlement timers, and trade history logs.
          </p>
        </div>

        <button
          onClick={() => void fetchTrades()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1018] px-4 py-2.5 text-xs font-black text-white hover:border-[#1689e8] transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-[#1689e8]" : ""}`} />
          Refresh Trades
        </button>
      </div>

      {/* Exposure Metrics KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#131a27] p-4 shadow-xl">
          <span className="text-[10px] font-black uppercase text-gray-400">Active Open Positions</span>
          <div className="mt-2 text-2xl font-black text-white">{stats.openCount}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#131a27] p-4 shadow-xl">
          <span className="text-[10px] font-black uppercase text-gray-400">Total Live Exposure</span>
          <div className="mt-2 text-2xl font-black text-[#1689e8]">{formatMoney(stats.totalVolume)}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#131a27] p-4 shadow-xl">
          <span className="text-[10px] font-black uppercase text-gray-400">Max Potential Payout</span>
          <div className="mt-2 text-2xl font-black text-amber-400">{formatMoney(stats.totalPayout)}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#131a27] p-4 shadow-xl">
          <span className="text-[10px] font-black uppercase text-gray-400">Active Traders On-Chart</span>
          <div className="mt-2 text-2xl font-black text-[#00c878]">{stats.uniqueUsers}</div>
        </div>
      </div>

      {/* Filters & Tab Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#131a27] p-4 shadow-xl">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by asset symbol, trader name, trade ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0b1018] py-2.5 pl-10 pr-4 text-xs font-bold text-white placeholder-gray-500 outline-none focus:border-[#1689e8]"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#0b1018] px-3.5 py-2 text-xs font-bold text-white outline-none focus:border-[#1689e8]"
          >
            <option value="all">All Asset Pairs</option>
            {availableAssets.map((asset) => (
              <option key={asset} value={asset}>{asset}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0b1018] p-1">
            <button
              onClick={() => setActiveTab("live")}
              className={`rounded-lg px-4 py-1.5 text-xs font-black transition ${
                activeTab === "live" ? "bg-[#1689e8] text-white shadow-md" : "text-gray-400 hover:text-white"
              }`}
            >
              Live ({trades.filter((t) => t.status === "open").length})
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`rounded-lg px-4 py-1.5 text-xs font-black transition ${
                activeTab === "history" ? "bg-[#1689e8] text-white shadow-md" : "text-gray-400 hover:text-white"
              }`}
            >
              Settled History
            </button>
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#131a27] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-[#0b1018]/80 text-[11px] font-black uppercase tracking-wider text-gray-400">
                <th className="py-3.5 px-4">Trade ID</th>
                <th className="py-3.5 px-4">Asset</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Direction</th>
                <th className="py-3.5 px-4">Entry Price</th>
                <th className="py-3.5 px-4">Stake</th>
                <th className="py-3.5 px-4">{activeTab === "live" ? "Time Left" : "Profit Payout"}</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-semibold">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">No trades matching current filter criteria.</td>
                </tr>
              ) : (
                filteredTrades.map((t) => {
                  const isCall = t.direction.toUpperCase() === "CALL" || t.direction.toUpperCase() === "HIGHER";
                  const isWon = Number(t.profit ?? 0) > 0;
                  return (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4 font-mono text-gray-400">{t.id.slice(0, 8)}...</td>
                      <td className="py-3.5 px-4 font-extrabold text-white">{t.asset_symbol}</td>
                      <td className="py-3.5 px-4 text-gray-300">{t.userLabel}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 font-black text-[10px] uppercase ${isCall ? "bg-[#00c878]/20 text-[#00c878]" : "bg-[#ff4a5a]/20 text-[#ff4a5a]"}`}>
                          {isCall ? "↑ CALL" : "↓ PUT"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-300">{Number(t.entry_price).toFixed(5)}</td>
                      <td className="py-3.5 px-4 font-black text-white">{formatMoney(Number(t.amount))}</td>
                      <td className="py-3.5 px-4">
                        {t.status === "open" ? (
                          <span className="font-mono font-extrabold text-[#1689e8]">{formatTimeRemaining(t, nowMs)}</span>
                        ) : (
                          <span className={`font-black ${isWon ? "text-[#00c878]" : "text-[#ff4a5a]"}`}>
                            {formatMoney(Number(t.profit ?? 0))}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${t.status === "open" ? "bg-[#1689e8]/20 text-[#1689e8]" : isWon ? "bg-[#00c878]/20 text-[#00c878]" : "bg-[#ff4a5a]/20 text-[#ff4a5a]"}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TradeManagement;
