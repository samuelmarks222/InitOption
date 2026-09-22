import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown, ChevronUp, Plus, Minus, ArrowUp, ArrowDown,
  Clock, Briefcase,
  X, Check, TrendingUp, TrendingDown
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencyAmount, getCurrencySymbol } from "@/lib/currency";
import { ActiveTrade, OpenTradeHandler, TradeDirection, TradeHistoryEntry, useTrading } from "@/hooks/useTrading";
import { toast } from "@/hooks/use-toast";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { AccountType } from "./AccountModals";
import AssetSymbolMark from "./AssetSymbolMark";
import {
  mapTradeHistoryEntryToPresentation,
  TradeResultDetailModal,
  TradeResultInlinePanel,
} from "./TradeResultPresentation";
import { TRADING_DOWN_COLOR, TRADING_UP_COLOR } from "./tradingPalette";
import { useTradingPreferences } from "@/lib/tradingPreferences";
import {
  TRADE_DESK_DIRECTION_FOCUS_EVENT,
  TRADE_DESK_DIRECTION_SUBMIT_EVENT,
  type TradeDeskDirectionFocusDetail,
} from "./tradeDeskEvents";
import { useTradingDesk } from "./TradingDeskContext";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TradingPanelProps {
  asset: { symbol: string; name?: string; price: number; maxProfit?: number; available?: boolean };
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
  onOpenMobileHistory?: () => void;
  mobileDocked?: boolean;
}

type ActiveTab = "trades" | "pending";
type InvestmentMode = "amount" | "percent";

interface QueuedPendingTrade {
  id: string;
  asset_symbol: string;
  direction: TradeDirection;
  amount: number;
  payout_rate: number;
  expiry_seconds: number;
  created_at: string;
  opened_at: string;
}

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

const formatDurationShortcut = (seconds: number) => {
  if (seconds % 3600 === 0 && seconds >= 3600) {
    return `${seconds / 3600}h`;
  }

  if (seconds % 60 === 0 && seconds >= 60) {
    return `${seconds / 60}m`;
  }

  return `${seconds}s`;
};

const useLiveCountdownSeconds = (
  openedAt: string,
  expirySeconds: number,
  fallbackSeconds: number,
) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 100);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  const openedAtMs = new Date(openedAt).getTime();
  if (!Number.isFinite(openedAtMs)) {
    return Math.max(0, fallbackSeconds);
  }

  const elapsedSeconds = (nowMs - openedAtMs) / 1000;
  return Math.max(0, expirySeconds - elapsedSeconds);
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

// Preset durations in seconds (used by adjustExpiry and TimePopover)
const TIME_PRESETS = [
  { label: "00:05", val: 5 },
  { label: "00:10", val: 10 },
  { label: "00:15", val: 15 },
  { label: "00:30", val: 30 },
  { label: "01:00", val: 60 },
  { label: "02:00", val: 120 },
  { label: "05:00", val: 300 },
  { label: "10:00", val: 600 },
  { label: "15:00", val: 900 },
  { label: "30:00", val: 1800 },
  { label: "01:00:00", val: 3600 },
  { label: "02:00:00", val: 7200 },
  { label: "04:00:00", val: 14400 },
  { label: "08:00:00", val: 28800 },
  { label: "12:00:00", val: 43200 },
  { label: "24:00:00", val: 86400 },
];

const MAX_MANUAL_INVESTMENT = 3000;
const MAX_MANUAL_EXPIRY_SECONDS = 24 * 60 * 60;
const PENDING_TRADE_DELAY_MS = 3000;
const PENDING_TRADE_MODE_KEY = "trade_pending_mode_enabled";

const clampInvestmentValue = (value: number, mode: InvestmentMode) => {
  if (mode === "percent") {
    return Math.max(1, Math.min(100, Math.round(value)));
  }

  return Math.max(1, Math.min(MAX_MANUAL_INVESTMENT, Math.round(value * 100) / 100));
};

const TimeSwitcherDropdown = ({
  expirySeconds,
  setExpirySeconds,
  setShowTimeSwitcher,
}: {
  expirySeconds: number;
  setExpirySeconds: (value: number) => void;
  setShowTimeSwitcher: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [tab, setTab] = useState<"timer" | "time">("timer");
  const [manualH, setManualH] = useState("");
  const [manualM, setManualM] = useState("");
  const [manualS, setManualS] = useState("");

  const TIMER_PRESETS = [
    { label: "00:05", val: 5 },
    { label: "00:10", val: 10 },
    { label: "00:15", val: 15 },
    { label: "00:30", val: 30 },
    { label: "01:00", val: 60 },
    { label: "02:00", val: 120 },
    { label: "05:00", val: 300 },
    { label: "10:00", val: 600 },
    { label: "15:00", val: 900 },
    { label: "30:00", val: 1800 },
    { label: "01:00:00", val: 3600 },
    { label: "02:00:00", val: 7200 },
  ];

  const applyManualTime = () => {
    const h = Math.max(0, parseInt(manualH) || 0);
    const m = Math.max(0, Math.min(59, parseInt(manualM) || 0));
    const s = Math.max(0, Math.min(59, parseInt(manualS) || 0));
    const total = Math.min(MAX_MANUAL_EXPIRY_SECONDS, Math.max(1, h * 3600 + m * 60 + s));
    setExpirySeconds(total);
    setShowTimeSwitcher(false);
    setManualH("");
    setManualM("");
    setManualS("");
  };

  return (
    <div className="w-[260px] rounded-lg border border-white/10 bg-[#2a2f3a] p-2 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
      <div className="flex gap-1 rounded-md bg-[#1a1e28] p-0.5">
        <button
          type="button"
          onClick={() => setTab("timer")}
          className={`flex-1 rounded-md py-1.5 text-[11px] font-normal uppercase tracking-wider transition ${
            tab === "timer" ? "bg-[#21c978] text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Timer
        </button>
        <button
          type="button"
          onClick={() => setTab("time")}
          className={`flex-1 rounded-md py-1.5 text-[11px] font-normal uppercase tracking-wider transition ${
            tab === "time" ? "bg-[#21c978] text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Time
        </button>
      </div>

      {tab === "timer" ? (
        <div className="mt-2">
          <div className="grid grid-cols-3 gap-1.5">
            {TIMER_PRESETS.map((preset) => {
              const selected = expirySeconds === preset.val;
              return (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => { setExpirySeconds(preset.val); setShowTimeSwitcher(false); }}
                  className={`rounded-md border py-2 text-[12px] font-normal transition active:scale-95 ${
                    selected
                      ? "border-[#21c978] bg-[#21c978] text-white"
                      : "border-white/8 bg-[#353b4a] text-white hover:border-white/20"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setTab("time")}
            className="mt-2 w-full rounded-md border border-white/8 bg-[#353b4a] py-2.5 text-[12px] font-normal text-white hover:border-white/20 transition"
          >
            Set manually
          </button>
        </div>
      ) : (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[9px] font-normal uppercase tracking-wider text-gray-500">Hrs</label>
              <input
                type="number"
                min={0}
                max={24}
                placeholder="00"
                value={manualH}
                onChange={(e) => setManualH(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applyManualTime(); }}
                className="h-10 w-full rounded-md border border-white/10 bg-[#353b4a] px-2 text-center text-[14px] font-normal text-white outline-none focus:border-[#21c978]"
              />
            </div>
            <span className="mt-4 text-lg font-normal text-gray-500">:</span>
            <div className="flex-1">
              <label className="mb-1 block text-[9px] font-normal uppercase tracking-wider text-gray-500">Min</label>
              <input
                type="number"
                min={0}
                max={59}
                placeholder="00"
                value={manualM}
                onChange={(e) => setManualM(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applyManualTime(); }}
                className="h-10 w-full rounded-md border border-white/10 bg-[#353b4a] px-2 text-center text-[14px] font-normal text-white outline-none focus:border-[#21c978]"
              />
            </div>
            <span className="mt-4 text-lg font-normal text-gray-500">:</span>
            <div className="flex-1">
              <label className="mb-1 block text-[9px] font-normal uppercase tracking-wider text-gray-500">Sec</label>
              <input
                type="number"
                min={0}
                max={59}
                placeholder="00"
                value={manualS}
                onChange={(e) => setManualS(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applyManualTime(); }}
                className="h-10 w-full rounded-md border border-white/10 bg-[#353b4a] px-2 text-center text-[14px] font-normal text-white outline-none focus:border-[#21c978]"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={applyManualTime}
            className="mt-2 w-full rounded-md bg-[#21c978] py-2.5 text-[12px] font-normal text-white hover:bg-[#1db86d] transition active:scale-[0.98]"
          >
            Set Time
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Withdrawal Modal and more was extracted to AccountModals.tsx ───

// ─── Active Trade Row ─────────────────────────────────────────────────────────
const ActiveTradeRow = ({ trade }: { trade: ActiveTrade }) => {
  const pct = Math.max(0, (trade.timeLeft / trade.expiry_seconds) * 100);
  const isUp = trade.direction === "higher";

  return (
    <div className="px-4 py-3 border-b border-white/5">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full"
            style={{ background: isUp ? TRADING_UP_COLOR : TRADING_DOWN_COLOR }}
          >
            {isUp ? <TrendingUp className="w-3 h-3 text-white" /> : <TrendingDown className="w-3 h-3 text-white" />}
          </div>
          <div>
            <div className="text-[11px] font-semibold text-white">{trade.asset_symbol}</div>
            <div className="text-[9px] text-gray-500">{isUp ? "▲ UP" : "▼ DOWN"}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[12px] font-bold text-white">${trade.amount.toFixed(2)}</div>
          <div className="text-[10px]" style={{ color: TRADING_UP_COLOR }}>+${(trade.amount * trade.payout_rate).toFixed(2)}</div>
        </div>
      </div>
      {/* Countdown bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#0fa053] transition-all duration-100"
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
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full"
            style={{ background: won ? TRADING_UP_COLOR : TRADING_DOWN_COLOR }}
          >
            {won ? <Check className="w-3 h-3 text-white" /> : <X className="w-3 h-3 text-white" />}
          </div>
          <div>
            <div className="text-[11px] font-semibold text-white">{trade.asset_symbol}</div>
            <div className="text-[9px] text-gray-500">{trade.direction === "higher" ? "▲ UP" : "▼ DOWN"}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[12px] font-bold" style={{ color: won ? TRADING_UP_COLOR : TRADING_DOWN_COLOR }}>
            {won ? "+" : "−"}${Math.abs(trade.profit ?? 0).toFixed(2)}
          </div>
          <div className="text-[9px] text-gray-500">${trade.amount.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

// ─── Main TradingPanel ────────────────────────────────────────────────────────
const SymbolFlags = ({ symbol, size = 20 }: { symbol: string; size?: number }) => {
  return (
    <AssetSymbolMark symbol={symbol} size={size} />
  );
};

const TradeGroupHeader = ({ label, count }: { label: string; count: number }) => (
  <div className="flex items-center justify-center gap-1.5 px-3 pb-1 pt-4">
    <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[#9da6bb]">{label}</span>
    <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#697289] px-1 text-[10px] font-black text-white">
      {count}
    </span>
  </div>
);

const CompactTradeRowShell = ({
  symbol,
  clockValue,
  amountLabel,
  amountColor,
  profitLabel,
  profitColor,
  direction,
  expanded = false,
  onToggle,
  details,
}: {
  symbol: string;
  clockValue: string;
  amountLabel: string;
  amountColor: string;
  profitLabel: string;
  profitColor: string;
  direction: TradeDirection;
  expanded?: boolean;
  onToggle?: () => void;
  details?: ReactNode;
}) => {
  const rowBody = (
    <div className="px-2 py-2 transition-colors hover:bg-white/[0.025]">
      <div className="flex items-start">
        <span className="mt-[2px] flex h-3 w-3 shrink-0 items-center justify-center text-[#b8c2d8]">
          <ChevronDown className={`h-2.5 w-2.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <SymbolFlags symbol={symbol} size={20} />
              <span className="max-w-[82px] truncate text-[11px] font-black uppercase tracking-[0.01em] text-[#e8edf8] sm:text-[12px]">
                {symbol}
              </span>
            </div>

            <span className="shrink-0 text-[11px] font-black tabular-nums text-[#eff3ff]">
              {clockValue}
            </span>
          </div>

          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black" style={{ color: amountColor }}>
              <span
                className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full"
                style={{ background: direction === "higher" ? "rgba(24, 216, 125, 0.16)" : "rgba(255, 106, 114, 0.16)" }}
              >
                {direction === "higher" ? <ArrowUp className="h-3 w-3" strokeWidth={3} /> : <ArrowDown className="h-3 w-3" strokeWidth={3} />}
              </span>
              {amountLabel}
            </span>

            <span className="shrink-0 text-[11px] font-black sm:text-[12px]" style={{ color: profitColor }}>
              {profitLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="border-b border-white/6 last:border-b-0">
      {onToggle ? (
        <button type="button" onClick={onToggle} className="block w-full text-left">
          {rowBody}
        </button>
      ) : (
        rowBody
      )}

      {expanded && details ? (
        <div className="px-0 pb-2">
          {details}
        </div>
      ) : null}
    </div>
  );
};

const CompactActiveTradeRow = ({
  trade,
  shortOrderLabel,
  upColor,
  downColor,
}: {
  trade: ActiveTrade;
  shortOrderLabel: boolean;
  upColor: string;
  downColor: string;
}) => {
  const liveTimeLeft = useLiveCountdownSeconds(trade.opened_at, trade.expiry_seconds, trade.timeLeft);

  return (
    <CompactTradeRowShell
      symbol={trade.asset_symbol}
      clockValue={shortOrderLabel ? formatDurationShortcut(Math.max(0, liveTimeLeft - 0.05)) : formatTradeClock(Math.max(0, liveTimeLeft - 0.05))}
      amountLabel={formatStake(trade.amount)}
      amountColor={trade.direction === "higher" ? upColor : downColor}
      profitLabel={formatProfit(trade.amount * trade.payout_rate)}
      profitColor={upColor}
      direction={trade.direction}
    />
  );
};

const CompactPendingTradeRow = ({
  trade,
  shortOrderLabel,
  upColor,
  downColor,
}: {
  trade: QueuedPendingTrade;
  shortOrderLabel: boolean;
  upColor: string;
  downColor: string;
}) => {
  const pendingTimeLeft = useLiveCountdownSeconds(
    trade.created_at,
    PENDING_TRADE_DELAY_MS / 1000,
    PENDING_TRADE_DELAY_MS / 1000,
  );

  return (
    <CompactTradeRowShell
      symbol={trade.asset_symbol}
      clockValue={shortOrderLabel ? formatDurationShortcut(Math.max(0, pendingTimeLeft)) : formatTradeClock(Math.max(0, pendingTimeLeft))}
      amountLabel={formatStake(trade.amount)}
      amountColor={trade.direction === "higher" ? upColor : downColor}
      profitLabel="Queued"
      profitColor="#c7d1e6"
      direction={trade.direction}
    />
  );
};

const CompactHistoryRow = ({
  trade,
  expanded,
  onToggle,
  onOpenModal,
  shortOrderLabel,
  upColor,
  downColor,
}: {
  trade: TradeHistoryEntry;
  expanded: boolean;
  onToggle: () => void;
  onOpenModal: (trade: TradeHistoryEntry) => void;
  shortOrderLabel: boolean;
  upColor: string;
  downColor: string;
}) => {
  const result = Number(trade.profit ?? 0);

  return (
    <CompactTradeRowShell
      symbol={trade.asset_symbol}
      clockValue={shortOrderLabel ? formatDurationShortcut(trade.expiry_seconds ?? 0) : formatTradeClock(trade.expiry_seconds ?? 0)}
      amountLabel={formatStake(trade.amount ?? 0)}
      amountColor={trade.direction === "higher" ? upColor : downColor}
      profitLabel={formatProfit(result)}
      profitColor={result > 0 ? upColor : downColor}
      direction={trade.direction}
      expanded={expanded}
      onToggle={onToggle}
      details={<TradeResultInlinePanel trade={trade} onOpenModal={onOpenModal} />}
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
  onOpenMobileHistory,
  mobileDocked = false,
}: TradingPanelProps) => {
  const { profile } = useAuth();
  const { currency, formatMoney } = useCurrency();
  const { t } = useTranslation();
  const { activeTrades, tradeHistory, openTrade } = useTrading();
  const { preferences: tradingPreferences } = useTradingPreferences();
  const executeTrade = onTrade ?? openTrade;

  // Trading Desk Context for cross-component signal integration
  const {
    expirySeconds: contextExpirySeconds,
    setExpirySeconds: contextSetExpirySeconds,
    investment: contextInvestment,
    setInvestment: contextSetInvestment,
    executeTrade: contextExecuteTrade,
    direction: contextDirection,
    setDirection: contextSetDirection,
    isSignalMode,
  } = useTradingDesk();

  // Trading params - use context when in signal mode, otherwise local state
  const [localExpirySeconds, setLocalExpirySeconds] = useState(60);
  const [localInvestment, setLocalInvestment] = useState(1);
  const [investmentMode] = useState<InvestmentMode>("amount");
  const [showTimeSwitcher, setShowTimeSwitcher] = useState(false);
  const [showInvestmentSwitcher, setShowInvestmentSwitcher] = useState(false);

  // Sync with context when signal mode is active
  useEffect(() => {
    if (isSignalMode) {
      setLocalExpirySeconds(contextExpirySeconds);
      setLocalInvestment(contextInvestment);
    }
  }, [isSignalMode, contextExpirySeconds, contextInvestment]);

  // Exported values - prefer context in signal mode
  const expirySeconds = isSignalMode ? contextExpirySeconds : localExpirySeconds;
  const investment = isSignalMode ? contextInvestment : localInvestment;
  const setExpirySeconds = isSignalMode ? contextSetExpirySeconds : setLocalExpirySeconds;
  const setInvestment = isSignalMode ? contextSetInvestment : setLocalInvestment;

  // Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>("trades");
  const [expandedHistoryTradeId, setExpandedHistoryTradeId] = useState<string | null>(null);
  const [selectedHistoryTrade, setSelectedHistoryTrade] = useState<TradeHistoryEntry | null>(null);
  const [queuedPendingTrades, setQueuedPendingTrades] = useState<QueuedPendingTrade[]>([]);
  const [pendingTradeEnabled, setPendingTradeEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(PENDING_TRADE_MODE_KEY) === "1";
  });
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
  const firstSelectedAssetTradeId = selectedAssetTrades[0]?.id ?? null;
  const tradesTabCount = visibleActiveTrades.length + visibleTradeHistory.length;
  const activeTradeGroups = buildTradeGroups(sortedActiveTrades);
  const historyGroups = buildTradeGroups(sortedTradeHistory);
  const pendingTradeGroups = buildTradeGroups(queuedPendingTrades);
  const tradeListRef = useRef<HTMLDivElement | null>(null);
  const selectedAssetTradeRef = useRef<HTMLDivElement | null>(null);
  const queuedPendingTimeoutRef = useRef<number | null>(null);
  const queuedPendingTradeIdRef = useRef<string | null>(null);
  const directionFocusTimeoutRef = useRef<number | null>(null);
  const higherButtonRef = useRef<HTMLButtonElement | null>(null);
  const lowerButtonRef = useRef<HTMLButtonElement | null>(null);
  const [focusedDirection, setFocusedDirection] = useState<TradeDirection | null>(null);

  const liveBalance = getEffectiveLiveBalance(profile);
  const balance = accountType === "live" ? liveBalance : demoBalance;
  const payoutRate = (asset.maxProfit ?? 63) / 100;
  const effectiveInvestment = Math.max(1, Math.min(MAX_MANUAL_INVESTMENT, +investment.toFixed(2)));
  const payout = +(effectiveInvestment * (1 + payoutRate)).toFixed(2);
  const investmentUnit = "$";
  const upColor = tradingPreferences.upTrendColor;
  const downColor = tradingPreferences.downTrendColor;

  const adjustInvestment = (delta: number) => {
    const step = 1;
    const max = Math.max(1, Math.floor(Math.min(balance, MAX_MANUAL_INVESTMENT)));
    setInvestment((value) => {
      const next = Math.round((value + delta * step) * 100) / 100;
      return Math.max(1, Math.min(max, next));
    });
  };

  const adjustExpiry = (delta: number) => {
    const nextIdx = delta > 0
      ? TIME_PRESETS.findIndex((preset) => preset.val > expirySeconds)
      : TIME_PRESETS.reduce((lastIndex, preset, presetIndex) => (
        preset.val < expirySeconds ? presetIndex : lastIndex
      ), -1);
    const fallbackIdx = delta > 0 ? TIME_PRESETS.length - 1 : 0;
    const resolvedIdx = nextIdx === -1 ? fallbackIdx : nextIdx;
    setExpirySeconds(TIME_PRESETS[resolvedIdx].val);
  };

  const handleInvestmentInput = (rawValue: string) => {
    setInvestment(clampInvestmentValue(Number(rawValue) || 1, "amount"));
  };

  useEffect(() => {
    if (expandedHistoryTradeId && !sortedTradeHistory.some((trade) => trade.id === expandedHistoryTradeId)) {
      setExpandedHistoryTradeId(null);
    }
  }, [expandedHistoryTradeId, sortedTradeHistory]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PENDING_TRADE_MODE_KEY, pendingTradeEnabled ? "1" : "0");
  }, [pendingTradeEnabled]);

  useEffect(() => {
    return () => {
      if (queuedPendingTimeoutRef.current !== null) {
        window.clearTimeout(queuedPendingTimeoutRef.current);
      }
      if (directionFocusTimeoutRef.current !== null) {
        window.clearTimeout(directionFocusTimeoutRef.current);
      }
    };
  }, []);

  // Trade execution
  const executeTradeNow = async (direction: "higher" | "lower") => {
    const dir = isSignalMode && contextDirection ? contextDirection : direction;
    if (effectiveInvestment <= 0) return false;

    // Use context executeTrade in signal mode for cross-component integration
    if (isSignalMode && contextExecuteTrade) {
      return await contextExecuteTrade(
        asset.symbol,
        dir,
        effectiveInvestment,
        asset.price,
        expirySeconds,
        payoutRate,
      );
    }

    if (accountType === "demo") {
      if (effectiveInvestment > demoBalance) {
        alert("Insufficient demo balance");
        return false;
      }
      return await (onDemoTrade ?? executeTrade)(
        asset.symbol,
        dir,
        effectiveInvestment,
        asset.price,
        expirySeconds,
        payoutRate,
      );
    }

    return await executeTrade(
      asset.symbol,
      dir,
      effectiveInvestment,
      asset.price,
      expirySeconds,
      payoutRate,
    );
  };

  const cancelQueuedPendingTrade = () => {
    if (queuedPendingTimeoutRef.current !== null) {
      window.clearTimeout(queuedPendingTimeoutRef.current);
      queuedPendingTimeoutRef.current = null;
      queuedPendingTradeIdRef.current = null;
      setQueuedPendingTrades([]);
      toast({
        title: t("tradingPanel.pendingTradeCanceled"),
        description: t("tradingPanel.pendingTradeCanceledDesc"),
      });
    }
  };

  const placeTrade = async (direction: "higher" | "lower") => {
    if (effectiveInvestment <= 0) return;
    if (asset.available === false) return;

    if (!tradingPreferences.oneClickTrade) {
      const directionLabel = direction === "higher" ? t("tradingPanel.up") : t("tradingPanel.down");
      const confirmed = window.confirm(
        t("tradingPanel.confirmTrade", { direction: directionLabel, symbol: asset.symbol, amount: formatStake(effectiveInvestment) }),
      );

      if (!confirmed) {
        return;
      }
    }

    if (pendingTradeEnabled) {
      const queuedTradeId =
        typeof window !== "undefined" && typeof window.crypto?.randomUUID === "function"
          ? window.crypto.randomUUID()
          : `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const createdAt = new Date().toISOString();

      queuedPendingTradeIdRef.current = queuedTradeId;
      setQueuedPendingTrades([
        {
          id: queuedTradeId,
          asset_symbol: asset.symbol,
          direction,
          amount: effectiveInvestment,
          payout_rate: payoutRate,
          expiry_seconds: expirySeconds,
          created_at: createdAt,
          opened_at: createdAt,
        },
      ]);
      focusPendingTab();
      toast({
        title: t("tradingPanel.pendingTradeArmed"),
        description: t("tradingPanel.pendingTradeArmedDesc", { direction: direction === "higher" ? "Up" : "Down" }),
      });

      queuedPendingTimeoutRef.current = window.setTimeout(() => {
        void (async () => {
          try {
            const didOpenTrade = await executeTradeNow(direction);
            if (didOpenTrade) {
              focusTradesTab();
            }
          } finally {
            queuedPendingTimeoutRef.current = null;
            queuedPendingTradeIdRef.current = null;
            setQueuedPendingTrades([]);
          }
        })();
      }, PENDING_TRADE_DELAY_MS);
      return;
    }

    const didOpenTrade = await executeTradeNow(direction);
    if (didOpenTrade) {
      focusTradesTab();
    }
  };

  const focusDirectionButton = (direction: TradeDirection) => {
    setFocusedDirection(direction);
    const targetButton = direction === "higher" ? higherButtonRef.current : lowerButtonRef.current;

    if (targetButton && targetButton.offsetParent !== null) {
      targetButton.focus({ preventScroll: true });
    }

    if (directionFocusTimeoutRef.current !== null) {
      window.clearTimeout(directionFocusTimeoutRef.current);
    }

    directionFocusTimeoutRef.current = window.setTimeout(() => {
      setFocusedDirection(null);
      directionFocusTimeoutRef.current = null;
    }, 1800);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleDirectionFocus = (event: Event) => {
      const detail = (event as CustomEvent<TradeDeskDirectionFocusDetail>).detail;
      if (!detail?.direction) return;

      focusDirectionButton(detail.direction);
    };

    const handleDirectionSubmit = (event: Event) => {
      const detail = (event as CustomEvent<TradeDeskDirectionFocusDetail>).detail;
      if (!detail?.direction) return;

      focusDirectionButton(detail.direction);
      void placeTrade(detail.direction);
    };

    window.addEventListener(TRADE_DESK_DIRECTION_FOCUS_EVENT, handleDirectionFocus as EventListener);
    window.addEventListener(TRADE_DESK_DIRECTION_SUBMIT_EVENT, handleDirectionSubmit as EventListener);
    return () => {
      window.removeEventListener(TRADE_DESK_DIRECTION_FOCUS_EVENT, handleDirectionFocus as EventListener);
      window.removeEventListener(TRADE_DESK_DIRECTION_SUBMIT_EVENT, handleDirectionSubmit as EventListener);
    };
  }, [placeTrade]);

  const focusTradesTab = ({ openMobilePanel = false }: { openMobilePanel?: boolean } = {}) => {
    setActiveTab("trades");

    if (openMobilePanel && typeof window !== "undefined" && window.innerWidth < 1024) {
      onOpenMobileHistory?.();
    }

    window.setTimeout(() => {
      if (selectedAssetTradeRef.current) {
        selectedAssetTradeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      tradeListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 80);
  };

  const focusPendingTab = ({ openMobilePanel = false }: { openMobilePanel?: boolean } = {}) => {
    setActiveTab("pending");

    if (openMobilePanel && typeof window !== "undefined" && window.innerWidth < 1024) {
      onOpenMobileHistory?.();
    }

    window.setTimeout(() => {
      tradeListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 80);
  };

  const handlePendingTradeToggle = () => {
    const nextValue = !pendingTradeEnabled;

    if (!nextValue) {
      cancelQueuedPendingTrade();
    }

    setPendingTradeEnabled(nextValue);

    if (nextValue) {
      focusPendingTab();
      toast({
        title: t("tradingPanel.pendingTradeEnabled"),
        description: t("tradingPanel.pendingTradeEnabledDesc"),
      });
    }
  };

  const higherButtonFocused = focusedDirection === "higher";
  const lowerButtonFocused = focusedDirection === "lower";

  return (
    <>
      <aside
        className={`font-copy w-full lg:w-[210px] h-full min-h-[190px] shrink-0 flex flex-col border-l text-[var(--trading-text-color)] rounded-t-[18px] lg:rounded-none border-t lg:border-t-0 shadow-[0_-10px_30px_rgba(0,0,0,0.28)] lg:shadow-none overflow-hidden ${mobileDocked ? "rounded-t-[16px]" : ""}`}
        style={{
          background: "var(--trading-panel-bg)",
          borderColor: "var(--trading-border-color)",
        }}
      >

        {/* ── Asset Header & Pending Toggle (Single Row) ──────────────── */}
        <div className="flex items-center justify-between px-2.5 pt-2 pb-1.5 lg:px-[14px] lg:min-h-[72px] lg:pt-[12px] lg:pb-0" style={{ background: "var(--trading-panel-bg)" }}>
          <button 
            onClick={() => onOpenAssetSelector?.()}
            className="flex min-w-0 items-center gap-2 rounded-[4px] p-1 -ml-1 transition-colors hover:bg-white/5"
          >
            <SymbolFlags symbol={asset.symbol} />
            <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-normal tracking-[0.01em] text-white sm:text-[12px] lg:text-[13px]">
              <span className="max-w-[112px] truncate">{asset.symbol}</span>
              <span className={`shrink-0 text-[#8f98ac] ${asset.available === false ? "text-red-400" : ""}`}>{asset.available === false ? "N/A" : `${asset.maxProfit ?? 79}%`}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 lg:hidden" strokeWidth={3} />
            </div>
          </button>

          {/* Mobile: PENDING TRADE toggle in header */}
          <button
            type="button"
            onClick={handlePendingTradeToggle}
            aria-pressed={pendingTradeEnabled}
            className="flex shrink-0 items-center gap-1.5 lg:hidden"
          >
            <span className={`text-[9px] font-normal uppercase tracking-wider ${pendingTradeEnabled ? "text-[#0fa053]" : "text-[#7f8b99]"}`}>
              PENDING TRADE
            </span>
            <div
              className={`relative h-[14px] w-[28px] rounded-full border transition-all`}
              style={{
                borderColor: pendingTradeEnabled ? "#0fa053" : "rgba(255,255,255,0.15)",
                backgroundColor: pendingTradeEnabled ? "#0fa053" : "transparent",
              }}
            >
              <div className={`absolute top-[2px] h-[8px] w-[8px] rounded-full transition-all ${pendingTradeEnabled ? "left-[16px] bg-white shadow-sm" : "left-[2px] bg-gray-500"}`} />
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={handlePendingTradeToggle}
          aria-pressed={pendingTradeEnabled}
          className="hidden items-center justify-between px-4 pb-3 text-left transition-colors hover:bg-white/[0.02] lg:flex"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#0fa053]" strokeWidth={2.4} />
            <span className={`text-[10px] font-black uppercase tracking-[0.02em] ${pendingTradeEnabled ? "text-[#1c9cff]" : "text-[#8fb0cf]"}`}>
              Pending trade
            </span>
          </div>

          <div
            className={`relative h-[16px] w-[28px] rounded-full border transition-all ${pendingTradeEnabled ? "border-[#1c9cff]/80 bg-[#253044]" : "border-[#1c9cff]/80 bg-transparent"}`}
          >
            <div
              className={`absolute top-[2px] h-[10px] w-[10px] rounded-full transition-all ${pendingTradeEnabled ? "left-[14px] bg-[#1c9cff] shadow-[0_0_10px_rgba(28,156,255,0.45)]" : "left-[2px] bg-[#1c9cff]"}`}
            />
          </div>
        </button>

        {/* ── Compact mobile layout with desktop controls restored ── */}
        <div className="pb-2 lg:px-4 lg:pb-2.5">
          <div className="relative z-10 lg:pb-0 lg:px-0">
            <div className="grid w-full grid-cols-1 gap-2 lg:grid-cols-1 lg:gap-3">
              <div className="relative">
                {/* Mobile: Two separate cards - Timer and Investment (edge-to-edge) */}
                <div className="relative lg:hidden">
                  <div className="flex gap-1 px-1">
                    {/* Timer card */}
                    <div className="relative flex h-[35px] flex-1 rounded-lg border py-2.5 px-3" style={{ background: "var(--trading-control-bg)", borderColor: "var(--trading-control-border)" }}>
                      <span className="absolute -top-2 left-3 z-10 px-1 text-[9px] font-normal text-[var(--trading-muted-color)]" style={{ background: "var(--trading-control-bg)" }}>Timer</span>
                      <div
                        onClick={() => setShowTimeSwitcher((value) => !value)}
                        className="flex h-[15px] cursor-pointer items-center"
                      >
                        <span className="text-[15px] font-normal tabular-nums text-[var(--trading-text-color)]" style={{ fontFamily: "Arial, sans-serif" }}>
                          {formatTradeClock(expirySeconds)}
                        </span>
                      </div>
                    </div>

                    {/* Investment card */}
                    <div className="relative flex h-[35px] flex-1 rounded-lg border py-2.5 px-3" style={{ background: "var(--trading-control-bg)", borderColor: "var(--trading-control-border)" }}>
                      <span className="absolute -top-2 left-3 z-10 px-1 text-[9px] font-normal text-[var(--trading-muted-color)]" style={{ background: "var(--trading-control-bg)" }}>Investment</span>
                      <div className="flex h-[15px] w-full items-center justify-between">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--trading-muted-color)] active:scale-95"
                          style={{ background: "var(--trading-panel-soft-bg)" }}
                          onClick={() => adjustInvestment(-1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={investment}
                            min={1}
                            max={MAX_MANUAL_INVESTMENT}
                            step={0.01}
                            inputMode="decimal"
                            onChange={(event) => handleInvestmentInput(event.target.value)}
                            className="hide-number-spin w-[38px] bg-transparent text-center text-[15px] font-normal text-[var(--trading-text-color)] outline-none"
                            style={{ fontFamily: "Arial, sans-serif" }}
                          />
                          <span className="text-[12px] font-normal text-[var(--trading-muted-color)]">$</span>
                        </div>
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--trading-muted-color)] active:scale-95"
                          style={{ background: "var(--trading-panel-soft-bg)" }}
                          onClick={() => adjustInvestment(1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SWITCH below cards, right-aligned */}
                  <div className="mt-1 flex items-center justify-end px-1">
                    <button
                      type="button"
                      onClick={() => setShowInvestmentSwitcher((value) => !value)}
                      className="text-[9px] font-normal uppercase tracking-wider text-[var(--trading-accent-color)]"
                    >
                      SWITCH
                    </button>
                  </div>

                  {/* Payout row below */}
                  <div className="mt-0.5 flex items-center justify-between px-1">
                    <span className="text-[11px] font-normal text-[var(--trading-muted-color)]">Payout</span>
                    <span className="text-[14px] font-normal text-[var(--trading-text-color)]">
                      {asset.available === false ? "N/A" : formatCurrencyAmount(payout, currency)}
                    </span>
                  </div>
                </div>

                {/* Mobile timer dropdown (portal) */}
                {showTimeSwitcher && createPortal(
                  <div className="fixed inset-0 z-[9998] lg:hidden" onClick={() => setShowTimeSwitcher(false)}>
                    <div
                      className="absolute bottom-[140px] left-2 right-2 z-[9999]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TimeSwitcherDropdown
                        expirySeconds={expirySeconds}
                        setExpirySeconds={setExpirySeconds}
                        setShowTimeSwitcher={setShowTimeSwitcher}
                      />
                    </div>
                  </div>,
                  document.body
                )}

                {/* Desktop timer */}
                <div className="relative hidden lg:block">
                  <div className="absolute -top-2 left-3 z-10 bg-[#252938] px-1 text-[10px] font-semibold text-[#777f92]">{t("tradingPanel.timeLabelShort")}</div>
                  <div
                    onClick={() => setShowTimeSwitcher((v) => !v)}
                    className="flex h-[38px] cursor-pointer items-center justify-between rounded-[5px] border border-[#464c5d] bg-[#282c3b] px-0 transition hover:border-[#5a6278]"
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustExpiry(-1); }}
                      className="flex h-full w-[38px] items-center justify-center border-0 bg-transparent text-[21px] text-[#8d94a5] transition hover:text-white"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center text-[14px] font-medium tracking-[0.01em] text-[#f0f1f5]" style={{ fontFamily: "Arial, sans-serif" }}>
                      {formatTradeClock(expirySeconds)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustExpiry(1); }}
                      className="flex h-full w-[38px] items-center justify-center border-0 bg-transparent text-[21px] text-[#8d94a5] transition hover:text-white"
                    >
                      +
                    </button>
                  </div>
                  <div className="mt-[3px] flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setShowTimeSwitcher((v) => !v)}
                      className="border-0 bg-transparent text-[9px] font-semibold uppercase tracking-wider text-[#00a0ff] cursor-pointer"
                    >
                      {showTimeSwitcher ? "▲ SWITCH TIME" : "▼ SWITCH TIME"}
                    </button>
                  </div>

                  {/* Inline dropdown */}
                  {showTimeSwitcher && (
                    <div className="absolute left-0 bottom-full z-50 mb-1">
                      <TimeSwitcherDropdown
                        expirySeconds={expirySeconds}
                        setExpirySeconds={setExpirySeconds}
                        setShowTimeSwitcher={setShowTimeSwitcher}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                {/* Desktop amount */}
                <div className="relative hidden lg:block">
                  <div className="absolute -top-2 left-3 z-10 bg-[#252938] px-1 text-[10px] font-semibold text-[#777f92]">{t("tradingPanel.investmentLabel")}</div>
                  <div
                    onClick={() => setShowInvestmentSwitcher((v) => !v)}
                    className="flex h-[38px] cursor-pointer items-center justify-between rounded-[5px] border border-[#464c5d] bg-[#282c3b] px-0 transition hover:border-[#5a6278]"
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustInvestment(-1); }}
                      className="flex h-full w-[38px] items-center justify-center border-0 bg-transparent text-[21px] text-[#8d94a5] transition hover:text-white"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={investment}
                      min={1}
                      max={MAX_MANUAL_INVESTMENT}
                      step={0.01}
                      inputMode="decimal"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(event) => handleInvestmentInput(event.target.value)}
                      className="hide-number-spin min-w-0 w-[70px] bg-transparent text-center text-[14px] font-medium tracking-[0.01em] text-[#f0f1f5] outline-none"
                      style={{ fontFamily: "Arial, sans-serif" }}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); adjustInvestment(1); }}
                      className="flex h-full w-[38px] items-center justify-center border-0 bg-transparent text-[21px] text-[#8d94a5] transition hover:text-white"
                    >
                      +
                    </button>
                  </div>
                  <div className="mt-[3px] flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setShowInvestmentSwitcher((v) => !v)}
                      className="border-0 bg-transparent text-[9px] font-semibold uppercase tracking-wider text-[#00a0ff] cursor-pointer"
                    >
                      {showInvestmentSwitcher ? "▲ SWITCH" : "▼ SWITCH"}
                    </button>
                  </div>

                  {/* Inline dropdown */}
                  {showInvestmentSwitcher && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-white/10 bg-[#1a1f2e] shadow-xl">
                      <div className="grid grid-cols-3 gap-1 p-2">
                        {[1, 5, 10, 25, 50, 100, 250, 500, 1000].map((amt) => {
                          const isSelected = investment === amt;
                          const isDisabled = amt > MAX_MANUAL_INVESTMENT;
                          return (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => { if (!isDisabled) { setInvestment(amt); setShowInvestmentSwitcher(false); } }}
                              disabled={isDisabled}
                              className={`h-8 rounded-md text-[11px] font-bold transition-all active:scale-95 ${
                                isSelected
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : isDisabled
                                    ? "bg-white/3 text-white/20 border border-white/4 cursor-not-allowed"
                                    : "bg-white/5 text-white/50 border border-white/6 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              ${amt.toLocaleString()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Payout ───────────────────────────────────────────────── */}
        <div className="hidden items-center justify-between border-t px-2.5 pb-2 pt-2 text-xs lg:mx-3.5 lg:flex lg:px-0 lg:pb-[7px] lg:pt-[10px]" style={{ borderColor: "var(--trading-border-color)", color: "#8b91a1" }}>
          <span className="font-normal text-[12px]">Payout</span>
          <span className="text-[12px] font-semibold tracking-wide text-[#f2f3f6]">{asset.available === false ? "N/A" : formatCurrencyAmount(payout, currency)}</span>
        </div>

        {/* ── UP & DOWN Buttons (Side-by-side on mobile, stacked on desktop) ── */}
        <div className="grid grid-cols-2 gap-2 px-1.5 pb-3 lg:mx-3.5 lg:grid-cols-1 lg:gap-2 lg:px-0 lg:pb-2">
          <button
            ref={higherButtonRef}
            type="button"
            onClick={() => placeTrade("higher")}
            disabled={asset.available === false}
            className={`flex h-[44px] items-center justify-between rounded-[4px] px-3 text-[12px] font-normal text-white transition-all active:scale-[0.99] focus:outline-none lg:h-[43px] lg:rounded-[5px] lg:px-[13px] lg:text-[14px] lg:font-bold ${
              higherButtonFocused ? "scale-[1.02]" : ""
            } ${asset.available === false ? "cursor-not-allowed opacity-40" : ""}`}
            style={{
              background: asset.available === false ? "var(--trading-muted-color, #3a4055)" : "var(--trading-up-color, var(--trading-success-color))",
              color: "var(--trading-success-contrast-color)",
              boxShadow: higherButtonFocused ? "var(--trading-success-focus-shadow)" : "0 4px 16px rgba(16,160,85,0.30)",
            }}>
            <span>Up</span>
            <span className="flex w-[20px] h-[20px] items-center justify-center rounded-full bg-white/20 text-[10px] lg:w-[22px] lg:h-[22px]">
              <ArrowUp className="w-3 h-3" strokeWidth={3} />
            </span>
          </button>

          <button
            ref={lowerButtonRef}
            type="button"
            onClick={() => placeTrade("lower")}
            disabled={asset.available === false}
            className={`flex h-[44px] items-center justify-between rounded-[4px] px-3 text-[12px] font-normal text-white transition-all active:scale-[0.99] focus:outline-none lg:h-[43px] lg:rounded-[5px] lg:px-[13px] lg:text-[14px] lg:font-bold ${
              lowerButtonFocused ? "scale-[1.02]" : ""
            } ${asset.available === false ? "cursor-not-allowed opacity-40" : ""}`}
            style={{
              background: asset.available === false ? "var(--trading-muted-color, #3a4055)" : "var(--trading-down-color, var(--trading-danger-color))",
              color: "var(--trading-danger-contrast-color)",
              boxShadow: lowerButtonFocused ? "var(--trading-danger-focus-shadow)" : "0 4px 16px rgba(220,60,60,0.30)",
            }}>
            <span>{t("tradingPanel.down")}</span>
            <span className="flex w-[20px] h-[20px] items-center justify-center rounded-full bg-white/20 text-[10px] lg:w-[22px] lg:h-[22px]">
              <ArrowDown className="w-3 h-3" strokeWidth={3} />
            </span>
          </button>
        </div>

        {/* ── Secondary Layout Block (Modal on Mobile, Fixed Panel on Desktop) ── */}
        <div
          className={`${mobileHistoryOpen ? 'fixed inset-0 z-[100] flex animate-in slide-in-from-bottom pb-12' : 'hidden lg:mt-2 lg:flex flex-1'} flex-col overflow-hidden rounded-[4px] border border-[#242b3e] border-t-[#1c9cff] bg-[#252b3d]`}
        >
          
          {/* ── Tabs: History / Pending ───────────────────────────────── */}
          <div
            className="grid grid-cols-2 border-b border-[#202638] bg-[#252b3d] text-center text-xs font-semibold"
          >
            <button
              onClick={() => setActiveTab("trades")}
              className={`flex items-center justify-center gap-1.5 py-3 text-xs font-black transition-colors ${activeTab === "trades" ? "text-white" : "text-gray-400 hover:text-gray-200"}`}
            >
              <span>{t("tradingPanel.trades")}</span>
              <span className="rounded-full bg-[#697289] px-1.5 text-[9px] font-black text-white">{tradesTabCount}</span>
            </button>

            <button
              onClick={() => setActiveTab("pending")}
              aria-label={t("tradingPanel.pendingTrades")}
              className={`flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${activeTab === "pending" ? "text-white" : "text-gray-400 hover:text-gray-200"}`}
            >
              <i className="fa-regular fa-clock text-xs"></i>
              <span className="rounded-full bg-[#697289] px-1.5 text-[9px] font-black text-white/70">{queuedPendingTrades.length}</span>
            </button>

            {mobileHistoryOpen && (
              <button onClick={onCloseMobileHistory} className="ml-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* ── Trade List ───────────────────────────────────────────── */}
          <div ref={tradeListRef} className="flex-1 overflow-y-auto scrollbar-hide px-1.5 py-1.5">
            {activeTab === "pending" ? (
              queuedPendingTrades.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#2a3040] p-4 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full">
                    <Clock className="h-5 w-5 text-gray-600" />
                  </div>
                  <p className="text-[11px] leading-relaxed text-gray-500">
                    No pending trades yet. Armed delayed trades will appear here before execution.
                  </p>
                </div>
              ) : (
                <div className="bg-[#2a3040]">
                  {pendingTradeGroups.map((group, groupIndex) => (
                    <section key={`${group.label}-${group.items.length}`} className={groupIndex > 0 ? "border-t border-white/2" : ""}>
                      <TradeGroupHeader label={group.label} count={group.items.length} />
                      <div>
                        {group.items.map((trade) => (
                          <CompactPendingTradeRow
                            key={trade.id}
                            trade={trade}
                            shortOrderLabel={tradingPreferences.shortOrderLabel}
                            upColor={upColor}
                            downColor={downColor}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )
            ) : (
              tradesTabCount === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#2a3040] p-4 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full">
                    <Briefcase className="h-5 w-5 text-gray-600" />
                  </div>
                  <p className="text-[11px] leading-relaxed text-gray-500">No trades yet. Ongoing and completed trades will appear here.</p>
                </div>
              ) : (
                <div className="bg-[#2a3040]">
                  {sortedActiveTrades.length > 0 ? (
                    <section>
                      <TradeGroupHeader label={t("tradingPanel.openTrades")} count={sortedActiveTrades.length} />
                      <div>
                        {sortedActiveTrades.map((trade) => (
                          <div
                            key={trade.id}
                            ref={trade.id === firstSelectedAssetTradeId ? selectedAssetTradeRef : null}
                          >
                            <CompactActiveTradeRow
                              trade={trade}
                              shortOrderLabel={tradingPreferences.shortOrderLabel}
                              upColor={upColor}
                              downColor={downColor}
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {sortedTradeHistory.length > 0 ? (
                    <section className={sortedActiveTrades.length > 0 ? "border-t border-white/2" : ""}>
                      {historyGroups.map((group, groupIndex) => (
                        <div key={`${group.label}-${group.items.length}`} className={groupIndex > 0 ? "border-t border-white/2" : ""}>
                          <TradeGroupHeader label={group.label} count={group.items.length} />
                          <div>
                            {group.items.map((trade) => (
                              <CompactHistoryRow
                                key={trade.id}
                                trade={trade}
                                expanded={expandedHistoryTradeId === trade.id}
                                onToggle={() =>
                                  setExpandedHistoryTradeId((current) => (current === trade.id ? null : trade.id))
                                }
                                onOpenModal={setSelectedHistoryTrade}
                                shortOrderLabel={tradingPreferences.shortOrderLabel}
                                upColor={upColor}
                                downColor={downColor}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </section>
                  ) : null}
                </div>
              )
            )}
          </div>

        </div>
      </aside>
      <TradeResultDetailModal
        trade={selectedHistoryTrade ? mapTradeHistoryEntryToPresentation(selectedHistoryTrade) : null}
        onClose={() => setSelectedHistoryTrade(null)}
      />
    </>
  );
};

export default TradingPanel;
