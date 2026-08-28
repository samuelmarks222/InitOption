import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState, type ReactNode, useContext } from "react";
import {
  ChevronDown, Plus, Minus, ArrowUp, ArrowDown,
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
import TimePopover from "./TimePopover";
import AmountPopover from "./AmountPopover";
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

// Preset durations in seconds
const TIME_PRESETS = [
  { label: "1m",   val: 60     },
  { label: "2m",   val: 120    },
  { label: "3m",   val: 180    },
  { label: "4m",   val: 240    },
  { label: "5m",   val: 300    },
  { label: "10m",  val: 600    },
  { label: "15m",  val: 900    },
  { label: "30m",  val: 1800   },
  { label: "1h",   val: 3600   },
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

// ─── Withdrawal Modal and more was extracted to AccountModals.tsx ───

const INVESTMENT_PRESETS = [1, 5, 10, 25, 50, 100, 200, 500];

const InvestmentSwitcher = ({
  value,
  onChange,
  onClose,
  max,
  triggerRef,
}: {
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
  max: number;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const [customAmount, setCustomAmount] = useState(String(value));
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (!triggerRef.current || !cardRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: triggerRect.top,
      right: window.innerWidth - triggerRect.left + 8,
    });
  }, [triggerRef]);

  const applyCustom = () => {
    const v = Math.max(1, Math.min(max, Math.round(Number(customAmount) || 0)));
    onChange(v);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        ref={cardRef}
        style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 100 }}
        className="w-[200px] overflow-hidden rounded-lg border border-white/10 shadow-lg"
      >
        <div className="flex items-center justify-between bg-[#0fa053] px-3 py-1.5">
          <span className="text-[11px] font-semibold text-white">Investment</span>
          <button type="button" onClick={onClose} className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30">
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>
        <div style={{ background: "var(--trading-panel-bg, #1e2330)" }} className="p-2.5">
          <div className="grid grid-cols-2 gap-1.5">
            {INVESTMENT_PRESETS.map((amount) => {
              const isSelected = value === amount;
              return (
                <button
                  key={amount}
                  type="button"
                  onClick={() => { onChange(amount); onClose(); }}
                  className={`rounded-md px-2 py-1.5 text-center text-[11px] transition-colors ${
                    isSelected
                      ? "bg-[#0fa053]/20 text-white"
                      : "text-white/60 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  ${amount}
                </button>
              );
            })}
          </div>
          <div className="mt-3 border-t border-white/8 pt-2.5">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={max}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="hide-number-spin h-7 flex-1 rounded border border-white/10 bg-transparent px-2 text-[11px] text-white outline-none"
              />
              <button
                type="button"
                onClick={applyCustom}
                className="h-7 rounded bg-[#0fa053] px-2.5 text-[10px] font-medium text-white hover:opacity-90"
              >
                Go
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

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
  const timeTriggerRef = useRef<HTMLDivElement | null>(null);
  const investTriggerRef = useRef<HTMLDivElement | null>(null);
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
    const idx = TIME_PRESETS.findIndex((preset) => preset.val === expirySeconds);
    const resolvedIdx =
      idx >= 0
        ? idx
        : TIME_PRESETS.reduce((closestIndex, preset, presetIndex) => {
            const currentDistance = Math.abs(TIME_PRESETS[closestIndex].val - expirySeconds);
            const nextDistance = Math.abs(preset.val - expirySeconds);
            return nextDistance < currentDistance ? presetIndex : closestIndex;
          }, 0);
    const nextIdx = Math.max(0, Math.min(TIME_PRESETS.length - 1, resolvedIdx + delta));
    setExpirySeconds(TIME_PRESETS[nextIdx].val);
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
      <aside className={`font-copy w-full lg:w-[240px] h-full min-h-[190px] shrink-0 flex flex-col border-l border-[#171d2d] bg-[#242a3c] text-white rounded-t-[18px] lg:rounded-none border-t border-white/10 lg:border-t-0 shadow-[0_-10px_30px_rgba(0,0,0,0.28)] lg:shadow-none ${showTimeSwitcher ? "overflow-visible lg:overflow-visible" : "overflow-hidden"} ${mobileDocked ? "rounded-t-[16px]" : ""}`}>

        <div className="flex items-center justify-between border-b border-white/6 bg-[#242a3c] px-3 py-2.5">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8da1c9]">Pending trade</span>
          <button
            type="button"
            onClick={handlePendingTradeToggle}
            aria-pressed={pendingTradeEnabled}
            className="flex shrink-0 items-center gap-2 rounded-full border border-[#41506f] bg-[#1c2434] px-2 py-1"
          >
            <span className={`text-[9px] font-bold uppercase tracking-[0.08em] ${pendingTradeEnabled ? "text-[#2c9dff]" : "text-[#8fa0bc]"}`}>
              {pendingTradeEnabled ? "ON" : "OFF"}
            </span>
            <div className={`relative h-[14px] w-[28px] rounded-full border transition-all ${pendingTradeEnabled ? "border-[#2c9dff]/80 bg-[#1d2d49]" : "border-white/10 bg-transparent"}`}>
              <div className={`absolute top-[2px] h-[8px] w-[8px] rounded-full transition-all ${pendingTradeEnabled ? "left-[16px] bg-[#2c9dff] shadow-[0_0_10px_rgba(44,157,255,0.5)]" : "left-[2px] bg-[#7a879f]"}`} />
            </div>
          </button>
        </div>

        {/* ── Compact mobile layout with desktop controls restored ── */}
       <div className="space-y-2 px-2.5 pb-2 lg:px-4 lg:pb-2.5">
         <div ref={timeTriggerRef} className="relative z-10">
           <div className="flex items-center justify-between rounded-md border border-[#3a465d] bg-[#2f3648] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
             <div className="flex items-center gap-2">
               <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#7783a0] text-[9px] text-slate-900">
                 <Clock className="h-2.5 w-2.5" strokeWidth={2.4} />
               </span>
               <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#b7c5df]">Time</span>
             </div>
             <button
               type="button"
               onClick={() => setShowTimeSwitcher((value) => !value)}
               className="flex items-center gap-2 rounded-md border border-[#4b5874] bg-[#1b2333] px-2 py-1"
             >
               <span className="text-[14px] font-bold text-white tabular-nums">{formatTradeClock(expirySeconds)}</span>
               <Plus className="h-3 w-3 text-[#8fa5d9]" strokeWidth={2.6} />
             </button>
           </div>

           {showTimeSwitcher && (
             <TimePopover value={expirySeconds} onChange={setExpirySeconds} onClose={() => setShowTimeSwitcher(false)} triggerRef={timeTriggerRef} />
           )}
         </div>

         <div ref={investTriggerRef} className="flex items-center justify-between rounded-md border border-[#3a465d] bg-[#2f3648] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
           <div className="flex items-center gap-2">
             <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#b7c5df]">Investment</span>
           </div>
           <button
             type="button"
             onClick={() => setShowInvestmentSwitcher((v) => !v)}
             className="flex items-center gap-2 rounded-md border border-[#4b5874] bg-[#1b2333] px-2 py-1"
           >
             <span className="text-[14px] font-bold text-white tabular-nums">{getCurrencySymbol(currency)} {Number(investment).toFixed(0)}</span>
             <Plus className="h-3 w-3 text-[#8fa5d9]" strokeWidth={2.6} />
           </button>
         </div>

         {showInvestmentSwitcher && (
           <AmountPopover
             value={investment}
             onChange={(v) => handleInvestmentInput(String(v))}
             onClose={() => setShowInvestmentSwitcher(false)}
             max={MAX_MANUAL_INVESTMENT}
             triggerRef={investTriggerRef}
           />
         )}
       </div>

       <div className="flex items-center justify-between border-t border-dashed border-[#4a5267] px-2.5 pb-2 pt-2 text-xs text-gray-400 lg:mx-4 lg:px-0 lg:pb-3">
         <span className="font-semibold">{t("tradingPanel.yourPayout")}</span>
         <span className="text-[13px] font-black tracking-wide text-white">{asset.available === false ? "N/A" : formatCurrencyAmount(payout, currency)}</span>
       </div>

       <div className="grid grid-cols-2 gap-2 px-2.5 pb-3 lg:mx-4 lg:grid-cols-1 lg:gap-2.5 lg:px-0 lg:pb-2">
          <button
            ref={higherButtonRef}
            type="button"
            onClick={() => placeTrade("higher")}
            disabled={asset.available === false}
            className={`flex h-[44px] items-center justify-between rounded-[4px] px-3 text-[12px] font-bold text-white transition-all active:scale-[0.99] focus:outline-none lg:px-4 lg:text-[13px] ${
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
            className={`flex h-[44px] items-center justify-between rounded-[4px] px-3 text-[12px] font-bold text-white transition-all active:scale-[0.99] focus:outline-none lg:px-4 lg:text-[13px] ${
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



