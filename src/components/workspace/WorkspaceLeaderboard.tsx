import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, HelpCircle, Trophy, UserCheck, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialTrading } from "@/contexts/SocialTradingContext";
import type { TraderSummary } from "@/lib/social";
import { computeTraderWinRate, getTraderDisplayName } from "@/lib/social";
import CountryFlag from "@/components/ui/CountryFlag";
import { getCountryOptionByName } from "@/lib/countries";

type LeaderboardTrader = TraderSummary & {
  rankedProfit: number;
  rankedTrades: number;
  rankedWins: number;
  winRate: number;
};

type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "all";

const PERIODS: Array<{ id: LeaderboardPeriod; label: string }> = [
  { id: "daily", label: "Day" },
  { id: "weekly", label: "Week" },
  { id: "monthly", label: "Month" },
  { id: "all", label: "All" },
];

const LEADERBOARD_SELECT_WITH_COUNTRY =
  "user_id, profit, status, closed_at, profiles(id, username, display_name, avatar_url, nationality, phone_country, vip_tier, followers_count, following_count, total_profit, total_trades, total_wins)";

const LEADERBOARD_SELECT_FALLBACK =
  "user_id, profit, status, closed_at, profiles(id, username, display_name, avatar_url, vip_tier, followers_count, following_count, total_profit, total_trades, total_wins)";

const isMissingCountryColumnError = (error: unknown) => {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  return /(nationality|phone_country)/iu.test(message) && /(column|schema|not found|does not exist)/iu.test(message);
};

const hashSeed = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const getTraderCountryCode = (trader: Partial<TraderSummary>, offset = 0) => {
  const storedCountryCode = (trader.phone_country ?? trader.phoneCountry ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/u.test(storedCountryCode)) {
    return storedCountryCode;
  }

  const nationalityCode = getCountryOptionByName(trader.nationality)?.code;
  if (nationalityCode) {
    return nationalityCode;
  }

  const fallbackCodes = ["KE", "NG", "ZA", "GB", "US", "FR", "BR", "IN", "TR", "AE", "CA", "AU", "DE", "JP", "KR", "MX", "EG", "SA"];
  const seed = trader.id || trader.username || trader.display_name || "trader";
  return fallbackCodes[(hashSeed(seed) + offset) % fallbackCodes.length];
};

const getCutoff = (period: LeaderboardPeriod) => {
  const now = new Date();

  if (period === "daily") {
    const next = new Date(now);
    next.setDate(now.getDate() - 1);
    return next.toISOString();
  }

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
  if (rank === 1) return "bg-[#f9d54a] text-[#1b1f2d]";
  if (rank === 2) return "bg-[#d9e0eb] text-[#1b1f2d]";
  if (rank === 3) return "bg-[#f0a44a] text-[#1b1f2d]";
  return "bg-transparent text-white/45";
};

const FlagBadge = ({ code, size = 16, className = "" }: { code: string; size?: number; className?: string }) => (
  <span className={`inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-black/35 ${className}`}>
    <CountryFlag code={code} size={size} className="rounded-full" />
  </span>
);

const FlagStack = ({ trader }: { trader: Partial<TraderSummary> }) => (
  <span className="flex shrink-0 items-center">
    <FlagBadge code={getTraderCountryCode(trader)} size={16} />
  </span>
);

const Avatar = ({ trader }: { trader: Partial<TraderSummary> }) => {
  const fallback = getTraderDisplayName(trader).charAt(0).toUpperCase();

  if (trader.avatar_url) {
    return (
      <img
        src={trader.avatar_url}
        alt={getTraderDisplayName(trader)}
        className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10"
      />
    );
  }

  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#252a37] text-[10px] font-black text-white ring-1 ring-white/8">
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
  const [period, setPeriod] = useState<LeaderboardPeriod>("daily");
  const [traders, setTraders] = useState<LeaderboardTrader[]>([]);

  useEffect(() => {
    const fetchLeaders = async () => {
      setLoading(true);
      const cutoff = getCutoff(period);

      const runLeaderboardQuery = (selectClause: string) => {
        let query = supabase
          .from("trades")
          .select(selectClause)
          .neq("status", "open")
          .order("closed_at", { ascending: false })
          .limit(500);

        if (cutoff) {
          query = query.gte("closed_at", cutoff);
        }

        return query;
      };

      let { data, error } = await runLeaderboardQuery(LEADERBOARD_SELECT_WITH_COUNTRY);

      if (error && isMissingCountryColumnError(error)) {
        const fallbackResult = await runLeaderboardQuery(LEADERBOARD_SELECT_FALLBACK);
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        setTraders([]);
        setLoading(false);
        return;
      }

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
        .slice(0, 30);

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
  const currentUserCountry = getTraderCountryCode({
    id: profile?.id,
    username: profile?.username,
    display_name: profile?.display_name,
    nationality: profile?.nationality,
    phone_country: profile?.phone_country,
    phoneCountry: profile?.phoneCountry,
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#191d29] text-white">
      <div className="flex h-[58px] shrink-0 items-center gap-2 border-b border-white/[0.08] px-3">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Close leaderboard"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-black leading-none text-white">Leader Board</div>
          <div className="mt-1 text-[11px] font-semibold text-white/42">of the {period === "daily" ? "Day" : PERIODS.find((item) => item.id === period)?.label}</div>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Close leaderboard"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="shrink-0 border-b border-white/[0.08] px-3 py-2.5">
        <div className="rounded-[5px] bg-[#242837] px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <FlagBadge code={currentUserCountry} size={17} />
              <span className="truncate text-[12px] font-black text-white">{currentUserLabel}</span>
            </div>
            <span className="shrink-0 text-[12px] font-black text-[#00c977]">{formatLeaderboardProfit(currentUserProfit)}</span>
          </div>
          <div className="mt-2 text-[10px] font-bold text-white/48">Your position: {currentUserPosition}</div>
        </div>

        <div className="mt-2 flex items-center gap-2 rounded-[5px] bg-[#0e2a4e] px-2.5 py-2 text-left">
          <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#f4b43e]/18 text-[#f4b43e]">
            <HelpCircle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-black text-[#4da3ff]">How does this rating work?</div>
            <div className="mt-0.5 truncate text-[10px] text-white/45">Closed trades update this list automatically.</div>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          {PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={`rounded-[5px] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] transition-colors ${
                period === item.id
                  ? "bg-[#0e8beb] text-white"
                  : "bg-[#222633] text-white/45 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0fa053]/25 border-t-[#0fa053]" />
          </div>
        ) : rankedRows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.04] text-white/35">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="mt-3 text-[13px] font-black text-white">No leaders yet</div>
            <p className="mt-1.5 text-[11px] leading-5 text-white/42">
              Closed trades will appear here as soon as traders finish positions.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {rankedRows.map((trader) => {
              const following = isFollowing(trader.id);
              const isSelf = trader.id === currentUserId;
              const profitClass = trader.rankedProfit >= 0 ? "text-[#00c977]" : "text-[#ff6f6f]";

              return (
                <div key={trader.id} className="group flex h-[44px] items-center gap-2">
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${getRankBadgeClass(trader.rank)}`}>
                    {trader.rank}
                  </div>

                  <div className="flex shrink-0 items-center">
                    <Avatar trader={trader} />
                    <span className="-ml-2 mt-4">
                      <FlagStack trader={trader} />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-bold text-white">{getTraderDisplayName(trader)}</div>
                    <div className="mt-0.5 truncate text-[9px] font-semibold text-white/32">
                      {isSelf ? "you" : `${trader.winRate}% wins`} - {trader.rankedTrades} trades
                    </div>
                  </div>

                  {!isSelf ? (
                    <button
                      type="button"
                      onClick={() => void (following ? unfollowTrader(trader.id) : followTrader(trader.id))}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border opacity-0 transition-all group-hover:opacity-100 ${
                        following
                          ? "border-[#00c977]/35 bg-[#00c977]/14 text-[#00c977]"
                          : "border-white/[0.08] bg-white/[0.04] text-white/45 hover:text-white"
                      }`}
                      aria-label={following ? `Unfollow ${getTraderDisplayName(trader)}` : `Follow ${getTraderDisplayName(trader)}`}
                    >
                      {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                    </button>
                  ) : null}

                  <div className={`w-[76px] shrink-0 text-right text-[11px] font-black ${profitClass}`}>
                    {formatLeaderboardProfit(trader.rankedProfit)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="shrink-0 border-t border-white/[0.08] px-3 py-2.5">
          <a
            href="/social/traders"
            className="flex items-center justify-center gap-2 rounded-[5px] bg-[#0fa053]/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-[#0fa053] transition-colors hover:bg-[#0fa053]/25"
          >
            <Trophy className="h-3.5 w-3.5" />
            View Full Leaderboard
          </a>
        </div>
      </div>    </div>
  );
};
