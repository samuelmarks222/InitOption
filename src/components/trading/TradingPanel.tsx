import { useState } from "react";
import Flag from "react-world-flags";
import {
  ChevronDown, Plus, Minus, ArrowUp, ArrowDown, ArrowUpCircle, ArrowDownCircle,
  Clock, Briefcase,
  X, Check, TrendingUp, TrendingDown, Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ActiveTrade, OpenTradeHandler, TradeDirection, TradeHistoryEntry, useTrading } from "@/hooks/useTrading";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { AccountType } from "./AccountModals";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TradingPanelProps {
  asset: { symbol: string; name?: string; price: number; maxProfit?: number };
  balance?: number;
  demoBalance: number;
  accountType: AccountType;
  onDemoBalanceChange: React.Dispatch<React.SetStateAction<number>>;
  onTrade?: OpenTradeHandler;
  onDemoTrade?: OpenTradeHandler;
  activeTradesOverride?: ActiveTrade[];
  tradeHistoryOverride?: TradeHistoryEntry[];
  onTournamentsClick?: () => void;
  onOpenAssetSelector?: () => void;
  mobileHistoryOpen?: boolean;
  onCloseMobileHistory?: () => void;
  mobileDocked?: boolean;
}

type ActiveTab = "trades" | "history";
type InvestmentMode = "amount" | "percent";

// ─── Utility ──────────────────────────────────────────────────────────────────
const formatTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const formatTradeClock = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = Math.floor(total % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const formatStake = (amount: number) => `${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)} $`;

const formatProfit = (amount: number) => `${amount > 0 ? "+" : amount < 0 ? "-" : ""}${Math.abs(amount).toFixed(2)} $`;

const formatGroupLabel = (value?: string) => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "RECENT";
  }

  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "long" }).toUpperCase();
  return `${day} ${month}`;
};

const buildTradeGroups = <T extends { closed_at?: string; opened_at?: string }>(trades: T[]) => {
  const groups = new Map<string, T[]>();

  trades.forEach((trade) => {
    const label = formatGroupLabel(trade.closed_at ?? trade.opened_at);
    const items = groups.get(label) ?? [];
    items.push(trade);
    groups.set(label, items);
  });

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
};

const currencyToCountry: Record<string, string> = {
  USD: "US",
  EUR: "EU",
  GBP: "GB",
  JPY: "JP",
  CHF: "CH",
  AUD: "AU",
  CAD: "CA",
  NZD: "NZ",
  PKR: "PK",
  MXN: "MX",
  NGN: "NG",
  INR: "IN",
  ZAR: "ZA",
  SGD: "SG",
  AED: "AE",
  TRY: "TR",
  BRL: "BR",
  ARS: "AR",
  EGP: "EG",
  KRW: "KR",
  CNY: "CN",
  HKD: "HK",
  IDR: "ID",
  RUB: "RU",
};

const normalizeSymbol = (symbol: string) => symbol.replace(/\s*OTC$/i, "").trim();

const splitAssetSymbol = (symbol: string) => {
  const cleaned = normalizeSymbol(symbol);

  if (cleaned.includes("/")) {
    const [base = "", quote = ""] = cleaned.split("/");
    return [base.toUpperCase(), quote.toUpperCase()].filter(Boolean);
  }

  const compact = cleaned.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (compact.length >= 6) {
    return [compact.slice(0, 3), compact.slice(3, 6)];
  }

  return [compact || cleaned.toUpperCase()];
};

const resolveSymbolTokens = (symbol: string) =>
  splitAssetSymbol(symbol).slice(0, 2).map((token) => ({
    label: token.slice(0, 2),
    code: currencyToCountry[token] ?? null,
  }));

// Preset durations in seconds
const TIME_PRESETS = [
  { label: "5s",   val: 5      },
  { label: "10s",  val: 10     },
  { label: "15s",  val: 15     },
  { label: "30s",  val: 30     },
  { label: "1m",   val: 60     },
  { label: "2m",   val: 120    },
  { label: "3m",   val: 180    },
  { label: "5m",   val: 300    },
  { label: "10m",  val: 600    },
  { label: "15m",  val: 900    },
  { label: "30m",  val: 1800   },
  { label: "1h",   val: 3600   },
  { label: "4h",   val: 14400  },
];

// ─── Withdrawal Modal and more was extracted to AccountModals.tsx ───

// ─── Time Switcher ─────────────────────────────────────────────────────────────
const TimeSwitcher = ({ value, onChange, onClose }: { value: number; onChange: (v: number) => void; onClose: () => void }) => (
  <>
    <div className="fixed inset-0 z-30" onClick={onClose} />
    <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl shadow-xl z-40 border border-white/10 overflow-hidden"
      style={{ background: "hsl(228 22% 14%)" }}>
      <div className="p-2 grid grid-cols-3 gap-1">
        {TIME_PRESETS.map(p => (
          <button key={p.val} onClick={() => { onChange(p.val); onClose(); }}
            className={`py-2 rounded-lg text-[11px] font-semibold transition-all ${value === p.val ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  </>
);

// ─── Active Trade Row ─────────────────────────────────────────────────────────
const ActiveTradeRow = ({ trade }: { trade: ActiveTrade }) => {
  const pct = Math.max(0, (trade.timeLeft / trade.expiry_seconds) * 100);
  const isUp = trade.direction === "higher";

  return (
    <div className="px-4 py-3 border-b border-white/5">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isUp ? "bg-green-600" : "bg-red-600"}`}>
            {isUp ? <TrendingUp className="w-3 h-3 text-white" /> : <TrendingDown className="w-3 h-3 text-white" />}
          </div>
          <div>
            <div className="text-[11px] font-semibold text-white">{trade.asset_symbol}</div>
            <div className="text-[9px] text-gray-500">{isUp ? "▲ UP" : "▼ DOWN"}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[12px] font-bold text-white">${trade.amount.toFixed(2)}</div>
          <div className="text-[10px] text-green-400">+${(trade.amount * trade.payout_rate).toFixed(2)}</div>
        </div>
      </div>
      {/* Countdown bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-blue-500 transition-all duration-100"
            style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] text-gray-400 font-mono w-8 shrink-0 text-right">
          {formatTime(trade.timeLeft)}
        </span>
      </div>
    </div>
  );
};

// ─── History Trade Row ────────────────────────────────────────────────────────
const HistoryRow = ({ trade }: { trade: TradeHistoryEntry }) => {
  const won = trade.status === "won";
  return (
    <div className="px-4 py-3 border-b border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${won ? "bg-green-600" : "bg-red-600"}`}>
            {won ? <Check className="w-3 h-3 text-white" /> : <X className="w-3 h-3 text-white" />}
          </div>
          <div>
            <div className="text-[11px] font-semibold text-white">{trade.asset_symbol}</div>
            <div className="text-[9px] text-gray-500">{trade.direction === "higher" ? "▲ UP" : "▼ DOWN"}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-[12px] font-bold ${won ? "text-green-400" : "text-red-400"}`}>
            {won ? "+" : "−"}${Math.abs(trade.profit ?? 0).toFixed(2)}
          </div>
          <div className="text-[9px] text-gray-500">${trade.amount.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

// ─── Main TradingPanel ────────────────────────────────────────────────────────
const SymbolFlags = ({ symbol }: { symbol: string }) => {
  const badges = resolveSymbolTokens(symbol);

  return (
    <div className="relative h-5 w-8 shrink-0">
      {badges.map((badge, index) => (
        <div
          key={`${symbol}-${badge.label}-${index}`}
          className="absolute top-0 h-5 w-5 overflow-hidden rounded-full border border-white/15 bg-[#1e2433]"
          style={{ left: `${index * 10}px`, zIndex: badges.length - index }}
        >
          {badge.code ? (
            <Flag code={badge.code} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[8px] font-black uppercase text-white">
              {badge.label}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const TradeGroupHeader = ({ label, count }: { label: string; count: number }) => (
  <div className="sticky top-0 z-10 flex items-center justify-center gap-2 px-4 py-3 backdrop-blur-sm" style={{ background: "rgba(52, 58, 76, 0.94)" }}>
    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#c4cbda]">{label}</span>
    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#565d71] px-1.5 text-[10px] font-black text-white">
      {count}
    </span>
  </div>
);

const CompactTradeRow = ({
  symbol,
  clockValue,
  amountLabel,
  amountColor,
  profitLabel,
  profitColor,
  direction,
}: {
  symbol: string;
  clockValue: string;
  amountLabel: string;
  amountColor: string;
  profitLabel: string;
  profitColor: string;
  direction: TradeDirection;
}) => (
  <div className="border-b border-white/6 px-3 py-3.5 transition-colors hover:bg-white/[0.03] last:border-b-0">
    <div className="flex items-start gap-2.5">
      <ChevronDown className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[#697388]" />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <SymbolFlags symbol={symbol} />
            <span className="max-w-[92px] truncate text-[12px] font-black uppercase tracking-[0.02em] text-white sm:max-w-[118px]">
              {symbol}
            </span>
          </div>

          <span className="shrink-0 text-[11px] font-black tabular-nums text-[#d6dbea]">
            {clockValue}
          </span>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-3 pl-[38px]">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black" style={{ color: amountColor }}>
            <span
              className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full"
              style={{ background: direction === "higher" ? "rgba(24, 216, 125, 0.16)" : "rgba(255, 106, 114, 0.16)" }}
            >
              {direction === "higher" ? <ArrowUp className="h-3 w-3" strokeWidth={3} /> : <ArrowDown className="h-3 w-3" strokeWidth={3} />}
            </span>
            {amountLabel}
          </span>

          <span className="shrink-0 text-[12px] font-black" style={{ color: profitColor }}>
            {profitLabel}
          </span>
        </div>
      </div>
    </div>
  </div>
);

const CompactActiveTradeRow = ({ trade }: { trade: ActiveTrade }) => (
  <CompactTradeRow
    symbol={trade.asset_symbol}
    clockValue={formatTradeClock(trade.timeLeft)}
    amountLabel={formatStake(trade.amount)}
    amountColor={trade.direction === "higher" ? "#18d87d" : "#ff6a72"}
    profitLabel={formatProfit(trade.amount * trade.payout_rate)}
    profitColor="#18d87d"
    direction={trade.direction}
  />
);

const CompactHistoryRow = ({ trade }: { trade: TradeHistoryEntry }) => {
  const result = Number(trade.profit ?? 0);

  return (
    <CompactTradeRow
      symbol={trade.asset_symbol}
      clockValue={formatTradeClock(trade.expiry_seconds ?? 0)}
      amountLabel={formatStake(trade.amount ?? 0)}
      amountColor={trade.direction === "higher" ? "#18d87d" : "#ff6a72"}
      profitLabel={formatProfit(result)}
      profitColor={result > 0 ? "#18d87d" : "#ff6a72"}
      direction={trade.direction}
    />
  );
};

const TradingPanel = ({
  asset,
  accountType,
  demoBalance,
  onDemoBalanceChange,
  onTrade,
  onDemoTrade,
  activeTradesOverride,
  tradeHistoryOverride,
  onOpenAssetSelector,
  mobileHistoryOpen,
  onCloseMobileHistory,
  mobileDocked = false,
}: TradingPanelProps) => {
  const { profile } = useAuth();
  const { activeTrades, tradeHistory, openTrade } = useTrading();
  const executeTrade = onTrade ?? openTrade;

  // Trading params
  const [expirySeconds, setExpirySeconds] = useState(60);
  const [investment, setInvestment] = useState(1);
  const [investmentMode, setInvestmentMode] = useState<InvestmentMode>("amount");
  const [showTimeSwitcher, setShowTimeSwitcher] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>("trades");
  const [isLoading, setIsLoading] = useState<"up" | "down" | null>(null);
  const visibleActiveTrades = activeTradesOverride ?? activeTrades;
  const visibleTradeHistory = tradeHistoryOverride ?? tradeHistory;
  const sortedActiveTrades = [...visibleActiveTrades].sort(
    (left, right) => new Date(right.opened_at).getTime() - new Date(left.opened_at).getTime(),
  );
  const sortedTradeHistory = [...visibleTradeHistory].sort(
    (left, right) =>
      new Date(right.closed_at ?? right.opened_at ?? 0).getTime() -
      new Date(left.closed_at ?? left.opened_at ?? 0).getTime(),
  );
  const selectedAssetTrades = sortedActiveTrades.filter((trade) => trade.asset_symbol === asset.symbol);
  const pendingTrade = selectedAssetTrades.length > 0;
  const activeTradeGroups = buildTradeGroups(sortedActiveTrades);
  const historyGroups = buildTradeGroups(sortedTradeHistory);

  const liveBalance = getEffectiveLiveBalance(profile);
  const balance = accountType === "live" ? liveBalance : demoBalance;
  const payoutRate = (asset.maxProfit ?? 63) / 100;
  const effectiveInvestment = investmentMode === "percent"
    ? Math.max(1, +((balance * investment) / 100).toFixed(2))
    : investment;
  const payout = +(effectiveInvestment * (1 + payoutRate)).toFixed(2);

  // Investment helpers
  const adjustInvestment = (delta: number) => {
    const step = investmentMode === "percent" ? 5 : 1;
    const max = investmentMode === "percent" ? 100 : Math.max(1, Math.floor(balance));
    setInvestment((value) => {
      const next = Math.round((value + delta * step) * 100) / 100;
      return Math.max(1, Math.min(max, next));
    });
  };
  const adjustExpiry = (delta: number) => {
    const idx = TIME_PRESETS.findIndex(p => p.val === expirySeconds);
    const newIdx = Math.max(0, Math.min(TIME_PRESETS.length - 1, idx + delta));
    setExpirySeconds(TIME_PRESETS[newIdx].val);
  };

  const toggleInvestmentMode = () => {
    if (investmentMode === "amount") {
      const nextPercent = balance > 0 ? Math.max(1, Math.min(100, Math.round((investment / balance) * 100))) : 1;
      setInvestment(nextPercent);
      setInvestmentMode("percent");
      return;
    }

    const nextAmount = Math.max(1, +((balance * investment) / 100).toFixed(2));
    setInvestment(nextAmount);
    setInvestmentMode("amount");
  };

  // Trade execution
  const placeTrade = async (direction: "higher" | "lower") => {
    if (isLoading) return;
    if (effectiveInvestment <= 0) return;

    if (accountType === "demo") {
      if (effectiveInvestment > demoBalance) {
        alert("Insufficient demo balance");
        return;
      }
      setIsLoading(direction === "higher" ? "up" : "down");
      await new Promise(r => setTimeout(r, 600));
      await (onDemoTrade ?? executeTrade)(asset.symbol, direction, effectiveInvestment, asset.price, expirySeconds, payoutRate);
      setIsLoading(null);
      return;
    }

    // Live trade
    setIsLoading(direction === "higher" ? "up" : "down");
    await executeTrade(asset.symbol, direction, effectiveInvestment, asset.price, expirySeconds, payoutRate);
    setIsLoading(null);
  };

  return (
    <>
      <aside className={`w-full lg:w-[236px] xl:w-[244px] h-full min-h-[190px] shrink-0 flex flex-col overflow-hidden text-white rounded-t-[18px] lg:rounded-none border-t border-white/10 lg:border-t-0 shadow-[0_-10px_30px_rgba(0,0,0,0.28)] lg:shadow-none ${mobileDocked ? "rounded-t-[16px]" : ""}`}
        style={{ background: "#1e2330" }}>

        {/* ── Asset Header & Pending Toggle (Single Row) ──────────────── */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1.5 lg:px-4 lg:pt-3 lg:pb-2.5">
          <button 
            onClick={() => onOpenAssetSelector?.()}
            className="flex items-center gap-1.5 transition-colors hover:bg-white/5 p-1 rounded-lg -ml-1 min-w-0"
          >
            <SymbolFlags symbol={asset.symbol} />
            <div className="text-[11px] lg:text-[12px] font-bold text-white tracking-wide flex items-center gap-1 min-w-0">
              <span className="truncate max-w-[120px] sm:max-w-[180px] lg:max-w-[116px]">{asset.symbol}</span>
              <span className="text-[#ff9f00] shrink-0">{asset.maxProfit ?? 79}%</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" strokeWidth={3} />
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[8px] font-extrabold tracking-wide uppercase hidden sm:inline ${pendingTrade ? "text-blue-500" : "text-[#7f8b99]"}`}>
              PENDING TRADE
            </span>
            <div
              className={`w-[24px] h-[12px] rounded-full relative transition-all border ${pendingTrade ? "bg-blue-600 border-blue-500/50" : "bg-transparent border-white/15"}`}
            >
              <div className={`absolute top-[1.5px] w-[7px] h-[7px] rounded-full transition-all ${pendingTrade ? "left-[13px] bg-white shadow-sm" : "left-[1.5px] bg-gray-500"}`} />
            </div>
          </div>
        </div>

        {/* ── RESPONSIVE GRID: Timer & Investment ── */}
        <div className="px-3 pb-1.5 lg:px-4 lg:pb-2 grid grid-cols-2 lg:grid-cols-1 gap-2">
          
          {/* Timer */}
          <div className="relative border border-[#4c5366] rounded-xl p-2 lg:pt-3 lg:pb-3 lg:px-4 flex flex-col justify-center cursor-pointer min-h-[58px] lg:min-h-[58px]"
               onClick={() => setShowTimeSwitcher(v => !v)}>
             <div className="absolute -top-2 left-2 bg-[#1e2330] px-1 text-[10px] text-[#7f8b99] font-medium leading-none">
               Timer
             </div>
             
             {/* Mobile layout (tap to switch) */}
             <div className="lg:hidden text-[11px] sm:text-[12px] font-bold text-white pl-1 mt-0.5">
               {formatTime(expirySeconds)}
             </div>

             {/* Desktop layout (+/-) */}
             <div className="hidden lg:flex items-center justify-between mt-0.5 gap-2">
                <button onClick={(e) => { e.stopPropagation(); adjustExpiry(-1); }} className="w-[28px] h-[28px] rounded-full bg-[#2b3244] flex items-center justify-center text-white hover:bg-gray-500 transition-colors">
                  <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
                <div className="text-[15px] font-bold text-white tracking-widest flex-1 text-center">{formatTime(expirySeconds)}</div>
                <button onClick={(e) => { e.stopPropagation(); adjustExpiry(1); }} className="w-[28px] h-[28px] rounded-full bg-[#2b3244] flex items-center justify-center text-white hover:bg-gray-500 transition-colors">
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
             </div>

             <div className="hidden lg:flex absolute -bottom-2 left-0 right-0 justify-center">
                 <button
                   type="button"
                   onClick={(e) => { e.stopPropagation(); setShowTimeSwitcher(v => !v); }}
                   className="bg-[#1e2330] px-2 text-[9px] text-[#2962ff] font-extrabold tracking-widest uppercase leading-none hover:text-blue-300"
                 >
                   SWITCH TIME
                 </button>
             </div>
          </div>
          {showTimeSwitcher && ( <TimeSwitcher value={expirySeconds} onChange={setExpirySeconds} onClose={() => setShowTimeSwitcher(false)} /> )}

          {/* Investment */}
          <div className="relative border border-[#4c5366] rounded-xl p-2 lg:pt-3 lg:pb-3 lg:px-4 flex flex-col justify-center min-h-[58px] lg:min-h-[58px]">
             <div className="absolute -top-2 left-2 bg-[#1e2330] px-1 text-[10px] text-[#7f8b99] font-medium leading-none">
               Investment
             </div>
             
             {/* Mobile layout (direct input) */}
             <div className="lg:hidden flex items-center justify-between mt-0.5 px-1">
               <input type="number" value={investment} min={1} onChange={e => setInvestment(Math.max(1, +e.target.value || 1))} 
                      className="w-10 bg-transparent text-[11px] sm:text-[12px] font-bold text-white outline-none" />
               <span className="text-[11px] sm:text-[12px] font-bold text-white mr-1">{investmentMode === "percent" ? "%" : "$"}</span>
             </div>
             <div className="lg:hidden absolute -bottom-[7px] right-2 bg-[#1e2330] px-1 flex justify-center">
                <button type="button" onClick={toggleInvestmentMode} className="text-[8px] text-[#2962ff] font-extrabold uppercase leading-none">
                  SWITCH
                </button>
             </div>

             {/* Desktop layout (+/-) */}
             <div className="hidden lg:flex items-center justify-between mt-0.5 gap-2">
                <button onClick={() => adjustInvestment(-1)} className="w-[28px] h-[28px] rounded-full bg-[#2b3244] flex items-center justify-center text-white hover:bg-gray-600 transition-colors">
                  <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
                <div className="flex items-center justify-center gap-1.5 flex-1">
                  <input type="number" value={investment} min={1} onChange={e => setInvestment(Math.max(1, +e.target.value || 1))} className="w-10 bg-transparent text-[15px] font-bold text-white text-right outline-none" />
                  <span className="text-[15px] font-bold text-white">{investmentMode === "percent" ? "%" : "$"}</span>
                </div>
                <button onClick={() => adjustInvestment(1)} className="w-[28px] h-[28px] rounded-full bg-[#3b4353] flex items-center justify-center text-white hover:bg-gray-600 transition-colors">
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
             </div>

             <div className="hidden lg:flex absolute -bottom-2 left-0 right-0 justify-center">
                 <button
                   type="button"
                   onClick={toggleInvestmentMode}
                   className="bg-[#2a3040] px-2 text-[9px] text-blue-500 font-extrabold tracking-widest hover:text-blue-400 uppercase leading-none"
                 >
                   SWITCH
                 </button>
             </div>
          </div>
        </div>

        {/* ── Payout ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-3 pb-2 lg:px-4 lg:pb-3">
          <span className="text-[10px] lg:text-[12px] text-gray-400 font-bold">Your payout:</span>
          <div className="flex-1 border-b border-dashed border-gray-600 mx-2 relative top-[-4px]" />
          <span className="text-[11px] lg:text-[14px] font-extrabold text-white">{payout.toFixed(2)} $</span>
        </div>

        {/* ── UP & DOWN Buttons (Side-by-side on mobile, stacked on desktop) ── */}
        <div className="px-3 pb-4 lg:px-4 lg:pb-3 grid grid-cols-2 lg:grid-cols-1 gap-3">
          <button
            onClick={() => placeTrade("higher")}
            disabled={!!isLoading}
            className="rounded-xl py-4 lg:py-3 px-4 flex items-center justify-between text-white transition-all active:scale-[0.98] font-bold text-[14px] lg:text-[15px] shadow-[0_8px_20px_rgba(34,197,94,0.18)]"
            style={{ background: "#22c55e" }}>
            <span>Up</span>
            {isLoading === "up" ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUpCircle className="w-5 h-5 opacity-90" strokeWidth={2} />}
          </button>

          <button
            onClick={() => placeTrade("lower")}
            disabled={!!isLoading}
            className="rounded-xl py-4 lg:py-3 px-4 flex items-center justify-between text-white transition-all active:scale-[0.98] font-bold text-[14px] lg:text-[15px] shadow-[0_8px_20px_rgba(248,113,113,0.18)]"
            style={{ border: "1px solid #ef4444", background: "#f87171" }}>
            <span>Down</span>
            {isLoading === "down" ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowDownCircle className="w-5 h-5 opacity-90" strokeWidth={2} />}
          </button>
        </div>

        {/* ── Secondary Layout Block (Modal on Mobile, Fixed Panel on Desktop) ── */}
        <div className={`${mobileHistoryOpen ? 'fixed inset-0 z-[100] flex animate-in slide-in-from-bottom pb-12' : 'hidden lg:flex flex-1'} flex-col overflow-hidden border-t border-[#161c28]/70`} style={{ background: "#2f3445" }}>
          
          {/* ── Tabs: Trades / History ────────────────────────────────── */}
          <div className="flex items-center gap-1 px-2 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(40, 46, 61, 0.96)" }}>
            <button
              onClick={() => setActiveTab("trades")}
              className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-black transition-colors ${activeTab === "trades" ? "bg-[#31384a] text-white" : "text-[#9aa3b5] hover:text-white"}`}
            >
              {activeTab === "trades" && <div className="absolute left-2 right-2 top-0 h-[2px] rounded-full bg-[#3b82f6]" />}
              <span>Trades</span>
              <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black ${activeTab === "trades" ? "bg-[#454d62] text-white" : "bg-black/15 text-[#8a94a8]"}`}>
                {visibleActiveTrades.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`relative ml-auto flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-black transition-colors ${activeTab === "history" ? "bg-[#31384a] text-white" : "text-[#9aa3b5] hover:text-white"}`}
            >
              {activeTab === "history" && <div className="absolute left-2 right-2 top-0 h-[2px] rounded-full bg-[#3b82f6]" />}
              <Clock className="h-4 w-4" />
              <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black ${activeTab === "history" ? "bg-[#454d62] text-white" : "bg-black/15 text-[#8a94a8]"}`}>
                {visibleTradeHistory.length}
              </span>
            </button>

            {mobileHistoryOpen && (
              <button onClick={onCloseMobileHistory} className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* ── Trade List ───────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto scrollbar-hide px-2 py-3">
            {activeTab === "trades" ? (
              sortedActiveTrades.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
                    <Briefcase className="w-7 h-7 text-gray-600" />
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    No open trades yet. Place a trade above to populate this feed.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeTradeGroups.map((group) => (
                    <section key={`${group.label}-${group.items.length}`} className="overflow-hidden rounded-[18px] border border-white/6 bg-[#343a4c]/86">
                      <TradeGroupHeader label={group.label} count={group.items.length} />
                      <div>
                        {group.items.map((trade) => (
                          <CompactActiveTradeRow key={trade.id} trade={trade} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )
            ) : (
              sortedTradeHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
                    <Clock className="w-7 h-7 text-gray-600" />
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">No completed trades yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyGroups.map((group) => (
                    <section key={`${group.label}-${group.items.length}`} className="overflow-hidden rounded-[18px] border border-white/6 bg-[#343a4c]/86">
                      <TradeGroupHeader label={group.label} count={group.items.length} />
                      <div>
                        {group.items.map((trade) => (
                          <CompactHistoryRow key={trade.id} trade={trade} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )
            )}
          </div>

        </div>
      </aside>
    </>
  );
};

export default TradingPanel;
