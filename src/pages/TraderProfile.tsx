import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Copy, TrendingDown, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialTrading } from "@/contexts/SocialTradingContext";
import { toast } from "@/hooks/use-toast";
import { VipBadge } from "@/components/vip/VipBadge";
import { CopyTraderDialog } from "@/components/social/CopyTraderDialog";
import {
  computeTraderAverageReturn,
  computeTraderWinRate,
  formatDirectionLabel,
  formatSocialCurrency,
  getTraderDisplayName,
  type TraderSummary,
} from "@/lib/social";

type TradeRow = Tables<"trades">;
type TradeFilter = "all" | "winning" | "losing";

const supabaseAny = supabase as any;
const PROFILE_SUMMARY_SELECT =
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
  const [followers, setFollowers] = useState<TraderSummary[]>([]);
  const [following, setFollowing] = useState<TraderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tradeFilter, setTradeFilter] = useState<TradeFilter>("all");
  const [trader, setTrader] = useState<Tables<"profiles"> | null>(null);
  const [trades, setTrades] = useState<TradeRow[]>([]);

  useEffect(() => {
    const loadTraderProfile = async () => {
      if (!username) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: traderData, error: traderError } = await supabase
        .from("profiles")
        .select(PROFILE_SUMMARY_SELECT)
        .eq("username", username)
        .maybeSingle();

      if (traderError || !traderData) {
        toast({
          title: "Trader profile not found",
          description: traderError?.message ?? "The trader you requested does not exist.",
          variant: "destructive",
        });
        setTrader(null);
        setTrades([]);
        setFollowers([]);
        setFollowing([]);
        setLoading(false);
        return;
      }

      setTrader(traderData);

      const [tradesResponse, followerRowsResponse, followingRowsResponse] = await Promise.all([
        supabase
          .from("trades")
          .select("*")
          .eq("user_id", traderData.id)
          .neq("status", "open")
          .order("closed_at", { ascending: false })
          .limit(24),
        supabaseAny
          .from("follows")
          .select("follower_id")
          .eq("followed_id", traderData.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabaseAny
          .from("follows")
          .select("followed_id")
          .eq("follower_id", traderData.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setTrades((tradesResponse.data ?? []) as TradeRow[]);

      const followerIds = ((followerRowsResponse.data ?? []) as Array<{ follower_id: string }>).map((row) => row.follower_id);
      const followingIds = ((followingRowsResponse.data ?? []) as Array<{ followed_id: string }>).map((row) => row.followed_id);

      const [followersProfiles, followingProfiles] = await Promise.all([
        followerIds.length
          ? supabase.from("profiles").select(PROFILE_SUMMARY_SELECT).in("id", followerIds)
          : Promise.resolve({ data: [] as Tables<"profiles">[] }),
        followingIds.length
          ? supabase.from("profiles").select(PROFILE_SUMMARY_SELECT).in("id", followingIds)
          : Promise.resolve({ data: [] as Tables<"profiles">[] }),
      ]);

      setFollowers((followersProfiles.data ?? []) as TraderSummary[]);
      setFollowing((followingProfiles.data ?? []) as TraderSummary[]);
      setLoading(false);
    };

    void loadTraderProfile();
  }, [username]);

  const filteredTrades = useMemo(() => {
    if (tradeFilter === "winning") return trades.filter((trade) => trade.status === "won");
    if (tradeFilter === "losing") return trades.filter((trade) => trade.status === "lost");
    return trades;
  }, [tradeFilter, trades]);

  const isSelf = trader?.id === currentProfile?.id;
  const copySetting = trader ? getCopySetting(trader.id) : undefined;
  const followingTrader = trader ? isFollowing(trader.id) : false;
  const winRate = computeTraderWinRate(trader?.total_wins, trader?.total_trades);
  const avgReturn = computeTraderAverageReturn(trader?.total_profit, trader?.total_trades);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1018] px-4 py-10 text-white md:px-6">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-20 text-center text-sm text-gray-400">
          Loading trader profile...
        </div>
      </div>
    );
  }

  if (!trader) {
    return (
      <div className="min-h-screen bg-[#0b1018] px-4 py-10 text-white md:px-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
          <h1 className="text-2xl font-bold text-white">Trader not found</h1>
          <p className="mt-3 text-sm text-gray-400">The public profile you requested could not be loaded.</p>
          <Link
            to="/trade"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0fa053] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2a955e]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to platform
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#18273c_0%,#0b1018_42%,#070b11_100%)] px-4 py-8 text-white md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/trade" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:bg-white/[0.06] hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to trading
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.08fr,0.92fr]">
          <section className="rounded-[28px] border border-white/10 bg-[#111823]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                {trader.avatar_url ? (
                  <img src={trader.avatar_url} alt={getTraderDisplayName(trader)} className="h-20 w-20 rounded-3xl object-cover ring-1 ring-white/10" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#1d4ed8,#22c55e)] text-2xl font-black text-white ring-1 ring-white/10">
                    {getTraderDisplayName(trader).charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="truncate text-2xl font-black text-white md:text-3xl">@{getTraderDisplayName(trader)}</h1>
                    <VipBadge tierId={(trader.vip_tier as any) ?? "none"} size={24} showLabel />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px] text-gray-400">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-[#8be0af]" />
                      Joined {new Date(trader.created_at).toLocaleDateString()}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#8be0af]" />
                      {Number(trader.followers_count ?? 0)} followers
                    </span>
                  </div>
                  {trader.social_trading_disabled ? (
                    <p className="mt-3 rounded-xl border border-[#0fa053]/20 bg-[#0fa053]/10 px-3 py-2 text-[12px] text-[#d8f6e5]">
                      This trader has disabled copy trading for now.
                    </p>
                  ) : null}
                </div>
              </div>

              {!isSelf ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void (followingTrader ? unfollowTrader(trader.id) : followTrader(trader.id))}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                      followingTrader
                        ? "border border-white/10 bg-black/20 text-gray-200 hover:bg-white/5 hover:text-white"
                        : "bg-[#0fa053] text-white hover:bg-[#2a955e]"
                    }`}
                  >
                    {followingTrader ? "Following" : "Follow"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopyDialogOpen(true)}
                    disabled={trader.social_trading_disabled}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Copy className="h-4 w-4" />
                    {copySetting ? "Manage Copy" : "Copy Trader"}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Profit" value={formatSocialCurrency(trader.total_profit)} accent="text-emerald-300" />
              <StatCard label="Win Rate" value={`${winRate}%`} accent="text-[#8be0af]" />
              <StatCard label="Trades" value={`${Number(trader.total_trades ?? 0)}`} accent="text-white" />
              <StatCard label="Avg Return" value={formatSocialCurrency(avgReturn)} accent="text-[#8be0af]" />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <ListCard title={`Followers (${followers.length})`} items={followers} emptyText="No followers yet" />
              <ListCard title={`Following (${following.length})`} items={following} emptyText="Not following anyone yet" />
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#111823]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">Recent Trades</h2>
                <p className="mt-1 text-[12px] text-gray-400">Review recent results and filter by winning or losing positions.</p>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
                {(["all", "winning", "losing"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTradeFilter(value)}
                    className={`rounded-xl px-3 py-2 text-[12px] font-semibold transition-colors ${
                      tradeFilter === value ? "bg-[#0fa053] text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {value === "all" ? "All" : value === "winning" ? "Winning" : "Losing"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {filteredTrades.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-gray-400">
                  No trades match this filter yet.
                </div>
              ) : (
                filteredTrades.map((trade) => (
                  <div key={trade.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[15px] font-bold text-white">{trade.asset_symbol}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${
                            trade.direction === "higher" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                          }`}>
                            {formatDirectionLabel(trade.direction)}
                          </span>
                          {trade.source_trade_id ? (
                            <span className="rounded-full bg-[#0fa053]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#8be0af]">
                              Copy
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[12px] text-gray-400">
                          Expiry {trade.expiry_seconds}s • Closed {trade.closed_at ? new Date(trade.closed_at).toLocaleString() : "Pending"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[14px] font-bold text-white">{formatSocialCurrency(trade.amount)}</p>
                        <p className={`mt-1 text-[12px] font-semibold ${
                          Number(trade.profit ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"
                        }`}>
                          {formatSocialCurrency(trade.profit)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <TradeDetail
                        icon={trade.status === "won" ? TrendingUp : TrendingDown}
                        label="Status"
                        value={trade.status?.toUpperCase() ?? "CLOSED"}
                        accent={trade.status === "won" ? "text-emerald-300" : "text-red-300"}
                      />
                      <TradeDetail
                        icon={ArrowLeft}
                        label="Entry"
                        value={trade.entry_price.toFixed(4)}
                        accent="text-white"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
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

const StatCard = ({ accent, label, value }: { accent: string; label: string; value: string }) => (
  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500">{label}</p>
    <p className={`mt-2 text-2xl font-black ${accent}`}>{value}</p>
  </div>
);

const ListCard = ({
  emptyText,
  items,
  title,
}: {
  emptyText: string;
  items: TraderSummary[];
  title: string;
}) => (
  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
    <p className="text-[13px] font-bold text-white">{title}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {items.length === 0 ? (
        <span className="text-[12px] text-gray-500">{emptyText}</span>
      ) : (
        items.map((item) => (
          <Link
            key={item.id}
            to={item.username ? `/traders/${item.username}` : "/trade"}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] font-semibold text-gray-200 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            {item.avatar_url ? (
              <img src={item.avatar_url} alt={getTraderDisplayName(item)} className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0fa053]/20 text-[10px] font-black text-[#e8fff2]">
                {getTraderDisplayName(item).charAt(0).toUpperCase()}
              </span>
            )}
            @{getTraderDisplayName(item)}
          </Link>
        ))
      )}
    </div>
  </div>
);

const TradeDetail = ({
  accent,
  icon: Icon,
  label,
  value,
}: {
  accent: string;
  icon: typeof ArrowLeft;
  label: string;
  value: string;
}) => (
  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <p className={`mt-2 text-[13px] font-semibold ${accent}`}>{value}</p>
  </div>
);

export default TraderProfile;

