import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Trophy, TrendingUp, TrendingDown } from "lucide-react";
import CountryFlag from "@/components/ui/CountryFlag";

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
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

type DummyTrader = {
  id: string;
  name: string;
  country: string;
  profit: number;
  trades: number;
  wins: number;
};

const TOTAL_TRADERS = 1287;

function generateDummyTraders(): DummyTrader[] {
  const rng = seededRandom(42);
  const result: DummyTrader[] = [];
  for (let i = 0; i < TOTAL_TRADERS; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const name = `${firstName} ${lastName}`;
    const country = COUNTRIES[Math.floor(rng() * COUNTRIES.length)];
    const profit = Number(((rng() - 0.15) * 25000).toFixed(2));
    const trades = Math.floor(rng() * 400 + 10);
    const wins = Math.floor(trades * (0.4 + rng() * 0.5));
    result.push({ id: `lb-dummy-${i}`, name, country, profit, trades, wins });
  }
  result.sort((a, b) => b.profit - a.profit);
  return result;
}

const ALL_TRADERS = generateDummyTraders();

const formatProfit = (value: number) => {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercent = (profit: number, trades: number) => {
  const avg = trades > 0 ? profit / trades : 0;
  const base = 100;
  const pct = (avg / base) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
};

const getWinRate = (wins: number, trades: number) => {
  if (trades === 0) return 0;
  return Math.round((wins / trades) * 100);
};

const getRankColor = (rank: number) => {
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-slate-300";
  if (rank === 3) return "text-amber-600";
  return "text-[#7a8aa8]";
};

const getRankBg = (rank: number) => {
  if (rank <= 3) return "bg-[#2a3340]";
  return "bg-transparent";
};

interface WorkspaceLeaderboardProps {
  onClose?: () => void;
}

export const WorkspaceLeaderboard = ({ onClose }: WorkspaceLeaderboardProps) => {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(ALL_TRADERS.length / pageSize);

  const paginatedTraders = useMemo(
    () => ALL_TRADERS.slice((page - 1) * pageSize, page * pageSize),
    [page],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#191d29] text-white">
      {/* Header */}
      <div className="flex h-[58px] shrink-0 items-center gap-2 border-b border-white/[0.08] px-3">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Close leaderboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-black leading-none text-white">Leader Board</div>
          <div className="mt-1 text-[11px] font-semibold text-white/42">Today's Top Traders</div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Close leaderboard"
          >
            <ChevronDown className="h-4 w-4 rotate-90" />
          </button>
        ) : null}
      </div>

      {/* Stats bar */}
      <div className="shrink-0 border-b border-white/[0.08] px-3 py-2.5">
        <div className="rounded-[5px] bg-[#242837] px-2.5 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#f4b43e]/18 text-[#f4b43e]">
                <Trophy className="h-4 w-4" />
              </span>
              <span className="text-[13px] font-black text-white">
                {ALL_TRADERS.length.toLocaleString()} Traders Today
              </span>
            </div>
            <span className="text-[11px] text-white/42">
              Page {page} of {totalPages.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {/* Column headers */}
        <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
          <span className="w-8 text-center">Rank</span>
          <span className="w-7" />
          <span className="w-6" />
          <span className="flex-1">Trader</span>
          <span className="w-[90px] text-right">Profit</span>
          <span className="w-[70px] text-right">Return</span>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {paginatedTraders.map((trader, idx) => {
            const rank = (page - 1) * pageSize + idx + 1;
            const isPositive = trader.profit >= 0;
            const initial = trader.name.charAt(0).toUpperCase();
            const iconColor = ICON_COLORS[hashCode(trader.id) % ICON_COLORS.length];
            const winRate = getWinRate(trader.wins, trader.trades);

            return (
              <div key={trader.id} className="flex h-[48px] items-center gap-2 px-2 transition-colors hover:bg-white/[0.03]">
                {/* Rank */}
                <span className={`w-8 text-center text-[12px] font-black ${getRankColor(rank)}`}>
                  {rank}
                </span>

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
                  <span className="truncate text-[12px] font-bold text-white">{trader.name}</span>
                  <span className="ml-2 text-[9px] font-semibold text-white/35">
                    {winRate}% win · {trader.trades} trades
                  </span>
                </div>

                {/* Profit */}
                <span className={`w-[90px] shrink-0 text-right text-[12px] font-black tabular-nums ${isPositive ? "text-[#00c977]" : "text-[#ff6f6f]"}`}>
                  {formatProfit(trader.profit)}
                </span>

                {/* Percentage Gain */}
                <span className={`w-[70px] shrink-0 text-right text-[11px] font-bold tabular-nums ${isPositive ? "text-[#00c977]" : "text-[#ff6f6f]"}`}>
                  {isPositive ? <TrendingUp className="inline h-3 w-3 mr-0.5" /> : <TrendingDown className="inline h-3 w-3 mr-0.5" />}
                  {formatPercent(trader.profit, trader.trades)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      <div className="shrink-0 border-t border-white/[0.08] px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 rounded-[5px] bg-[#242837] px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-[#2e3348] disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous
          </button>
          <span className="text-[11px] text-white/42">
            {page} / {totalPages.toLocaleString()}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center gap-1 rounded-[5px] bg-[#242837] px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-[#2e3348] disabled:opacity-40"
          >
            Next
            <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );
};
