import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, HelpCircle, Trophy, UserCheck, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialTrading } from "@/contexts/SocialTradingContext";
import type { TraderSummary } from "@/lib/social";
import { computeTraderWinRate, getTraderDisplayName } from "@/lib/social";

type LeaderboardTrader = TraderSummary & {
  rankedProfit: number;
  rankedTrades: number;
  rankedWins: number;
  winRate: number;
};

type LeaderboardPeriod = "weekly" | "monthly" | "all";

const PERIODS: Array<{ id: LeaderboardPeriod; label: string }> = [
  { id: "weekly", label: "Week" },
  { id: "monthly", label: "Month" },
  { id: "all", label: "All" },
];

const getCutoff = (period: LeaderboardPeriod) => {
  const now = new Date();
  if (period === "weekly") {
    const next = new Date(now);
    next.setDate(now.getDate() - 7);
    return next.toISOString();
  }

  if (period === "monthly") {
    const next = new Date(now);
    next.setMonth(now.getMonth() - 1);
    return next.toISOString();
  }

  return null;
};

const formatLeaderboardProfit = (value: number) => {
  if (value >= 30000) {
    return "$30,000.00+";
  }

  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getRankBadgeClass = (rank: number) => {
  if (rank === 1) return "bg-[#0fa053] text-white";
  if (rank === 2) return "bg-white/18 text-white";
  if (rank === 3) return "bg-white/12 text-white";
  return "bg-transparent text-white/55";
};

const Avatar = ({ trader }: { trader: Partial<TraderSummary> }) => {
  const fallback = getTraderDisplayName(trader).charAt(0).toUpperCase();

  if (trader.avatar_url) {
    return (
      <img
        src={trader.avatar_url}
        alt={getTraderDisplayName(trader)}
        className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10"
      />
    );
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0fa053]/20 text-[11px] font-black text-white ring-1 ring-[#0fa053]/30">
      {fallback}
    </div>
  );
};

interface WorkspaceLeaderboardProps {
  onClose?: () => void;
}

export const WorkspaceLeaderboard = ({ onClose }: WorkspaceLeaderboardProps) => {
  const { profile } = useAuth();
  const { followTrader, isFollowing, unfollowTrader } = useSocialTrading();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const [traders, setTraders] = useState<LeaderboardTrader[]>([]);

  useEffect(() => {
    const fetchLeaders = async () => {
      setLoading(true);
      const cutoff = getCutoff(period);
      let query = supabase
        .from("trades")
        .select(
          "user_id, profit, status, closed_at, profiles(id, username, display_name, avatar_url, vip_tier, followers_count, following_count, total_profit, total_trades, total_wins)",
        )
        .neq("status", "open")
        .order("closed_at", { ascending: false })
        .limit(400);

      if (cutoff) {
        query = query.gte("closed_at", cutoff);
      }

      const { data } = await query;
      const aggregate = new Map<string, LeaderboardTrader>();

      (data ?? []).forEach((row: any) => {
        const trader = row.profiles;
        if (!trader?.id) return;

        const current = aggregate.get(trader.id) ?? {
          ...trader,
          rankedProfit: 0,
          rankedTrades: 0,
          rankedWins: 0,
          winRate: 0,
        };

        current.rankedProfit += Number(row.profit ?? 0);
        current.rankedTrades += 1;
        current.rankedWins += row.status === "won" ? 1 : 0;
        current.winRate = computeTraderWinRate(current.rankedWins, current.rankedTrades);
        aggregate.set(trader.id, current);
      });

      const nextTraders = Array.from(aggregate.values())
        .sort((left, right) => right.rankedProfit - left.rankedProfit)
        .slice(0, 20);

      setTraders(nextTraders);
      setLoading(false);
    };

    void fetchLeaders();
  }, [period]);

  const currentUserId = profile?.id ?? null;
  const rankedRows = useMemo(
    () =>
      traders.map((trader, index) => ({
        ...trader,
        rank: index + 1,
      })),
    [traders],
  );

  const currentUserEntry = useMemo(
    () => rankedRows.find((trader) => trader.id === currentUserId) ?? null,
    [currentUserId, rankedRows],
  );

  const currentUserLabel = profile?.username?.trim() || profile?.display_name?.trim() || "Your account";
  const currentUserPosition = currentUserEntry ? `#${currentUserEntry.rank}` : "-";
  const currentUserProfit = currentUserEntry?.rankedProfit ?? 0;

  return (
    <div className="flex h-full flex-col bg-[#1c1f2d] text-white">
      <div className="flex items-center gap-3 border-b border-white/6 px-4 py-4">
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/6 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="text-[18px] font-black leading-none text-white">Leader Board</div>
          <div className="mt-1 text-[12px] font-semibold text-white/45">of the Day</div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/6 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 border-b border-white/6 bg-[#1c1f2d] px-4 py-4">
        <div className="rounded-2xl border border-white/6 bg-[#1e2330] px-4 py-3 shadow-[0_14px_36px_rgba(0,0,0,0.18)]">
          <div className="flex items-center gap-3">
            <Avatar trader={{ username: profile?.username, display_name: profile?.display_name, avatar_url: profile?.avatar_url }} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-black text-white">{currentUserLabel}</div>
              <div className="mt-2 flex items-center justify-between border-t border-white/8 pt-2 text-[12px]">
                <span className="text-white/55">Your position: {currentUserPosition}</span>
                <span className="font-black text-[#0fa053]">{formatLeaderboardProfit(currentUserProfit)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-[#0fa053]/20 bg-[#0fa053]/10 px-4 py-3 text-left">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0fa053]/20 text-[#0fa053]">
            <HelpCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-white">How does this rating work?</div>
            <div className="mt-1 text-[11px] text-white/55">Rankings update from closed trades and total session profit.</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] transition-colors ${
                period === item.id
                  ? "bg-[#0fa053] text-white"
                  : "bg-[#1e2330] text-white/55 hover:bg-white/8 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0fa053]/25 border-t-[#0fa053]" />
          </div>
        ) : rankedRows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-white/6 bg-[#1e2330] px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0fa053]/14 text-[#0fa053]">
              <Trophy className="h-7 w-7" />
            </div>
            <div className="mt-4 text-[16px] font-black text-white">No leaders yet</div>
            <p className="mt-2 text-[12px] leading-relaxed text-white/50">
              Closed trades will start filling this leaderboard as soon as traders finish positions.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rankedRows.map((trader) => {
              const following = isFollowing(trader.id);
              const isSelf = trader.id === currentUserId;
              const profitClass = trader.rankedProfit >= 0 ? "text-[#0fa053]" : "text-white/70";

              return (
                <div
                  key={trader.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/6 bg-[#1e2330] px-3 py-3 transition-colors hover:bg-[#23293a]"
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-black ${getRankBadgeClass(trader.rank)}`}>
                    {trader.rank}
                  </div>

                  <Avatar trader={trader} />

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold text-white">{getTraderDisplayName(trader)}</div>
                    <div className="mt-1 truncate text-[11px] text-white/45">
                      {isSelf ? "You" : following ? "Following" : `${trader.winRate}% win rate`} · {trader.rankedTrades} trades
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isSelf ? (
                      <button
                        type="button"
                        onClick={() => void (following ? unfollowTrader(trader.id) : followTrader(trader.id))}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                          following
                            ? "border-[#0fa053]/35 bg-[#0fa053]/14 text-[#0fa053] hover:bg-[#0fa053]/22"
                            : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white"
                        }`}
                        aria-label={following ? `Unfollow ${getTraderDisplayName(trader)}` : `Follow ${getTraderDisplayName(trader)}`}
                      >
                        {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                      </button>
                    ) : null}

                    <div className="min-w-[94px] text-right">
                      <div className={`text-[13px] font-black ${profitClass}`}>{formatLeaderboardProfit(trader.rankedProfit)}</div>
                      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">profit</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
