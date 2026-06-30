import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { TraderProfile } from "./TraderProfile";

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

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  return hash >>> 0;
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
    const totalTrades = Math.floor(rng() * 1500 + 10);
    const wins = Math.floor(totalTrades * (0.45 + rng() * 0.4));
    const losses = totalTrades - wins;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const avgReturn = Number((rng() * 35 + 5).toFixed(1));
    const totalProfit = Number(((rng() - 0.2) * 85000).toFixed(2));
    const todayProfit = Number(((rng() - 0.3) * 2500).toFixed(2));
    const highestWin = Number((rng() * 5000 + 100).toFixed(2));
    const longestStreak = Math.floor(rng() * 18 + 1);
    const currentStreak = Math.floor(rng() * 8);
    const avgDuration = Number((rng() * 14 + 1).toFixed(1));
    const avgAmount = Number((rng() * 200 + 10).toFixed(2));
    const numAssets = Math.floor(rng() * 5 + 2);
    const preferredAssets = [...ASSETS].sort(() => rng() - 0.5).slice(0, numAssets);
    const favExpirations = [...EXPIRATIONS].filter(() => rng() > 0.3);
    const experience = EXPERIENCES[Math.floor(rng() * EXPERIENCES.length)];
    const memberSince = `202${Math.floor(rng() * 5)}-${String(Math.floor(rng() * 12) + 1).padStart(2, "0")}-${String(Math.floor(rng() * 28) + 1).padStart(2, "0")}`;
    const isOnline = rng() > 0.4;
    const isVerified = rng() > 0.7;
    const followers = Math.floor(rng() * 5000 + 1);
    const successRate = Number((winRate * (0.85 + rng() * 0.3)).toFixed(1));
    const last30DaysProfit = Number(((rng() - 0.25) * 12000).toFixed(2));
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#131722] text-white">
      {/* Header */}
      <div className="flex h-[58px] shrink-0 items-center gap-2 border-b border-white/[0.08] px-4">
        {onClose ? (
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-black leading-none text-white">Leaders</span>
            <span className="rounded-full bg-[#00e676]/12 px-2 py-0.5 text-[10px] font-bold text-[#00e676]">
              {ALL_TRADERS.length.toLocaleString()} Traders
            </span>
          </div>
          <div className="mt-0.5 text-[11px] font-semibold text-white/42">Today's Top Ranked Traders</div>
        </div>
      </div>

      {/* Dropdown */}
      <div className="shrink-0 px-4 pt-3">
        <div className="flex items-center gap-2 rounded-lg bg-[#1e2235] border border-[#2a3045] px-3 py-2.5">
          <span className="text-[13px]">🥇</span>
          <span className="flex-1 text-[13px] font-medium text-white">Top ranked traders for 24h</span>
          <ChevronDown className="h-4 w-4 text-[#787b86]" />
        </div>
      </div>

      {/* REAL TRADING subheader */}
      <div className="shrink-0 px-4 pt-3 pb-1">
        <div className="flex items-center justify-center rounded-md bg-[#1e2235]/60 py-2">
          <span className="text-[11px] font-bold tracking-[1.5px] text-[#787b86]">REAL TRADING</span>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-white/[0.04] px-4">
        {ALL_TRADERS.slice(0, 100).map((trader) => {
          const isPositive = trader.totalProfit >= 0;

          return (
            <div
              key={trader.id}
              onClick={() => setSelectedTrader(trader)}
              className="flex cursor-pointer items-center gap-3 py-3 transition-colors hover:bg-white/[0.02]"
            >
              {/* Avatar with status badge */}
              <div className="relative shrink-0">
                <img
                  src={trader.flagUrl}
                  alt=""
                  className="h-10 w-10 rounded-full border border-[#2a3045] object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#131722] bg-[#26a69a]" />
              </div>

              {/* User info */}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-[#f1f2f4]">{trader.name}</div>
                <div className="mt-0.5">
                  <span className="text-[11px] text-[#787b86]">Number of trades: </span>
                  <span className="text-[12px] font-bold text-[#d1d4dc]">{trader.totalTrades.toLocaleString()}</span>
                </div>
              </div>

              {/* Right metrics */}
              <div className="shrink-0 text-right">
                <div className="text-[14px] font-bold text-[#26a69a]">{formatProfit(trader.totalProfit)}</div>
                <div className="mt-0.5">
                  <span className="text-[11px] text-[#787b86]">Profitable trades: </span>
                  <span className="text-[12px] font-bold text-[#d1d4dc]">{trader.winRate.toFixed(0)}%</span>
                </div>
              </div>

              {/* Copy button on hover */}
              <button
                type="button"
                onClick={(e) => handleCopy(e, trader.id)}
                className={`ml-1 shrink-0 rounded-md px-2.5 py-1.5 text-[10px] font-bold transition-all ${
                  copiedId === trader.id
                    ? "bg-[#26a69a] text-white"
                    : "border border-[#26a69a]/30 text-[#26a69a] hover:bg-[#26a69a]/10"
                }`}
              >
                {copiedId === trader.id ? "Copied!" : "Copy"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Trader Profile Modal */}
      {selectedTrader && (
        <TraderProfile
          trader={selectedTrader}
          onClose={() => setSelectedTrader(null)}
          onCopy={(id) => console.log("Copy trader:", id)}
        />
      )}
    </div>
  );
};
