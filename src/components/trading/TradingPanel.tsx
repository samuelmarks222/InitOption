import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown, Plus, Minus, ArrowUp, ArrowDown,
  Clock, Briefcase,
  X, Check, TrendingUp, TrendingDown
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
const MIN_MANUAL_EXPIRY_SECONDS = 60;
const MAX_MANUAL_EXPIRY_SECONDS = 24 * 60 * 60;
const PENDING_TRADE_DELAY_MS = 3000;
const PENDING_TRADE_MODE_KEY = "trade_pending_mode_enabled";

const clampInvestmentValue = (value: number, mode: InvestmentMode) => {
  if (mode === "percent") {
    return Math.max(1, Math.min(100, Math.round(value)));
  }

  return Math.max(1, Math.min(MAX_MANUAL_INVESTMENT, Math.round(value * 100) / 100));
};

type CustomDurationUnit = "seconds" | "minutes" | "hours";

const deriveCustomDurationInput = (seconds: number): { amount: string; unit: CustomDurationUnit } => {
  if (seconds >= 3600 && seconds % 3600 === 0) {
    return { amount: String(seconds / 3600), unit: "hours" };
  }

  if (seconds >= 60 && seconds % 60 === 0) {
    return { amount: String(seconds / 60), unit: "minutes" };
  }

  return { amount: String(seconds), unit: "seconds" };
};

const customDurationUnitToSeconds = (amount: number, unit: CustomDurationUnit) => {
  if (unit === "hours") return amount * 3600;
  if (unit === "minutes") return amount * 60;
  return amount;
};

// ─── Withdrawal Modal and more was extracted to AccountModals.tsx ───

// ─── Time Switcher ─────────────────────────────────────────────────────────────
const TimeSwitcher = ({
  value,
  onChange,
  onClose,
  triggerRef,
}: {
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const derived = deriveCustomDurationInput(value);
  const [customAmount, setCustomAmount] = useState(derived.amount);
  const [customUnit, setCustomUnit] = useState<CustomDurationUnit>(derived.unit);
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (!triggerRef.current || !cardRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      setPos({
        top: Math.max(8, window.innerHeight - 380),
        right: Math.max(8, (window.innerWidth - 340) / 2),
      });
    } else {
      setPos({
        top: triggerRect.top,
        right: window.innerWidth - triggerRect.left + 8,
      });
    }
  }, [triggerRef]);

  useEffect(() => {
    const nextDerived = deriveCustomDurationInput(value);
    setCustomAmount(nextDerived.amount);
    setCustomUnit(nextDerived.unit);
  }, [value]);

  const applyCustomDuration = () => {
    const parsedAmount = Math.max(1, Number(customAmount) || 0);
    const nextSeconds = Math.max(
      MIN_MANUAL_EXPIRY_SECONDS,
      Math.min(
        MAX_MANUAL_EXPIRY_SECONDS,
        Math.round(customDurationUnitToSeconds(parsedAmount, customUnit)),
      ),
    );

    onChange(nextSeconds);
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
          <span className="text-[11px] font-semibold text-white">Expiry Time</span>
          <button type="button" onClick={onClose} className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30">
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>
        <div style={{ background: "var(--trading-panel-bg, #1e2330)" }} className="p-2.5">
          <div className="grid grid-cols-2 gap-1.5">
            {TIME_PRESETS.map((preset) => {
              const isSelected = value === preset.val;
              return (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => { onChange(preset.val); onClose(); }}
                  className={`rounded-md px-2 py-1.5 text-center text-[11px] transition-colors ${
                    isSelected
                      ? "bg-[#0fa053]/20 text-white"
                      : "text-white/60 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 border-t border-white/8 pt-2.5">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                step={1}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="hide-number-spin h-7 w-14 rounded border border-white/10 bg-transparent px-2 text-[11px] text-white outline-none"
              />
              <select
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value as CustomDurationUnit)}
                className="h-7 flex-1 rounded border border-white/10 bg-transparent px-1 text-[11px] text-white outline-none"
              >
                <option value="seconds">Sec</option>
                <option value="minutes">Min</option>
                <option value="hours">Hr</option>
              </select>
              <button
                type="button"
                onClick={applyCustomDuration}
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
    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b8c0d3]">{label}</span>
    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#666f86] px-1 text-[10px] font-black text-white">
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
    <div className="px-2 py-2.5 transition-colors hover:bg-white/[0.02]">
      <div className="flex items-start">
        <span className="mt-[2px] flex h-3 w-3 shrink-0 items-center justify-center text-[#b8c2d8]">
          <ChevronDown className={`h-2.5 w-2.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <SymbolFlags symbol={symbol} size={20} />
              <span className="text-[11px] font-black uppercase tracking-[0.01em] text-white sm:text-[12px]">
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
  const { t } = useTranslation();
  const { activeTrades, tradeHistory, openTrade } = useTrading();
  const { preferences: tradingPreferences } = useTradingPreferences();
  const executeTrade = onTrade ?? openTrade;

  // Trading params
  const [expirySeconds, setExpirySeconds] = useState(60);
  const [investment, setInvestment] = useState(1);
  const [investmentMode] = useState<InvestmentMode>("amount");
  const [showTimeSwitcher, setShowTimeSwitcher] = useState(false);
  const [showInvestmentSwitcher, setShowInvestmentSwitcher] = useState(false);

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
    if (effectiveInvestment <= 0) return false;

    if (accountType === "demo") {
      if (effectiveInvestment > demoBalance) {
        alert("Insufficient demo balance");
        return false;
      }
      return await (onDemoTrade ?? executeTrade)(
        asset.symbol,
        direction,
        effectiveInvestment,
        asset.price,
        expirySeconds,
        payoutRate,
      );
    }

    return await executeTrade(
      asset.symbol,
      direction,
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
      const confirmed = window.confirm(
        `Confirm ${direction === "higher" ? "Up" : "Down"} trade on ${asset.symbol} for ${formatStake(effectiveInvestment)}?`,
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
      <aside className={`font-copy w-full lg:w-[160px] xl:w-[170px] 2xl:w-[180px] h-full min-h-[190px] shrink-0 flex flex-col text-white rounded-t-[18px] lg:rounded-none border-t border-white/10 lg:border-t-0 shadow-[0_-10px_30px_rgba(0,0,0,0.28)] lg:shadow-none ${showTimeSwitcher ? "overflow-visible lg:overflow-hidden" : "overflow-hidden"} ${mobileDocked ? "rounded-t-[16px]" : ""}`}
        style={{ background: "var(--trading-panel-bg, #2a3040)", borderColor: "var(--trading-border-color, #262b40)" }}>

        {/* ── Asset Header & Pending Toggle (Single Row) ──────────────── */}
        <div className="flex items-center justify-between px-2.5 pt-2 pb-1.5 lg:px-4 lg:pt-3.5 lg:pb-1">
          <button 
            onClick={() => onOpenAssetSelector?.()}
            className="flex min-w-0 items-center gap-1.5 rounded-lg p-1 -ml-1 transition-colors hover:bg-white/5"
          >
            <SymbolFlags symbol={asset.symbol} />
            <div className="flex min-w-0 items-center gap-1 text-[11px] font-extrabold tracking-[0.01em] text-white sm:text-[12px] lg:text-[12px]">
              <span className="max-w-[90px] truncate sm:max-w-[120px] lg:max-w-[110px]">{asset.symbol}</span>
              <span className={`shrink-0 ${asset.available === false ? "text-red-400" : "text-[#0fa053]"}`}>{asset.available === false ? "N/A" : `${asset.maxProfit ?? 79}%`}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 lg:hidden" strokeWidth={3} />
            </div>
          </button>

          <button
            type="button"
            onClick={handlePendingTradeToggle}
            aria-pressed={pendingTradeEnabled}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-1 py-0.5 transition-colors hover:bg-white/5 lg:hidden"
          >
            <span className={`text-[9px] font-black tracking-[0.06em] uppercase ${pendingTradeEnabled ? "text-[#0fa053]" : "text-[#7f8b99]"}`}>
              PENDING TRADE
            </span>
            <div
              className={`relative h-[14px] w-[28px] rounded-full border transition-all ${pendingTradeEnabled ? "bg-[#0fa053] border-[#0fa053]/50" : "bg-transparent border-white/15"}`}
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
            <span className={`text-[12px] font-black uppercase tracking-[0.05em] ${pendingTradeEnabled ? "text-[#0fa053]" : "text-[#8fb0cf]"}`}>
              Pending trade
            </span>
          </div>

          <div
            className={`relative h-[24px] w-[42px] rounded-full border transition-all ${pendingTradeEnabled ? "border-[#0fa053]/80 bg-[#1e2330]" : "border-[#0fa053]/80 bg-transparent"}`}
          >
            <div
              className={`absolute top-[3px] h-[14px] w-[14px] rounded-full transition-all ${pendingTradeEnabled ? "left-[22px] bg-[#0fa053] shadow-[0_0_10px_rgba(48,168,106,0.45)]" : "left-[4px] bg-[#0fa053]"}`}
            />
          </div>
        </button>

        {accountType === "tournament" && (
          <div className="mx-2.5 mb-2 rounded-[10px] border border-[#0fa053]/35 bg-[#2a3040]/80 px-3 py-2 text-[10px] font-semibold leading-relaxed text-[#d8f6e5] lg:mx-4 lg:mb-3">
            Tournament mode is active. Open positions and history below are scoped to this tournament account.
          </div>
        )}

        {/* ── Compact mobile layout with desktop controls restored ── */}
        <div className="px-2.5 pb-2 lg:px-4 lg:pb-2.5">
          <div className="relative z-10 lg:pb-0">
            <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 lg:grid-cols-1 lg:gap-3">
              <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTimeSwitcher((value) => !value)}
                    className="relative flex h-[44px] w-full items-center justify-between rounded-lg border border-[#2b3149] bg-[#2a3040] px-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-blue-500/50 lg:hidden"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-[#596278]" strokeWidth={1.8} />
                      <span className="text-[15px] font-bold tracking-[0.01em] tabular-nums text-white min-[360px]:text-[16px]" style={{ fontFamily: "Arial, sans-serif" }}>
                        {formatTradeClock(expirySeconds)}
                      </span>
                    </div>
                    <span className="text-[9px] font-medium uppercase tracking-[0.06em] text-[#8fb0cf]">
                      Time
                    </span>
                  </button>

                <div
                  ref={timeTriggerRef}
                  onClick={() => setShowTimeSwitcher((value) => !value)}
                  className="relative hidden lg:flex flex-col group cursor-pointer"
                >
                  <div className="absolute -top-2 left-3 bg-[#2a3040] px-1 text-[10px] text-gray-400 font-medium z-10">Time</div>
                  <div className="flex items-center justify-between border border-[#2b3149] rounded-lg px-2 bg-[#2a3040] hover:border-blue-500/50 transition cursor-pointer h-11">
<span className="flex w-7 h-7 items-center justify-center rounded-lg border border-[#2b3149] bg-[#2a3040] text-gray-400 hover:text-white transition active:scale-95"
onClick={(e) => { e.stopPropagation(); adjustExpiry(-1); }}>
                      <Minus className="w-3 h-3" />
                    </span>
                    <span className="text-sm font-semibold text-white tracking-widest" style={{ fontFamily: "Arial, sans-serif" }}>
                      {formatTradeClock(expirySeconds)}
                    </span>
<span className="flex w-7 h-7 items-center justify-center rounded-lg border border-[#2b3149] bg-[#2a3040] text-gray-400 hover:text-white transition active:scale-95"
onClick={(e) => { e.stopPropagation(); adjustExpiry(1); }}>
                      <Plus className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="w-full text-center mt-0.5"><span className="text-[9px] font-bold text-[#3b82f6] uppercase tracking-wider">Switch Time</span></div>
                </div>
              </div>

              <div className="relative">
                <div className="relative flex h-[44px] w-full items-center justify-between rounded-lg border border-[#2b3149] bg-[#2a3040] px-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] lg:hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold tracking-[0.01em] text-white" style={{ fontFamily: "Arial, sans-serif" }}>$</span>
                    <input
                      type="number"
                      value={investment}
                      min={1}
                      max={MAX_MANUAL_INVESTMENT}
                      step={0.01}
                      inputMode="decimal"
                      onChange={(event) => handleInvestmentInput(event.target.value)}
                      className="hide-number-spin min-w-0 max-w-[72px] bg-transparent text-[15px] font-bold tracking-[0.01em] text-white outline-none min-[360px]:text-[16px]"
                      style={{ fontFamily: "Arial, sans-serif" }}
                    />
                  </div>
                  <span className="text-[9px] font-medium uppercase tracking-[0.06em] text-[#8fb0cf]">
                    Amount
                  </span>
                </div>

                <div
                  ref={investTriggerRef}
                  onClick={() => setShowInvestmentSwitcher((v) => !v)}
                  className="relative hidden lg:flex flex-col group cursor-pointer"
                >
                  <div className="absolute -top-2 left-3 bg-[#2a3040] px-1 text-[10px] text-gray-400 font-medium z-10">Investment</div>
                  <div className="flex items-center justify-between border border-[#2b3149] rounded-lg px-2 bg-[#2a3040] hover:border-blue-500/50 transition cursor-pointer h-11">
<span className="flex w-7 h-7 items-center justify-center rounded-lg border border-[#2b3149] bg-[#2a3040] text-gray-400 hover:text-white transition active:scale-95"
onClick={(e) => { e.stopPropagation(); adjustInvestment(-1); }}>
                      <Minus className="w-3 h-3" />
                    </span>
                    <input
                      type="number"
                      value={investment}
                      min={1}
                      max={MAX_MANUAL_INVESTMENT}
                      step={0.01}
                      inputMode="decimal"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(event) => handleInvestmentInput(event.target.value)}
                      className="hide-number-spin min-w-0 w-[60px] bg-transparent text-sm font-semibold text-white tracking-widest font-mono outline-none text-center"
                      style={{ fontFamily: "Arial, sans-serif" }}
                    />
<span className="flex w-7 h-7 items-center justify-center rounded-lg border border-[#2b3149] bg-[#2a3040] text-gray-400 hover:text-white transition active:scale-95"
onClick={(e) => { e.stopPropagation(); adjustInvestment(1); }}>
                      <Plus className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="w-full text-center mt-0.5"><span className="text-[9px] font-bold text-[#3b82f6] uppercase tracking-wider">Switch</span></div>
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
            </div>

            {showTimeSwitcher && (
              <TimePopover value={expirySeconds} onChange={setExpirySeconds} onClose={() => setShowTimeSwitcher(false)} triggerRef={timeTriggerRef} />
            )}
          </div>
        </div>

        {/* ── Payout ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-2.5 pb-2 text-xs text-gray-400 lg:px-4 lg:pb-3 border-t border-[#262b40]/60 pt-3">
          <span className="font-medium">Your payout:</span>
          <span className="text-sm font-bold text-white tracking-wide font-mono">{asset.available === false ? "N/A" : `${payout.toFixed(2)} $`}</span>
        </div>

        {/* ── UP & DOWN Buttons (Side-by-side on mobile, stacked on desktop) ── */}
        <div className="grid grid-cols-2 gap-2.5 px-2.5 pb-3 lg:grid-cols-1 lg:gap-2.5 lg:px-0 lg:pb-4 lg:mx-4">
          <button
            ref={higherButtonRef}
            type="button"
            onClick={() => placeTrade("higher")}
            disabled={asset.available === false}
            className={`flex h-12 items-center justify-between rounded-lg px-4 text-[13px] font-bold text-white transition-all active:scale-[0.99] focus:outline-none ${
              higherButtonFocused ? "scale-[1.02]" : ""
            } ${asset.available === false ? "cursor-not-allowed opacity-40" : ""}`}
            style={{
              background: asset.available === false ? "var(--trading-muted-color, #3a4055)" : "var(--trading-up-color, var(--trading-success-color))",
              color: "var(--trading-success-contrast-color)",
              boxShadow: higherButtonFocused ? "var(--trading-success-focus-shadow)" : "0 4px 16px rgba(16,160,85,0.30)",
            }}>
            <span>Up</span>
            <span className="flex w-[22px] h-[22px] items-center justify-center rounded-full bg-white/20 text-[10px]">
              <ArrowUp className="w-3 h-3" strokeWidth={3} />
            </span>
          </button>

          <button
            ref={lowerButtonRef}
            type="button"
            onClick={() => placeTrade("lower")}
            disabled={asset.available === false}
            className={`flex h-12 items-center justify-between rounded-lg px-4 text-[13px] font-bold text-white transition-all active:scale-[0.99] focus:outline-none ${
              lowerButtonFocused ? "scale-[1.02]" : ""
            } ${asset.available === false ? "cursor-not-allowed opacity-40" : ""}`}
            style={{
              background: asset.available === false ? "var(--trading-muted-color, #3a4055)" : "var(--trading-down-color, var(--trading-danger-color))",
              color: "var(--trading-danger-contrast-color)",
              boxShadow: lowerButtonFocused ? "var(--trading-danger-focus-shadow)" : "0 4px 16px rgba(220,60,60,0.30)",
            }}>
            <span>Down</span>
            <span className="flex w-[22px] h-[22px] items-center justify-center rounded-full bg-white/20 text-[10px]">
              <ArrowDown className="w-3 h-3" strokeWidth={3} />
            </span>
          </button>
        </div>

        {/* ── Secondary Layout Block (Modal on Mobile, Fixed Panel on Desktop) ── */}
        <div
          className={`${mobileHistoryOpen ? 'fixed inset-0 z-[100] flex animate-in slide-in-from-bottom pb-12' : 'hidden lg:flex flex-1'} flex-col overflow-hidden rounded-xl border border-[#262b40] bg-[#2a3040]`}
        >
          
          {/* ── Tabs: History / Pending ───────────────────────────────── */}
          <div
            className="grid grid-cols-2 border-b border-[#262b40] text-center text-xs font-semibold"
          >
            <button
              onClick={() => setActiveTab("trades")}
              className={`flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${activeTab === "trades" ? "border-b-2 border-blue-500 text-white" : "text-gray-400 hover:text-gray-200"}`}
            >
              <span>{t("tradingPanel.trades")}</span>
              <span className="bg-[#2a3040] text-[9px] px-1 rounded-sm text-gray-300 font-mono">{tradesTabCount}</span>
            </button>

            <button
              onClick={() => setActiveTab("pending")}
              aria-label={t("tradingPanel.pendingTrades")}
              className={`flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${activeTab === "pending" ? "border-b-2 border-blue-500 text-white" : "text-gray-400 hover:text-gray-200"}`}
            >
              <i className="fa-regular fa-clock text-xs"></i>
              <span className="bg-[#2a3040] text-[9px] px-1 rounded-sm text-gray-500 font-mono">{queuedPendingTrades.length}</span>
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



