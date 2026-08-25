import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Globe2,
  Image,
  Lock,
  Pencil,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";
import { api } from "@/integrations/api/client";
import { requestMobileMoneyWithdrawal } from "@/lib/mobileMoney";
import { requestCryptoWithdrawal } from "@/lib/withdrawals";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { AssetSymbolMark } from "@/components/trading/AssetSymbolMark";
import { useStatistics, type Trade, type Transaction } from "@/hooks/useStatistics";
import { useTrading, type ActiveTrade, type TradeHistoryEntry } from "@/hooks/useTrading";
import { cloudinaryClient } from "@/integrations/cloudinary/client";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { readDemoBalanceStorage } from "@/lib/onboarding";
import type { SupportedCurrency } from "@/lib/currency";
import {
  getProfileKycLabel,
  normalizeKycStatus,
} from "@/lib/kyc";
import { useTradingPreferences, type TradingLanguage } from "@/lib/tradingPreferences";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import type { AnalyticsSignalAsset } from "./analytics/AnalyticsSignals";

type AnalyticsRange = "3 days" | "Week" | "Month" | "Year" | "All";
type AnalyticsAccountScope = "live" | "demo";
type AccountTab = "personal" | "deposit" | "balance_history" | "trading_history" | "settings";
export type AnalyticsAccountTab = "Withdrawal" | "Payments" | "Trades" | "My account" | "Market" | "Tournaments" | "Analytics";

interface AnalyticsGridOverlayProps {
  onClose?: () => void;
  activeAsset?: AnalyticsSignalAsset;
  initialTab?: AnalyticsAccountTab;
  onNavigate?: (target: { workspace?: "account" | "analytics" | "tournaments" | "leaderboard" | "more"; accountTab?: AccountTab; route?: "withdraw" }) => void;
}

const RANGE_OPTIONS: AnalyticsRange[] = ["3 days", "Week", "Month", "Year", "All"];
const ACCOUNT_SCOPE_OPTIONS: Array<{ value: AnalyticsAccountScope; label: string }> = [
  { value: "live", label: "Live Account" },
  { value: "demo", label: "Demo Account" },
];
const ACCOUNT_TABS: AnalyticsAccountTab[] = ["Withdrawal", "Payments", "Trades", "My account", "Market", "Tournaments", "Analytics"];
const PIE_COLORS = ["#08c66b", "#1d96f2", "#ff5b58", "#bb0039", "#ff950f"];
const PAGE_SIZE = 10;
const LANGUAGE_OPTIONS: Array<{ label: string; code: TradingLanguage }> = [
  { label: "English", code: "en" },
  { label: "中文 (Chinese)", code: "zh" },
  { label: "Español (Spanish)", code: "es" },
  { label: "Français (French)", code: "fr" },
  { label: "Deutsch (German)", code: "de" },
  { label: "Português (Portuguese)", code: "pt" },
  { label: "हिन्दी (Hindi)", code: "hi" },
  { label: "العربية (Arabic)", code: "ar" },
  { label: "বাংলা (Bengali)", code: "bn" },
  { label: "اردو (Urdu)", code: "ur" },
  { label: "Kiswahili (Swahili)", code: "sw" },
  { label: "Русский (Russian)", code: "ru" },
  { label: "日本語 (Japanese)", code: "ja" },
  { label: "Türkçe (Turkish)", code: "tr" },
  { label: "Bahasa Indonesia (Indonesian)", code: "id" },
];
const TIMEZONE_OPTIONS = ["(UTC+03:00)", "(UTC+00:00)", "(UTC+01:00)", "(UTC-05:00)", "(UTC+05:30)", "(UTC+08:00)"];
const ID_DOCUMENT_OPTIONS = ["ID card", "Passport", "Residence permit", "Driver's license"];
const KYC_UPLOAD_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"];
const KYC_UPLOAD_ACCEPT = "image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf";

const rangeStart = (range: AnalyticsRange) => {
  const now = Date.now();
  if (range === "3 days") return now - 3 * 24 * 60 * 60 * 1000;
  if (range === "Week") return now - 7 * 24 * 60 * 60 * 1000;
  if (range === "Month") return now - 31 * 24 * 60 * 60 * 1000;
  if (range === "Year") return now - 365 * 24 * 60 * 60 * 1000;
  return 0;
};

const dayKey = (value: string) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
};

const formatAxisDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(iso)).replace(" ", ". ");

const formatUsdCompact = (value: number) => `${Math.round(value).toLocaleString("en-US").replace(/,/g, "")} $`;
const getDemoBalance = (profile: any) => Number(profile?.demo_balance ?? profile?.practice_balance ?? 0);
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const readProfileText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const paginate = <T,>(items: T[], page: number, pageSize: number) => {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pages,
  };
};

const shortTransactionId = (id: string) => {
  const digits = id.replace(/\D/g, "");
  if (digits.length >= 8) return digits.slice(0, 9);
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return String(hash).slice(0, 9);
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.toLocaleDateString("en-GB")}, ${date.toLocaleTimeString("en-GB", { hour12: false })}`;
};

const formatDateRange = (trades: Trade[]) => {
  if (trades.length === 0) return "No trades";
  const times = trades.map((trade) => new Date(trade.closeTime || trade.openTime).getTime()).filter(Number.isFinite);
  if (times.length === 0) return "No trades";
  const start = new Date(Math.min(...times)).toLocaleDateString("en-GB").replace(/\//g, ".");
  const end = new Date(Math.max(...times)).toLocaleDateString("en-GB").replace(/\//g, ".");
  return `${start} - ${end}`;
};

const formatSelectedDateRange = (range: AnalyticsRange, trades: Trade[]) => {
  if (range === "All") return formatDateRange(trades);
  const start = new Date(rangeStart(range));
  const end = new Date();
  const format = (date: Date) => date.toLocaleDateString("en-GB").replace(/\//g, ".");
  return `${format(start)} - ${format(end)}`;
};

const getDemoTradeHistoryStorageKey = (userId: string) => `demo_trade_history:${userId}`;

const mapHistoryEntryToTrade = (entry: TradeHistoryEntry): Trade => ({
  id: entry.id,
  asset: entry.asset_symbol,
  direction: entry.direction === "higher" ? "Buy" : "Sell",
  amount: Number(entry.amount ?? 0),
  payout: Number(entry.profit ?? 0) > 0 ? Number(entry.amount ?? 0) + Number(entry.profit ?? 0) : 0,
  profit: Number(entry.profit ?? 0),
  openTime: entry.opened_at,
  closeTime: entry.closed_at ?? entry.opened_at,
});

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const resolvePaymentSystem = (tx: Transaction) => {
  const description = tx.description.toLowerCase();
  if (description.includes("m-pesa") || description.includes("mpesa")) return "M-pesa";
  if (description.includes("usdt")) return "USDT";
  if (description.includes("crypto")) return "Crypto";
  if (tx.type === "deposit" || tx.type === "withdrawal") return "M-pesa";
  return "Account";
};

const estimateOpeningQuote = (trade: Trade) => {
  const seed = trade.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (1 + (seed % 9000) / 10000).toFixed(5);
};

const estimateClosingQuote = (trade: Trade) => {
  const opening = Number(estimateOpeningQuote(trade));
  const directionFactor = trade.direction === "Buy" || trade.direction === "Higher" ? 1 : -1;
  const profitFactor = trade.profit > 0 ? directionFactor : -directionFactor;
  return (opening + profitFactor * Math.max(0.0001, trade.amount / 10000)).toFixed(5);
};

const exportTradesCsv = (items: Array<Trade | ActiveTrade>, mode: "history" | "pending") => {
  const rows = mode === "history"
    ? [
        ["Asset", "Direction", "Amount", "Profit", "Opened", "Closed"],
        ...(items as Trade[]).map((trade) => [trade.asset, trade.direction, trade.amount, trade.profit, trade.openTime, trade.closeTime]),
      ]
    : [
        ["Asset", "Direction", "Amount", "Entry price", "Opened", "Time left"],
        ...(items as ActiveTrade[]).map((trade) => [trade.asset_symbol, trade.direction, trade.amount, trade.entry_price, trade.opened_at, trade.timeLeft]),
      ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${mode}-trades.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const AnalyticsGridOverlay = ({ onClose, activeAsset, initialTab = "Analytics", onNavigate }: AnalyticsGridOverlayProps) => {
  const { profile, user } = useAuth();
  const { formatMoney } = useCurrency();
  const { trades, transactions, assetPerformance } = useStatistics();
  const { activeTrades } = useTrading();
  const [activeTab, setActiveTab] = useState<AnalyticsAccountTab>(initialTab);
  const [tradeMode, setTradeMode] = useState<"history" | "pending">("history");
  const [range, setRange] = useState<AnalyticsRange>("Month");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [tradeRangeOpen, setTradeRangeOpen] = useState(false);
  const [accountScope, setAccountScope] = useState<AnalyticsAccountScope>("live");
  const [accountScopeOpen, setAccountScopeOpen] = useState(false);
  const [demoHistory, setDemoHistory] = useState<TradeHistoryEntry[]>([]);
  const [demoBalanceSnapshot, setDemoBalanceSnapshot] = useState<number | null>(null);
  const [summaryVisible, setSummaryVisible] = useState(true);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [tradesPage, setTradesPage] = useState(1);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [tabMenuOpen, setTabMenuOpen] = useState(false);

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") {
      setDemoHistory([]);
      setDemoBalanceSnapshot(null);
      return;
    }

    const loadDemoAccountState = () => {
      try {
        const raw = window.localStorage.getItem(getDemoTradeHistoryStorageKey(user.id));
        const parsed = raw ? JSON.parse(raw) : [];
        setDemoHistory(Array.isArray(parsed) ? parsed : []);
      } catch {
        setDemoHistory([]);
      }

      setDemoBalanceSnapshot(readDemoBalanceStorage(user.id));
    };

    loadDemoAccountState();
    window.addEventListener("focus", loadDemoAccountState);
    window.addEventListener("storage", loadDemoAccountState);
    return () => {
      window.removeEventListener("focus", loadDemoAccountState);
      window.removeEventListener("storage", loadDemoAccountState);
    };
  }, [user?.id]);

  const filteredTrades = useMemo(() => {
    const start = rangeStart(range);
    return trades.filter((trade) => new Date(trade.closeTime || trade.openTime).getTime() >= start);
  }, [range, trades]);
  const demoTrades = useMemo(() => demoHistory.map(mapHistoryEntryToTrade), [demoHistory]);
  const accountHistoryTrades = accountScope === "live" ? trades : demoTrades;
  const accountPendingTrades = accountScope === "live" ? activeTrades : [];
  const filteredAccountHistoryTrades = useMemo(() => {
    const start = rangeStart(range);
    return accountHistoryTrades.filter((trade) => new Date(trade.closeTime || trade.openTime).getTime() >= start);
  }, [accountHistoryTrades, range]);
  const filteredAccountPendingTrades = useMemo(() => {
    const start = rangeStart(range);
    return accountPendingTrades.filter((trade) => new Date(trade.opened_at).getTime() >= start);
  }, [accountPendingTrades, range]);

  const stats = useMemo(() => buildAnalyticsStats(filteredTrades), [filteredTrades]);
  const profitSeries = useMemo(() => buildProfitSeries(filteredTrades, range), [filteredTrades, range]);
  const profitableSeries = useMemo(() => buildProfitableSeries(filteredTrades, range), [filteredTrades, range]);
  const filteredAssets = useMemo(() => buildAssetBreakdown(filteredTrades, assetPerformance), [assetPerformance, filteredTrades]);
  const liveBalance = getEffectiveLiveBalance(profile);
  const demoBalance = demoBalanceSnapshot ?? getDemoBalance(profile);
  const email = readProfileText(user?.email, (profile as any)?.email) || "Account email unavailable";
  const displayName = readProfileText(profile?.display_name, profile?.username);
  const displayId = readProfileText(profile?.id, user?.id).replace(/-/g, "").slice(0, 8).toUpperCase() || "-";
  const location = readProfileText(profile?.nationality, profile?.phone_country) || "-";
  const avatarUrl = readProfileText(profile?.avatar_url);
  const handleTabClick = (tab: AnalyticsAccountTab) => {
    if (tab === "Tournaments") return onNavigate?.({ workspace: "tournaments" }) ?? onClose?.();
    setActiveTab(tab);
    setPaymentsPage(1);
    setTradesPage(1);
    setRangeOpen(false);
    setTradeRangeOpen(false);
    setAccountScopeOpen(false);
  };
  const pagedTransactions = paginate(transactions, paymentsPage, PAGE_SIZE);
  const currentTradeItems = tradeMode === "history" ? filteredAccountHistoryTrades : filteredAccountPendingTrades;
  const pagedTrades = paginate(currentTradeItems, tradesPage, PAGE_SIZE);
  const accountScopeLabel = ACCOUNT_SCOPE_OPTIONS.find((option) => option.value === accountScope)?.label ?? "Live Account";
  const profileSummary = (
    <ProfileSummary
      email={email}
      displayName={displayName}
      displayId={displayId}
      location={location}
      liveBalance={formatMoney(liveBalance)}
      demoBalance={formatMoney(demoBalance)}
      avatarUrl={avatarUrl}
      visible={summaryVisible}
      onToggleVisible={() => setSummaryVisible((current) => !current)}
    />
  );
  const rangeSelector = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setRangeOpen((current) => !current)}
        className="flex h-[42px] min-w-[180px] items-center justify-between rounded-[6px] bg-[#2d3446] px-4 text-left text-[14px] font-black text-white"
      >
        {range}
        <ChevronDown className={`h-4 w-4 transition-transform ${rangeOpen ? "rotate-180" : ""}`} />
      </button>
      {rangeOpen && (
        <div className="absolute right-0 top-[50px] z-20 w-full overflow-hidden rounded-[6px] bg-[#2d3446] shadow-xl">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setRange(option);
                setRangeOpen(false);
              }}
              className={`block w-full px-4 py-3 text-left text-[13px] font-bold ${option === range ? "bg-[#4a5061] text-white" : "text-white/70 hover:bg-white/5"}`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="quotex-glow-home trading-terminal flex h-full w-full flex-col overflow-hidden text-white" style={{ background: "#1b202a" }}>
      <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-5 lg:py-5">
        <div className="mb-6">
          <div className="block xl:hidden">
            <button
              type="button"
              onClick={() => setTabMenuOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-[6px] bg-[#2a3040] px-4 py-3 text-[14px] font-black text-white"
            >
              <span>{activeTab}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${tabMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {tabMenuOpen && (
              <div className="mt-1 overflow-hidden rounded-[6px] bg-[#2a3040] shadow-xl">
                {ACCOUNT_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => { handleTabClick(tab); setTabMenuOpen(false); }}
                    className={`block w-full border-b border-white/10 px-4 py-3 text-left text-[14px] font-black last:border-b-0 ${
                      tab === activeTab ? "bg-[#4a5061] text-white" : "text-white/80 hover:bg-white/5"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="hidden xl:flex w-fit max-w-full flex-wrap items-center gap-4 rounded-[6px] bg-[#2a3040] px-3 py-2">
            {ACCOUNT_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabClick(tab)}
                className={`rounded-[6px] px-5 py-3 text-[14px] font-black transition-colors ${
                  tab === activeTab ? "bg-[#4a5061] text-white" : "text-white hover:bg-white/5"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "Analytics" && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            {profileSummary}
            {rangeSelector}
          </div>
        )}

        {activeTab === "Withdrawal" && (
          <WithdrawalPanel />
        )}

        {activeTab === "Payments" && (
          <TabbedPanel>
            <div className="mb-8 flex items-center justify-end">
              <Pagination page={paymentsPage} total={transactions.length} onPageChange={setPaymentsPage} />
            </div>
            <PaymentsTable transactions={pagedTransactions.items} formatMoney={formatMoney} />
          </TabbedPanel>
        )}

        {activeTab === "Trades" && (
          <TabbedPanel>
            <div className="mb-6 flex flex-wrap items-center gap-5 border-b border-white/10 pb-5">
              <button
                type="button"
                onClick={() => {
                  setTradeMode("history");
                  setTradesPage(1);
                }}
                className={`px-5 py-3 text-[14px] font-black ${tradeMode === "history" ? "border-b-2 border-[#0f83e6] text-white" : "text-white/45"}`}
              >
                Trade history
              </button>
              <button
                type="button"
                onClick={() => {
                  setTradeMode("pending");
                  setTradesPage(1);
                }}
                className={`px-5 py-3 text-[14px] font-black ${tradeMode === "pending" ? "border-b-2 border-[#0f83e6] text-white" : "text-white/45"}`}
              >
                Pending trades
              </button>
              <div className="ml-auto flex items-center gap-5">
                <button type="button" onClick={() => exportTradesCsv(currentTradeItems, tradeMode)} className="rounded-[4px] bg-[#4a5061] px-5 py-3 text-[13px] font-black text-white">Export to</button>
                <Pagination page={tradesPage} total={currentTradeItems.length} onPageChange={setTradesPage} />
              </div>
            </div>
            <div className="mb-5 flex flex-wrap gap-5">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setTradeRangeOpen((current) => !current);
                    setAccountScopeOpen(false);
                  }}
                  className="min-w-[250px] rounded-[4px] border border-white/20 px-4 py-3 text-left transition hover:border-white/35"
                >
                  <p className="text-[11px] text-white/45">Date Range:</p>
                  <p className="mt-1 flex items-center gap-2 text-[14px] font-bold text-white">
                    <Calendar className="h-4 w-4 text-white/55" />
                    {formatSelectedDateRange(range, accountHistoryTrades)}
                  </p>
                </button>
                {tradeRangeOpen && (
                  <div className="absolute left-0 top-[76px] z-30 w-[228px] overflow-hidden rounded-[6px] bg-[#4a5061] py-1 shadow-2xl">
                    {RANGE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setRange(option);
                          setTradesPage(1);
                          setTradeRangeOpen(false);
                        }}
                        className={`block w-full border-b border-white/10 px-4 py-3 text-left text-[14px] font-bold last:border-b-0 ${option === range ? "text-white" : "text-white/80 hover:bg-white/5"}`}
                      >
                        {option === "All" ? "Select period..." : option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setAccountScopeOpen((current) => !current);
                    setTradeRangeOpen(false);
                  }}
                  className="min-w-[220px] rounded-[4px] border border-white/20 px-4 py-3 text-left transition hover:border-white/35"
                >
                  <p className="text-[11px] text-white/45">Account Type:</p>
                  <p className="mt-1 flex items-center justify-between gap-4 text-[14px] font-bold text-white">
                    {accountScopeLabel}
                    <ChevronDown className={`h-4 w-4 transition-transform ${accountScopeOpen ? "rotate-180" : ""}`} />
                  </p>
                </button>
                {accountScopeOpen && (
                  <div className="absolute left-0 top-[76px] z-30 w-[220px] overflow-hidden rounded-[6px] bg-[#4a5061] py-1 shadow-2xl">
                    {ACCOUNT_SCOPE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setAccountScope(option.value);
                          setTradesPage(1);
                          setAccountScopeOpen(false);
                        }}
                        className={`block w-full border-b border-white/10 px-4 py-3 text-left text-[14px] font-bold last:border-b-0 ${option.value === accountScope ? "text-white/45" : "text-white hover:bg-white/5"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {tradeMode === "history" ? (
              <TradesTable trades={pagedTrades.items as Trade[]} formatMoney={formatMoney} onSelectTrade={setSelectedTrade} />
            ) : (
              <PendingTradesTable trades={pagedTrades.items as ActiveTrade[]} formatMoney={formatMoney} />
            )}
          </TabbedPanel>
        )}

        {activeTab === "My account" && (
          <MyAccountPanel />
        )}

        {activeTab === "Market" && (
          <TabbedPanel>
            <MarketTable assets={assetPerformance} formatMoney={formatMoney} />
          </TabbedPanel>
        )}

        {activeTab === "Analytics" && (
          <>
        <AnalyticsDashboard
          stats={stats}
          profitSeries={profitSeries}
          profitableSeries={profitableSeries}
          filteredAssets={filteredAssets}
        />
          </>
        )}

        {selectedTrade && <TradeDetailModal trade={selectedTrade} formatMoney={formatMoney} onClose={() => setSelectedTrade(null)} />}
      </div>
    </div>
  );
};

const getSmoothPathD = (points: { x: number; y: number }[]) => {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
};

const TradeDetailModal = ({ trade, formatMoney, onClose }: { trade: Trade; formatMoney: (amount: number) => string; onClose: () => void }) => {
  const isUp = trade.direction === "Buy" || trade.direction === "Higher";
  const isWon = trade.profit > 0;
  const openQuoteStr = estimateOpeningQuote(trade);
  const closeQuoteStr = estimateClosingQuote(trade);
  const openQuote = Number(openQuoteStr);
  const closeQuote = Number(closeQuoteStr);
  const pointDiff = Math.round(Math.abs(closeQuote - openQuote) * 100000);

  const durationSec = Math.max(1, (new Date(trade.closeTime).getTime() - new Date(trade.openTime).getTime()) / 1000);
  const formatDurationHHMMSS = (sec: number) => {
    const s = Math.round(sec);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    const p = (n: number) => String(n).padStart(2, "0");
    return hrs > 0 ? `${p(hrs)}:${p(mins)}:${p(secs)}` : `${p(mins)}:${p(secs)}`;
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const p = (n: number) => String(n).padStart(2, "0");
      return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[540px] overflow-hidden rounded-[8px] border border-[#2b364a] bg-[#1e2638] text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#2b364a] px-6 py-4">
          <div>
            <h3 className="text-base font-black text-white">Trade ID</h3>
            <p className="mt-0.5 font-mono text-xs font-semibold text-gray-300">{trade.id}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 bg-[#1b2130] px-6 py-4 border-b border-[#2b364a]">
          <div>
            <p className="text-[11px] font-bold text-gray-400">Asset:</p>
            <div className="mt-1 flex items-center gap-1.5">
              <AssetSymbolMark symbol={trade.asset} size={18} />
              <span className="text-xs font-black text-white">{trade.asset}</span>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-gray-400">Type:</p>
            <div className="mt-1 flex items-center gap-1">
              <span className={`inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[11px] font-extrabold text-white ${isUp ? "bg-[#0fa055]" : "bg-[#e03e3e]"}`}>
                {isUp ? "↑" : "↓"} {formatMoney(trade.amount)}
              </span>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-gray-400">Duration:</p>
            <p className="mt-1 text-xs font-black text-white">{formatDurationHHMMSS(durationSec)}</p>
          </div>

          <div>
            <p className="text-[11px] font-bold text-gray-400">Result:</p>
            <p className={`mt-1 text-xs font-black ${isWon ? "text-[#18d87d]" : "text-[#ff5d52]"}`}>
              {isWon ? `+${formatMoney(trade.profit)}` : formatMoney(0)}
            </p>
          </div>
        </div>

        <MiniTradeChart
          openQuote={openQuote}
          closeQuote={closeQuote}
          isUp={isUp}
          isWon={isWon}
          stakeText={`${isUp ? "↑" : "↓"} ${formatMoney(trade.amount)}`}
        />

        <div className="grid grid-cols-3 gap-4 border-t border-[#2b364a] bg-[#1a2130] px-6 py-4 text-xs">
          <div>
            <p className="text-[11px] font-bold text-gray-400">Opening quote:</p>
            <p className="mt-0.5 text-sm font-black text-white">{openQuoteStr}</p>
            <p className="text-[10px] font-medium text-gray-400">{formatDateTime(trade.openTime)}</p>
          </div>

          <div>
            <p className="text-[11px] font-bold text-gray-400">Closing quote:</p>
            <p className="mt-0.5 text-sm font-black text-white">{closeQuoteStr}</p>
            <p className="text-[10px] font-medium text-gray-400">{formatDateTime(trade.closeTime)}</p>
          </div>

          <div>
            <p className="text-[11px] font-bold text-gray-400">Difference:</p>
            <p className="mt-0.5 text-sm font-black text-white">{pointDiff} points</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MiniTradeChart = ({
  openQuote,
  closeQuote,
  isUp,
  isWon,
  stakeText,
}: {
  openQuote: number;
  closeQuote: number;
  isUp: boolean;
  isWon: boolean;
  stakeText: string;
}) => {
  const width = 540;
  const height = 210;
  const paddingX = 25;
  const paddingY = 25;

  const pointsCount = 45;
  const rawValues: number[] = [openQuote];

  const diff = closeQuote - openQuote;
  for (let i = 1; i < pointsCount - 1; i++) {
    const progress = i / (pointsCount - 1);
    const trend = openQuote + diff * progress;
    const seed = (Math.sin(i * 14.3 + openQuote * 100) * 43758.5453) % 1;
    const noise = (seed - 0.5) * (Math.abs(diff) * 0.35 + 0.00015);
    rawValues.push(trend + noise);
  }
  rawValues.push(closeQuote);

  const minVal = Math.min(...rawValues, openQuote);
  const maxVal = Math.max(...rawValues, openQuote);
  const valRange = Math.max(maxVal - minVal, 0.0004);

  const points = rawValues.map((val, idx) => {
    const x = paddingX + (idx / (pointsCount - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - ((val - minVal) / valRange) * (height - 2 * paddingY);
    return { x, y };
  });

  const entryY = height - paddingY - ((openQuote - minVal) / valRange) * (height - 2 * paddingY);
  const smoothPathD = getSmoothPathD(points);

  const firstX = points[0].x;
  const lastX = points[points.length - 1].x;
  const bottomY = height;

  const areaPathD = `${smoothPathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  const entryMarkerX = points[Math.floor(points.length * 0.18)].x;
  const entryMarkerY = entryY;

  const pillText = stakeText;
  const textWidth = Math.max(38, pillText.length * 6.5 + 14);

  return (
    <div className="relative h-[210px] w-full bg-[#161c28] overflow-hidden select-none">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <defs>
          <linearGradient id="modalChartAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2585f1" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#2585f1" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {Array.from({ length: 9 }).map((_, i) => (
          <line
            key={`vgrid-${i}`}
            x1={i * 65 + 10}
            x2={i * 65 + 10}
            y1="0"
            y2={height}
            stroke="#263147"
            strokeOpacity="0.5"
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={`hgrid-${i}`}
            x1="0"
            x2={width}
            y1={i * 38 + 10}
            y2={i * 38 + 10}
            stroke="#263147"
            strokeOpacity="0.5"
            strokeWidth="1"
          />
        ))}

        <path d={areaPathD} fill="url(#modalChartAreaGrad)" />

        <line
          x1="0"
          x2={width}
          y1={entryY}
          y2={entryY}
          stroke={isUp ? "#0fa055" : "#e03e3e"}
          strokeWidth="1.5"
          strokeOpacity="0.9"
        />

        <path d={smoothPathD} fill="none" stroke="#2585f1" strokeWidth="2.5" strokeLinecap="round" />

        <g transform={`translate(${entryMarkerX}, ${entryMarkerY})`}>
          <line x1="0" y1="0" x2="0" y2="-10" stroke={isUp ? "#0fa055" : "#e03e3e"} strokeWidth="1.5" />
          <circle r="4" fill="#ffffff" stroke={isUp ? "#0fa055" : "#e03e3e"} strokeWidth="2" />
          <g transform={`translate(-${textWidth / 2}, -26)`}>
            <rect
              width={textWidth}
              height="18"
              rx="9"
              fill={isUp ? "#0fa055" : "#e03e3e"}
              stroke="#ffffff"
              strokeWidth="1"
            />
            <text
              x={textWidth / 2}
              y="12"
              fill="#ffffff"
              fontSize="9.5"
              fontWeight="900"
              textAnchor="middle"
            >
              {pillText}
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
};

type StoredVerificationCard = {
  id: string;
  last4: string;
  createdAt: string;
};

const getScopedStorageKey = (userId: string | undefined, key: string) => `${key}:${userId ?? "guest"}`;
const getProfileDetailsKey = (userId: string | undefined) => getScopedStorageKey(userId, "account_profile_details");

const loadStoredJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const saveStoredJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
  <button type="button" onClick={onChange} className="flex items-center gap-3 text-left" aria-pressed={checked}>
    <span className={`flex h-[24px] w-[44px] items-center rounded-full p-[3px] transition ${checked ? "bg-[#1687ee]" : "bg-[#3a4050]"}`}>
      <span className={`h-[18px] w-[18px] rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </span>
    <span className="text-[14px] font-black text-white">{label}</span>
  </button>
);

const mergeProfileDetails = (profile: any, user: { id: string; email: string | null } | null) => {
  const stored = loadStoredJson<Record<string, string>>(getProfileDetailsKey(user?.id ?? profile?.id), {});
  const email = readProfileText(user?.email, profile?.email);
  const username = readProfileText(stored.username, profile?.username, profile?.display_name, email.split("@")[0]);

  return {
    username,
    firstName: readProfileText(stored.firstName, profile?.firstName, profile?.first_name),
    lastName: readProfileText(stored.lastName, profile?.lastName, profile?.last_name),
    dob: readProfileText(stored.dob, profile?.dob, profile?.dateOfBirth),
    email,
    country: readProfileText(stored.country, profile?.nationality, profile?.country),
    address: readProfileText(stored.address, profile?.address),
  };
};

const MyAccountPanel = () => {
  const { profile, user, emailVerified, updateProfile, changePassword, deleteAccount, sendEmailVerificationCode } = useAuth();
  const { currency, options: currencyOptions, setCurrency, formatMoney } = useCurrency();
  const { preferences: tradingPreferences, updatePreferences: updateTradingPreferences } = useTradingPreferences();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const frontInputRef = useRef<HTMLInputElement | null>(null);
  const backInputRef = useRef<HTMLInputElement | null>(null);
  const liveBalance = getEffectiveLiveBalance(profile);
  const reservedBalance = Number((profile as any)?.reserved_withdrawal_balance ?? 0);
  const withdrawableBalance = Math.max(0, liveBalance - reservedBalance);
  const displayId = readProfileText(profile?.id, user?.id).replace(/-/g, "").slice(0, 8).toUpperCase() || "-";
  const email = readProfileText(user?.email, (profile as any)?.email);
  const storedProfileDetails = mergeProfileDetails(profile as any, user);
  const displayName = readProfileText(storedProfileDetails.username, profile?.display_name, profile?.username, email.split("@")[0]);
  const avatarUrl = readProfileText(profile?.avatar_url);
  const settingsKey = getScopedStorageKey(user?.id, "account_security_settings");
  const cardsKey = getScopedStorageKey(user?.id, "account_verification_cards");
  const [visible, setVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [cards, setCards] = useState<StoredVerificationCard[]>(() => loadStoredJson(cardsKey, []));
  const [cardFormOpen, setCardFormOpen] = useState(false);
  const [cardLast4, setCardLast4] = useState("");
  const [security, setSecurity] = useState(() =>
    loadStoredJson(settingsKey, {
      login2fa: true,
      withdraw2fa: true,
    }),
  );
  const [form, setForm] = useState(() => storedProfileDetails);
  const [idType, setIdType] = useState(() => readProfileText((profile as any)?.idType, (profile as any)?.id_type));
  const [idNumber, setIdNumber] = useState(() => readProfileText((profile as any)?.idNumber, (profile as any)?.id_number));
  const [documents, setDocuments] = useState<Record<string, unknown>>(() =>
    ((profile as any)?.kyc_documents ?? (profile as any)?.kycDocuments) ?? {},
  );
  const [kycStatus, setKycStatus] = useState(() => normalizeKycStatus((profile as any)?.kyc_status ?? (profile as any)?.kycStatus));
  const kycVerified = kycStatus === "Verified";
  const [isUploadingDoc, setIsUploadingDoc] = useState<"front" | "back" | null>(null);
  const [verificationSaving, setVerificationSaving] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [verificationPromptOpen, setVerificationPromptOpen] = useState(false);
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [identityModalStep, setIdentityModalStep] = useState<"privacy" | "document" | "upload">("privacy");
  const [identityPrivacyAccepted, setIdentityPrivacyAccepted] = useState(false);
  const [hasUploadedInSession, setHasUploadedInSession] = useState(false);
  const docs = documents as Record<string, any>;
  const personalDetailsComplete = Boolean(
    form.username.trim() &&
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.dob &&
    form.country &&
    form.address.trim(),
  );
  const needsBackSide = idType !== "Passport";
  const frontUploaded = Boolean(docs.front?.url);
  const backUploaded = Boolean(docs.back?.url);
  const hasAnyKycDocument = frontUploaded || backUploaded;
  const requiredDocumentsUploaded = frontUploaded && (!needsBackSide || backUploaded);
  const kycLabel = kycStatus === "Pending" && hasUploadedInSession ? "Submitted" : getProfileKycLabel(kycStatus, docs);
  const kycBadgeClass =
    kycLabel === "Verified"
      ? "bg-green-500/15 text-green-400"
      : kycLabel === "Rejected"
        ? "bg-red-500/15 text-red-300"
        : kycLabel === "Submitted"
          ? "bg-[#0d82df]/15 text-[#58adff]"
          : "bg-red-500/15 text-red-300";

  useEffect(() => {
    setForm(mergeProfileDetails(profile as any, user));
  }, [profile, user]);

  useEffect(() => {
    if (kycVerified) {
      setVerificationPromptOpen(false);
      return;
    }

    const timer = window.setTimeout(() => setVerificationPromptOpen(true), 250);
    return () => window.clearTimeout(timer);
  }, [kycVerified]);

  useEffect(() => {
    setDocuments(((profile as any)?.kyc_documents ?? (profile as any)?.kycDocuments) ?? {});
    setKycStatus(normalizeKycStatus((profile as any)?.kyc_status ?? (profile as any)?.kycStatus));
  }, [profile]);

  useEffect(() => {
    setSecurity(loadStoredJson(settingsKey, {
      login2fa: true,
      withdraw2fa: true,
    }));
    setCards(loadStoredJson(cardsKey, []));
  }, [cardsKey, settingsKey]);

  const updateSecurity = (updates: Partial<typeof security>) => {
    const next = { ...security, ...updates };
    setSecurity(next);
    saveStoredJson(settingsKey, next);
  };

  const updateFormValue = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const nextDetails = {
        username: form.username.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dob: form.dob,
        country: form.country,
        address: form.address.trim(),
      };
      saveStoredJson(getProfileDetailsKey(user?.id ?? profile?.id), nextDetails);
      await updateProfile({
        username: nextDetails.username,
        firstName: nextDetails.firstName,
        lastName: nextDetails.lastName,
        dob: nextDetails.dob,
        nationality: nextDetails.country,
        address: nextDetails.address,
      });
      setForm((current) => ({ ...current, ...nextDetails }));
      setStatus("Account details saved.");
    } catch (error: any) {
      setStatus(error?.message || "Could not save account details.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await updateProfile({ avatar_url: String(reader.result) });
        setStatus("Profile photo updated.");
      } catch (error: any) {
        setStatus(error?.message || "Could not update profile photo.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordChange = async () => {
    setStatus(null);
    if (newPassword !== confirmPassword) {
      setStatus("New passwords do not match.");
      return;
    }
    setChangingPassword(true);
    const result = await changePassword(oldPassword, newPassword);
    setChangingPassword(false);
    if (result.error) {
      setStatus(result.error.message);
      return;
    }
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setStatus("Password changed successfully.");
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    const result = await deleteAccount();
    setDeletingAccount(false);
    if (result.error) {
      setStatus(result.error.message);
      setDeleteConfirmOpen(false);
    }
  };

  const selectedLanguageLabel = LANGUAGE_OPTIONS.find((option) => option.code === tradingPreferences.language)?.label ?? "English";
  const handleLanguageChange = (label: string) => {
    const option = LANGUAGE_OPTIONS.find((item) => item.label === label);
    if (!option) return;
    updateTradingPreferences({ language: option.code });
    window.localStorage.setItem("profile.language", label);
    setStatus(`Language changed to ${label}.`);
  };

  const handleTimezoneChange = (value: string) => {
    const timezone = value.replace(/[()]/g, "");
    updateTradingPreferences({ timezone });
    window.localStorage.setItem("profile.timezone", timezone);
    setStatus(`Timezone changed to ${timezone}.`);
  };

  const handleEmailVerification = async () => {
    try {
      const result = await sendEmailVerificationCode();
      setStatus(result.status === "cooldown" ? "Verification code was already sent recently." : "Verification code sent to your email.");
    } catch (error: any) {
      setStatus(error?.message || "Could not send verification code.");
    }
  };

  const handleCurrencyChange = async (nextCurrency: SupportedCurrency) => {
    await setCurrency(nextCurrency);
    setStatus(`Currency changed to ${nextCurrency}.`);
  };

  const handleAddCard = () => {
    const last4 = cardLast4.replace(/\D/g, "").slice(-4);
    if (last4.length !== 4) {
      setStatus("Enter the last 4 card digits.");
      return;
    }
    const nextCards = [
      ...cards,
      { id: `${Date.now()}`, last4, createdAt: new Date().toISOString() },
    ];
    setCards(nextCards);
    saveStoredJson(cardsKey, nextCards);
    setCardLast4("");
    setCardFormOpen(false);
    setStatus("Card added for verification.");
  };

  const persistKycDocuments = async (nextDocuments: Record<string, unknown>) => {
    await updateProfile({ kyc_documents: nextDocuments, kyc_status: "Pending" });
    setDocuments(nextDocuments);
    setKycStatus("Pending");
  };

  const handleDocumentUpload = async (slot: "front" | "back", file: File) => {
    if (!user) {
      toast.error("Please log in again to upload documents.");
      return;
    }
    if (!KYC_UPLOAD_TYPES.includes(file.type)) {
      toast.error(`Unsupported file type: ${file.type}. Use PDF, PNG, JPG, WEBP, or HEIC.`);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Documents must be 50MB or smaller.");
      return;
    }
    setIsUploadingDoc(slot);
    try {
      const extension = file.name.split(".").pop() || "bin";
      const path = `kyc/${user.id}/${slot}_${Date.now()}.${extension}`;
      const result = await cloudinaryClient.upload(file, "kyc");
      console.log("Cloudinary upload result:", result);
      const nextDocuments = {
        ...documents,
        [slot]: {
          name: file.name,
          url: result.url,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
          path,
          fallback: false,
        },
      };
      await persistKycDocuments(nextDocuments);
      setHasUploadedInSession(true);
      toast.success(`${slot === "front" ? "Front" : "Back"} document uploaded successfully.`);
      setVerificationStatus("Documents submitted. They are waiting for admin review.");
    } catch (error: any) {
      console.error("Document upload failed:", error);
      toast.error(error?.message || "Failed to upload document. Check console for details.");
    } finally {
      setIsUploadingDoc(null);
    }
  };

  const handleDocumentRemove = async (slot: "front" | "back") => {
    const nextDocuments = { ...documents, [slot]: null };
    try {
      await persistKycDocuments(nextDocuments);
      setHasUploadedInSession(false);
      toast.success(`${slot === "front" ? "Front" : "Back"} document removed.`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove document.");
    }
  };

  const openIdentityVerification = () => {
    setVerificationPromptOpen(false);
    setIdentityModalStep("privacy");
    setIdentityPrivacyAccepted(false);
    setIdentityModalOpen(true);
  };

  const handleIdentityDocumentSelection = async (nextIdType: string) => {
    setIdType(nextIdType);
    await updateProfile({ idType: nextIdType, nationality: form.country || "Kenya" });
    setIdentityModalStep("upload");
  };

  const handleIdentityCountryChange = (nextCountry: string) => {
    setForm((prev) => ({ ...prev, country: nextCountry }));
  };

  const handleIdentityUpload = async () => {
    const nextSlot = !frontUploaded ? "front" : needsBackSide && !backUploaded ? "back" : null;
    if (!nextSlot) {
      setIdentityModalOpen(false);
      setVerificationStatus("Documents submitted. They are waiting for admin review.");
      return;
    }
    if (nextSlot === "front") frontInputRef.current?.click();
    if (nextSlot === "back") backInputRef.current?.click();
  };

  return (
    <section className="rounded-[6px] bg-[#202633] px-5 py-5 text-white shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
      <div className="mb-5 flex flex-wrap items-center justify-end gap-6 border-b border-white/10 pb-4 text-right">
        <div>
          <p className="text-[12px] font-bold text-[#9ba5b9]">My current currency</p>
          <div className="mt-1 flex items-center justify-end gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2d3446] text-[12px] font-black text-white">$</span>
            <select
              value={currency}
              onChange={(event) => void handleCurrencyChange(event.target.value as SupportedCurrency)}
              className="rounded-[4px] bg-[#167fdd] px-2 py-1 text-[11px] font-black uppercase text-white outline-none"
            >
              {currencyOptions.map((option) => (
                <option key={option.code} value={option.code} className="bg-[#202633] text-white">{option.code}</option>
              ))}
            </select>
          </div>
        </div>
        <ProfileMetric label="Available for withdrawal" value={visible ? formatMoney(withdrawableBalance) : "****"} />
        <ProfileMetric label="In the account" value={visible ? formatMoney(liveBalance) : "****"} />
      </div>

      <div className="grid gap-7 xl:grid-cols-[minmax(360px,0.95fr)_minmax(320px,0.92fr)_minmax(320px,0.92fr)]">
        <div className="border-white/10 xl:border-r xl:pr-7" data-verify-tour="status">
          <h2 className="mb-5 text-[18px] font-black text-white">Personal data:</h2>
          <div className="mb-5 flex flex-row items-center gap-4">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="group relative flex h-[72px] w-[72px] shrink-0 items-end justify-center overflow-hidden rounded-full bg-black shadow-[inset_0_0_0_5px_rgba(33,45,68,0.9)]" aria-label="Change profile photo">
              <span className="relative flex h-full w-full items-end justify-center overflow-hidden rounded-full">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName || email || "Profile"} className="h-full w-full object-cover" />
                ) : (
                  <>
                    <span className="mb-1.5 h-8 w-12 rounded-t-full bg-[#0d86f7]" />
                    <span className="absolute top-4 h-9 w-9 rounded-full bg-[#0d86f7]" />
                  </>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-4 w-4 text-white" />
                </span>
              </span>
              <span className="absolute right-0 top-0 rounded-full bg-[#4a5061] p-0.5 text-white/80">
                <Camera className="h-3.5 w-3.5" />
              </span>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-bold text-white/65">{email || "Account email unavailable"}</p>
              <p className="mt-0.5 text-[13px] font-bold text-white/60">ID: {visible ? displayId : "********"}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#21c978]">
                  <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span className={`text-[11px] font-black uppercase tracking-[0.1em] ${kycBadgeClass.includes("green") || kycBadgeClass.includes("21c978") ? "text-[#21c978]" : "text-[#f59e0b]"}`}>{kycLabel}</span>
              </div>
            </div>
          </div>
          <div className="space-y-4" data-verify-tour="details-form">
            <ProfileInput label="Nickname" value={form.username} onChange={(value) => updateFormValue("username", value)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileInput label="First Name" value={form.firstName} onChange={(value) => updateFormValue("firstName", value)} />
              <ProfileInput label="Last Name" value={form.lastName} onChange={(value) => updateFormValue("lastName", value)} />
            </div>
            <ProfileInput label="Date of birth" type="date" value={form.dob} onChange={(value) => updateFormValue("dob", value)} />
            <ProfileInput label="Email" value={form.email} disabled suffix={emailVerified ? "Verified" : "Not verified"} onChange={() => undefined} />
            <ProfileDropdown label="Country" value={form.country} onChange={(value) => updateFormValue("country", value)} options={["Kenya", "United States", "Nigeria", "South Africa", "United Kingdom", "India"]} />
            <ProfileInput label="Address" value={form.address} onChange={(value) => updateFormValue("address", value)} multiline />
            <button type="button" onClick={handleSave} disabled={saving} className="h-11 w-full rounded-[4px] bg-[#0d82df] text-[14px] font-black text-white transition hover:bg-[#118bea] disabled:opacity-60">
              {saving ? "Saving..." : "Save"}
            </button>
            {status && <p className="text-[12px] font-bold text-white/60">{status}</p>}
          </div>
        </div>

        <div className="border-white/10 xl:border-r xl:pr-7">
          <h2 className="mb-5 text-[18px] font-black text-white">Security:</h2>
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 fill-[#21c978] text-[#21c978]" />
                <p className="text-[15px] font-black text-white">Two-step verification</p>
              </div>
              <button type="button" onClick={handleEmailVerification} className="mt-2 ml-8 inline-flex items-center gap-2 text-[13px] font-bold text-[#9ba5b9] hover:text-white">
                Receiving codes via Email <Pencil className="h-3.5 w-3.5 text-[#0d82df]" />
              </button>
            </div>
            <ToggleSwitch checked={Boolean(security.login2fa)} onChange={() => updateSecurity({ login2fa: !security.login2fa })} label="To enter the platform" />
            <ToggleSwitch checked={Boolean(security.withdraw2fa)} onChange={() => updateSecurity({ withdraw2fa: !security.withdraw2fa })} label="To withdraw funds" />
            <div className="border-t border-dashed border-white/15 pt-5">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-white/55" />
                <div>
                  <p className="text-[15px] font-black text-white">Password</p>
                  <p className="text-[12px] font-bold text-white/50">Change your account password</p>
                  <button
                    type="button"
                    onClick={() => setPasswordOpen((open) => !open)}
                    className="mt-1 text-[13px] font-black text-[#0d82df] hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>
              {passwordOpen && (
                <div className="mt-4 space-y-4 pl-8">
                  <ProfileInput label="Old password" type="password" value={oldPassword} onChange={setOldPassword} />
                  <ProfileInput label="New password" type="password" value={newPassword} onChange={setNewPassword} />
                  <ProfileInput label="Confirm new password" type="password" value={confirmPassword} onChange={setConfirmPassword} />
                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={changingPassword}
                    className="h-11 w-full rounded-[4px] bg-[#0d82df] text-[14px] font-black text-white transition hover:bg-[#118bea] disabled:opacity-60"
                  >
                    {changingPassword ? "Changing..." : "Change Password"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <ProfileDropdown label="Language" icon={<Globe2 className="h-5 w-5 text-white/45" />} value={selectedLanguageLabel} onChange={handleLanguageChange} options={LANGUAGE_OPTIONS.map((option) => option.label)} />
          <ProfileDropdown label="Timezone" value={`(${tradingPreferences.timezone})`} onChange={handleTimezoneChange} options={TIMEZONE_OPTIONS} />
          <div className="border-t border-dashed border-white/15 pt-5">
            <button type="button" onClick={() => setDeleteConfirmOpen(true)} className="inline-flex items-center gap-2 text-[13px] font-black text-[#ff5d52] hover:text-[#ff7b72]">
              <X className="h-4 w-4" />
              Delete My account
            </button>
          </div>
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            className="flex h-11 w-20 items-center justify-center rounded-[6px] bg-[#2d3446] text-white transition hover:bg-[#3a4052]"
            aria-label={visible ? "Hide profile information" : "Show profile information"}
          >
            {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-[#0b101b]/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[420px] rounded-[8px] border border-red-500/20 bg-[#2a3040] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[19px] font-black text-white">Delete account?</h3>
                <p className="mt-3 text-[13px] font-bold leading-6 text-white/65">
                  This will remove your platform profile data, disable your login, and sign you out. This action cannot be undone.
                </p>
              </div>
              <button type="button" onClick={() => setDeleteConfirmOpen(false)} className="text-white/45 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="h-11 flex-1 rounded-[4px] bg-[#4a5061] text-[13px] font-black text-white hover:bg-[#565d70]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="h-11 flex-1 rounded-[4px] bg-[#e34d43] text-[13px] font-black text-white hover:bg-[#f05b50] disabled:opacity-60"
              >
                {deletingAccount ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!kycVerified && verificationPromptOpen && (
        <VerifyAccountIntroModal
          onClose={() => setVerificationPromptOpen(false)}
          onStart={openIdentityVerification}
        />
      )}

      <input
        ref={frontInputRef}
        type="file"
        accept={KYC_UPLOAD_ACCEPT}
        style={{ display: "none" }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleDocumentUpload("front", file);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={backInputRef}
        type="file"
        accept={KYC_UPLOAD_ACCEPT}
        style={{ display: "none" }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleDocumentUpload("back", file);
          event.currentTarget.value = "";
        }}
      />

      {identityModalOpen && (
        <AccountIdentityVerificationModal
          step={identityModalStep}
          privacyAccepted={identityPrivacyAccepted}
          country={form.country || "Kenya"}
          idType={idType}
          documents={docs}
          uploadingSlot={isUploadingDoc}
          personalDetailsComplete={personalDetailsComplete}
          needsBackSide={needsBackSide}
          requiredDocumentsUploaded={requiredDocumentsUploaded}
          onPrivacyAccepted={setIdentityPrivacyAccepted}
          onStepChange={setIdentityModalStep}
          onClose={() => setIdentityModalOpen(false)}
          onDocumentSelection={(nextType) => void handleIdentityDocumentSelection(nextType)}
          onUploadDocument={() => void handleIdentityUpload()}
          onCountryChange={handleIdentityCountryChange}
        />
      )}

      {!kycVerified && (
        <div className="mt-6 rounded-[6px] border border-white/10 bg-[#202633] px-5 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)]" data-verify-tour="documents">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-[18px] font-black text-white">
                <ShieldCheck className="h-5 w-5 text-[#0d82df]" />
                Documents verification:
              </h2>
              <p className="mt-1 text-[12px] font-bold text-white/50">
                {personalDetailsComplete
                  ? "Upload a color photo or scanned copy of your identity document."
                  : "Complete your personal details first, then upload your identity document."}
              </p>
            </div>
            <span
              className={`inline-flex rounded-[8px] px-3 py-1 text-[12px] font-black uppercase tracking-[0.08em] ${kycBadgeClass}`}
            >
              {kycLabel}
            </span>
          </div>

          {!personalDetailsComplete && (
            <div className="mt-4 flex items-start gap-3 rounded-[6px] border border-red-500/25 bg-red-500/10 px-4 py-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
              <p className="text-[13px] font-bold leading-5 text-red-200">
                You need full identity information before verifying your account. Fill in your name, date of birth, country, and address, then save.
              </p>
            </div>
          )}

          {personalDetailsComplete && !hasAnyKycDocument && kycStatus !== "Rejected" && (
            <div className="mt-4 rounded-[6px] border border-[#0d82df]/60 bg-[#122d4c] p-5 shadow-[0_18px_40px_rgba(13,130,223,0.14)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-[16px] font-black text-white">
                    <AlertCircle className="h-5 w-5 fill-[#0d82df] text-[#0d82df]" />
                    Verification of documents
                  </h3>
                  <p className="mt-3 max-w-[640px] text-[13px] font-bold leading-5 text-white">
                    Please upload a color photo or scanned image of your regular civil passport, driving license, residence permit, or national identity card.
                  </p>
                  <p className="mt-3 max-w-[620px] text-[11px] font-bold leading-4 text-white/35">
                    Account verification means providing an official document certifying the client's identity.
                  </p>
                </div>
                <ChevronDown className="mt-1 h-5 w-5 rotate-180 text-white" />
              </div>
              <button
                type="button"
                onClick={openIdentityVerification}
                className="mt-4 h-11 w-full rounded-[4px] bg-[#0d82df] text-[14px] font-black text-white transition hover:bg-[#118bea]"
              >
                Upload Documents
              </button>
            </div>
          )}

          {kycStatus === "Rejected" && (
            <div className="mt-4 flex items-start gap-3 rounded-[6px] border border-red-500/25 bg-red-500/10 px-4 py-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
              <p className="text-[13px] font-bold leading-5 text-red-200">
                Verification needs attention. Upload clearer front and back document images, then save again.
              </p>
            </div>
          )}

          {personalDetailsComplete && (hasAnyKycDocument || kycStatus === "Rejected") && (
          <>
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <ProfileDropdown label="ID Type" value={idType} onChange={setIdType} options={ID_DOCUMENT_OPTIONS} />
            <ProfileInput label="ID Number" value={idNumber} onChange={setIdNumber} />
            <button
              type="button"
              onClick={handleSaveVerification}
              disabled={verificationSaving}
              className="inline-flex h-12 items-center justify-center gap-2 self-end rounded-[6px] bg-[#0d82df] px-5 text-[13px] font-black text-white transition hover:bg-[#118bea] disabled:opacity-60"
            >
              {verificationSaving ? "Saving..." : "Save ID"}
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <IdDocumentRow
              label="Front of document"
              document={documents?.front ?? null}
              uploading={isUploadingDoc === "front"}
              onUpload={() => frontInputRef.current?.click()}
              onRemove={() => handleDocumentRemove("front")}
            />
            <IdDocumentRow
              label="Back of document"
              document={documents?.back ?? null}
              uploading={isUploadingDoc === "back"}
              onUpload={() => backInputRef.current?.click()}
              onRemove={() => handleDocumentRemove("back")}
            />
          </div>

          {verificationStatus && (
            <p className="mt-4 text-[12px] font-bold text-white/60">{verificationStatus}</p>
          )}
          </>
          )}
        </div>
      )}

      <div className="mt-5 border-t border-dashed border-white/15 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-black text-white">Credit / debit card verification:</h2>
            <p className="mt-3 text-[12px] font-bold text-white/45">
              {cards.length ? `${cards.length} card${cards.length === 1 ? "" : "s"} added for verification` : "You don't have any credit / debit cards for verification"}
            </p>
          </div>
          <button type="button" onClick={() => setCardFormOpen((current) => !current)} className="rounded-[4px] bg-[#0d82df] px-3 py-2 text-[11px] font-black uppercase text-white hover:bg-[#118bea]">
            Add new card
          </button>
        </div>
        {cardFormOpen && (
          <div className="mt-4 flex max-w-md flex-wrap items-end gap-3 rounded-[6px] border border-white/10 bg-[#252b3a] p-4">
            <ProfileInput label="Last 4 card digits" value={cardLast4} onChange={setCardLast4} />
            <button type="button" onClick={handleAddCard} className="inline-flex h-11 items-center gap-2 rounded-[4px] bg-[#0d82df] px-4 text-[13px] font-black text-white">
              <Upload className="h-4 w-4" /> Add
            </button>
          </div>
        )}
        {cards.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <div key={card.id} className="flex items-center justify-between rounded-[6px] border border-white/10 bg-[#252b3a] px-4 py-3">
                <span className="inline-flex items-center gap-2 text-[13px] font-black text-white">
                  <CreditCard className="h-4 w-4 text-[#9ba5b9]" />
                  Card ending {card.last4}
                </span>
                <span className="text-[11px] font-bold text-[#ffce5c]">Pending</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const VerifyAccountIntroModal = ({ onClose, onStart }: { onClose: () => void; onStart: () => void }) => (
  <div className="fixed inset-0 z-[700] flex items-center justify-center bg-[#0b101b]/78 p-4 backdrop-blur-[3px]">
    <div className="relative w-full max-w-[360px] rounded-[8px] bg-[#2b3142] px-8 py-8 text-center shadow-[0_28px_90px_rgba(0,0,0,0.5)]">
      <button type="button" onClick={onClose} className="absolute right-5 top-5 text-white/55 transition hover:text-white" aria-label="Close">
        <X className="h-5 w-5" />
      </button>
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#1687ee]/15">
        <ShieldCheck className="h-11 w-11 fill-[#1687ee] text-[#8fd0ff]" />
      </div>
      <h3 className="mt-6 text-[24px] font-black text-white">Verify your account</h3>
      <p className="mx-auto mt-5 max-w-[270px] text-[16px] font-bold leading-6 text-white/75">
        Verify your account to confirm your identity and unlock full access to all features.
      </p>
      <button type="button" onClick={onStart} className="mt-6 h-11 w-full rounded-[4px] bg-[#12b76a] text-[14px] font-black text-white shadow-[0_12px_28px_rgba(18,183,106,0.25)] transition hover:bg-[#19c477]">
        Start verification
      </button>
      <button type="button" onClick={onClose} className="mt-2 h-10 w-full rounded-[4px] bg-[#5a6278] text-[13px] font-black text-white transition hover:bg-[#667088]">
        Later
      </button>
    </div>
  </div>
);

const AccountIdentityVerificationModal = ({
  step,
  privacyAccepted,
  country,
  idType,
  documents,
  uploadingSlot,
  personalDetailsComplete,
  needsBackSide,
  requiredDocumentsUploaded,
  onPrivacyAccepted,
  onStepChange,
  onClose,
  onDocumentSelection,
  onUploadDocument,
  onCountryChange,
}: {
  step: "privacy" | "document" | "upload";
  privacyAccepted: boolean;
  country: string;
  idType: string;
  documents: Record<string, any>;
  uploadingSlot: "front" | "back" | null;
  personalDetailsComplete: boolean;
  needsBackSide: boolean;
  requiredDocumentsUploaded: boolean;
  onPrivacyAccepted: (checked: boolean) => void;
  onStepChange: (step: "privacy" | "document" | "upload") => void;
  onClose: () => void;
  onDocumentSelection: (documentType: string) => void;
  onUploadDocument: () => void;
  onCountryChange: (country: string) => void;
}) => {
  const selectedType = idType || "ID card";
  const uploadLabel = !documents.front?.url ? "Upload Front side" : needsBackSide && !documents.back?.url ? "Upload Back side" : "Finish verification";

  return (
    <div className="fixed inset-0 z-[720] flex items-center justify-center bg-[#0d1422]/80 p-4 backdrop-blur-[5px]">
      <div className="relative w-full max-w-[492px] rounded-[6px] border border-white/6 bg-[#2a3040] px-8 py-7 text-white shadow-[0_32px_100px_rgba(0,0,0,0.58)]">
        <button type="button" onClick={onClose} className="absolute right-5 top-5 text-white/45 transition hover:text-white" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-[20px] font-black">Identity Verification</h3>
        <div className="mt-5 border-t border-dashed border-white/16 pt-7">
          {step === "privacy" && (
            <div>
              <div className="mb-9 flex justify-end">
                <span className="inline-flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-[14px] font-black">
                  <Globe2 className="h-4 w-4" /> En
                </span>
              </div>
              <h4 className="text-[24px] font-black">Data and Privacy</h4>
              <label className="mt-7 grid cursor-pointer grid-cols-[26px_1fr] gap-4 text-[16px] font-bold leading-6 text-white/82">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(event) => onPrivacyAccepted(event.target.checked)}
                  className="sr-only"
                />
                <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-[5px] border transition ${privacyAccepted ? "border-[#1e9bff] bg-[#1e9bff]" : "border-white/35 bg-[#171c27]"}`}>
                  {privacyAccepted && <Check className="h-4 w-4 stroke-[3] text-white" />}
                </span>
                <span>
                  I confirm that I have read the <span className="text-[#0d82df]">Privacy Notice</span> and the <span className="text-[#0d82df]">Notification to Processing of Personal Data</span>
                </span>
              </label>
              <button
                type="button"
                disabled={!privacyAccepted}
                onClick={() => onStepChange("document")}
                className="mt-8 h-12 w-full rounded-[5px] bg-[#0d82df] text-[16px] font-black text-white shadow-[0_14px_28px_rgba(13,130,223,0.18)] transition hover:bg-[#118bea] disabled:cursor-not-allowed disabled:bg-[#1f5f98] disabled:text-white/55"
              >
                Continue
              </button>
              <p className="mt-6 text-center text-[11px] font-black text-white/45">Powered by sumsub</p>
            </div>
          )}

          {step === "document" && (
            <div>
              <div className="mb-8 flex items-center justify-between">
                <span className="inline-flex items-center gap-4 text-[16px] font-black">
                  <span>Step</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/55">1/1</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-[14px] font-black">
                  <Globe2 className="h-4 w-4" /> En
                </span>
              </div>
              <h4 className="max-w-[340px] text-[26px] font-black leading-tight">Select type and issuing country of your identity document</h4>
              <div className="mt-9">
                <p className="text-[15px] font-black">Issuing country <span className="text-[#ff5d52]">*</span></p>
                <div className="mt-5">
                  <select
                    value={country}
                    onChange={(event) => onCountryChange(event.target.value)}
                    className="w-full h-12 rounded-[6px] border border-white/10 bg-[#1e2435] px-4 text-[16px] font-black text-white focus:border-[#0d82df] focus:outline-none"
                  >
                    {COUNTRY_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.name}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-9">
                <p className="text-[15px] font-black">Document type <span className="text-[#ff5d52]">*</span></p>
                <div className="mt-5 space-y-5">
                  {ID_DOCUMENT_OPTIONS.map((option) => (
                    <button key={option} type="button" onClick={() => onDocumentSelection(option)} className="flex min-h-[38px] w-full items-center justify-between text-left text-[16px] font-black text-white">
                      <span>{option}</span>
                      <span className={`h-6 w-6 rounded-full border ${selectedType === option ? "border-[#0d82df] bg-[#0d82df] shadow-[inset_0_0_0_5px_#1b2130]" : "border-white/35 bg-black/30"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-8 text-[13px] font-bold text-white/50"><span className="text-[#ff5d52]">*</span> Required fields</p>
              <button type="button" disabled={!idType} onClick={() => onStepChange("upload")} className="mt-4 h-12 w-full rounded-[5px] bg-[#0d82df] text-[16px] font-black text-white transition hover:bg-[#118bea] disabled:opacity-45">
                Continue
              </button>
              <p className="mt-6 text-center text-[11px] font-black text-white/45">Powered by sumsub</p>
            </div>
          )}

          {step === "upload" && (
            <div>
              <div className="mb-7 flex items-center justify-between">
                <button type="button" onClick={() => onStepChange("document")} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="inline-flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-[14px] font-black">
                  <Globe2 className="h-4 w-4" /> En
                </span>
              </div>
              <div className="mx-auto mb-5 flex h-[156px] max-w-[376px] items-center justify-center rounded-[6px] bg-[#67746e] p-3">
                <div className="flex h-full w-full items-center justify-center rounded-[4px] border border-dashed border-[#35a6ff] bg-[#6f7b76]/55 text-center">
                  <div className="relative h-[112px] w-[118px]">
                    <div className="absolute left-5 top-0 h-[64px] w-[82px] rounded-[6px] bg-white shadow-[0_8px_18px_rgba(0,0,0,0.16)]">
                      <span className="mx-auto mt-4 block h-2 w-14 rounded-full bg-[#b9dcf5]" />
                      <span className="mx-auto mt-3 block h-2 w-14 rounded-full bg-[#b9dcf5]" />
                      <span className="absolute bottom-3 left-4 right-4 h-2 rounded-[2px] bg-[#2e9eff]" />
                    </div>
                    <div className="absolute bottom-0 left-5 h-[62px] w-[82px] rounded-[6px] bg-white shadow-[0_8px_18px_rgba(0,0,0,0.16)]">
                      <span className="absolute left-4 top-4 h-10 w-10 rounded-full bg-[#88cfff]" />
                      <span className="absolute right-4 top-4 h-2 w-8 rounded-full bg-[#4aa8ee]" />
                      <span className="absolute right-4 top-7 h-2 w-8 rounded-full bg-[#b9dcf5]" />
                      <span className="absolute right-4 top-10 h-2 w-8 rounded-full bg-[#b9dcf5]" />
                    </div>
                  </div>
                </div>
              </div>
              <h4 className="text-[26px] font-black">Upload your document</h4>
              <p className="mt-3 max-w-[340px] text-[16px] font-bold leading-6 text-white/85">
                Ensure all details on the photo is visible and easy to read
              </p>
              <div className="mt-7">
                <p className="text-[15px] font-black">Document type</p>
                <div className="mt-5 flex items-center gap-3 text-[16px] font-black">
                  <CountryCodeMark country={country} /> {selectedType}
                  <Pencil className="ml-auto h-4 w-4 text-white" />
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <ModalDocumentState label={selectedType === "Passport" ? "Passport photo page" : "Front side"} required document={documents.front} uploading={uploadingSlot === "front"} />
                {needsBackSide && <ModalDocumentState label="Back side" required document={documents.back} uploading={uploadingSlot === "back"} />}
              </div>
              <p className="mt-4 text-center text-[13px] font-black text-white/45">JPG, PNG, HEIC, WEBP or PDF (max 50 MB)</p>
              <p className="mt-6 text-[13px] font-bold text-white/50"><span className="text-[#ff5d52]">*</span> Required fields</p>
              <button type="button" onClick={onUploadDocument} disabled={Boolean(uploadingSlot)} className="mt-3 h-12 w-full rounded-[5px] bg-[#0d82df] text-[16px] font-black text-white transition hover:bg-[#118bea] disabled:opacity-55">
                {uploadingSlot ? "Uploading..." : requiredDocumentsUploaded ? "Finish verification" : uploadLabel}
              </button>
              <p className="mt-6 text-center text-[11px] font-black text-white/45">Powered by sumsub</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ModalDocumentState = ({ label, required, document, uploading }: { label: string; required?: boolean; document?: any; uploading?: boolean }) => (
  <div className="flex min-h-[82px] items-center gap-4 rounded-[6px] border border-dashed border-white/35 bg-black/45 px-4 py-3">
    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[10px] bg-white/8">
      {document?.url ? <CheckCircle2 className="h-7 w-7 text-[#12b76a]" /> : <UploadCloud className="h-7 w-7 text-white/55" />}
    </span>
    <div className="min-w-0">
      <p className="text-[16px] font-black text-white">
        {label} {required && <span className="text-[#ff5d52]">*</span>}
      </p>
      <p className="mt-1 text-[14px] font-bold text-white/60">
        {uploading ? "Uploading..." : document?.name ? document.name : <><span className="text-[#0d82df]">Choose</span> or drag and drop</>}
      </p>
    </div>
  </div>
);

const ProfileInput = ({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
  suffix,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  suffix?: string;
  multiline?: boolean;
}) => (
  <label className="relative block">
    <span className="absolute -top-2 left-3 bg-[#202633] px-1 text-[11px] font-bold text-[#778198]">{label}</span>
    {suffix && <span className="absolute -top-2 right-3 bg-[#202633] px-1 text-[10px] font-bold text-[#21c978]">{suffix}</span>}
    {multiline ? (
      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[82px] w-full resize-none rounded-[6px] border border-white/18 bg-[#202633] px-4 py-4 text-[14px] font-bold text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_8px_24px_rgba(0,0,0,0.12)] transition placeholder:text-white/35 focus:border-[#0d82df] disabled:text-white/35"
        placeholder="Empty"
      />
    ) : (
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-[6px] border border-white/18 bg-[#202633] px-4 text-[14px] font-bold text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_8px_24px_rgba(0,0,0,0.12)] transition placeholder:text-white/35 focus:border-[#0d82df] disabled:text-white/35"
        placeholder="Empty"
      />
    )}
  </label>
);

const ProfileDropdown = ({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  icon?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <span className="absolute -top-2 left-3 z-10 bg-[#202633] px-1 text-[11px] font-bold text-[#778198]">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-full items-center rounded-[6px] border border-white/18 bg-[#202633] px-4 text-left text-[14px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_8px_24px_rgba(0,0,0,0.12)] transition hover:border-white/28 focus:border-[#0d82df]"
      >
        {icon && <span className="mr-3">{icon}</span>}
        <span className="min-w-0 flex-1 truncate">{value || "Select"}</span>
        <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[54px] z-40 overflow-hidden rounded-[6px] border border-white/12 bg-[#303647] py-1 shadow-[0_22px_54px_rgba(0,0,0,0.35)]">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="block w-full px-4 py-3 text-left text-[14px] font-bold text-white/65 hover:bg-[#3b4255] hover:text-white"
          >
            Select
          </button>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`block w-full px-4 py-3 text-left text-[14px] font-bold ${option === value ? "bg-[#167fdd] text-white" : "text-white hover:bg-[#3b4255]"}`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ProfileSummary = ({
  email,
  displayName,
  displayId,
  location,
  liveBalance,
  demoBalance,
  avatarUrl,
  visible,
  onToggleVisible,
}: {
  email: string;
  displayName: string;
  displayId: string;
  location: string;
  liveBalance: string;
  demoBalance: string;
  avatarUrl: string;
  visible: boolean;
  onToggleVisible: () => void;
}) => (
  <div className="flex min-h-[76px] flex-wrap items-center gap-x-7 gap-y-4">
    <div className="flex min-w-[260px] items-center gap-3">
      <div className="relative flex h-14 w-14 shrink-0 items-end justify-center overflow-hidden rounded-full bg-black">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName || email} className="h-full w-full object-cover" />
        ) : (
          <>
            <div className="mb-1 h-6 w-10 rounded-t-full bg-[#0d86f7]" />
            <div className="absolute top-2.5 h-7 w-7 rounded-full bg-[#0d86f7]" />
          </>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-bold text-white/45">
          {visible ? (displayName ? `${displayName} - ${email}` : email) : "Hidden account information"}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="truncate text-[17px] font-black text-white">ID: {visible ? displayId : "********"}</p>
          <Send className="h-4 w-4 shrink-0 fill-[#39d10f] text-[#39d10f]" />
        </div>
      </div>
    </div>

    <ProfileMetric label="Location" value={visible ? location : "****"} compact />
    <ProfileMetric label="In the account" value={visible ? liveBalance : "****"} />
    <ProfileMetric label="In the demo" value={visible ? demoBalance : "****"} />
    <button
      type="button"
      onClick={onToggleVisible}
      className="flex h-10 w-16 items-center justify-center rounded-[6px] bg-[#2d3446] text-white transition hover:bg-[#3a4052]"
      aria-label={visible ? "Hide account summary" : "Show account summary"}
      title={visible ? "Hide account summary" : "Show account summary"}
    >
      {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
    </button>
  </div>
);

const AnalyticsDashboard = ({
  stats,
  profitSeries,
  profitableSeries,
  filteredAssets,
}: {
  stats: ReturnType<typeof buildAnalyticsStats>;
  profitSeries: ChartPoint[];
  profitableSeries: ChartPoint[];
  filteredAssets: AssetSlice[];
}) => (
  <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.72fr)_minmax(0,1.62fr)]">
          <div className="space-y-5">
            <Panel title="General data">
              <div className="grid grid-cols-3 gap-y-10 px-7 py-10">
                <RingMetric value={stats.tradesCount.toString()} label="Trades count" />
                <MoneyMetric value={stats.totalProfit} label="Trades profit" />
                <RingMetric value={stats.profitableTrades.toString()} sub={`${stats.profitablePct}%`} label="Profitable trades" />
              </div>
              <div className="mx-7 border-t border-white/10" />
              <div className="grid grid-cols-3 gap-x-8 gap-y-12 px-7 py-10">
                <MoneyMetric value={stats.averageProfit} label="Average profit" />
                <MoneyMetric value={stats.netTurnover} label="Net turnover" />
                <MoneyMetric value={stats.hedgedTrades} label="Hedged trades" />
                <MoneyMetric value={stats.minTradeAmount} label="Min trade amount" />
                <MoneyMetric value={stats.maxTradeAmount} label="Max trade amount" />
                <MoneyMetric value={stats.maxTradeProfit} label="Max trade profit" />
              </div>
              <div className="mx-7 mb-8 w-[230px] rounded-[3px] bg-[#3a4050] px-4 py-3">
                <div className="flex h-3 overflow-hidden">
                  <div className="w-[24%] bg-[#ff443d]" />
                  <div className="w-[24%] bg-[#f3b13e]" />
                  <div className="w-[24%] bg-[#12b76a]" />
                  <div className="w-[24%] bg-gradient-to-r from-[#12b76a] to-transparent" />
                </div>
                <div className="mt-2 flex gap-3 text-[14px] font-bold text-white/45">
                  <span>-1K-0</span>
                  <span>0-1K</span>
                  <span>+1K</span>
                </div>
              </div>
            </Panel>

            <Panel title="Top 5 most profitable instruments among traders">
              <div className="flex min-h-[240px] items-center justify-center gap-8 px-6 py-8">
                <PieChartGraphic items={filteredAssets} />
                <div className="space-y-4">
                  {filteredAssets.map((asset, index) => (
                    <div key={asset.asset} className="flex items-center gap-3 text-[13px] font-black text-white">
                      <span className="h-3 w-3 rounded-full" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span>{asset.asset} otc {asset.share}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="Statistics of profitable trades">
              <LineChartGraphic series={profitSeries} min={Math.min(0, ...profitSeries.map((p) => p.value))} max={Math.max(1, ...profitSeries.map((p) => p.value))} height={300} />
            </Panel>

            <Panel title="Percentage % of profitable trades">
              <LineChartGraphic series={profitableSeries} min={0} max={100} height={320} showGrid />
            </Panel>

            <div className="grid gap-8 lg:grid-cols-2">
              <Panel title="Statistics Profit & Loss by instruments">
                <NoData />
              </Panel>
              <Panel title="Distribution of trades by instruments, %">
                <NoData />
              </Panel>
            </div>
          </div>
        </div>
);

const ProfileMetric = ({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) => (
  <div className={`border-l border-white/15 pl-5 ${compact ? "min-w-[95px]" : "min-w-[135px]"}`}>
    <p className="text-[12px] font-bold text-white/45">{label}</p>
    <p className="mt-1 text-[16px] font-black text-white">{value}</p>
  </div>
);

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="overflow-hidden rounded-[6px] bg-[#2a3040]">
    <header className="border-b border-white/10 px-7 py-6">
      <h2 className="text-[19px] font-black text-white">{title}</h2>
    </header>
    {children}
  </section>
);

const RingMetric = ({ value, sub, label }: { value: string; sub?: string; label: string }) => (
  <div className="flex flex-col items-center text-center">
    <div className="flex h-[86px] w-[86px] items-center justify-center rounded-full bg-[#454c61]">
      <div className="flex h-[64px] w-[64px] flex-col items-center justify-center rounded-full bg-[#242a39]">
        <span className="text-[22px] font-black text-white">{value}</span>
        {sub && <span className="text-[11px] font-black text-white/70">{sub}</span>}
      </div>
    </div>
    <p className="mt-5 text-[14px] font-bold text-white/70">{label}</p>
  </div>
);

const MoneyMetric = ({ value, label }: { value: number; label: string }) => (
  <div className="text-left">
    <p className="text-[20px] font-black text-white">{formatUsdCompact(value)}</p>
    <div className="mt-4 flex gap-1">
      <span className="h-2.5 w-7 bg-[#454c61]" />
      <span className="h-2.5 w-7 bg-[#454c61]" />
      <span className="h-2.5 w-7 bg-[#454c61]" />
      <span className="h-2.5 w-7 bg-[#454c61]" />
    </div>
    <p className="mt-5 text-[14px] font-bold leading-tight text-white/70">{label}</p>
  </div>
);

const NoData = () => (
  <div className="flex h-[86px] items-center justify-center text-[28px] font-black text-white/25">No data</div>
);

const TabbedPanel = ({ children }: { children: React.ReactNode }) => (
  <section className="rounded-[6px] bg-[#202633] px-5 py-5 text-white">{children}</section>
);

const Pagination = ({ page, total, onPageChange }: { page: number; total: number; onPageChange: (page: number) => void }) => {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className="inline-flex h-10 items-center gap-2 rounded-[4px] bg-[#4a5061] px-4 text-[13px] font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
      >
        <ChevronLeft className="h-4 w-4" /> Prev
      </button>
      <span className="min-w-10 text-center text-[14px] font-black text-white">{page}/{pages}</span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPageChange(Math.min(pages, page + 1))}
        className="inline-flex h-10 items-center gap-2 rounded-[4px] bg-[#4a5061] px-4 text-[13px] font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
      >
        Next <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};

const PaymentsTable = ({ transactions, formatMoney }: { transactions: Transaction[]; formatMoney: (amount: number) => string }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[980px] border-collapse text-left">
      <thead className="text-[12px] font-medium text-[#9ba5b9]">
        <tr>
          <th className="border-b border-white/8 px-3 py-4">Transaction ID</th>
          <th className="border-b border-white/8 px-3 py-4">Date and time</th>
          <th className="border-b border-white/8 px-3 py-4">Status</th>
          <th className="border-b border-white/8 px-3 py-4">Transaction type</th>
          <th className="border-b border-white/8 px-3 py-4">Payment system</th>
          <th className="border-b border-white/8 px-3 py-4 text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((tx) => (
          <tr key={tx.id} className="border-b border-white/6 text-[14px] font-bold text-white">
            <td className="px-3 py-5">{shortTransactionId(tx.id)}</td>
            <td className="px-3 py-5">{formatDateTime(tx.date)}</td>
            <td className="px-3 py-5"><StatusBadge status={tx.status} /></td>
            <td className="px-3 py-5">{titleCase(tx.type)}</td>
            <td className="px-3 py-5">{resolvePaymentSystem(tx)}</td>
            <td className={`px-3 py-5 text-right ${tx.amount >= 0 ? "text-[#00c878]" : "text-[#ff5d52]"}`}>
              {tx.amount >= 0 ? "+" : "-"}{formatMoney(Math.abs(tx.amount))}
            </td>
          </tr>
        ))}
        {transactions.length === 0 && (
          <tr>
            <td colSpan={6} className="px-3 py-16 text-center text-[14px] font-bold text-white/45">No payment transactions found.</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const StatusBadge = ({ status }: { status?: Transaction["status"] }) => {
  const failed = status === "failed" || status === "rejected" || status === "cancelled";
  const pending = status === "pending" || status === "processing" || status === "approved";
  return (
    <span className={`inline-flex items-center gap-2 ${failed ? "text-[#ff5d52]" : pending ? "text-[#ffce5c]" : "text-[#00c878]"}`}>
      <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white ${failed ? "bg-[#ff5d52]" : pending ? "bg-[#ffb020]" : "bg-[#18b96f]"}`}>
        {failed ? "x" : pending ? "!" : "ok"}
      </span>
      {failed ? "Failed" : pending ? "Processing" : "Succeeded"}
    </span>
  );
};

const TradesTable = ({ trades, formatMoney, onSelectTrade }: { trades: Trade[]; formatMoney: (amount: number) => string; onSelectTrade: (trade: Trade) => void }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[1180px] border-collapse text-left">
      <thead className="text-[12px] font-medium text-[#9ba5b9]">
        <tr>
          <th className="border-b border-white/8 px-3 py-4">Asset</th>
          <th className="border-b border-white/8 px-3 py-4">Info</th>
          <th className="border-b border-white/8 px-3 py-4">Chart</th>
          <th className="border-b border-white/8 px-3 py-4">Opening quote</th>
          <th className="border-b border-white/8 px-3 py-4">Closing quote</th>
          <th className="border-b border-white/8 px-3 py-4">IP</th>
          <th className="border-b border-white/8 px-3 py-4 text-right">Amount</th>
          <th className="border-b border-white/8 px-3 py-4 text-right">Profit</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((trade) => (
          <tr key={trade.id} onClick={() => onSelectTrade(trade)} className="cursor-pointer border-b border-white/6 text-[14px] font-bold text-white hover:bg-white/[0.025]">
            <td className="px-3 py-5">{trade.asset}</td>
            <td className="px-3 py-5"><div> {trade.direction === "Buy" || trade.direction === "Higher" ? "Up" : "Down"}</div><div className="mt-1 max-w-[180px] truncate text-[12px] font-medium text-white/65">{trade.id}</div></td>
            <td className="px-3 py-5"><Image className="h-5 w-5 text-white/80" /></td>
            <td className="px-3 py-5"><div>{estimateOpeningQuote(trade)}</div><div className="mt-1 text-[12px] font-medium text-white/70">{formatDateTime(trade.openTime)}</div></td>
            <td className="px-3 py-5"><div>{estimateClosingQuote(trade)}</div><div className="mt-1 text-[12px] font-medium text-white/70">{formatDateTime(trade.closeTime)}</div></td>
            <td className="px-3 py-5">217.199.144.34</td>
            <td className={`px-3 py-5 text-right ${trade.direction === "Buy" || trade.direction === "Higher" ? "text-[#00c878]" : "text-[#ff5d52]"}`}>
              {formatMoney(trade.amount)}
            </td>
            <td className={`px-3 py-5 text-right ${trade.profit > 0 ? "text-[#00c878]" : "text-[#ff5d52]"}`}>{formatMoney(Math.abs(trade.profit))}</td>
          </tr>
        ))}
        {trades.length === 0 && (
          <tr><td colSpan={8} className="px-3 py-16 text-center text-[14px] font-bold text-white/45">No trade history found.</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

const PendingTradesTable = ({ trades, formatMoney }: { trades: ActiveTrade[]; formatMoney: (amount: number) => string }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[920px] border-collapse text-left">
      <thead className="text-[12px] font-medium text-[#9ba5b9]">
        <tr>
          <th className="border-b border-white/8 px-3 py-4">Asset</th>
          <th className="border-b border-white/8 px-3 py-4">Direction</th>
          <th className="border-b border-white/8 px-3 py-4">Opened</th>
          <th className="border-b border-white/8 px-3 py-4">Duration</th>
          <th className="border-b border-white/8 px-3 py-4">Time left</th>
          <th className="border-b border-white/8 px-3 py-4 text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((trade) => (
          <tr key={trade.id} className="border-b border-white/6 text-[14px] font-bold text-white">
            <td className="px-3 py-5">{trade.asset_symbol}</td>
            <td className={`px-3 py-5 ${trade.direction === "Buy" || trade.direction === "Higher" ? "text-[#00c878]" : "text-[#ff5d52]"}`}>{trade.direction}</td>
            <td className="px-3 py-5">{formatDateTime(trade.opened_at)}</td>
            <td className="px-3 py-5">{formatDuration(trade.expiry_seconds)}</td>
            <td className="px-3 py-5">{formatDuration(trade.timeLeft)}</td>
            <td className="px-3 py-5 text-right">{formatMoney(trade.amount)}</td>
          </tr>
        ))}
        {trades.length === 0 && (
          <tr><td colSpan={6} className="px-3 py-16 text-center text-[14px] font-bold text-white/45">No pending trades.</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

const MarketTable = ({ assets, formatMoney }: { assets: Array<{ asset: string; trades: number; wins: number; losses: number; profit: number; volume: number; winRate?: number }>; formatMoney: (amount: number) => string }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[820px] border-collapse text-left">
      <thead className="text-[12px] font-medium text-[#9ba5b9]">
        <tr>
          <th className="border-b border-white/8 px-3 py-4">Instrument</th>
          <th className="border-b border-white/8 px-3 py-4 text-right">Trades</th>
          <th className="border-b border-white/8 px-3 py-4 text-right">Wins</th>
          <th className="border-b border-white/8 px-3 py-4 text-right">Losses</th>
          <th className="border-b border-white/8 px-3 py-4 text-right">Win rate</th>
          <th className="border-b border-white/8 px-3 py-4 text-right">Volume</th>
          <th className="border-b border-white/8 px-3 py-4 text-right">Profit</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset.asset} className="border-b border-white/6 text-[14px] font-bold text-white">
            <td className="px-3 py-5">{asset.asset}</td>
            <td className="px-3 py-5 text-right">{asset.trades}</td>
            <td className="px-3 py-5 text-right text-[#00c878]">{asset.wins}</td>
            <td className="px-3 py-5 text-right text-[#ff5d52]">{asset.losses}</td>
            <td className="px-3 py-5 text-right">{asset.winRate ?? 0}%</td>
            <td className="px-3 py-5 text-right">{formatMoney(asset.volume)}</td>
            <td className={`px-3 py-5 text-right ${asset.profit >= 0 ? "text-[#00c878]" : "text-[#ff5d52]"}`}>{formatMoney(Math.abs(asset.profit))}</td>
          </tr>
        ))}
        {assets.length === 0 && (
          <tr><td colSpan={7} className="px-3 py-16 text-center text-[14px] font-bold text-white/45">No market trading statistics yet.</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

type AssetSlice = { asset: string; share: number; profit: number };

const PieChartGraphic = ({ items }: { items: AssetSlice[] }) => {
  if (!items.length) return <div className="flex h-[190px] w-[190px] items-center justify-center rounded-full bg-[#222839] text-white/35">No data</div>;

  let cumulative = 0;
  const gradient = items
    .map((item, index) => {
      const start = cumulative;
      cumulative += item.share;
      return `${PIE_COLORS[index % PIE_COLORS.length]} ${start}% ${cumulative}%`;
    })
    .join(", ");

  return (
    <div className="relative flex h-[205px] w-[205px] items-center justify-center rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
      <div className="h-[54px] w-[54px] rounded-full bg-[#2a3040]" />
      {items.slice(0, 3).map((item, index) => (
        <span
          key={item.asset}
          className="absolute text-[11px] font-bold text-white drop-shadow"
          style={{
            left: index === 0 ? "68%" : index === 1 ? "35%" : "22%",
            top: index === 0 ? "37%" : index === 1 ? "25%" : "55%",
          }}
        >
          {item.share}%
        </span>
      ))}
    </div>
  );
};

const LineChartGraphic = ({
  series,
  min,
  max,
  height,
  showGrid = false,
}: {
  series: ChartPoint[];
  min: number;
  max: number;
  height: number;
  showGrid?: boolean;
}) => {
  const width = 1000;
  const chartHeight = 230;
  const range = Math.max(max - min, 1);
  const safeSeries = series.length > 1 ? series : [{ label: "", value: min }, { label: "", value: min }];
  const labelEvery = Math.max(1, Math.ceil(safeSeries.length / 12));
  const points = safeSeries.map((point, index) => {
    const x = 40 + (index / Math.max(safeSeries.length - 1, 1)) * (width - 80);
    const y = 40 + (1 - (point.value - min) / range) * (chartHeight - 70);
    return { ...point, x, y };
  });

  const smoothPathD = getSmoothPathD(points);
  const firstX = points[0].x;
  const lastX = points[points.length - 1].x;
  const bottomY = chartHeight - 30;
  const areaPathD = `${smoothPathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  const ticks = showGrid ? [100, 75, 50, 25, 0] : [0];

  return (
    <div className="px-7 py-7" style={{ minHeight: height }}>
      <svg viewBox={`0 0 ${width} ${chartHeight}`} className="h-full min-h-[230px] w-full overflow-visible">
        <defs>
          <linearGradient id="analyticsAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#13a66a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#13a66a" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => {
          const y = 40 + (1 - (tick - min) / range) * (chartHeight - 70);
          return (
            <g key={tick}>
              <text x="0" y={y + 5} fill="#ffffff" opacity="0.9" fontSize="13" fontWeight="700">{tick}</text>
              <line x1="40" x2={width - 20} y1={y} y2={y} stroke="#5a6275" strokeOpacity={showGrid ? 0.45 : 0.18} />
            </g>
          );
        })}
        <path d={areaPathD} fill="url(#analyticsAreaGrad)" />
        <path d={smoothPathD} fill="none" stroke="#13a66a" strokeWidth="3" strokeLinecap="round" />
        {points.map((point, index) => (
          <text key={`${point.label}-${index}`} x={point.x} y={chartHeight - 4} fill="#d6d9e1" fontSize="12" fontWeight="700" textAnchor="middle">
            {index % labelEvery === 0 ? point.label : ""}
          </text>
        ))}
      </svg>
    </div>
  );
};

const buildAnalyticsStats = (trades: Trade[]) => {
  const tradesCount = trades.length;
  const profitableTrades = trades.filter((trade) => trade.profit > 0).length;
  const totalProfit = trades.reduce((sum, trade) => sum + trade.profit, 0);
  const averageProfit = tradesCount > 0 ? totalProfit / tradesCount : 0;
  const amounts = trades.map((trade) => trade.amount);
  const profits = trades.map((trade) => trade.profit);

  return {
    tradesCount,
    profitableTrades,
    profitablePct: tradesCount > 0 ? Math.round((profitableTrades / tradesCount) * 100) : 0,
    totalProfit,
    averageProfit,
    netTurnover: trades.reduce((sum, trade) => sum + trade.amount, 0),
    hedgedTrades: trades.filter((trade) => trade.direction === "Buy" || trade.direction === "Sell").length,
    minTradeAmount: amounts.length ? Math.min(...amounts) : 0,
    maxTradeAmount: amounts.length ? Math.max(...amounts) : 0,
    maxTradeProfit: profits.length ? Math.max(...profits, 0) : 0,
  };
};

const buildProfitSeries = (trades: Trade[], range: AnalyticsRange): ChartPoint[] => {
  const grouped = groupTradesByDay(trades);
  return fillDaySeries(grouped.map(([date, dayTrades]) => ({
    date,
    value: dayTrades.filter((trade) => trade.profit > 0).length,
  })), range);
};

const buildProfitableSeries = (trades: Trade[], range: AnalyticsRange): ChartPoint[] => {
  const grouped = groupTradesByDay(trades);
  return fillDaySeries(grouped.map(([date, dayTrades]) => ({
    date,
    value: dayTrades.length ? Math.round((dayTrades.filter((trade) => trade.profit > 0).length / dayTrades.length) * 100) : 0,
  })), range);
};

const groupTradesByDay = (trades: Trade[]) => {
  const groups = new Map<string, Trade[]>();
  trades.forEach((trade) => {
    const key = dayKey(trade.closeTime || trade.openTime);
    groups.set(key, [...(groups.get(key) ?? []), trade]);
  });
  return Array.from(groups.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
};

const fillDaySeries = (values: { date: string; value: number }[], range: AnalyticsRange): ChartPoint[] => {
  if (range === "All" && values.length > 0) {
    const valueMap = new Map(values.map((item) => [item.date, item.value]));
    return values.map((item) => ({ label: formatAxisDate(item.date), value: valueMap.get(item.date) ?? 0 }));
  }

  const days = range === "3 days" ? 3 : range === "Week" ? 7 : range === "Year" ? 365 : 31;
  const valueMap = new Map(values.map((item) => [item.date, item.value]));
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  return Array.from({ length: days }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = date.toISOString();
    return {
      label: formatAxisDate(key),
      value: valueMap.get(key) ?? 0,
    };
  });
};

const buildAssetBreakdown = (trades: Trade[], fallback: Array<{ asset: string; profit: number }>): AssetSlice[] => {
  const profitByAsset = new Map<string, number>();
  trades.forEach((trade) => {
    profitByAsset.set(trade.asset, (profitByAsset.get(trade.asset) ?? 0) + Math.max(trade.profit, 0));
  });
  const source = profitByAsset.size
    ? Array.from(profitByAsset.entries()).map(([asset, profit]) => ({ asset, profit }))
    : fallback.slice(0, 5).map((asset) => ({ asset: asset.asset, profit: Math.max(asset.profit, 0) }));
  const top = source.sort((a, b) => b.profit - a.profit).slice(0, 5);
  const total = top.reduce((sum, item) => sum + item.profit, 0);
  if (total <= 0) {
    return [
      { asset: "BRLUSD", profit: 34, share: 34 },
      { asset: "USDARS", profit: 18, share: 18 },
      { asset: "CADCHF", profit: 17, share: 17 },
      { asset: "USDBDT", profit: 17, share: 17 },
      { asset: "EURJPY", profit: 15, share: 15 },
    ];
  }
  return top.map((item) => ({
    asset: item.asset.replace(/\s*\(OTC\)\s*/i, ""),
    profit: item.profit,
    share: Math.max(1, Math.round((item.profit / total) * 100)),
  }));
};

const IdDocumentRow = ({
  label,
  document,
  uploading,
  onUpload,
  onRemove,
}: {
  label: string;
  document: { name: string; url: string; mimeType: string; uploadedAt: string; path?: string; fallback?: boolean } | null;
  uploading: boolean;
  onUpload: () => void;
  onRemove: () => void;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-[6px] border border-white/10 bg-[#202633] px-4 py-4">
    <div className="min-w-0">
      <div className="text-[14px] font-black text-white">{label}</div>
      <div className="mt-1 truncate text-[12px] font-bold text-white/45">
        {document?.name || "No file uploaded yet"}
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <span className={`rounded-[8px] px-2.5 py-1 text-[11px] font-bold ${document?.url ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-300"}`}>
        {document?.url ? "Submitted" : "Needed"}
      </span>
      <button
        type="button"
        onClick={onUpload}
        className="inline-flex items-center gap-2 rounded-[6px] bg-[#0d82df] px-3 py-2 text-[12px] font-black text-white transition hover:bg-[#118bea]"
      >
        <UploadCloud className="h-4 w-4" />
        {uploading ? "Uploading..." : "Upload"}
      </button>
      {document?.url && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-[6px] border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-black text-[#ff5d52] transition hover:bg-white/10"
        >
          Remove
        </button>
      )}
    </div>
  </div>
);
const WithdrawalPanel = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState<string>("10");
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState(() => profile?.full_name?.split(" ")[0] ?? "");
  const [lastName, setLastName] = useState(() => profile?.full_name?.split(" ").slice(1).join(" ") ?? "");
  const [bankName, setBankName] = useState("SAFARICOM");
  const [phone, setPhone] = useState(() => profile?.phone_number ?? "");
  const [walletAddress, setWalletAddress] = useState("");
  const [cryptoMemo, setCryptoMemo] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const [userDeposits, setUserDeposits] = useState<Tables<"deposit_requests">[]>([]);
  const [userWithdrawals, setUserWithdrawals] = useState<Tables<"withdrawals">[]>([]);
  const [cryptoMethods, setCryptoMethods] = useState<Tables<"crypto_payment_methods">[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");

  const liveBalance = getEffectiveLiveBalance(profile);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const loadUserData = async () => {
      const [depositsRes, withdrawalsRes, cryptoRes] = await Promise.all([
        api.from("deposit_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        api.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        api.from("crypto_payment_methods").select("*").eq("status", "active").order("coin_name"),
      ]);
      if (cancelled) return;
      if (depositsRes.data) setUserDeposits(depositsRes.data);
      if (withdrawalsRes.data) setUserWithdrawals(withdrawalsRes.data);
      if (cryptoRes.data) setCryptoMethods(cryptoRes.data);
    };
    void loadUserData();
    return () => { cancelled = true; };
  }, [user?.id]);

  const eligibleMethods = useMemo(() => {
    const map = new Map<string, { id: string; label: string; methodType: "mpesa" | "crypto"; symbol?: string }>();
    userDeposits.forEach((dep) => {
      const methodStr = (dep.method || "").toUpperCase();
      if (methodStr.includes("MPESA") || methodStr.includes("M-PESA") || methodStr.includes("MOBILE MONEY")) {
        map.set("mpesa", { id: "mpesa", label: "M-pesa", methodType: "mpesa" });
      } else if (methodStr.includes("AIRTEL")) {
        map.set("airtel", { id: "airtel", label: "Airtel Money", methodType: "mpesa" });
      } else if (methodStr.includes("CRYPTO") || methodStr.includes("USDT") || methodStr.includes("BTC") || methodStr.includes("ETH")) {
        const cleanLabel = dep.method ? dep.method.replace(/^CRYPTO\s*/i, "") : "USDT (TRC-20)";
        const id = `crypto:${cleanLabel}`;
        map.set(id, { id, label: cleanLabel, methodType: "crypto", symbol: cleanLabel.split(" ")[0] });
      }
    });
    if (map.size === 0) return [{ id: "mpesa", label: "M-pesa", methodType: "mpesa" as const }, { id: "crypto:USDT (TRC-20)", label: "USDT (TRC-20)", methodType: "crypto" as const, symbol: "USDT" }];
    return Array.from(map.values());
  }, [userDeposits]);

  useEffect(() => { if (eligibleMethods.length > 0 && !selectedMethodId) setSelectedMethodId(eligibleMethods[0].id); }, [eligibleMethods, selectedMethodId]);

  const selectedEligibleMethod = useMemo(() => eligibleMethods.find((m) => m.id === selectedMethodId) ?? eligibleMethods[0], [eligibleMethods, selectedMethodId]);

  const refreshWithdrawals = async () => {
    if (!user?.id) return;
    const res = await api.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
    if (res.data) setUserWithdrawals(res.data);
  };

  const handleConfirmWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 10) { toast.error("Minimum withdrawal is $10.00"); return; }
    if (amountNum > liveBalance) { toast.error("Insufficient funds in your account balance"); return; }
    if (selectedEligibleMethod?.methodType === "mpesa" && !phone.trim()) { toast.error("Please enter your M-Pesa phone number"); return; }
    if (selectedEligibleMethod?.methodType === "crypto" && !walletAddress.trim()) { toast.error("Please enter your wallet address"); return; }
    setLoading(true);
    try {
      if (selectedEligibleMethod?.methodType === "mpesa") {
        const res = await requestMobileMoneyWithdrawal({ amount: amountNum, phoneNumber: phone.trim() });
        await refreshProfile();
        toast.success(`Withdrawal request submitted! $${amountNum.toFixed(2)} (${res.amount_kes} KES) to ${res.masked_phone_number} is pending.`);
      } else {
        const matchingCrypto = cryptoMethods.find((c) => c.symbol.toUpperCase() === (selectedEligibleMethod?.symbol || "USDT").toUpperCase()) ?? cryptoMethods[0];
        await requestCryptoWithdrawal({ amount: amountNum, destination: walletAddress.trim(), cryptoCurrency: matchingCrypto?.symbol || "USDT", cryptoNetwork: matchingCrypto?.network || "TRC-20", cryptoMemo: cryptoMemo.trim() || undefined });
        await refreshProfile();
        toast.success(`Crypto withdrawal submitted! $${amountNum.toFixed(2)} is pending.`);
      }
      setAmount("10");
      await refreshWithdrawals();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const p = (n: number) => String(n).padStart(2, "0");
      return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    } catch { return iso; }
  };

  const FLabel = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="relative mt-1">
      <span className="absolute -top-2.5 left-3 z-10 bg-[#1b202a] px-1.5 text-[11px] font-bold text-[#6c7a91]">{label}</span>
      {children}
    </div>
  );

  const inputCls = "h-11 w-full rounded-[4px] border border-[#323d53] bg-[#1d2535] px-4 text-sm font-bold text-white outline-none focus:border-[#0084FF] transition-colors";
  
  const allFaqs = [
    { id: 1, question: "How to withdraw money from the account?", answer: "Specify the amount, choose one of your deposit methods, enter the destination details, and click Confirm." },
    { id: 2, question: "How long does it take to withdraw funds?", answer: "Withdrawal requests are processed promptly. Automated M-Pesa and crypto payouts complete in 15-60 minutes." },
    { id: 3, question: "What is the minimum withdrawal amount?", answer: "The minimum withdrawal amount is $10.00." },
    { id: 4, question: "Is there any fee for depositing or withdrawing funds from the account?", answer: "No, our platform charges zero commission or fees for deposits and withdrawals." },
    { id: 5, question: "Do I need to provide any documents to make a withdrawal?", answer: "Standard withdrawals do not require extra documents unless identity verification is requested." },
    { id: 6, question: "What is account verification?", answer: "Account verification ensures security and confirms identity before large payouts." },
    { id: 7, question: "How to understand that I need to go through account verification?", answer: "You will receive an in-app notice if identity verification documents are required." },
    { id: 8, question: "How long does the verification process take?", answer: "Verification is completed within 1 to 2 hours of document submission." },
    { id: 9, question: "How do I know that I successfully passed verification?", answer: "A green Verified badge will appear on your profile once completed." },
  ];
  const STAT_COLORS: Record<string, string> = { pending: "bg-yellow-500", completed: "bg-green-500", approved: "bg-green-500", failed: "text-[#ff5d52]", rejected: "text-[#ff5d52]", waiting: "text-yellow-400" };
  const STAT_LABELS: Record<string, string> = { pending: "Waiting confirmation", completed: "Completed", approved: "Completed", failed: "Failed", rejected: "Failed", waiting: "Waiting confirmation" };

  return (
    <div className="space-y-8 p-1 sm:p-3 text-white max-w-[1280px]">
      {/* ── Desktop 2-column layout / Mobile 1-column layout ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Left Column: Account & Withdrawal Form */}
        <div className="space-y-8 lg:col-span-6 xl:col-span-5">
          {/* Account Section */}
          <div className="space-y-3">
            <h3 className="text-[14px] font-black text-white">Account:</h3>
            <div className="space-y-3 pt-1 border-b border-white/10 pb-5">
              <div>
                <p className="text-[12px] font-bold text-[#8d99ae]">In the account:</p>
                <p className="mt-0.5 text-[22px] font-black text-white">{liveBalance.toFixed(2)} $</p>
              </div>
              <div>
                <p className="text-[12px] font-bold text-[#8d99ae]">Available for withdrawal:</p>
                <p className="mt-0.5 text-[22px] font-black text-white">{liveBalance.toFixed(2)} $</p>
              </div>
            </div>
          </div>

          {/* Withdrawal Form */}
          <form onSubmit={handleConfirmWithdrawal} className="space-y-5">
            <h3 className="text-[14px] font-black text-white">Withdrawal:</h3>

            {/* Row 1: Amount & Payment method side-by-side */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FLabel label="Amount">
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min={10}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-11 w-full rounded-[4px] border border-[#323d53] bg-[#1d2535] px-4 pr-14 text-sm font-bold text-white outline-none focus:border-[#0084FF] transition-colors"
                  />
                  <span className="absolute right-3 text-xs font-bold text-[#6c7a91]">USD</span>
                </div>
              </FLabel>

              <FLabel label="Payment method">
                <div className="relative">
                  <select
                    value={selectedMethodId}
                    onChange={(e) => setSelectedMethodId(e.target.value)}
                    className={inputCls + " appearance-none pr-10"}
                  >
                    {eligibleMethods.map((m) => (
                      <option key={m.id} value={m.id} className="bg-[#1d2535] text-white">
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-white/50" />
                </div>
              </FLabel>
            </div>

            {/* Method-specific inputs */}
            {selectedEligibleMethod?.methodType === "mpesa" ? (
              <div className="space-y-4">
                <FLabel label="First name">
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
                </FLabel>
                <FLabel label="Last name">
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
                </FLabel>
                <FLabel label="Bank">
                  <div className="relative">
                    <select value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputCls + " appearance-none pr-10"}>
                      <option value="SAFARICOM" className="bg-[#1d2535] text-white">SAFARICOM</option>
                      <option value="AIRTEL" className="bg-[#1d2535] text-white">AIRTEL</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-white/50" />
                  </div>
                </FLabel>
                <FLabel label="Phone">
                  <div className="relative">
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="254719320764" className={inputCls + " pr-10"} />
                    <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-white/50" />
                  </div>
                </FLabel>
              </div>
            ) : (
              <div className="space-y-4">
                <FLabel label="Wallet address">
                  <input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="Enter wallet address" className={inputCls} />
                </FLabel>
                <FLabel label="Memo (optional)">
                  <input type="text" value={cryptoMemo} onChange={(e) => setCryptoMemo(e.target.value)} placeholder="Destination memo / tag if required" className={inputCls} />
                </FLabel>
              </div>
            )}

            {/* Compact Confirm Button matching Quotex Image 2 */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex h-10 w-full sm:w-[150px] items-center justify-between rounded-[6px] bg-[#0084FF] px-4 text-sm font-bold text-white shadow-md transition-all hover:bg-[#0070df] active:scale-[0.99] disabled:opacity-50"
              >
                <span>{loading ? "Confirming..." : "Confirm"}</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white">
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: FAQ Section matching Reference Image 2 */}
        <div className="space-y-4 lg:col-span-6 xl:col-span-7">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-black text-white">FAQ:</h3>
            <button
              type="button"
              onClick={() => window.open("/help", "_blank")}
              className="flex items-center gap-1.5 text-[12px] font-bold text-[#0084FF] hover:underline"
            >
              Check out full FAQ
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0084FF] text-white">
                <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 text-[12.5px]">
            {allFaqs.map((item) => (
              <div key={item.id} className="border-b border-white/5 pb-2">
                <button
                  type="button"
                  onClick={() => setExpandedFaq(expandedFaq === item.id ? null : item.id)}
                  className="flex w-full items-start gap-2 text-left font-bold text-white/85 hover:text-white transition-colors"
                >
                  <ChevronDown
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-white/50 transition-transform ${expandedFaq === item.id ? "rotate-180" : ""}`}
                  />
                  <span>{item.question}</span>
                </button>
                {expandedFaq === item.id && (
                  <p className="mt-2 pl-5 text-[11.5px] font-normal leading-relaxed text-white/60">{item.answer}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Latest Requests Table matching Reference Image 2 */}
      <div className="border-t border-dashed border-white/15 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-black text-white">Some of your latest requests:</h3>
          <span className="flex items-center gap-1 cursor-pointer text-[12px] font-bold text-[#0084FF] hover:underline">
            All financial history
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0084FF] text-white">
              <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
            </span>
          </span>
        </div>

        <div className="space-y-2">
          {userWithdrawals.length === 0 ? (
            <p className="py-2 text-[12px] font-bold text-white/40">No withdrawal requests yet.</p>
          ) : (
            userWithdrawals.slice(0, 10).map((w, i) => {
              const status = (w.status || "pending").toLowerCase();
              const statusText = STAT_LABELS[status] ?? status;
              const isFailed = status === "failed" || status === "rejected";
              const isCompleted = status === "completed" || status === "approved";

              return (
                <div
                  key={w.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between py-2.5 ${
                    i < userWithdrawals.length - 1 ? "border-b border-white/10" : ""
                  } text-[12.5px] gap-2 font-bold`}
                >
                  <div className="flex items-center gap-4 sm:gap-8 min-w-0">
                    <span className="font-mono text-white/80 shrink-0">{String(w.id).slice(-9)}</span>
                    <span className="text-white/45 shrink-0">{formatDate(w.created_at)}</span>
                    <span
                      className={`flex items-center gap-1.5 shrink-0 ${
                        isFailed ? "text-red-400" : isCompleted ? "text-emerald-400" : "text-yellow-400"
                      }`}
                    >
                      <span className="text-[11px]">{isFailed ? "✕" : isCompleted ? "✓" : "⟳"}</span>
                      {statusText}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                    <span className="text-white/60">{w.method ?? "M-pesa"}</span>
                    <span className="font-mono text-[#00c853]">+{Number(w.amount ?? 0).toFixed(2)} $</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
