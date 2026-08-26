import { useEffect, useState } from "react";
import { api } from "@/integrations/api/client";
import { Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, Eye, EyeOff, RefreshCw, Search, Sliders, Users, TrendingUp, Activity } from "lucide-react";
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
  follower: { id: string; display_name: string | null; username: string | null } | null;
  follower_user_id: string;
  id: string;
  master: { id: string; display_name: string | null; username: string | null } | null;
  master_user_id: string;
  maximum_trade_amount: number;
  minimum_trade_amount: number;
  status: string;
  stop_balance: number;
}

interface CopiedTradeLog {
  actual_amount: number;
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

const BORDER = "#1b2333";

const fmt = (v: string | null) =>
  v ? new Date(v).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

const AdminSocialTrading = () => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [stats, setStats] = useState<AdminSocialStats | null>(null);
  const [traders, setTraders] = useState<TraderRow[]>([]);
  const [relationships, setRelationships] = useState<CopyRelationshipRow[]>([]);
  const [copiedTrades, setCopiedTrades] = useState<CopiedTradeLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadAll = async () => {
    setLoading(true);

    const [statsRes, tradersRes, relsRes, logsRes] = await Promise.all([
      api.rpc<AdminSocialStats>("get_admin_social_stats"),
      api.from("profiles").select("id, username, display_name, avatar_url, vip_tier, total_profit, total_trades, total_wins, followers_count, is_copy_trading_enabled, is_visible").gt("total_trades", 0).order("followers_count", { ascending: false }).limit(100),
      api.from("copy_trading_settings").select("*").order("created_at", { ascending: false }).limit(100),
      api.from("copied_trades").select("*").order("created_at", { ascending: false }).limit(100),
    ]);

    if (statsRes.data) setStats(statsRes.data);
    setTraders(((tradersRes.data ?? []) as unknown) as TraderRow[]);

    const rels = (relsRes.data ?? []) as any[];
    const logs = (logsRes.data ?? []) as any[];
    const uids = [...new Set([...rels.flatMap((r: any) => [r.follower_user_id, r.master_user_id]), ...logs.flatMap((l: any) => [l.follower_user_id, l.master_user_id])])];
    const tids = [...new Set(logs.map((l: any) => l.master_trade_id))];

    const [profilesRes, tradesRes] = await Promise.all([
      uids.length > 0 ? api.from("profiles").select("id, username, display_name").in("id", uids) : Promise.resolve({ data: [] }),
      tids.length > 0 ? api.from("trades").select("id, asset_symbol, direction, amount, profit, status").in("id", tids) : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    const tradeMap = new Map((tradesRes.data ?? []).map((t: any) => [t.id, t]));

    setRelationships(
      rels.map((r) => ({
        ...r,
        follower: profileMap.get(r.follower_user_id) ?? null,
        master: profileMap.get(r.master_user_id) ?? null,
      }))
    );

    setCopiedTrades(
      logs.map((l) => ({
        ...l,
        follower: profileMap.get(l.follower_user_id) ?? null,
        master: profileMap.get(l.master_user_id) ?? null,
        master_trade: tradeMap.get(l.master_trade_id) ?? null,
      }))
    );

    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleToggleTraderStatus = async (traderId: string, currentStatus: boolean) => {
    try {
      const { error } = await api
        .from("profiles")
        .update({ is_copy_trading_enabled: !currentStatus })
        .eq("id", traderId);

      if (error) throw new Error(error.message);

      setTraders((current) =>
        current.map((t) => (t.id === traderId ? { ...t, is_copy_trading_enabled: !currentStatus } : t))
      );

      toast({ title: "Master status updated", description: `Copy trading ${!currentStatus ? "enabled" : "disabled"}.` });
    } catch (err) {
      toast({ title: "Update failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    }
  };

  const filteredTraders = traders.filter((t) =>
    getTraderDisplayName(t).toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#131a27] p-6 shadow-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <Sliders className="h-6 w-6 text-[#1689e8]" />
            <h1 className="text-xl font-black text-white uppercase tracking-wider">Copy Trading Management Console</h1>
          </div>
          <p className="mt-1 text-xs font-bold text-gray-400">
            Monitor follower connections, master trader permissions, replicated volume, and automated copy trade execution logs.
          </p>
        </div>

        <button
          onClick={() => void loadAll()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1018] px-4 py-2.5 text-xs font-black text-white hover:border-[#1689e8] transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-[#1689e8]" : ""}`} />
          Refresh Stats
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#131a27] p-4 shadow-xl">
          <span className="text-[10px] font-black uppercase text-gray-400">Active Followers</span>
          <div className="mt-2 text-2xl font-black text-white">{stats?.active_relationships ?? relationships.filter(r => r.status === "active").length}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#131a27] p-4 shadow-xl">
          <span className="text-[10px] font-black uppercase text-gray-400">Copied Volume</span>
          <div className="mt-2 text-2xl font-black text-[#1689e8]">{formatSocialCurrency(stats?.volume ?? 0)}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#131a27] p-4 shadow-xl">
          <span className="text-[10px] font-black uppercase text-gray-400">Trades Copied Today</span>
          <div className="mt-2 text-2xl font-black text-[#00c878]">{stats?.copied_today ?? copiedTrades.length}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#131a27] p-4 shadow-xl">
          <span className="text-[10px] font-black uppercase text-gray-400">Copied Net Profit</span>
          <div className="mt-2 text-2xl font-black text-[#00c878]">{formatSocialCurrency(stats?.profit_loss ?? 0)}</div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#131a27] p-4 shadow-xl">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search traders or followers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0b1018] py-2 pl-9 pr-3 text-xs font-bold text-white placeholder-gray-500 outline-none focus:border-[#1689e8]"
          />
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1018] p-1">
          {[
            { id: "overview", label: "Master Traders" },
            { id: "relationships", label: "Active Links" },
            { id: "monitor", label: "Execution Log" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`rounded-lg px-4 py-1.5 text-xs font-black transition ${
                activeTab === tab.id ? "bg-[#1689e8] text-white shadow-md" : "text-gray-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Tables */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#131a27] shadow-xl">
        {activeTab === "overview" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-[#0b1018]/80 text-[11px] font-black uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 px-4">Master Trader</th>
                  <th className="py-3.5 px-4">Followers</th>
                  <th className="py-3.5 px-4">Total Profit</th>
                  <th className="py-3.5 px-4">Copy Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-semibold">
                {filteredTraders.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1689e8] to-purple-600 font-black text-white">
                          {getTraderDisplayName(t).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-white">{getTraderDisplayName(t)}</div>
                          <div className="text-[10px] text-gray-400">ID: {t.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-black text-[#1689e8]">{t.followers_count ?? 0} followers</td>
                    <td className="py-3.5 px-4 font-black text-[#00c878]">{formatSocialCurrency(t.total_profit ?? 0)}</td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${t.is_copy_trading_enabled !== false ? "bg-[#00c878]/20 text-[#00c878]" : "bg-[#ff4a5a]/20 text-[#ff4a5a]"}`}>
                        {t.is_copy_trading_enabled !== false ? "ENABLED" : "DISABLED"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => void handleToggleTraderStatus(t.id, t.is_copy_trading_enabled !== false)}
                        className={`rounded-lg px-3 py-1 text-xs font-black transition ${t.is_copy_trading_enabled !== false ? "bg-[#ff4a5a]/20 text-[#ff4a5a] hover:bg-[#ff4a5a] hover:text-white" : "bg-[#00c878]/20 text-[#00c878] hover:bg-[#00c878] hover:text-white"}`}
                      >
                        {t.is_copy_trading_enabled !== false ? "Disable Copy" : "Enable Copy"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "relationships" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-[#0b1018]/80 text-[11px] font-black uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 px-4">Follower</th>
                  <th className="py-3.5 px-4">Master Trader</th>
                  <th className="py-3.5 px-4">Allocation Rate</th>
                  <th className="py-3.5 px-4">Max / Trade</th>
                  <th className="py-3.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-semibold">
                {relationships.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-4 font-bold text-white">
                      {r.follower?.display_name || r.follower?.username || r.follower_user_id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1689e8]">
                      {r.master?.display_name || r.master?.username || r.master_user_id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4 font-black text-gray-300">{r.copy_percentage}% multiplier</td>
                    <td className="py-3.5 px-4 font-black text-white">${r.maximum_trade_amount}</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${r.status === "active" ? "bg-[#00c878]/20 text-[#00c878]" : "bg-amber-400/20 text-amber-400"}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "monitor" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-[#0b1018]/80 text-[11px] font-black uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 px-4">Master</th>
                  <th className="py-3.5 px-4">Follower</th>
                  <th className="py-3.5 px-4">Copied Stake</th>
                  <th className="py-3.5 px-4">Execution Status</th>
                  <th className="py-3.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-semibold">
                {copiedTrades.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-4 text-white font-bold">{log.master?.display_name || log.master_user_id.slice(0, 8)}</td>
                    <td className="py-3.5 px-4 text-[#1689e8] font-bold">{log.follower?.display_name || log.follower_user_id.slice(0, 8)}</td>
                    <td className="py-3.5 px-4 font-black text-white">${log.actual_amount}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${log.status === "executed" ? "bg-[#00c878]/20 text-[#00c878]" : "bg-[#ff4a5a]/20 text-[#ff4a5a]"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-gray-400">{fmt(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSocialTrading;
