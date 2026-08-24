import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "@/integrations/api/client";
import {
  Activity, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, Filter, RefreshCw, Search, Users, XCircle, DollarSign, Target,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type TradeRow = Tables<"trades">;
type ProfileRow = Pick<Tables<"profiles">, "id" | "username" | "display_name">;

type TradeWithUser = TradeRow & {
  userLabel: string;
};

const BORDER = "#202B3A";
const formatMoney = (value: number) => `$${value.toFixed(2)}`;
const formatSignedMoney = (value: number) => `${value > 0 ? "+" : value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;

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
  const [users, setUsers] = useState<ProfileRow[]>([]);
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
    setUsers(Array.from(profilesById.values()));
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
    return { totalOpen: openTrades.length, totalVolume, totalPayout, uniqueUsers };
  }, [trades]);

  return (
    <div className="space-y-5">
      {/* Header & Refresh */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4" style={{ borderColor: BORDER }}>
        <div>
          <h2 className="text-xl font-black text-white">LIVE TRADING OPERATIONS CONSOLE</h2>
          <p className="text-xs text-[#8D9AAF]">Real-time open positions monitor and trade execution settlement ledger.</p>
        </div>
        <button
          onClick={() => void fetchTrades()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-[#202B3A] bg-[#0D1420] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-[#00C98D]" : ""} /> Refresh Engine
        </button>
      </div>

      {/* Structured Metrics Strip */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
        <div className="grid grid-cols-2 divide-x divide-y divide-[#202B3A] sm:grid-cols-4 sm:divide-y-0">
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Open Trades</p>
            <p className="mt-0.5 text-xl font-black font-mono text-white">{stats.totalOpen}</p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Open Stake Volume</p>
            <p className="mt-0.5 text-xl font-black font-mono text-white">{formatMoney(stats.totalVolume)}</p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Potential Payout</p>
            <p className="mt-0.5 text-xl font-black font-mono text-[#00C98D]">{formatMoney(stats.totalPayout)}</p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Active Traders</p>
            <p className="mt-0.5 text-xl font-black font-mono text-white">{stats.uniqueUsers}</p>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-[#0D1420] p-3" style={{ borderColor: BORDER }}>
        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-md border border-[#202B3A] bg-[#080D16] p-1">
          <button
            onClick={() => setActiveTab("live")}
            className={`rounded px-3 py-1 text-xs font-bold transition-colors ${
              activeTab === "live" ? "bg-[#00C98D] text-black" : "text-[#8D9AAF] hover:text-white"
            }`}
          >
            Live Trades ({stats.totalOpen})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`rounded px-3 py-1 text-xs font-bold transition-colors ${
              activeTab === "history" ? "bg-[#00C98D] text-black" : "text-[#8D9AAF] hover:text-white"
            }`}
          >
            Trade History
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Trade ID, user, asset..."
              className="w-full h-8 rounded-lg border bg-[#080D16] pl-8 pr-2.5 text-xs text-white outline-none placeholder:text-gray-500 focus:border-[#00C98D]"
              style={{ borderColor: BORDER }}
            />
          </div>

          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="h-8 rounded-lg border bg-[#080D16] px-2.5 text-xs text-white outline-none focus:border-[#00C98D]"
            style={{ borderColor: BORDER }}
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name || u.username || u.id.slice(0, 8)}
              </option>
            ))}
          </select>

          {availableAssets.length > 0 && (
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="h-8 rounded-lg border bg-[#080D16] px-2.5 text-xs text-white outline-none focus:border-[#00C98D]"
              style={{ borderColor: BORDER }}
            >
              <option value="all">All Assets</option>
              {availableAssets.map((asset) => (
                <option key={asset} value={asset}>{asset}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Operations Data Table (Dense Table, NO CARDS) */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b bg-[#121B29] text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]" style={{ borderColor: BORDER }}>
                <th className="px-4 py-3">TIME</th>
                <th className="px-4 py-3">TRADE ID</th>
                <th className="px-4 py-3">USER</th>
                <th className="px-4 py-3">ASSET</th>
                <th className="px-4 py-3">DIRECTION</th>
                <th className="px-4 py-3">STAKE</th>
                <th className="px-4 py-3">PAYOUT / P&L</th>
                <th className="px-4 py-3">EXPIRY / TIMER</th>
                <th className="px-4 py-3">RESULT</th>
                <th className="px-4 py-3 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202B3A]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">Loading trade positions...</td>
                </tr>
              ) : filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">No trades matching selected filters.</td>
                </tr>
              ) : (
                filteredTrades.map((t) => {
                  const isWon = t.status === "won";
                  const isLost = t.status === "lost";
                  const profit = Number(t.profit ?? 0);

                  return (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5 font-mono text-[#8D9AAF]">
                        {new Date(t.opened_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-gray-400 font-semibold">#{t.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-2.5 font-semibold text-white truncate max-w-[120px]">{t.userLabel}</td>
                      <td className="px-4 py-2.5 font-bold text-white">{t.asset_symbol}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          t.direction === "higher" || t.direction === "CALL" ? "bg-[#00C98D]/15 text-[#00C98D]" : "bg-[#EF4444]/15 text-[#EF4444]"
                        }`}>
                          {t.direction?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-white">${t.amount}</td>
                      <td className={`px-4 py-2.5 font-mono font-bold ${t.status === "open" ? "text-[#00C98D]" : isWon ? "text-[#00C98D]" : "text-[#EF4444]"}`}>
                        {t.status === "open" ? `$${(t.amount * t.payout_rate).toFixed(2)}` : formatSignedMoney(profit)}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-white">
                        {t.status === "open" ? formatTimeRemaining(t, nowMs) : `${t.expiry_seconds}s`}
                      </td>
                      <td className="px-4 py-2.5 font-bold uppercase">
                        {t.status === "open" ? (
                          <span className="text-[#3B82F6]">—</span>
                        ) : isWon ? (
                          <span className="text-[#00C98D]">WIN</span>
                        ) : (
                          <span className="text-[#EF4444]">LOSS</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          t.status === "open" ? "bg-[#00C98D]/15 text-[#00C98D]" : "bg-[#202B3A] text-gray-400"
                        }`}>
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
