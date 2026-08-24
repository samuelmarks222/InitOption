import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/integrations/api/client";
import { ArrowLeft, Clock, Copy, Filter, History, Search, Square, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialTrading } from "@/contexts/SocialTradingContext";
import { VipBadge } from "@/components/vip/VipBadge";
import { CopyTraderDialog } from "@/components/social/CopyTraderDialog";
import {
  formatCopySettingSummary,
  formatSocialCurrency,
  getTraderDisplayName,
  type TraderSummary,
} from "@/lib/social";

interface CopiedHistoryItem {
  actual_amount: number;
  calculated_amount: number;
  copied_trade_id: string | null;
  copy_percentage: number;
  created_at: string;
  id: string;
  master: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
  master_trade: { asset_symbol: string; direction: string; amount: number; profit: number; status: string } | null;
  master_trade_id: string;
  master_user_id: string;
  original_amount: number;
  skip_reason: string | null;
  status: string;
}

const MyCopiedTraders = () => {
  const { profile: currentProfile } = useAuth();
  const { copySettings, saveCopySetting, stopCopying, getCopySetting } = useSocialTrading();
  const [editingTrader, setEditingTrader] = useState<TraderSummary | null>(null);
  const [historyItems, setHistoryItems] = useState<CopiedHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [resultFilter, setResultFilter] = useState<"all" | "won" | "lost" | "skipped">("all");
  const [assetFilter, setAssetFilter] = useState("all");

  const hasData = copySettings.length > 0;

  useEffect(() => {
    if (!currentProfile?.id) return;
    const loadHistory = async () => {
      setLoadingHistory(true);
      const { data: logs } = await api
        .from("copied_trades")
        .select("*")
        .eq("follower_user_id", currentProfile.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (logs && logs.length > 0) {
        const masterIds = [...new Set(logs.map((l: any) => l.master_user_id))];
        const tradeIds = [...new Set(logs.map((l: any) => l.master_trade_id))];

        const [{ data: masters }, { data: trades }] = await Promise.all([
          api.from("profiles").select("id, username, display_name, avatar_url").in("id", masterIds),
          api.from("trades").select("id, asset_symbol, direction, amount, profit, status").in("id", tradeIds),
        ]);

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
      setLoadingHistory(false);
    };
    void loadHistory();
  }, [currentProfile?.id]);

  const summary = useMemo(() => {
    let activeCopies = 0;
    let totalCopied = 0;
    let totalProfit = 0;

    for (const s of copySettings) {
      if (s.enabled) activeCopies++;
    }

    for (const item of historyItems) {
      if (item.status === "executed" && item.actual_amount) {
        totalCopied += Number(item.actual_amount);
        if (item.master_trade) {
          const profit = Number(item.master_trade.profit ?? 0);
          const net = item.master_trade.status === "won" ? profit - item.actual_amount : -item.actual_amount;
          totalProfit += net;
        }
      }
    }

    return { totalCopied, totalProfit, activeCopies };
  }, [copySettings, historyItems]);

  const filteredHistory = useMemo(() => {
    return historyItems.filter((item) => {
      if (assetFilter !== "all" && item.master_trade?.asset_symbol !== assetFilter) return false;
      if (resultFilter === "won" && item.master_trade?.status !== "won") return false;
      if (resultFilter === "lost" && item.master_trade?.status !== "lost") return false;
      if (resultFilter === "skipped" && item.status !== "skipped") return false;
      return true;
    });
  }, [assetFilter, historyItems, resultFilter]);

  const availableAssets = useMemo(() => {
    const assets = new Set<string>();
    historyItems.forEach((h) => {
      if (h.master_trade?.asset_symbol) assets.add(h.master_trade.asset_symbol);
    });
    return Array.from(assets);
  }, [historyItems]);

  return (
    <div className="min-h-screen bg-[#0D0D0D] px-4 py-8 text-white md:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="mb-6">
          <Link to="/trade" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to trading
          </Link>
          <h1 className="mt-4 text-3xl font-black text-white">My Copy Trading</h1>
          <p className="mt-1 text-sm text-gray-400">Monitor active copy connections and inspect your copy trading history.</p>
        </div>

        {/* Summary Card */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#111823] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Active Copies</p>
            <p className="mt-2 text-3xl font-black text-white">{summary.activeCopies}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#111823] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Copied Volume</p>
            <p className="mt-2 text-3xl font-black text-white">{formatSocialCurrency(summary.totalCopied)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#111823] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Copy Profit</p>
            <p className={`mt-2 text-3xl font-black ${summary.totalProfit >= 0 ? "text-[#00C076]" : "text-[#F6465D]"}`}>
              {summary.totalProfit >= 0 ? "+" : ""}{formatSocialCurrency(summary.totalProfit)}
            </p>
          </div>
        </div>

        {/* Active Copy Traders List */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Active Relationships</h2>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111823]">
            {!hasData ? (
              <div className="px-6 py-12 text-center text-sm text-gray-400">
                <Copy className="mx-auto mb-3 h-10 w-10 text-gray-600" />
                <p className="font-semibold text-white">No active copy trades</p>
                <p className="mt-1 text-xs">Visit Top Traders to discover and automatically copy expert traders.</p>
                <Link
                  to="/social/traders"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0fa053] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0d8f47]"
                >
                  <TrendingUp className="h-4 w-4" />
                  Browse Top Traders
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-gray-500">
                      <th className="px-5 py-4">Trader</th>
                      <th className="px-5 py-4">Copy Setup</th>
                      <th className="px-5 py-4">Copied Since</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {copySettings.map((setting) => {
                      const trader = setting.target;
                      return (
                        <tr key={setting.id} className="transition-colors hover:bg-white/[0.03]">
                          <td className="px-5 py-4">
                            <Link
                              to={`/traders/${trader?.username ?? setting.target_user_id}`}
                              className="flex items-center gap-3"
                            >
                              {trader?.avatar_url ? (
                                <img src={trader.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#0fa053] to-purple-600 text-sm font-bold text-white">
                                  {getTraderDisplayName(trader).charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white">{getTraderDisplayName(trader)}</span>
                                  <VipBadge tierId={(trader?.vip_tier as any) ?? "standard"} size={16} />
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-400">
                            {formatCopySettingSummary(setting)}
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-400">
                            {new Date(setting.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                              setting.enabled
                                ? "bg-[#00C076]/15 text-[#00C076]"
                                : "bg-yellow-500/15 text-yellow-400"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${setting.enabled ? "bg-[#00C076]" : "bg-yellow-400"}`} />
                              {setting.enabled ? "Active" : "Paused"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {trader && (
                                <button
                                  onClick={() => setEditingTrader(trader)}
                                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                  Edit
                                </button>
                              )}
                              <button
                                onClick={() => { if (confirm("Stop copying this trader?")) void stopCopying(setting.target_user_id); }}
                                className="rounded-lg border border-[#F6465D]/40 px-3 py-1.5 text-xs font-semibold text-[#F6465D] transition-colors hover:bg-[#F6465D] hover:text-white"
                              >
                                <Square className="h-3.5 w-3.5" />
                              </button>
                            </div>
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

        {/* Copy Trade History Section */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="h-5 w-5 text-[#00C076]" /> Copy Trade Execution History
              </h2>
              <p className="text-xs text-gray-400">Complete audit log of all trades executed or skipped by your copy settings.</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#111823] px-3 py-1.5">
                <Filter className="h-3.5 w-3.5 text-gray-400" />
                <select
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value as any)}
                  className="bg-transparent font-semibold text-white outline-none"
                >
                  <option value="all" className="bg-[#111823]">All Results</option>
                  <option value="won" className="bg-[#111823]">Won</option>
                  <option value="lost" className="bg-[#111823]">Lost</option>
                  <option value="skipped" className="bg-[#111823]">Skipped</option>
                </select>
              </div>

              {availableAssets.length > 0 && (
                <select
                  value={assetFilter}
                  onChange={(e) => setAssetFilter(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#111823] px-3 py-1.5 font-semibold text-white outline-none"
                >
                  <option value="all">All Assets</option>
                  {availableAssets.map((asset) => (
                    <option key={asset} value={asset} className="bg-[#111823]">{asset}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111823]">
            {loadingHistory ? (
              <div className="px-6 py-12 text-center text-xs text-gray-400">Loading history...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="px-6 py-12 text-center text-xs text-gray-400">
                No copy trades match your selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 font-bold uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3">Master Trader</th>
                      <th className="px-4 py-3">Asset</th>
                      <th className="px-4 py-3">Direction</th>
                      <th className="px-4 py-3">Master Amount</th>
                      <th className="px-4 py-3">Your Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Result / Profit</th>
                      <th className="px-4 py-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredHistory.map((item) => {
                      const won = item.master_trade?.status === "won";
                      const lost = item.master_trade?.status === "lost";
                      const profit = Number(item.master_trade?.profit ?? 0);
                      const netProfit = won ? profit - item.actual_amount : lost ? -item.actual_amount : 0;

                      return (
                        <tr key={item.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-semibold text-white">
                            {getTraderDisplayName(item.master)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-white">
                            {item.master_trade?.asset_symbol ?? "BTC/USD"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded px-1.5 py-0.5 font-bold ${
                              item.master_trade?.direction === "higher" ? "bg-[#00C076]/15 text-[#00C076]" : "bg-[#F6465D]/15 text-[#F6465D]"
                            }`}>
                              {item.master_trade?.direction?.toUpperCase() ?? "UP"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-400">${item.original_amount}</td>
                          <td className="px-4 py-3 font-mono font-bold text-white">${item.actual_amount}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              item.status === "executed" ? "bg-[#00C076]/15 text-[#00C076]" : "bg-amber-500/15 text-amber-400"
                            }`}>
                              {item.status === "skipped" ? (item.skip_reason ?? "skipped") : item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold">
                            {item.status === "executed" ? (
                              <span className={netProfit >= 0 ? "text-[#00C076]" : "text-[#F6465D]"}>
                                {netProfit >= 0 ? "+" : ""}{formatSocialCurrency(netProfit)}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400">
                            {new Date(item.created_at).toLocaleString()}
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

        {/* Risk Warning */}
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-5 py-4 text-sm text-orange-300">
          <p className="font-semibold text-orange-200">Copy trading involves financial risk.</p>
          <p className="mt-1 text-xs text-orange-300/80">
            Past trader performance does not guarantee future results. You can adjust your copy parameters or stop copying at any time.
          </p>
        </div>
      </div>

      {editingTrader && (
        <CopyTraderDialog
          existingSetting={getCopySetting(editingTrader.id)}
          open={!!editingTrader}
          trader={editingTrader}
          onOpenChange={(open) => { if (!open) setEditingTrader(null); }}
          onSave={(input) => saveCopySetting(editingTrader.id, input)}
        />
      )}
    </div>
  );
};

export default MyCopiedTraders;
