import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Copy, Eye, MessageCircle, TrendingUp, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialTrading } from "@/contexts/SocialTradingContext";
import { toast } from "@/hooks/use-toast";
import { VipBadge } from "@/components/vip/VipBadge";
import { CopyTraderDialog } from "@/components/social/CopyTraderDialog";
import {
  computeTraderWinRate,
  formatDirectionLabel,
  formatSocialCurrency,
  getTraderDisplayName,
  type TraderSummary,
} from "@/lib/social";

type TradeRow = Tables<"trades">;

const supabaseAny = supabase as any;
const PROFILE_SELECT =
  "id, username, display_name, avatar_url, vip_tier, created_at, total_profit, total_trades, total_wins, followers_count, following_count, social_trading_disabled";

const TraderProfile = () => {
  const { username } = useParams<{ username: string }>();
  const { profile: currentProfile } = useAuth();
  const {
    followTrader,
    getCopySetting,
    isFollowing,
    saveCopySetting,
    unfollowTrader,
  } = useSocialTrading();
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trader, setTrader] = useState<Tables<"profiles"> | null>(null);
  const [trades, setTrades] = useState<TradeRow[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!username) { setLoading(false); return; }
      setLoading(true);
      const { data: traderData } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .eq("username", username)
        .maybeSingle();
      if (!traderData) {
        toast({ title: "Trader not found", description: "The requested profile does not exist.", variant: "destructive" });
        setTrader(null);
        setTrades([]);
        setLoading(false);
        return;
      }
      setTrader(traderData);
      const { data: tradesData } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", traderData.id)
        .neq("status", "open")
        .order("closed_at", { ascending: false })
        .limit(20);
      setTrades((tradesData ?? []) as TradeRow[]);
      setLoading(false);
    };
    void load();
  }, [username]);

  const isSelf = trader?.id === currentProfile?.id;
  const copySetting = trader ? getCopySetting(trader.id) : undefined;
  const followingTrader = trader ? isFollowing(trader.id) : false;
  const winRate = computeTraderWinRate(trader?.total_wins, trader?.total_trades);

  const stats = useMemo(() => {
    if (!trades.length) return null;
    const profitable = trades.filter((t) => (t.profit ?? 0) > 0).length;
    const totalTurnover = trades.reduce((s, t) => s + Number(t.amount), 0);
    const totalProfit = trades.reduce((s, t) => s + Number(t.profit ?? 0), 0);
    const amounts = trades.map((t) => Number(t.amount));
    const profits = trades.filter((t => (t.profit ?? 0) > 0)).map((t) => Number(t.profit));
    return {
      trades: trades.length,
      profitablePct: trades.length > 0 ? ((profitable / trades.length) * 100).toFixed(1) : "0",
      turnover: totalTurnover,
      profit: totalProfit,
      maxTrade: Math.max(...amounts, 0),
      minTrade: Math.min(...amounts, 0),
      maxProfit: profits.length > 0 ? Math.max(...profits) : 0,
    };
  }, [trades]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] px-4 py-10 text-white md:px-6">
        <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-[#111823] px-6 py-20 text-center text-sm text-gray-400">
          Loading trader profile...
        </div>
      </div>
    );
  }

  if (!trader) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] px-4 py-10 text-white md:px-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-[#111823] px-6 py-16 text-center">
          <h1 className="text-2xl font-bold text-white">Trader not found</h1>
          <p className="mt-3 text-sm text-gray-400">The profile you requested could not be loaded.</p>
          <Link to="/trade" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0fa053] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0d8f47]">
            <ArrowLeft className="h-4 w-4" /> Back to platform
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] px-4 py-8 text-white md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Back */}
        <Link to="/social/traders" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to traders
        </Link>

        {/* Two Columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">

          {/* Left Column - Profile Info */}
          <section className="rounded-2xl border border-white/10 bg-[#111823] p-6">
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              {trader.avatar_url ? (
                <img src={trader.avatar_url} alt="" className="h-24 w-24 rounded-2xl object-cover ring-2 ring-white/10" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0fa053] to-purple-600 text-3xl font-black text-white ring-2 ring-white/10">
                  {getTraderDisplayName(trader).charAt(0).toUpperCase()}
                </div>
              )}

              <div className="mt-4">
                <p className="text-xs text-gray-500">ID: {trader.username ?? trader.id.slice(0, 8)}</p>
                <h1 className="mt-1 text-2xl font-bold text-white">{getTraderDisplayName(trader)}</h1>
                <p className="text-xs text-gray-500">last seen recently</p>
              </div>

              {/* Followers / Watchers */}
              <div className="mt-4 flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Users className="h-4 w-4 text-[#0fa053]" />
                  <span className="font-semibold text-white">{trader.followers_count ?? 0}</span>
                  <span>Followers</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Eye className="h-4 w-4 text-[#0fa053]" />
                  <span className="font-semibold text-white">{trader.followers_count ?? 0}</span>
                  <span>Watchers</span>
                </div>
              </div>

              {/* Profile Level */}
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-lg bg-gradient-to-r from-[#0fa053] to-amber-500 px-3 py-1 text-xs font-bold text-white">
                  Guru
                </span>
                <VipBadge tierId={(trader.vip_tier as any) ?? "none"} size={20} showLabel />
              </div>

              {/* Actions */}
              {!isSelf && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => setCopyDialogOpen(true)}
                    disabled={trader.social_trading_disabled}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0fa053] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0d8f47] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Copy className="h-4 w-4" />
                    {copySetting ? "Manage Copy" : "Copy"}
                  </button>
                  <button
                    onClick={() => void (followingTrader ? unfollowTrader(trader.id) : followTrader(trader.id))}
                    className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors ${
                      followingTrader
                        ? "border-[#00C076]/40 text-[#00C076] hover:bg-[#00C076] hover:text-white"
                        : "border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    {followingTrader ? "Watching" : "Watch"}
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white">
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </button>
                </div>
              )}

              {/* Callout */}
              {!isSelf && (
                <div className="mt-6 w-full rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
                  Add money to your account in order to copy trades.
                </div>
              )}
            </div>
          </section>

          {/* Right Column - Trading Statistics */}
          <section className="rounded-2xl border border-white/10 bg-[#111823] p-6">
            <h2 className="text-lg font-bold text-white">Trading Statistics</h2>

            {stats ? (
              <div className="mt-5 grid grid-cols-2 gap-4">
                <StatBox label="Trades" value={String(stats.trades)} />
                <StatBox label="Profitable Trades" value={`${stats.profitablePct}%`} accent={Number(stats.profitablePct) >= 50 ? "text-[#00C076]" : "text-[#F6465D]"} />
                <StatBox label="Trading Turnover" value={formatSocialCurrency(stats.turnover)} />
                <StatBox label="Trading Profit" value={`${stats.profit >= 0 ? "+" : ""}${formatSocialCurrency(stats.profit)}`} accent={stats.profit >= 0 ? "text-[#00C076]" : "text-[#F6465D]"} />
                <StatBox label="Max Trade" value={formatSocialCurrency(stats.maxTrade)} />
                <StatBox label="Min Trade" value={formatSocialCurrency(stats.minTrade)} />
                <StatBox label="Max Profit" value={formatSocialCurrency(stats.maxProfit)} accent="text-[#00C076]" />
                <StatBox label="Win Rate" value={`${winRate}%`} accent={winRate >= 50 ? "text-[#00C076]" : "text-[#F6465D]"} />
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-gray-400">
                No trade data available yet.
              </div>
            )}

            {/* Recent Trades */}
            <h3 className="mt-8 text-base font-bold text-white">Recent Trades</h3>
            {trades.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-gray-400">
                No trades yet.
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      <th className="px-3 py-2.5">Asset</th>
                      <th className="px-3 py-2.5">Direction</th>
                      <th className="px-3 py-2.5">Amount</th>
                      <th className="px-3 py-2.5">Result</th>
                      <th className="px-3 py-2.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {trades.slice(0, 8).map((trade) => (
                      <tr key={trade.id} className="hover:bg-white/[0.02]">
                        <td className="px-3 py-2.5 font-semibold text-white">{trade.asset_symbol}</td>
                        <td className="px-3 py-2.5">
                          <span className={`rounded px-1.5 py-0.5 font-bold ${
                            trade.direction === "higher" ? "bg-[#00C076]/15 text-[#00C076]" : "bg-[#F6465D]/15 text-[#F6465D]"
                          }`}>
                            {formatDirectionLabel(trade.direction)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono">{formatSocialCurrency(trade.amount)}</td>
                        <td className={`px-3 py-2.5 font-mono font-semibold ${(trade.profit ?? 0) >= 0 ? "text-[#00C076]" : "text-[#F6465D]"}`}>
                          {(trade.profit ?? 0) >= 0 ? "+" : ""}{formatSocialCurrency(trade.profit)}
                        </td>
                        <td className="px-3 py-2.5 text-gray-400">{trade.closed_at ? new Date(trade.closed_at).toLocaleDateString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      <CopyTraderDialog
        existingSetting={copySetting}
        open={copyDialogOpen}
        trader={trader}
        onOpenChange={setCopyDialogOpen}
        onSave={(input) => saveCopySetting(trader.id, input)}
      />
    </div>
  );
};

const StatBox = ({ label, value, accent = "text-white" }: { label: string; value: string; accent?: string }) => (
  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
    <p className={`mt-1.5 text-xl font-black ${accent}`}>{value}</p>
  </div>
);

export default TraderProfile;
