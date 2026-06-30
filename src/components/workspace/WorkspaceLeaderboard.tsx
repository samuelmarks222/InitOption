import { useMemo, useState } from "react";
import { Bell, BellOff, ChevronDown, Eye, EyeOff, MessageCircle, Star, Trophy, Users, X } from "lucide-react";
import { toast } from "sonner";
import { TraderProfile } from "./TraderProfile";
import type { CopySettings } from "./TraderProfile";

const FIRST_NAMES = [
  "James","Mary","John","Patricia","Robert","Jennifer","Michael","Linda","David","Elizabeth",
  "William","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah","Christopher","Karen",
  "Charles","Lisa","Daniel","Nancy","Matthew","Betty","Anthony","Margaret","Mark","Sandra",
  "Donald","Ashley","Steven","Dorothy","Paul","Kimberly","Andrew","Emily","Joshua","Donna",
  "Kenneth","Michelle","Kevin","Carol","Brian","Amanda","George","Melissa","Timothy","Deborah",
  "Ronald","Stephanie","Edward","Rebecca","Jason","Sharon","Jeffrey","Laura","Ryan","Cynthia",
  "Jacob","Kathleen","Gary","Amy","Nicholas","Angela","Eric","Shirley","Jonathan","Anna",
  "Stephen","Brenda","Larry","Pamela","Justin","Emma","Scott","Nicole","Brandon","Helen",
  "Benjamin","Samantha","Samuel","Katherine","Raymond","Christine","Gregory","Debra","Frank",
  "Rachel","Alexander","Carolyn","Patrick","Janet","Jack","Catherine","Dennis","Maria",
  "Jeremy","Heather","Ahmed","Fatima","Omar","Aisha","Kwame","Zara","Chen","Maria",
  "Carlos","Priya","Yusuf","Lindiwe","Chloe","David","Sofia","Hassan","Naledi","Rajesh",
];

const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin",
  "Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson",
  "Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
  "Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts",
  "Gomez","Phillips","Evans","Turner","Diaz","Parker","Cruz","Edwards","Collins","Reyes",
];

const COUNTRIES = [
  "US","GB","CA","AU","DE","FR","IT","ES","NL","SE","NO","DK","FI","BR","AR","MX",
  "CO","CL","ZA","NG","KE","GH","EG","MA","TN","AE","SA","IN","PK","BD","JP","KR",
  "CN","TH","VN","MY","SG","RU","TR","PL","CZ","HU","RO","UA","GR","PT","IE","CH",
  "AT","BE","IL","PH","ID","NZ","PE","VE",
];

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1103515245, s) + 12345) >>> 0;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

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

const TOTAL_TRADERS = 12845;
const ASSETS = ["EUR/USD","GBP/USD","Gold","Bitcoin","Oil","NASDAQ","Silver","Apple","Tesla","Amazon"];
const EXPIRATIONS = ["30 sec","1 min","5 min","15 min"];
const DIRECTIONS = ["Higher","Lower"];
const EXPERIENCES = ["Beginner","Intermediate","Professional"];

function generateTraders(): TraderData[] {
  const rng = seededRandom(99);
  const traders: TraderData[] = [];
  for (let i = 0; i < TOTAL_TRADERS; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const name = `${fn} ${ln}`;
    const country = COUNTRIES[Math.floor(rng() * COUNTRIES.length)];
    const flagUrl = `https://flagcdn.com/w160/${country.toLowerCase()}.png`;
    const totalTrades = Math.floor(rng() * 5000 + 50);
    const wins = Math.floor(totalTrades * (0.35 + rng() * 0.55));
    const losses = totalTrades - wins;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const avgReturn = Number((rng() * 60 + 3).toFixed(1));
    // Heavy-tail profit distribution: most traders near zero, few very high
    const profitRaw = -Math.log(1 - rng() + 0.00001) * 48000;
    const profitJitter = (rng() - 0.5) * 35000;
    const isLoss = rng() < 0.08;
    const totalProfit = Number((isLoss ? -(Math.abs(profitRaw * rng() * 0.6) + 500) : profitRaw + profitJitter).toFixed(2));
    const todayProfit = Number(((rng() - 0.45) * 12000).toFixed(2));
    const highestWin = Number((rng() * 15000 + 200).toFixed(2));
    const longestStreak = Math.floor(rng() * 25 + 1);
    const currentStreak = Math.floor(rng() * 12);
    const avgDuration = Number((rng() * 30 + 1).toFixed(1));
    const avgAmount = Number((rng() * 500 + 10).toFixed(2));
    const numAssets = Math.floor(rng() * 8 + 2);
    const preferredAssets = [...ASSETS].sort(() => rng() - 0.5).slice(0, numAssets);
    const favExpirations = [...EXPIRATIONS].filter(() => rng() > 0.3);
    const experience = EXPERIENCES[Math.floor(rng() * EXPERIENCES.length)];
    const memberSince = `202${Math.floor(rng() * 5)}-${String(Math.floor(rng() * 12) + 1).padStart(2, "0")}-${String(Math.floor(rng() * 28) + 1).padStart(2, "0")}`;
    const isOnline = rng() > 0.4;
    const isVerified = rng() > 0.7;
    const followers = Math.floor(rng() * 5000 + 1);
    const successRate = Number((winRate * (0.85 + rng() * 0.3)).toFixed(1));
    const last30DaysProfit = Number(((rng() - 0.35) * 25000).toFixed(2));
    const riskLevel = ["Low","Medium","High"][Math.floor(rng() * 3)];
    const minCopyAmount = Number((rng() * 500 + 50).toFixed(2));

    const tradeCount = Math.floor(rng() * 20 + 5);
    const copyTrades = Array.from({ length: tradeCount }, (_, ti) => {
      const asset = ASSETS[Math.floor(rng() * ASSETS.length)];
      const direction = DIRECTIONS[Math.floor(rng() * 2)];
      const expiration = EXPIRATIONS[Math.floor(rng() * EXPIRATIONS.length)];
      const investment = Number((rng() * 200 + 5).toFixed(2));
      const result = rng() > 0.45 ? "Win" : "Loss";
      const payout = result === "Win" ? Number((investment * (1.5 + rng() * 0.8)).toFixed(2)) : 0;
      const profit = result === "Win" ? Number((payout - investment).toFixed(2)) : Number((-investment).toFixed(2));
      const daysAgo = Math.floor(rng() * 30);
      const date = new Date(Date.now() - daysAgo * 86400000 - Math.floor(rng() * 86400000));
      return { asset, direction, expiration, investment, payout, result, profit, date: date.toISOString() };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const dailyProfits = Array.from({ length: 30 }, () => Number(((rng() - 0.45) * 3000).toFixed(2)));
    const weeklyProfits = Array.from({ length: 12 }, () => Number(((rng() - 0.35) * 8000).toFixed(2)));
    const monthlyProfits = Array.from({ length: 12 }, () => Number(((rng() - 0.3) * 15000).toFixed(2)));

    traders.push({
      id: `tr-${i}`, name, country, flagUrl, totalProfit, todayProfit, winRate, totalTrades, wins, losses,
      avgReturn, highestWin, longestStreak, currentStreak, avgDuration, avgAmount,
      preferredAssets, favExpirations, experience, memberSince, isOnline, isVerified,
      followers, successRate, last30DaysProfit, riskLevel, minCopyAmount,
      copyTrades, dailyProfits, weeklyProfits, monthlyProfits,
    });
  }
  traders.sort((a, b) => b.totalProfit - a.totalProfit);
  return traders;
}

const ALL_TRADERS = generateTraders();

const formatProfit = (value: number) => {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface WorkspaceLeaderboardProps {
  onClose?: () => void;
}

export const WorkspaceLeaderboard = ({ onClose }: WorkspaceLeaderboardProps) => {
  const [selectedTrader, setSelectedTrader] = useState<TraderData | null>(null);
  const [watchingIds, setWatchingIds] = useState<Set<string>>(new Set());
  const [showWatching, setShowWatching] = useState(false);

  const watchedTraders = useMemo(
    () => ALL_TRADERS.filter((t) => watchingIds.has(t.id)),
    [watchingIds]
  );

  const displayTraders = showWatching ? watchedTraders : ALL_TRADERS.slice(0, 100);

  const handleCopyWithSettings = (id: string, settings?: CopySettings) => {
    if (settings) {
      toast.success(`Now copying ${ALL_TRADERS.find(t => t.id === id)?.name || id}`, {
        description: `$${settings.amount.toLocaleString()} investment, ${settings.riskMultiplier}x risk, max ${settings.maxLoss.toLocaleString()} daily loss`,
        duration: 5000,
      });
    } else {
      toast.success("Trader added to copy portfolio", {
        duration: 3000,
      });
    }
  };

  const handleWatch = (id: string) => {
    setWatchingIds((prev) => new Set(prev).add(id));
  };

  const handleUnwatch = (id: string) => {
    setWatchingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col text-white"
      style={{ background: "linear-gradient(180deg, #232637 0%, #282D41 100%)" }}
    >
      {/* Header */}
      <div className="flex h-[58px] shrink-0 items-center gap-2 border-b border-white/[0.06] px-4">
        {onClose ? (
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-black leading-none text-white">Leaders</span>
            <span className="rounded-full bg-[#26a69a]/12 px-2 py-0.5 text-[10px] font-bold text-[#26a69a]">
              {ALL_TRADERS.length.toLocaleString()} Traders
            </span>
            {watchingIds.size > 0 && (
              <span className="rounded-full bg-[#f4b742]/12 px-2 py-0.5 text-[10px] font-bold text-[#f4b742]">
                {watchingIds.size} Watching
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] font-semibold text-white/35">Today's Top Ranked Traders</div>
        </div>
      </div>

      {/* Dropdown + Watching toggle */}
      <div className="shrink-0 px-4 pt-3">
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2.5 transition-all hover:bg-white/[0.06]">
          <span className="text-[13px]">🥇</span>
          <span className="flex-1 text-[13px] font-medium text-white">Top ranked traders for 24h</span>
          <ChevronDown className="h-4 w-4 text-[#787b86]" />
        </div>

        {/* Watching toggle */}
        {watchingIds.size > 0 && (
          <button
            type="button"
            onClick={() => setShowWatching(!showWatching)}
            className="mt-2 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-semibold transition-all"
            style={{
              borderColor: showWatching ? "#26a69a" : "rgba(255,255,255,0.06)",
              background: showWatching ? "rgba(38,166,154,0.08)" : "rgba(255,255,255,0.03)",
              color: showWatching ? "#26a69a" : "#787b86",
            }}
          >
            {showWatching ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showWatching ? `Show All Traders` : `View Watching List (${watchingIds.size})`}
          </button>
        )}
      </div>

      {/* REAL TRADING subheader */}
      <div className="shrink-0 px-4 pt-3 pb-1">
        <div className="flex items-center justify-center rounded-md bg-white/[0.03] py-2">
          <span className="text-[11px] font-bold tracking-[1.5px] text-[#787b86]/60">
            {showWatching ? "WATCHING" : "REAL TRADING"}
          </span>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
        {displayTraders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#787b86]">
            <Users className="mb-2 h-8 w-8 opacity-30" />
            <p className="text-[13px]">No watched traders yet</p>
            <p className="mt-1 text-[11px]">Click Watch on a trader profile to start following</p>
          </div>
        ) : (
          displayTraders.map((trader, idx) => {
            const isPositive = trader.totalProfit >= 0;
            const isWatched = watchingIds.has(trader.id);
            const rowBg = idx % 2 === 0 ? "#282D41" : "#232637";

            return (
              <div
                key={trader.id}
                onClick={() => setSelectedTrader(trader)}
                className="group flex cursor-pointer items-center gap-3 px-3 py-3 transition-all hover:brightness-[1.15] active:scale-[0.99]"
                style={{ background: rowBg }}
              >
                {/* Avatar with status badge */}
                <div className="relative shrink-0">
                  <img
                    src={trader.flagUrl}
                    alt=""
                    className="h-10 w-10 rounded-full border border-white/[0.08] object-cover ring-1 ring-white/[0.04] transition-all group-hover:ring-[#26a69a]/30"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white/[0.15] bg-[#26a69a]" />
                  {isWatched && (
                    <span className="absolute -bottom-0.5 -left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#f4b742] border-2 border-white/[0.15]">
                      <Star className="h-2 w-2 text-white" />
                    </span>
                  )}
                </div>

                {/* User info */}
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] font-semibold text-[#f1f2f4] group-hover:text-white">{trader.name}</span>
                    <div className="flex items-center gap-2">
                      {isWatched && (
                        <span className="shrink-0 rounded-full bg-[#f4b742]/12 px-1.5 py-0.5 text-[8px] font-bold text-[#f4b742]">WATCHING</span>
                      )}
                      <span className={`text-[13px] font-bold ${isPositive ? "text-[#26a69a]" : "text-[#ef5350]"}`}>{formatProfit(trader.totalProfit)}</span>
                    </div>
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-[#787b86]">
                    <span>Number of trades:</span>
                    <span>Profitable trades</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px] font-bold text-[#d1d4dc]">{trader.totalTrades.toLocaleString()}</span>
                    <span className="text-[12px] font-bold text-[#d1d4dc]">{trader.winRate.toFixed(0)}%</span>
                  </div>
                </div>


              </div>
            );
          })
        )}
      </div>

      {/* Trader Profile Modal */}
      {selectedTrader && (
        <TraderProfile
          trader={selectedTrader}
          onClose={() => setSelectedTrader(null)}
          onCopy={handleCopyWithSettings}
          onWatch={handleWatch}
          onUnwatch={handleUnwatch}
          isWatched={watchingIds.has(selectedTrader.id)}
        />
      )}
    </div>
  );
};
