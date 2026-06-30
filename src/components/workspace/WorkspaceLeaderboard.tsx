import { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowUpDown, ChevronDown, Copy, Medal, Search, SortAsc, TrendingDown, TrendingUp, Trophy, User, Users,
} from "lucide-react";
import CountryFlag from "@/components/ui/CountryFlag";
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

const ICON_COLORS = [
  "#f44336","#e91e63","#9c27b0","#673ab7","#3f51b5","#2196f3","#03a9f4","#00bcd4",
  "#009688","#4caf50","#8bc34a","#cddc39","#ffc107","#ff9800","#ff5722","#795548",
  "#607d8b","#1abc9c","#3498db","#9b59b6","#e67e22","#2ecc71","#e74c3c","#1b8ffa",
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
const ACHIEVEMENTS_LIST = ["Top Trader","High Win Rate","Consistent Performer","Weekly Champion","Monthly Champion","100 Winning Trades","1,000 Completed Trades","Elite Trader"];

function generateTraders(): TraderData[] {
  const rng = seededRandom(99);
  const traders: TraderData[] = [];
  for (let i = 0; i < TOTAL_TRADERS; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const name = `${fn} ${ln}`;
    const country = COUNTRIES[Math.floor(rng() * COUNTRIES.length)];
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
      id: `tr-${i}`, name, country, totalProfit, todayProfit, winRate, totalTrades, wins, losses,
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

type SortField = "rank" | "profit" | "winRate" | "trades" | "todayProfit";

const formatProfit = (value: number) => {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getRankStyle = (rank: number) => {
  if (rank === 1) return { bg: "bg-yellow-400/20 text-yellow-400 border-yellow-400/40", icon: <Trophy className="h-3.5 w-3.5" /> };
  if (rank === 2) return { bg: "bg-slate-300/20 text-slate-300 border-slate-300/40", icon: <Medal className="h-3.5 w-3.5" /> };
  if (rank === 3) return { bg: "bg-amber-600/20 text-amber-600 border-amber-600/40", icon: <Medal className="h-3.5 w-3.5" /> };
  return { bg: "bg-transparent text-[#7a8aa8] border-transparent", icon: null };
};

interface WorkspaceLeaderboardProps {
  onClose?: () => void;
}

export const WorkspaceLeaderboard = ({ onClose }: WorkspaceLeaderboardProps) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("profit");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedTrader, setSelectedTrader] = useState<TraderData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const pageSize = 25;

  const filtered = useMemo(() => {
    let list = ALL_TRADERS;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "profit") cmp = a.totalProfit - b.totalProfit;
      else if (sortField === "winRate") cmp = a.winRate - b.winRate;
      else if (sortField === "trades") cmp = a.totalTrades - b.totalTrades;
      else if (sortField === "todayProfit") cmp = a.todayProfit - b.todayProfit;
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [search, sortField, sortAsc]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(field === "rank"); }
    setPage(1);
  };

  const handleCopy = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const SortHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
    <button
      type="button"
      onClick={() => toggleSort(field)}
      className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#7a8aa8] transition-colors hover:text-white", className)}
    >
      {label}
      <ArrowUpDown className={cn("h-3 w-3", sortField === field && "text-[#00b95b]")} />
    </button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#191d29] text-white">
      {/* Header */}
      <div className="flex h-[58px] shrink-0 items-center gap-2 border-b border-white/[0.08] px-3">
        {onClose ? (
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white" aria-label="Close">
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-black leading-none text-white">Leaderboard</span>
            <span className="rounded-full bg-[#00b95b]/12 px-2 py-0.5 text-[10px] font-bold text-[#00b95b]">
              {ALL_TRADERS.toLocaleString()} Traders
            </span>
          </div>
          <div className="mt-1 text-[11px] font-semibold text-white/42">Today's Top Traders</div>
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0 border-b border-white/[0.08] px-3 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by username..."
            className="w-full rounded-[8px] border border-white/[0.1] bg-[#242837] py-2.5 pl-10 pr-4 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-[#007aff]/50"
          />
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
        <SortHeader field="rank" label="#" className="w-8 justify-center" />
        <span className="w-7" />
        <span className="w-6" />
        <span className="flex-1">Trader</span>
        <SortHeader field="profit" label="Total P/L" className="w-[90px] justify-end" />
        <SortHeader field="todayProfit" label="Today" className="w-[80px] justify-end" />
        <SortHeader field="winRate" label="Win Rate" className="w-[65px] justify-end" />
        <SortHeader field="trades" label="Trades" className="w-[55px] justify-end" />
        <span className="w-[80px] text-right">Action</span>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-white/[0.06]">
        {paginated.map((trader, idx) => {
          const rank = (page - 1) * pageSize + idx + 1;
          const isPositive = trader.totalProfit >= 0;
          const todayPositive = trader.todayProfit >= 0;
          const initial = trader.name.charAt(0).toUpperCase();
          const iconColor = ICON_COLORS[hashCode(trader.id) % ICON_COLORS.length];
          const rankStyle = getRankStyle(rank);

          return (
            <div
              key={trader.id}
              onClick={() => setSelectedTrader(trader)}
              className="flex cursor-pointer items-center gap-2 px-3 py-3 transition-colors hover:bg-white/[0.03]"
            >
              {/* Rank */}
              <div className={`flex w-8 shrink-0 items-center justify-center gap-1 text-[12px] font-black ${rankStyle.bg}`}>
                {rankStyle.icon}
                {rank <= 3 ? "" : rank}
              </div>

              {/* Profile Icon */}
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ring-1 ring-white/10"
                style={{ background: iconColor }}
              >
                {initial}
              </div>

              {/* Country Flag */}
              <div className="w-6 shrink-0">
                <CountryFlag code={trader.country} size={20} className="rounded-full ring-1 ring-black/20" />
              </div>

              {/* Username */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[12px] font-bold text-white">{trader.name}</span>
                  {trader.isVerified && (
                    <span className="shrink-0 rounded-full bg-[#007aff]/12 px-1.5 py-0.5 text-[8px] font-bold text-[#007aff]">VERIFIED</span>
                  )}
                </div>
              </div>

              {/* Total Profit */}
              <span className={`w-[90px] shrink-0 text-right text-[12px] font-black tabular-nums ${isPositive ? "text-[#00c977]" : "text-[#ff6f6f]"}`}>
                {formatProfit(trader.totalProfit)}
              </span>

              {/* Today Profit */}
              <span className={`w-[80px] shrink-0 text-right text-[11px] font-bold tabular-nums ${todayPositive ? "text-[#00c977]" : "text-[#ff6f6f]"}`}>
                {trader.todayProfit >= 0 ? "+" : ""}${Math.abs(trader.todayProfit).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>

              {/* Win Rate */}
              <span className="w-[65px] shrink-0 text-right text-[12px] font-bold tabular-nums text-white">
                {trader.winRate.toFixed(0)}%
              </span>

              {/* Trades */}
              <span className="w-[55px] shrink-0 text-right text-[11px] font-semibold text-white/60">
                {trader.totalTrades.toLocaleString()}
              </span>

              {/* Copy Trade */}
              <div className="flex w-[80px] shrink-0 justify-end">
                <button
                  type="button"
                  onClick={(e) => handleCopy(e, trader.id)}
                  className={`inline-flex items-center gap-1 rounded-[6px] px-2.5 py-1.5 text-[10px] font-bold transition-all ${
                    copiedId === trader.id
                      ? "bg-[#00b95b] text-white"
                      : "border border-[#00b95b]/30 bg-[#00b95b]/8 text-[#00b95b] hover:bg-[#00b95b]/20"
                  }`}
                >
                  <Copy className="h-3 w-3" />
                  {copiedId === trader.id ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-white/40">
            <Users className="mb-2 h-8 w-8" />
            <p className="text-[13px]">No traders found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="shrink-0 border-t border-white/[0.08] px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-white/42">
            {filtered.length.toLocaleString()} traders
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1 rounded-[6px] bg-[#242837] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#2e3348] disabled:opacity-40"
            >
              <ArrowLeft className="h-3 w-3" />
              Prev
            </button>
            <span className="text-[11px] text-white/42 min-w-[60px] text-center">
              {page} / {totalPages.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center gap-1 rounded-[6px] bg-[#242837] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#2e3348] disabled:opacity-40"
            >
              Next
              <ChevronDown className="h-3 w-3 -rotate-90" />
            </button>
          </div>
        </div>
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

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}