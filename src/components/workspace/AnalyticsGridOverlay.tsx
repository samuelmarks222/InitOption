import { useMemo, useState } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Eye, Image, Send, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useStatistics, type Trade, type Transaction } from "@/hooks/useStatistics";
import { useTrading, type ActiveTrade } from "@/hooks/useTrading";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import type { AccountTab } from "./AccountGridOverlay";
import type { AnalyticsSignalAsset } from "./analytics/AnalyticsSignals";
import { ProfilePersonalData } from "../profile/ProfilePersonalData";

type AnalyticsRange = "Day" | "Week" | "Month" | "All";
export type AnalyticsAccountTab = "Withdrawal" | "Payments" | "Trades" | "My account" | "Market" | "Tournaments" | "Analytics";

interface AnalyticsGridOverlayProps {
  onClose?: () => void;
  activeAsset?: AnalyticsSignalAsset;
  onNavigate?: (target: { workspace?: "account" | "tournaments" | "leaderboard" | "more"; accountTab?: AccountTab; route?: "withdraw" }) => void;
}

const RANGE_OPTIONS: AnalyticsRange[] = ["Day", "Week", "Month", "All"];
const ACCOUNT_TABS: AnalyticsAccountTab[] = ["Withdrawal", "Payments", "Trades", "My account", "Market", "Tournaments", "Analytics"];
const PIE_COLORS = ["#08c66b", "#1d96f2", "#ff5b58", "#bb0039", "#ff950f"];
const PAGE_SIZE = 10;

const rangeStart = (range: AnalyticsRange) => {
  const now = Date.now();
  if (range === "Day") return now - 24 * 60 * 60 * 1000;
  if (range === "Week") return now - 7 * 24 * 60 * 60 * 1000;
  if (range === "Month") return now - 31 * 24 * 60 * 60 * 1000;
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

export const AnalyticsGridOverlay = ({ onClose, onNavigate }: AnalyticsGridOverlayProps) => {
  const { profile, user } = useAuth();
  const { formatMoney } = useCurrency();
  const { trades, transactions, assetPerformance } = useStatistics();
  const { activeTrades } = useTrading();
  const [activeTab, setActiveTab] = useState<AnalyticsAccountTab>("Analytics");
  const [tradeMode, setTradeMode] = useState<"history" | "pending">("history");
  const [range, setRange] = useState<AnalyticsRange>("Month");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [tradesPage, setTradesPage] = useState(1);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  const filteredTrades = useMemo(() => {
    const start = rangeStart(range);
    return trades.filter((trade) => new Date(trade.closeTime || trade.openTime).getTime() >= start);
  }, [range, trades]);

  const stats = useMemo(() => buildAnalyticsStats(filteredTrades), [filteredTrades]);
  const profitSeries = useMemo(() => buildProfitSeries(filteredTrades, range), [filteredTrades, range]);
  const profitableSeries = useMemo(() => buildProfitableSeries(filteredTrades, range), [filteredTrades, range]);
  const filteredAssets = useMemo(() => buildAssetBreakdown(filteredTrades, assetPerformance), [assetPerformance, filteredTrades]);
  const liveBalance = getEffectiveLiveBalance(profile);
  const demoBalance = getDemoBalance(profile);
  const email = user?.email ?? profile?.email ?? "trader@example.com";
  const displayId = (profile?.id ?? user?.id ?? "84560898").replace(/\D/g, "").slice(0, 8) || "84560898";
  const location = profile?.country ?? profile?.nationality ?? "Kenya";
  const handleTabClick = (tab: AnalyticsAccountTab) => {
    if (tab === "Withdrawal") return onNavigate?.({ route: "withdraw" }) ?? onClose?.();
    if (tab === "Tournaments") return onNavigate?.({ workspace: "tournaments" }) ?? onClose?.();
    setActiveTab(tab);
    setPaymentsPage(1);
    setTradesPage(1);
  };
  const pagedTransactions = paginate(transactions, paymentsPage, PAGE_SIZE);
  const pagedTrades = paginate(tradeMode === "history" ? trades : activeTrades, tradesPage, PAGE_SIZE);

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

        {(activeTab === "Analytics" || activeTab === "My account") && <ProfileSummary email={email} displayId={displayId} location={location} liveBalance={formatMoney(liveBalance)} demoBalance={formatMoney(demoBalance)} />}

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
                <button type="button" onClick={() => exportTradesCsv(tradeMode === "history" ? trades : activeTrades, tradeMode)} className="rounded-[4px] bg-[#4a5061] px-5 py-3 text-[13px] font-black text-white">Export to</button>
                <Pagination page={tradesPage} total={tradeMode === "history" ? trades.length : activeTrades.length} onPageChange={setTradesPage} />
              </div>
            </div>
            <div className="mb-5 flex flex-wrap gap-5">
              <div className="rounded-[4px] border border-white/20 px-4 py-3">
                <p className="text-[11px] text-white/45">Date Range:</p>
                <p className="flex items-center gap-2 text-[14px] font-bold text-white"><Calendar className="h-4 w-4" /> {formatDateRange(trades)}</p>
              </div>
              <div className="rounded-[4px] border border-white/20 px-4 py-3">
                <p className="text-[11px] text-white/45">Account Type:</p>
                <p className="text-[14px] font-bold text-white">Live Account</p>
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
          <TabbedPanel>
            <ProfilePersonalData compact />
          </TabbedPanel>
        )}

        {activeTab === "Market" && (
          <TabbedPanel>
            <MarketTable assets={assetPerformance} formatMoney={formatMoney} />
          </TabbedPanel>
        )}

        {activeTab === "Analytics" && (
          <>
        <div className="mb-6 flex justify-end">
          <div className="relative">
            <button
              type="button"
              onClick={() => setRangeOpen((current) => !current)}
              className="flex h-[48px] min-w-[220px] items-center justify-between rounded-[6px] bg-[#2d3446] px-5 text-left text-[15px] font-black text-white"
            >
              {range}
              <ChevronDown className={`h-5 w-5 transition-transform ${rangeOpen ? "rotate-180" : ""}`} />
            </button>
            {rangeOpen && (
              <div className="absolute right-0 top-[64px] z-20 w-full overflow-hidden rounded-[6px] bg-[#2d3446] shadow-xl">
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setRange(option);
                      setRangeOpen(false);
                    }}
                    className={`block w-full px-5 py-3 text-left text-[14px] font-bold ${option === range ? "bg-[#4a5061] text-white" : "text-white/70 hover:bg-white/5"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

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

const ProfileSummary = ({
  email,
  displayId,
  location,
  liveBalance,
  demoBalance,
}: {
  email: string;
  displayId: string;
  location: string;
  liveBalance: string;
  demoBalance: string;
}) => (
  <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 items-end justify-center overflow-hidden rounded-full bg-black">
                <div className="mb-1 h-7 w-12 rounded-t-full bg-[#0d86f7]" />
                <div className="absolute top-3 h-8 w-8 rounded-full bg-[#0d86f7]" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-white/45">{email}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[19px] font-black text-white">ID: {displayId}</p>
                  <Send className="h-5 w-5 fill-[#39d10f] text-[#39d10f]" />
                </div>
              </div>
            </div>

            <ProfileMetric label="Location" value={location} compact />
            <ProfileMetric label="In the account" value={liveBalance} />
            <ProfileMetric label="In the demo" value={demoBalance} />
            <button type="button" className="flex h-12 w-20 items-center justify-center rounded-[6px] bg-[#2d3446] text-white">
              <Eye className="h-5 w-5" />
            </button>
          </div>
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
  <div className={`border-l border-white/15 pl-6 ${compact ? "min-w-[90px]" : "min-w-[150px]"}`}>
    <p className="text-[14px] font-bold text-white/45">{label}</p>
    <p className="mt-1.5 text-[19px] font-black text-white">{value}</p>
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

  const days = range === "Day" ? 1 : range === "Week" ? 7 : 31;
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
