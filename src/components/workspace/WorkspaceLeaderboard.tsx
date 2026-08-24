import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, ChevronDown, HelpCircle, Trophy, Users, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/integrations/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialTrading } from "@/contexts/SocialTradingContext";
import CountryFlag from "@/components/ui/CountryFlag";
import { getCountryOptionByName } from "@/lib/countries";
import { getUnreadCount, subscribe } from "./chatUnreadStore";
import { TraderProfile } from "./TraderProfile";
import type { CopySettings } from "./TraderProfile";

export type TraderData = {
  id: string;
  name: string;
  country: string;
  flagUrl: string;
  totalProfit: number;
  todayProfit: number;
  winRate: number;
  totalTrades: number;
  wins: number;
  losses: number;
  avgReturn: number;
  highestWin: number;
  longestStreak: number;
  currentStreak: number;
  avgDuration: number;
  avgAmount: number;
  preferredAssets: string[];
  favExpirations: string[];
  experience: string;
  memberSince: string;
  isOnline: boolean;
  isVerified: boolean;
  followers: number;
  successRate: number;
  last30DaysProfit: number;
  riskLevel: string;
  minCopyAmount: number;
  copyTrades: { asset: string; direction: string; expiration: string; investment: number; payout: number; result: string; profit: number; date: string }[];
  dailyProfits: number[];
  weeklyProfits: number[];
  monthlyProfits: number[];
};

type LeaderProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  nationality: string | null;
  phone_country: string | null;
  total_profit: number | null;
  total_trades: number | null;
  total_wins: number | null;
  followers_count: number | null;
  created_at: string | null;
  vip_tier: string | null;
};

type TradeRow = {
  amount: number | null;
  asset_symbol: string | null;
  closed_at: string | null;
  direction: string | null;
  expiry_seconds: number | null;
  profit: number | null;
  status: string | null;
  user_id: string;
  profiles: LeaderProfile | LeaderProfile[] | null;
};

const profileName = (profile?: Partial<LeaderProfile> | null) =>
  profile?.display_name || profile?.username || (profile?.id ? `#${String(profile.id).slice(0, 8)}` : "Trader");

const hashSeed = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const getCountryCode = (profile?: Partial<LeaderProfile> | null, offset = 0) => {
  const stored = String(profile?.phone_country ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(stored)) return stored;
  const national = getCountryOptionByName(profile?.nationality ?? null)?.code;
  if (national) return national;
  const fallbackCodes = ["KE", "NG", "ZA", "GB", "US", "FR", "BR", "IN", "TR", "AE", "CA", "AU"];
  const seed = profile?.id || profile?.username || profile?.display_name || "trader";
  return fallbackCodes[(hashSeed(seed) + offset) % fallbackCodes.length];
};

const flagUrlFor = (code: string) => `https://flagcdn.com/w160/${code.toLowerCase()}.png`;

const formatMoney = (value: number, showPlus = false) => {
  const sign = showPlus && value > 0 ? "+" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const toTraderData = (profile: LeaderProfile, index: number, totals?: Partial<TraderData>): TraderData => {
  const totalTrades = Number(totals?.totalTrades ?? profile.total_trades ?? 0);
  const wins = Number(totals?.wins ?? profile.total_wins ?? 0);
  const losses = Math.max(0, totalTrades - wins);
  const totalProfit = Number(totals?.totalProfit ?? profile.total_profit ?? 0);
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const country = getCountryCode(profile, index);

  return {
    id: profile.id,
    name: profileName(profile),
    country,
    flagUrl: profile.avatar_url || flagUrlFor(country),
    totalProfit,
    todayProfit: Number(totals?.todayProfit ?? 0),
    winRate,
    totalTrades,
    wins,
    losses,
    avgReturn: totalTrades > 0 ? Number((Math.max(totalProfit, 0) / Math.max(totalTrades, 1)).toFixed(1)) : 0,
    highestWin: Number(totals?.highestWin ?? Math.max(totalProfit, 0)),
    longestStreak: Number(totals?.longestStreak ?? 0),
    currentStreak: Number(totals?.currentStreak ?? 0),
    avgDuration: Number(totals?.avgDuration ?? 1),
    avgAmount: Number(totals?.avgAmount ?? 1),
    preferredAssets: totals?.preferredAssets ?? [],
    favExpirations: totals?.favExpirations ?? ["1 min"],
    experience: profile.vip_tier || (totalTrades > 100 ? "Professional" : totalTrades > 20 ? "Intermediate" : "Beginner"),
    memberSince: profile.created_at || new Date().toISOString(),
    isOnline: true,
    isVerified: true,
    followers: Number(profile.followers_count ?? 0),
    successRate: winRate,
    last30DaysProfit: totalProfit,
    riskLevel: "Medium",
    minCopyAmount: 1,
    copyTrades: totals?.copyTrades ?? [],
    dailyProfits: [],
    weeklyProfits: [],
    monthlyProfits: [],
  };
};

interface WorkspaceLeaderboardProps {
  onClose?: () => void;
}

export const WorkspaceLeaderboard = ({ onClose }: WorkspaceLeaderboardProps) => {
  const { profile } = useAuth();
  const { followTrader, unfollowTrader, isFollowing, saveCopySetting } = useSocialTrading();
  const [leaders, setLeaders] = useState<TraderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrader, setSelectedTrader] = useState<TraderData | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [, setUnreadTick] = useState(0);

  useEffect(() => {
    const unsub = subscribe(() => setUnreadTick((value) => value + 1));
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchLeaders = async () => {
      setLoading(true);
      try {
        const { data: profiles, error } = await api
          .from("profiles")
          .select("id, username, display_name, avatar_url, nationality, phone_country, total_profit, total_trades, total_wins, followers_count, created_at, vip_tier")
          .gt("total_trades", 0)
          .order("total_profit", { ascending: false })
          .limit(100);

        if (error) throw error;

        const profileList = (Array.isArray(profiles) ? profiles : []) as LeaderProfile[];
        
        let nextLeaders = profileList.map((item, index) => toTraderData(item, index));

        if (nextLeaders.length === 0) {
          const { data: fallbackProfiles } = await api
            .from("profiles")
            .select("id, username, display_name, avatar_url, nationality, phone_country, total_profit, total_trades, total_wins, followers_count, created_at, vip_tier")
            .order("total_profit", { ascending: false })
            .limit(50);
          nextLeaders = (Array.isArray(fallbackProfiles) ? fallbackProfiles : [] as LeaderProfile[]).map((item, index) => toTraderData(item, index));
        }

        if (!cancelled) {
          setLeaders(nextLeaders.sort((a, b) => b.totalProfit - a.totalProfit));
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to load leaderboard", error);
          const fallbackProfile = profile
            ? toTraderData({
                id: profile.id,
                username: profile.username ?? null,
                display_name: profile.display_name ?? null,
                avatar_url: profile.avatar_url ?? null,
                nationality: profile.nationality ?? null,
                phone_country: profile.phone_country ?? null,
                total_profit: Number(profile.total_profit ?? 0),
                total_trades: Number(profile.total_trades ?? 0),
                total_wins: Number(profile.total_wins ?? 0),
                followers_count: Number(profile.followers_count ?? 0),
                created_at: profile.created_at ?? null,
                vip_tier: profile.vip_tier ?? null,
              }, 0)
            : null;
          setLeaders(fallbackProfile ? [fallbackProfile] : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchLeaders();
    return () => {
      cancelled = true;
    };
  }, [period, profile]);

  const currentUserRow = useMemo(() => {
    if (!profile?.id) return null;
    return leaders.find((leader) => leader.id === profile.id) ?? toTraderData({
      id: profile.id,
      username: profile.username ?? null,
      display_name: profile.display_name ?? null,
      avatar_url: profile.avatar_url ?? null,
      nationality: profile.nationality ?? null,
      phone_country: profile.phone_country ?? null,
      total_profit: Number(profile.total_profit ?? 0),
      total_trades: Number(profile.total_trades ?? 0),
      total_wins: Number(profile.total_wins ?? 0),
      followers_count: Number(profile.followers_count ?? 0),
      created_at: profile.created_at ?? null,
      vip_tier: profile.vip_tier ?? null,
    }, leaders.length);
  }, [leaders, profile]);

  const currentUserRank = currentUserRow ? leaders.findIndex((leader) => leader.id === currentUserRow.id) + 1 : 0;

  const handleCopyWithSettings = async (id: string, settings?: CopySettings) => {
    const trader = leaders.find((leader) => leader.id === id);
    await saveCopySetting(id, {
      enabled: true,
      amountType: "fixed",
      executionMode: "manual",
      fixedAmount: settings?.amount ?? trader?.minCopyAmount ?? 1,
      maxDaily: settings?.maxLoss ?? 100,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#1b2030] text-white">
      <div className="flex h-[68px] shrink-0 items-center gap-2 px-3">
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-[4px] text-white transition-colors hover:bg-white/[0.06]"
          aria-label="Back from leaderboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-[20px] font-black leading-6 text-white">Leader Board</h2>
          <p className="text-[12px] font-bold text-[#6f7787]">of the {period === "day" ? "Day" : period === "week" ? "Week" : "Month"}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-[4px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
          aria-label="Close leaderboard"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={() => setPeriod((value) => (value === "day" ? "week" : value === "week" ? "month" : "day"))}
          className="flex h-[38px] w-full items-center justify-between rounded-[4px] bg-[#2a2f40] px-3 text-[12px] font-black text-white"
        >
          <span>{period === "day" ? "Top ranked traders for 24h" : period === "week" ? "Top ranked traders for 7 days" : "Top ranked traders for 30 days"}</span>
          <ChevronDown className="h-4 w-4 text-white/60" />
        </button>
      </div>

      {currentUserRow && (
        <div className="mx-4 mb-3 rounded-[4px] bg-[#2a2f40] px-3 py-3">
          <div className="flex items-center gap-2">
            <CountryFlag code={currentUserRow.country} size={18} className="rounded-full" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-black text-white">#{profile?.username || currentUserRow.name}</span>
            <span className="text-[13px] font-black text-[#00c878]">{formatMoney(currentUserRow.totalProfit)}</span>
          </div>
          <div className="mt-3 text-[11px] font-black text-[#8a93a5]">Your position: {currentUserRank > 0 ? currentUserRank : "-"}</div>
        </div>
      )}

      <button
        type="button"
        className="mx-4 mb-5 flex h-[40px] shrink-0 items-center gap-3 rounded-[4px] bg-[#0b3b67] px-4 text-left text-[13px] font-black text-[#1597ff]"
      >
        <BarChart3 className="h-5 w-5 text-[#f5c84b]" />
        How does this rating work?
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 no-scrollbar">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[13px] font-bold text-white/55">Loading leaderboard...</div>
        ) : leaders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/55">
            <Users className="h-9 w-9 opacity-40" />
            <p className="text-[13px] font-bold">No ranked traders yet.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {leaders.map((trader, index) => {
              const unread = getUnreadCount(trader.id);
              return (
                <button
                  key={trader.id}
                  type="button"
                  onClick={() => setSelectedTrader(trader)}
                  className="flex h-[45px] w-full items-center gap-2 border-b border-white/[0.055] text-left transition-colors hover:bg-white/[0.035]"
                >
                  <span
                    className={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                      index === 0 ? "bg-[#f8d34d] text-[#4d3b00]" : index === 1 ? "bg-[#e6e8ee] text-[#383b44]" : index === 2 ? "bg-[#f5a13d] text-[#422000]" : "bg-transparent text-[#8c95a8]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="relative flex h-5 w-8 shrink-0 items-center">
                    <CountryFlag code={trader.country} size={18} className="rounded-full" />
                    <span className="absolute left-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#283044] text-[9px] font-black text-white ring-2 ring-[#1b2030]">
                      {trader.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-black text-white">
                    {trader.name}
                    {unread > 0 && <span className="ml-1 rounded-full bg-[#ef5350] px-1 text-[9px]">{unread > 9 ? "9+" : unread}</span>}
                  </span>
                  <span className="shrink-0 text-[12px] font-black text-[#00c878]">{formatMoney(trader.totalProfit)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedTrader && (
        <TraderProfile
          trader={selectedTrader}
          onClose={() => setSelectedTrader(null)}
          onCopy={handleCopyWithSettings}
          onWatch={(id) => {
            void followTrader(id);
            toast.success("Trader added to your watch list");
          }}
          onUnwatch={(id) => {
            void unfollowTrader(id);
          }}
          isWatched={isFollowing(selectedTrader.id)}
        />
      )}
    </div>
  );
};
