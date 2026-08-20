import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
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
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
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
import type { AccountTab } from "./AccountGridOverlay";
import type { AnalyticsSignalAsset } from "./analytics/AnalyticsSignals";

type AnalyticsRange = "3 days" | "Week" | "Month" | "Year" | "All";
type AnalyticsAccountScope = "live" | "demo";
export type AnalyticsAccountTab = "Withdrawal" | "Payments" | "Trades" | "My account" | "Market" | "Tournaments" | "Analytics";

interface AnalyticsGridOverlayProps {
  onClose?: () => void;
  activeAsset?: AnalyticsSignalAsset;
  initialTab?: AnalyticsAccountTab;
  onNavigate?: (target: { workspace?: "account" | "tournaments" | "leaderboard" | "more"; accountTab?: AccountTab; route?: "withdraw" }) => void;
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
  { label: "Spanish", code: "es" },
  { label: "French", code: "fr" },
  { label: "Portuguese", code: "pt" },
  { label: "Arabic", code: "ar" },
  { label: "Hindi", code: "hi" },
];
const TIMEZONE_OPTIONS = ["(UTC+03:00)", "(UTC+00:00)", "(UTC+01:00)", "(UTC-05:00)", "(UTC+05:30)", "(UTC+08:00)"];

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
    if (tab === "Withdrawal") return onNavigate?.({ route: "withdraw" }) ?? onClose?.();
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
        <div className="mb-6 flex w-fit max-w-full flex-wrap items-center gap-4 rounded-[6px] bg-[#2a3040] px-3 py-2">
          {ACCOUNT_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabClick(tab)}
              className={`rounded-[6px] px-4 py-3 text-[14px] font-black transition-colors xl:px-5 ${
                tab === activeTab ? "bg-[#4a5061] text-white" : "text-white hover:bg-white/5"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Analytics" && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            {profileSummary}
            {rangeSelector}
          </div>
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
  const [cardFormOpen, setCardFormOpen] = useState(false);
  const [cardLast4, setCardLast4] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [cards, setCards] = useState<StoredVerificationCard[]>(() => loadStoredJson(cardsKey, []));
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

  useEffect(() => {
    setForm(mergeProfileDetails(profile as any, user));
  }, [profile, user]);

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

  const handleSaveVerification = async () => {
    if (!idType.trim() || !idNumber.trim()) {
      setVerificationStatus("Select your ID type and enter your ID number first.");
      return;
    }
    setVerificationSaving(true);
    setVerificationStatus(null);
    try {
      await updateProfile({ idType: idType.trim(), idNumber: idNumber.trim() });
      setVerificationStatus("ID details saved. Upload the front and back of your document to complete verification.");
    } catch (error: any) {
      setVerificationStatus(error?.message || "Could not save ID details.");
    } finally {
      setVerificationSaving(false);
    }
  };

  const handleDocumentUpload = async (slot: "front" | "back", file: File) => {
    if (!user) return;
    if (!["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      toast.error("Upload a PDF, PNG, JPG, or WEBP document.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Documents must be 10MB or smaller.");
      return;
    }
    setIsUploadingDoc(slot);
    try {
      const extension = file.name.split(".").pop() || "bin";
      const path = `kyc/${user.id}/${slot}_${Date.now()}.${extension}`;
      const result = await cloudinaryClient.upload(file, "kyc");
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
      toast.success(`${slot === "front" ? "Front" : "Back"} document uploaded successfully.`);
      setVerificationStatus("Documents uploaded. They are now waiting for admin review.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to upload document.");
    } finally {
      setIsUploadingDoc(null);
    }
  };

  const handleDocumentRemove = async (slot: "front" | "back") => {
    const nextDocuments = { ...documents, [slot]: null };
    try {
      await persistKycDocuments(nextDocuments);
      toast.success(`${slot === "front" ? "Front" : "Back"} document removed.`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove document.");
    }
  };

  return (
    <section className="rounded-[6px] bg-[#202633] px-5 py-5 text-white shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
      <div className="mb-5 flex flex-wrap items-center justify-end gap-8 border-b border-white/10 pb-4 text-right">
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
        <div className="border-white/10 xl:border-r xl:pr-7">
          <h2 className="mb-5 text-[18px] font-black text-white">Personal data:</h2>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="group relative flex h-[98px] w-[98px] shrink-0 items-end justify-center overflow-hidden rounded-full bg-black shadow-[inset_0_0_0_8px_rgba(33,45,68,0.9)]" aria-label="Change profile photo">
              <span className="relative flex h-full w-full items-end justify-center overflow-hidden rounded-full">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName || email || "Profile"} className="h-full w-full object-cover" />
                ) : (
                  <>
                    <span className="mb-2 h-10 w-14 rounded-t-full bg-[#0d86f7]" />
                    <span className="absolute top-5 h-10 w-10 rounded-full bg-[#0d86f7]" />
                  </>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-5 w-5 text-white" />
                </span>
              </span>
              <span className="absolute right-0 top-0 rounded-full bg-[#4a5061] p-1 text-white/80">
                <Camera className="h-4 w-4" />
              </span>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-[13px] font-bold text-white/65">{email || "Account email unavailable"}</p>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${emailVerified ? "bg-emerald-500/15 text-emerald-300" : "bg-[#0fa053]/15 text-[#d8f6e5]"}`}>
                  {emailVerified ? "Verified" : "Unverified"}
                </span>
              </div>
              <p className="mt-2 text-[18px] font-black text-white">{displayName || "Your account"}</p>
              <p className="mt-1 text-[14px] font-bold text-white/75">ID: {visible ? displayId : "********"}</p>
              <span className={`mt-3 inline-flex rounded-[8px] px-3 py-1 text-[12px] font-bold ${emailVerified ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-300"}`}>
                {emailVerified ? "Verified" : "Not verified"}
              </span>
              <p className="mt-2 text-[12px] font-bold text-white/45">Click the photo to upload or replace your profile picture.</p>
            </div>
          </div>
          <div className="space-y-4">
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
          <div className="space-y-6">
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
                <p className="text-[15px] font-black text-white">Password</p>
              </div>
              <p className="mt-2 ml-8 text-[13px] font-bold text-[#9ba5b9]">Change your account password</p>
              <div className="mt-5 space-y-4">
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
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <ProfileDropdown label="Language" icon={<Globe2 className="h-5 w-5 text-white/45" />} value={selectedLanguageLabel} onChange={handleLanguageChange} options={LANGUAGE_OPTIONS.map((option) => option.label)} />
          <ProfileDropdown label="Timezone" value={`(${tradingPreferences.timezone})`} onChange={handleTimezoneChange} options={TIMEZONE_OPTIONS} />
          <div className="border-t border-dashed border-white/15 pt-5">
            <button type="button" onClick={() => setDeleteConfirmOpen(true)} className="inline-flex items-center gap-2 text-[13px] font-black text-[#ff5d52] hover:text-[#ff7b72]">
              <Trash2 className="h-4 w-4" />
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

      {!kycVerified && (
        <div className="mt-6 rounded-[6px] border border-[#0fa053]/25 bg-[#0fa053]/10 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-[18px] font-black text-white">
                <ShieldCheck className="h-5 w-5 text-[#0fa053]" />
                ID verification
              </h2>
              <p className="mt-1 text-[12px] font-bold text-white/50">
                Verify your identity to unlock full access to your account.
              </p>
            </div>
            <span
              className={`inline-flex rounded-[8px] px-3 py-1 text-[12px] font-black uppercase tracking-[0.08em] ${
                kycStatus === "Rejected"
                  ? "bg-red-500/15 text-red-400"
                  : documents?.front?.url || documents?.back?.url
                    ? "bg-[#0fa053]/15 text-[#8be0af]"
                    : "bg-[#ffce5c]/15 text-[#ffce5c]"
              }`}
            >
              {getProfileKycLabel(kycStatus, documents)}
            </span>
          </div>

          {kycStatus === "Rejected" && (
            <div className="mt-4 flex items-start gap-3 rounded-[6px] border border-red-500/25 bg-red-500/10 px-4 py-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
              <p className="text-[13px] font-bold leading-5 text-red-200">
                Verification needs attention. Upload clearer front and back document images, then save again.
              </p>
            </div>
          )}

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <ProfileDropdown label="ID Type" value={idType} onChange={setIdType} options={["Passport", "Driver's License", "National ID"]} />
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

          <input
            ref={frontInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleDocumentUpload("front", file);
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={backInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleDocumentUpload("back", file);
              event.currentTarget.value = "";
            }}
          />

          {verificationStatus && (
            <p className="mt-4 text-[12px] font-bold text-white/60">{verificationStatus}</p>
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

const TradeDetailModal = ({ trade, formatMoney, onClose }: { trade: Trade; formatMoney: (amount: number) => string; onClose: () => void }) => (
  <div className="fixed inset-0 z-[500] flex items-center justify-center bg-[#0d1320]/70 p-4 backdrop-blur-sm" onClick={onClose}>
    <div className="w-full max-w-[550px] rounded-[6px] bg-[#2a3040] shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between px-7 py-5">
        <div>
          <h3 className="text-[22px] font-black text-white">Trade ID</h3>
          <p className="mt-2 text-[14px] font-bold text-white/75">{trade.id}</p>
        </div>
        <button type="button" onClick={onClose} className="text-white/45 hover:text-white"><X className="h-5 w-5" /></button>
      </div>
      <div className="grid grid-cols-4 gap-4 px-7 pb-4 text-[13px]">
        <DetailItem label="Asset:" value={trade.asset} />
        <DetailItem label="Type:" value={`${trade.direction} ${formatMoney(trade.amount)}`} tone={trade.direction === "Buy" || trade.direction === "Higher" ? "up" : "down"} />
        <DetailItem label="Duration:" value={formatDuration((new Date(trade.closeTime).getTime() - new Date(trade.openTime).getTime()) / 1000)} />
        <DetailItem label="Result:" value={formatMoney(Math.abs(trade.profit))} tone={trade.profit > 0 ? "up" : "down"} />
      </div>
      <MiniTradeChart won={trade.profit > 0} />
      <div className="grid grid-cols-3 gap-5 px-7 py-7 text-[13px]">
        <DetailItem label="Opening quote:" value={estimateOpeningQuote(trade)} />
        <DetailItem label="Closing quote:" value={estimateClosingQuote(trade)} />
        <DetailItem label="Difference:" value={`${Math.abs(Number(estimateClosingQuote(trade)) - Number(estimateOpeningQuote(trade))).toFixed(3)} points`} />
      </div>
    </div>
  </div>
);

const DetailItem = ({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) => (
  <div>
    <p className="text-[12px] font-bold text-white/45">{label}</p>
    <p className={`mt-1 font-black ${tone === "up" ? "text-[#00c878]" : tone === "down" ? "text-[#ff5d52]" : "text-white"}`}>{value}</p>
  </div>
);

const MiniTradeChart = ({ won }: { won: boolean }) => (
  <div className="h-[190px] bg-[#24364e]">
    <svg viewBox="0 0 550 190" className="h-full w-full">
      {Array.from({ length: 8 }).map((_, index) => <line key={`v-${index}`} x1={index * 80} x2={index * 80} y1="0" y2="190" stroke="#526079" strokeOpacity="0.28" />)}
      {Array.from({ length: 5 }).map((_, index) => <line key={`h-${index}`} x1="0" x2="550" y1={index * 45 + 8} y2={index * 45 + 8} stroke="#526079" strokeOpacity="0.28" />)}
      <path d={won ? "M0 150 L45 135 L85 112 L130 95 L175 72 L230 63 L285 70 L330 96 L380 82 L430 68 L485 54 L550 42" : "M0 80 L50 92 L100 110 L160 120 L220 132 L300 124 L370 145 L440 152 L500 165 L550 171"} fill="none" stroke="#279bff" strokeWidth="3" />
      <path d={won ? "M0 150 L45 135 L85 112 L130 95 L175 72 L230 63 L285 70 L330 96 L380 82 L430 68 L485 54 L550 42 L550 190 L0 190 Z" : "M0 80 L50 92 L100 110 L160 120 L220 132 L300 124 L370 145 L440 152 L500 165 L550 171 L550 190 L0 190 Z"} fill="#279bff" opacity="0.14" />
      <line x1="0" x2="550" y1="112" y2="112" stroke="#ff5d52" strokeWidth="2" />
    </svg>
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
      <div className="h-[48px] w-[48px] rounded-full bg-[#2a3040]" />
      {items.slice(0, 3).map((item, index) => (
        <span
          key={item.asset}
          className="absolute text-[11px] font-bold text-white"
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

type ChartPoint = { label: string; value: number };

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
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const ticks = showGrid ? [100, 75, 50, 25, 0] : [0];

  return (
    <div className="px-7 py-7" style={{ minHeight: height }}>
      <svg viewBox={`0 0 ${width} ${chartHeight}`} className="h-full min-h-[230px] w-full overflow-visible">
        {ticks.map((tick) => {
          const y = 40 + (1 - (tick - min) / range) * (chartHeight - 70);
          return (
            <g key={tick}>
              <text x="0" y={y + 5} fill="#ffffff" opacity="0.9" fontSize="13" fontWeight="700">{tick}</text>
              <line x1="40" x2={width - 20} y1={y} y2={y} stroke="#5a6275" strokeOpacity={showGrid ? 0.45 : 0.18} />
            </g>
          );
        })}
        <path d={path} fill="none" stroke="#13a66a" strokeWidth="2.5" />
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
        {document?.url ? "Uploaded" : "Needed"}
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
