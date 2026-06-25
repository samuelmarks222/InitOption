import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Square, TrendingUp, Users } from "lucide-react";
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

const MyCopiedTraders = () => {
  const { profile: currentProfile } = useAuth();
  const { copySettings, saveCopySetting, stopCopying, getCopySetting } = useSocialTrading();
  const [editingTrader, setEditingTrader] = useState<TraderSummary | null>(null);

  const hasData = copySettings.length > 0;

  const summary = useMemo(() => {
    if (!hasData) return { totalCopied: 0, totalProfit: 0, activeCopies: 0 };
    let totalCopied = 0;
    let totalProfit = 0;
    let activeCopies = 0;
    for (const s of copySettings) {
      if (s.enabled) activeCopies++;
    }
    return { totalCopied, totalProfit, activeCopies };
  }, [copySettings, hasData]);

  return (
    <div className="min-h-screen bg-[#0D0D0D] px-4 py-8 text-white md:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link to="/trade" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to trading
          </Link>
          <h1 className="mt-4 text-3xl font-black text-white">My Copied Traders</h1>
          <p className="mt-1 text-sm text-gray-400">Monitor and manage your active copy trading connections.</p>
        </div>

        {/* Summary Card */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#111823] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Active Copies</p>
            <p className="mt-2 text-3xl font-black text-white">{summary.activeCopies}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#111823] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Copied Amount</p>
            <p className="mt-2 text-3xl font-black text-white">{formatSocialCurrency(summary.totalCopied)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#111823] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Profit from Copy</p>
            <p className={`mt-2 text-3xl font-black ${summary.totalProfit >= 0 ? "text-[#00C076]" : "text-[#F6465D]"}`}>
              {summary.totalProfit >= 0 ? "+" : ""}{formatSocialCurrency(summary.totalProfit)}
            </p>
          </div>
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111823]">
          {!hasData ? (
            <div className="px-6 py-16 text-center text-sm text-gray-400">
              <Copy className="mx-auto mb-3 h-10 w-10 text-gray-600" />
              <p className="font-semibold text-white">No active copy trades</p>
              <p className="mt-1">Visit the Top Traders page to find and copy successful traders.</p>
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
                    <th className="px-5 py-4">Settings</th>
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

        {/* Help text */}
        <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-5 py-4 text-sm text-orange-300">
          <p className="font-semibold text-orange-200">Copy trading involves risk.</p>
          <p className="mt-1 text-orange-300/80">
            You may lose money. Copying does not guarantee profits. You can stop copying at any time and your settings will be saved.
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
