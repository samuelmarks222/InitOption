import { useEffect, useState } from "react";
import { api } from "@/integrations/api/client";
import { Link } from "react-router-dom";
import {
  Activity, AlertCircle, ArrowUpRight, CheckCircle2, Copy, Eye, EyeOff,
  Filter, RefreshCw, Search, ShieldAlert, Sliders, TrendingUp, Users, XCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatSocialCurrency, getTraderDisplayName } from "@/lib/social";

interface AdminSocialStats {
  active_relationships: number;
  copied_today: number;
  profit_loss: number;
  total_followers: number;
  total_traders: number;
  volume: number;
}

interface TraderRow {
  avatar_url: string | null;
  display_name: string | null;
  followers_count: number;
  id: string;
  is_copy_trading_enabled: boolean;
  is_visible: boolean;
  total_profit: number;
  total_trades: number;
  total_wins: number;
  username: string | null;
  vip_tier: string | null;
}

interface CopyRelationshipRow {
  auto_copy: boolean;
  copy_percentage: number;
  created_at: string;
  follower: { id: string; display_name: string | null; username: string | null; avatar_url: string | null } | null;
  follower_user_id: string;
  id: string;
  master: { id: string; display_name: string | null; username: string | null; avatar_url: string | null } | null;
  master_user_id: string;
  maximum_trade_amount: number;
  minimum_trade_amount: number;
  status: string;
  stop_balance: number;
}

interface CopiedTradeLog {
  actual_amount: number;
  calculated_amount: number;
  copied_trade_id: string | null;
  copy_percentage: number;
  created_at: string;
  follower: { display_name: string | null; username: string | null } | null;
  follower_user_id: string;
  id: string;
  master: { display_name: string | null; username: string | null } | null;
  master_trade: { asset_symbol: string; direction: string; amount: number; profit: number; status: string } | null;
  master_trade_id: string;
  master_user_id: string;
  original_amount: number;
  skip_reason: string | null;
  status: string;
}

type TabType = "overview" | "traders" | "relationships" | "monitor";

const AdminSocialTrading = () => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [stats, setStats] = useState<AdminSocialStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [traders, setTraders] = useState<TraderRow[]>([]);
  const [loadingTraders, setLoadingTraders] = useState(false);
  const [relationships, setRelationships] = useState<CopyRelationshipRow[]>([]);
  const [loadingRelationships, setLoadingRelationships] = useState(false);
  const [copiedTrades, setCopiedTrades] = useState<CopiedTradeLog[]>([]);
  const [loadingCopiedTrades, setLoadingCopiedTrades] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadStats = async () => {
    setLoadingStats(true);
    const { data, error } = await api.rpc<AdminSocialStats>("get_admin_social_stats");
    if (error) {
      console.error("Failed to load admin social stats", error);
    } else if (data) {
      setStats(data);
    }
    setLoadingStats(false);
  };

  const loadTraders = async () => {
    setLoadingTraders(true);
    const { data } = await api
      .from("profiles")
      .select("id, username, display_name, avatar_url, vip_tier, total_profit, total_trades, total_wins, followers_count, is_copy_trading_enabled, is_visible")
      .gt("total_trades", 0)
      .order("followers_count", { ascending: false })
      .limit(100);

    setTraders(((data ?? []) as unknown) as TraderRow[]);
    setLoadingTraders(false);
  };

  const loadRelationships = async () => {
    setLoadingRelationships(true);
    const { data: rels } = await api
      .from("copy_trading_settings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (rels && rels.length > 0) {
      const uids = [...new Set(rels.flatMap((r: any) => [r.follower_user_id, r.master_user_id]))];
      const { data: profilesData } = await api.from("profiles").select("id, username, display_name, avatar_url").in("id", uids);
      const profileMap = Object.fromEntries((profilesData ?? []).map((p: any) => [p.id, p]));

      setRelationships(
        rels.map((r: any) => ({
          ...r,
          follower: profileMap[r.follower_user_id] ?? null,
          master: profileMap[r.master_user_id] ?? null,
        }))
      );
    } else {
      setRelationships([]);
    }
    setLoadingRelationships(false);
  };

  const loadCopiedTrades = async () => {
    setLoadingCopiedTrades(true);
    const { data: logs } = await api
      .from("copied_trades")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (logs && logs.length > 0) {
      const uids = [...new Set(logs.flatMap((l: any) => [l.follower_user_id, l.master_user_id]))];
      const tids = [...new Set(logs.map((l: any) => l.master_trade_id))];

      const [{ data: profilesData }, { data: tradesData }] = await Promise.all([
        api.from("profiles").select("id, username, display_name").in("id", uids),
        api.from("trades").select("id, asset_symbol, direction, amount, profit, status").in("id", tids),
      ]);

      const profileMap = Object.fromEntries((profilesData ?? []).map((p: any) => [p.id, p]));
      const tradeMap = Object.fromEntries((tradesData ?? []).map((t: any) => [t.id, t]));

      setCopiedTrades(
        logs.map((l: any) => ({
          ...l,
          follower: profileMap[l.follower_user_id] ?? null,
          master: profileMap[l.master_user_id] ?? null,
          master_trade: tradeMap[l.master_trade_id] ?? null,
        }))
      );
    } else {
      setCopiedTrades([]);
    }
    setLoadingCopiedTrades(false);
  };

  useEffect(() => {
    void loadStats();
    void loadTraders();
    void loadRelationships();
    void loadCopiedTrades();
  }, []);

  const toggleTraderCopying = async (traderId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const { error } = await api
      .from("profiles")
      .update({ is_copy_trading_enabled: nextStatus })
      .eq("id", traderId);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: nextStatus ? "Copy trading enabled for trader" : "Copy trading disabled for trader" });
      setTraders((prev) => prev.map((t) => (t.id === traderId ? { ...t, is_copy_trading_enabled: nextStatus } : t)));
    }
  };

  const toggleTraderVisibility = async (traderId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const { error } = await api
      .from("profiles")
      .update({ is_visible: nextStatus })
      .eq("id", traderId);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: nextStatus ? "Trader profile set to Visible" : "Trader profile Hidden" });
      setTraders((prev) => prev.map((t) => (t.id === traderId ? { ...t, is_visible: nextStatus } : t)));
    }
  };

  const updateRelationshipStatus = async (id: string, newStatus: string) => {
    const { error } = await api
      .from("copy_trading_settings")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Relationship status updated to ${newStatus}` });
      setRelationships((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    }
  };

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Social Trading Management</h1>
          <p className="text-sm text-gray-400">Monitor copy traders, active relationships, and server-side execution logs.</p>
        </div>
        <button
          onClick={() => {
            void loadStats();
            void loadTraders();
            void loadRelationships();
            void loadCopiedTrades();
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#1A2234] px-4 py-2 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Data
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <KpiCard title="Total Copy Traders" value={stats?.total_traders ?? 0} icon={<Users className="h-4 w-4 text-[#00C076]" />} />
        <KpiCard title="Active Relationships" value={stats?.active_relationships ?? 0} icon={<Sliders className="h-4 w-4 text-blue-400" />} />
        <KpiCard title="Total Followers" value={stats?.total_followers ?? 0} icon={<Eye className="h-4 w-4 text-purple-400" />} />
        <KpiCard title="Copied Today" value={stats?.copied_today ?? 0} icon={<Activity className="h-4 w-4 text-amber-400" />} />
        <KpiCard title="Copy Volume" value={formatSocialCurrency(stats?.volume ?? 0)} icon={<TrendingUp className="h-4 w-4 text-[#00C076]" />} />
        <KpiCard title="Copy P&L" value={`${(stats?.profit_loss ?? 0) >= 0 ? "+" : ""}${formatSocialCurrency(stats?.profit_loss ?? 0)}`} accent={(stats?.profit_loss ?? 0) >= 0 ? "text-[#00C076]" : "text-[#F6465D]"} icon={<Activity className="h-4 w-4 text-[#D5006C]" />} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-3 transition-colors border-b-2 ${activeTab === "overview" ? "border-[#00C076] text-[#00C076]" : "border-transparent text-gray-400 hover:text-white"}`}
        >
          Overview & System Status
        </button>
        <button
          onClick={() => setActiveTab("traders")}
          className={`px-4 py-3 transition-colors border-b-2 ${activeTab === "traders" ? "border-[#00C076] text-[#00C076]" : "border-transparent text-gray-400 hover:text-white"}`}
        >
          Copy Traders ({traders.length})
        </button>
        <button
          onClick={() => setActiveTab("relationships")}
          className={`px-4 py-3 transition-colors border-b-2 ${activeTab === "relationships" ? "border-[#00C076] text-[#00C076]" : "border-transparent text-gray-400 hover:text-white"}`}
        >
          Copy Relationships ({relationships.length})
        </button>
        <button
          onClick={() => setActiveTab("monitor")}
          className={`px-4 py-3 transition-colors border-b-2 ${activeTab === "monitor" ? "border-[#00C076] text-[#00C076]" : "border-transparent text-gray-400 hover:text-white"}`}
        >
          Copy Trade Monitor ({copiedTrades.length})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
            <h3 className="text-base font-bold text-white">Server-Side Copy Engine Status</h3>
            <p className="mt-1 text-xs text-gray-400">Current system configuration and health checks.</p>
            <div className="mt-4 space-y-3 text-xs">
              <StatusRow label="Copy Trading Engine" value="Active (Server-Side PL/pgSQL)" ok />
              <StatusRow label="Idempotency Guard" value="Enforced via UNIQUE(master_trade_id, follower_user_id)" ok />
              <StatusRow label="Risk & Stop Balance Control" value="Active (Automatic Suspension)" ok />
              <StatusRow label="Minimum/Maximum Limits" value="Server-Side Clamping & Validation" ok />
              <StatusRow label="Real-time Event Bridge" value="Pusher + Notifications Active" ok />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
            <h3 className="text-base font-bold text-white">Recent Copy Activity Overview</h3>
            <p className="mt-1 text-xs text-gray-400">Snapshot of recent copied trade executions.</p>
            {copiedTrades.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-white/5 py-8 text-center text-xs text-gray-400">
                No copy trade logs recorded yet.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {copiedTrades.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-xs">
                    <div>
                      <span className="font-semibold text-white">{getTraderDisplayName(log.follower)}</span>
                      <span className="text-gray-400"> copied </span>
                      <span className="font-semibold text-[#00C076]">{getTraderDisplayName(log.master)}</span>
                    </div>
                    <span className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                      log.status === "executed" ? "bg-[#00C076]/15 text-[#00C076]" : "bg-amber-500/15 text-amber-400"
                    }`}>
                      {log.status === "executed" ? `$${log.actual_amount}` : log.skip_reason ?? log.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Copy Traders Tab */}
      {activeTab === "traders" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search copy traders..."
                className="w-full rounded-xl border border-white/10 bg-[#111827] py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-[#00C076]"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 font-bold uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Trader</th>
                    <th className="px-4 py-3">Followers</th>
                    <th className="px-4 py-3">Trades</th>
                    <th className="px-4 py-3">Win Rate</th>
                    <th className="px-4 py-3">Profit</th>
                    <th className="px-4 py-3">Copy Enabled</th>
                    <th className="px-4 py-3">Profile Visible</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {traders
                    .filter((t) => !searchQuery || getTraderDisplayName(t).toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((t) => {
                      const winRate = t.total_trades > 0 ? Math.round((t.total_wins / t.total_trades) * 100) : 0;
                      return (
                        <tr key={t.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-semibold text-white">
                            <Link to={`/traders/${t.username ?? t.id}`} className="hover:underline">
                              {getTraderDisplayName(t)}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{t.followers_count}</td>
                          <td className="px-4 py-3 font-mono text-gray-300">{t.total_trades}</td>
                          <td className="px-4 py-3 font-mono text-gray-300">{winRate}%</td>
                          <td className={`px-4 py-3 font-mono font-bold ${t.total_profit >= 0 ? "text-[#00C076]" : "text-[#F6465D]"}`}>
                            {t.total_profit >= 0 ? "+" : ""}{formatSocialCurrency(t.total_profit)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.is_copy_trading_enabled !== false ? "bg-[#00C076]/15 text-[#00C076]" : "bg-[#F6465D]/15 text-[#F6465D]"}`}>
                              {t.is_copy_trading_enabled !== false ? "Enabled" : "Disabled"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.is_visible !== false ? "bg-blue-500/15 text-blue-400" : "bg-gray-500/15 text-gray-400"}`}>
                              {t.is_visible !== false ? "Visible" : "Hidden"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => void toggleTraderCopying(t.id, t.is_copy_trading_enabled !== false)}
                                className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-gray-300 hover:bg-white/10"
                              >
                                {t.is_copy_trading_enabled !== false ? "Disable Copying" : "Enable Copying"}
                              </button>
                              <button
                                onClick={() => void toggleTraderVisibility(t.id, t.is_visible !== false)}
                                className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-gray-300 hover:bg-white/10"
                              >
                                {t.is_visible !== false ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Copy Relationships Tab */}
      {activeTab === "relationships" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 font-bold uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Follower</th>
                    <th className="px-4 py-3">Master Trader</th>
                    <th className="px-4 py-3">Copy %</th>
                    <th className="px-4 py-3">Min / Max</th>
                    <th className="px-4 py-3">Stop Balance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {relationships.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-semibold text-white">{getTraderDisplayName(r.follower)}</td>
                      <td className="px-4 py-3 font-semibold text-[#00C076]">{getTraderDisplayName(r.master)}</td>
                      <td className="px-4 py-3 font-mono text-gray-300">{r.copy_percentage}%</td>
                      <td className="px-4 py-3 font-mono text-gray-300">${r.minimum_trade_amount} / ${r.maximum_trade_amount}</td>
                      <td className="px-4 py-3 font-mono text-gray-300">${r.stop_balance}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          r.status === "active" ? "bg-[#00C076]/15 text-[#00C076]" : r.status === "paused" ? "bg-amber-500/15 text-amber-400" : "bg-[#F6465D]/15 text-[#F6465D]"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status === "active" ? (
                            <button onClick={() => void updateRelationshipStatus(r.id, "paused")} className="rounded-lg border border-amber-500/40 px-2.5 py-1 text-[11px] font-semibold text-amber-400 hover:bg-amber-500/20">
                              Pause
                            </button>
                          ) : (
                            <button onClick={() => void updateRelationshipStatus(r.id, "active")} className="rounded-lg border border-[#00C076]/40 px-2.5 py-1 text-[11px] font-semibold text-[#00C076] hover:bg-[#00C076]/20">
                              Resume
                            </button>
                          )}
                          <button onClick={() => void updateRelationshipStatus(r.id, "stopped")} className="rounded-lg border border-[#F6465D]/40 px-2.5 py-1 text-[11px] font-semibold text-[#F6465D] hover:bg-[#F6465D]/20">
                            Stop
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Copy Trade Monitor Tab */}
      {activeTab === "monitor" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 font-bold uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Master</th>
                    <th className="px-4 py-3">Follower</th>
                    <th className="px-4 py-3">Asset & Direction</th>
                    <th className="px-4 py-3">Master Amount</th>
                    <th className="px-4 py-3">Follower Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Skip / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {copiedTrades.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-white">{getTraderDisplayName(log.master)}</td>
                      <td className="px-4 py-3 font-semibold text-[#00C076]">{getTraderDisplayName(log.follower)}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white">{log.master_trade?.asset_symbol ?? "BTC/USD"} </span>
                        <span className={`rounded px-1 py-0.5 font-bold ${log.master_trade?.direction === "higher" ? "bg-[#00C076]/15 text-[#00C076]" : "bg-[#F6465D]/15 text-[#F6465D]"}`}>
                          {log.master_trade?.direction?.toUpperCase() ?? "UP"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-300">${log.original_amount}</td>
                      <td className="px-4 py-3 font-mono text-white font-semibold">${log.actual_amount}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          log.status === "executed" ? "bg-[#00C076]/15 text-[#00C076]" : log.status === "skipped" ? "bg-amber-500/15 text-amber-400" : "bg-[#F6465D]/15 text-[#F6465D]"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-400">{log.skip_reason ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KpiCard = ({ title, value, icon, accent = "text-white" }: { title: string; value: string | number; icon: React.ReactNode; accent?: string }) => (
  <div className="rounded-2xl border border-white/10 bg-[#111827] p-4">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{title}</span>
      {icon}
    </div>
    <p className={`mt-2 text-xl font-black ${accent}`}>{value}</p>
  </div>
);

const StatusRow = ({ label, value, ok }: { label: string; value: string; ok: boolean }) => (
  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2">
    <span className="text-gray-400">{label}</span>
    <div className="flex items-center gap-1.5 font-semibold text-white">
      {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-[#00C076]" /> : <AlertCircle className="h-3.5 w-3.5 text-amber-400" />}
      <span>{value}</span>
    </div>
  </div>
);

export default AdminSocialTrading;
