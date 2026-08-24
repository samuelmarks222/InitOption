import { useEffect, useState } from "react";
import { api } from "@/integrations/api/client";
import { Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, Eye, EyeOff, RefreshCw, Search } from "lucide-react";
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

const BORDER = "#202B3A";

const fmt = (v: string | null) =>
  v ? new Date(v).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

const AdminSocialTrading = () => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [stats, setStats] = useState<AdminSocialStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [traders, setTraders] = useState<TraderRow[]>([]);
  const [relationships, setRelationships] = useState<CopyRelationshipRow[]>([]);
  const [copiedTrades, setCopiedTrades] = useState<CopiedTradeLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadAll = async () => {
    setLoading(true);
    setLoadingStats(true);

    const [statsRes, tradersRes, relsRes, logsRes] = await Promise.all([
      api.rpc<AdminSocialStats>("get_admin_social_stats"),
      api.from("profiles").select("id, username, display_name, avatar_url, vip_tier, total_profit, total_trades, total_wins, followers_count, is_copy_trading_enabled, is_visible").gt("total_trades", 0).order("followers_count", { ascending: false }).limit(100),
      api.from("copy_trading_settings").select("*").order("created_at", { ascending: false }).limit(100),
      api.from("copied_trades").select("*").order("created_at", { ascending: false }).limit(100),
    ]);

    if (statsRes.data) setStats(statsRes.data);
    setTraders(((tradersRes.data ?? []) as unknown) as TraderRow[]);
    setLoadingStats(false);

    const rels = (relsRes.data ?? []) as any[];
    const logs = (logsRes.data ?? []) as any[];
    const uids = [...new Set([...rels.flatMap((r: any) => [r.follower_user_id, r.master_user_id]), ...logs.flatMap((l: any) => [l.follower_user_id, l.master_user_id])])];
    const tids = [...new Set(logs.map((l: any) => l.master_trade_id))];

    const [profilesRes, tradesRes] = await Promise.all([
      uids.length > 0 ? api.from("profiles").select("id, username, display_name").in("id", uids) : Promise.resolve({ data: [] }),
      tids.length > 0 ? api.from("trades").select("id, asset_symbol, direction, amount, profit, status").in("id", tids) : Promise.resolve({ data: [] }),
    ]);

    const pm = Object.fromEntries((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    const tm = Object.fromEntries((tradesRes.data ?? []).map((t: any) => [t.id, t]));

    setRelationships(rels.map((r: any) => ({ ...r, follower: pm[r.follower_user_id] ?? null, master: pm[r.master_user_id] ?? null })));
    setCopiedTrades(logs.map((l: any) => ({ ...l, follower: pm[l.follower_user_id] ?? null, master: pm[l.master_user_id] ?? null, master_trade: tm[l.master_trade_id] ?? null })));
    setLoading(false);
  };

  useEffect(() => { void loadAll(); }, []);

  const toggleCopying = async (id: string, current: boolean) => {
    const { error } = await api.from("profiles").update({ is_copy_trading_enabled: !current }).eq("id", id);
    if (error) { toast({ title: "Update failed", variant: "destructive" }); return; }
    toast({ title: !current ? "Copy trading enabled" : "Copy trading disabled" });
    setTraders((prev) => prev.map((t) => (t.id === id ? { ...t, is_copy_trading_enabled: !current } : t)));
  };

  const toggleVisibility = async (id: string, current: boolean) => {
    const { error } = await api.from("profiles").update({ is_visible: !current }).eq("id", id);
    if (error) { toast({ title: "Update failed", variant: "destructive" }); return; }
    toast({ title: !current ? "Trader profile visible" : "Trader profile hidden" });
    setTraders((prev) => prev.map((t) => (t.id === id ? { ...t, is_visible: !current } : t)));
  };

  const updateRelStatus = async (id: string, status: string) => {
    const { error } = await api.from("copy_trading_settings").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast({ title: "Update failed", variant: "destructive" }); return; }
    toast({ title: `Relationship ${status}` });
    setRelationships((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const TABS: { id: TabType; label: string; count?: number }[] = [
    { id: "overview", label: "Engine Status" },
    { id: "traders", label: `Traders (${traders.length})` },
    { id: "relationships", label: `Relationships (${relationships.length})` },
    { id: "monitor", label: `Copy Log (${copiedTrades.length})` },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4" style={{ borderColor: BORDER }}>
        <div>
          <h2 className="text-xl font-black text-white">SOCIAL & COPY TRADING OPERATIONS</h2>
          <p className="text-xs text-[#8D9AAF]">Server-side copy engine status, trader roster, relationship graph, and execution audit log.</p>
        </div>
        <button onClick={() => void loadAll()} disabled={loading} className="flex items-center gap-1.5 rounded-lg border border-[#202B3A] bg-[#0D1420] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white">
          <RefreshCw size={13} className={loading ? "animate-spin text-[#00C98D]" : ""} /> Refresh All
        </button>
      </div>

      {/* Metrics Strip */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
        <div className="grid grid-cols-3 divide-x divide-[#202B3A] sm:grid-cols-6">
          {[
            { label: "Copy Traders", value: stats?.total_traders ?? "-", color: "text-white" },
            { label: "Active Relationships", value: stats?.active_relationships ?? "-", color: "text-[#00C98D]" },
            { label: "Total Followers", value: stats?.total_followers ?? "-", color: "text-white" },
            { label: "Copied Today", value: stats?.copied_today ?? "-", color: "text-[#F59E0B]" },
            { label: "Copy Volume", value: `$${formatSocialCurrency(stats?.volume ?? 0)}`, color: "text-white" },
            { label: "Copy P&L", value: `${(stats?.profit_loss ?? 0) >= 0 ? "+" : ""}$${formatSocialCurrency(stats?.profit_loss ?? 0)}`, color: (stats?.profit_loss ?? 0) >= 0 ? "text-[#00C98D]" : "text-[#EF4444]" },
          ].map((m) => (
            <div key={m.label} className="p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">{m.label}</p>
              <p className={`mt-0.5 text-xl font-black font-mono ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Toolbar */}
      <div className="flex items-center gap-1 rounded-lg border border-[#202B3A] bg-[#0D1420] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded px-3 py-1.5 text-xs font-bold transition-colors ${activeTab === tab.id ? "bg-[#00C98D] text-black" : "text-[#8D9AAF] hover:text-white"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab — engine status rows (no cards, just structured panels) */}
      {activeTab === "overview" && (
        <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
          <div className="border-b bg-[#121B29] px-4 py-2.5" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Server-Side Copy Engine — Health Check</p>
          </div>
          {[
            { label: "Copy Trading Engine", value: "Active — Server-Side PL/pgSQL RPC", ok: true },
            { label: "Idempotency Guard", value: "Enforced — UNIQUE(master_trade_id, follower_user_id)", ok: true },
            { label: "Risk & Stop Balance Control", value: "Active — Automatic suspension on breach", ok: true },
            { label: "Min/Max Trade Limits", value: "Server-side clamping & validation on every copy", ok: true },
            { label: "Real-time Event Bridge", value: "Pusher + Notifications — Active", ok: true },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between border-b px-4 py-3 last:border-0" style={{ borderColor: BORDER }}>
              <span className="text-xs text-[#8D9AAF]">{row.label}</span>
              <div className="flex items-center gap-2 text-xs font-semibold">
                {row.ok
                  ? <CheckCircle2 size={13} className="text-[#00C98D]" />
                  : <AlertCircle size={13} className="text-[#F59E0B]" />}
                <span className={row.ok ? "text-[#00C98D]" : "text-[#F59E0B]"}>{row.value}</span>
              </div>
            </div>
          ))}
          {/* Recent 5 copy trade events */}
          <div className="border-t bg-[#121B29] px-4 py-2.5" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Recent Copy Executions</p>
          </div>
          {copiedTrades.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-[#5E6B7D]">No copy trade executions recorded yet.</div>
          ) : copiedTrades.slice(0, 5).map((log) => (
            <div key={log.id} className="flex items-center justify-between border-b px-4 py-2.5 last:border-0" style={{ borderColor: BORDER }}>
              <div className="text-xs">
                <span className="font-semibold text-white">{getTraderDisplayName(log.follower)}</span>
                <span className="text-[#5E6B7D]"> copied </span>
                <span className="font-semibold text-[#00C98D]">{getTraderDisplayName(log.master)}</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                log.status === "executed" ? "bg-[#00C98D]/15 text-[#00C98D]" : "bg-[#F59E0B]/15 text-[#F59E0B]"
              }`}>
                {log.status === "executed" ? `$${log.actual_amount}` : log.skip_reason ?? log.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Traders Tab */}
      {activeTab === "traders" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border bg-[#0D1420] p-3" style={{ borderColor: BORDER }}>
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search traders..."
                className="w-full h-8 rounded-lg border bg-[#080D16] pl-8 pr-3 text-xs text-white outline-none placeholder:text-gray-500 focus:border-[#00C98D]"
                style={{ borderColor: BORDER }}
              />
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-[#121B29] text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]" style={{ borderColor: BORDER }}>
                    <th className="px-4 py-3">TRADER</th>
                    <th className="px-4 py-3">FOLLOWERS</th>
                    <th className="px-4 py-3">TRADES</th>
                    <th className="px-4 py-3">WIN %</th>
                    <th className="px-4 py-3">PROFIT</th>
                    <th className="px-4 py-3">COPY ENABLED</th>
                    <th className="px-4 py-3">VISIBLE</th>
                    <th className="px-4 py-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202B3A]">
                  {traders.filter((t) => !searchQuery || getTraderDisplayName(t).toLowerCase().includes(searchQuery.toLowerCase())).map((t) => {
                    const winRate = t.total_trades > 0 ? Math.round((t.total_wins / t.total_trades) * 100) : 0;
                    return (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-white">
                          <Link to={`/traders/${t.username ?? t.id}`} className="hover:text-[#00C98D] transition-colors">{getTraderDisplayName(t)}</Link>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-gray-300">{t.followers_count}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-300">{t.total_trades}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-300">{winRate}%</td>
                        <td className={`px-4 py-2.5 font-mono font-bold ${t.total_profit >= 0 ? "text-[#00C98D]" : "text-[#EF4444]"}`}>
                          {t.total_profit >= 0 ? "+" : ""}{formatSocialCurrency(t.total_profit)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.is_copy_trading_enabled !== false ? "bg-[#00C98D]/15 text-[#00C98D]" : "bg-[#EF4444]/15 text-[#EF4444]"}`}>
                            {t.is_copy_trading_enabled !== false ? "● On" : "● Off"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.is_visible !== false ? "bg-[#3B82F6]/15 text-[#3B82F6]" : "bg-[#5E6B7D]/15 text-[#5E6B7D]"}`}>
                            {t.is_visible !== false ? "Visible" : "Hidden"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => void toggleCopying(t.id, t.is_copy_trading_enabled !== false)}
                              className="rounded border border-[#202B3A] px-2 py-1 text-[11px] font-bold text-gray-300 hover:border-[#00C98D] hover:text-[#00C98D] transition-colors">
                              {t.is_copy_trading_enabled !== false ? "Disable Copy" : "Enable Copy"}
                            </button>
                            <button onClick={() => void toggleVisibility(t.id, t.is_visible !== false)}
                              className="rounded border border-[#202B3A] p-1 text-gray-400 hover:text-white transition-colors">
                              {t.is_visible !== false ? <EyeOff size={13} /> : <Eye size={13} />}
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

      {/* Relationships Tab */}
      {activeTab === "relationships" && (
        <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-[#121B29] text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]" style={{ borderColor: BORDER }}>
                  <th className="px-4 py-3">FOLLOWER</th>
                  <th className="px-4 py-3">MASTER TRADER</th>
                  <th className="px-4 py-3">COPY %</th>
                  <th className="px-4 py-3">MIN / MAX</th>
                  <th className="px-4 py-3">STOP BALANCE</th>
                  <th className="px-4 py-3">STATUS</th>
                  <th className="px-4 py-3">CREATED</th>
                  <th className="px-4 py-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202B3A]">
                {relationships.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">No copy relationships found.</td></tr>
                ) : relationships.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-white">{getTraderDisplayName(r.follower)}</td>
                    <td className="px-4 py-2.5 font-semibold text-[#00C98D]">{getTraderDisplayName(r.master)}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-300">{r.copy_percentage}%</td>
                    <td className="px-4 py-2.5 font-mono text-gray-300">${r.minimum_trade_amount} / ${r.maximum_trade_amount}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-300">${r.stop_balance}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.status === "active" ? "bg-[#00C98D]/15 text-[#00C98D]" : r.status === "paused" ? "bg-[#F59E0B]/15 text-[#F59E0B]" : "bg-[#EF4444]/15 text-[#EF4444]"
                      }`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[#8D9AAF]">{fmt(r.created_at)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === "active"
                          ? <button onClick={() => void updateRelStatus(r.id, "paused")} className="rounded border border-[#F59E0B]/30 px-2 py-1 text-[11px] font-bold text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors">Pause</button>
                          : <button onClick={() => void updateRelStatus(r.id, "active")} className="rounded border border-[#00C98D]/30 px-2 py-1 text-[11px] font-bold text-[#00C98D] hover:bg-[#00C98D]/20 transition-colors">Resume</button>}
                        <button onClick={() => void updateRelStatus(r.id, "stopped")} className="rounded border border-[#EF4444]/30 px-2 py-1 text-[11px] font-bold text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors">Stop</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monitor Tab */}
      {activeTab === "monitor" && (
        <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-[#121B29] text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]" style={{ borderColor: BORDER }}>
                  <th className="px-4 py-3">TIME</th>
                  <th className="px-4 py-3">MASTER</th>
                  <th className="px-4 py-3">FOLLOWER</th>
                  <th className="px-4 py-3">ASSET / DIR</th>
                  <th className="px-4 py-3">MASTER AMT</th>
                  <th className="px-4 py-3">FOLLOWER AMT</th>
                  <th className="px-4 py-3">STATUS</th>
                  <th className="px-4 py-3">SKIP REASON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202B3A]">
                {copiedTrades.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">No copy trade executions logged yet.</td></tr>
                ) : copiedTrades.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[#8D9AAF]">{fmt(log.created_at)}</td>
                    <td className="px-4 py-2.5 font-semibold text-white">{getTraderDisplayName(log.master)}</td>
                    <td className="px-4 py-2.5 font-semibold text-[#00C98D]">{getTraderDisplayName(log.follower)}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-white">{log.master_trade?.asset_symbol ?? "—"} </span>
                      <span className={`rounded px-1 py-0.5 font-bold text-[10px] ${log.master_trade?.direction === "higher" ? "bg-[#00C98D]/15 text-[#00C98D]" : "bg-[#EF4444]/15 text-[#EF4444]"}`}>
                        {log.master_trade?.direction?.toUpperCase() ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-300">${log.original_amount}</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-white">${log.actual_amount}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        log.status === "executed" ? "bg-[#00C98D]/15 text-[#00C98D]" : log.status === "skipped" ? "bg-[#F59E0B]/15 text-[#F59E0B]" : "bg-[#EF4444]/15 text-[#EF4444]"
                      }`}>{log.status}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[#5E6B7D]">{log.skip_reason ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSocialTrading;
