import { useMemo, useState } from "react";
import { ChevronDown, Eye, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useStatistics, type Trade } from "@/hooks/useStatistics";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import type { AccountTab } from "./AccountGridOverlay";
import type { AnalyticsSignalAsset } from "./analytics/AnalyticsSignals";

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

export const AnalyticsGridOverlay = ({ onClose, onNavigate }: AnalyticsGridOverlayProps) => {
  const { profile, user } = useAuth();
  const { formatMoney } = useCurrency();
  const { trades, assetPerformance } = useStatistics();
  const [range, setRange] = useState<AnalyticsRange>("Month");
  const [rangeOpen, setRangeOpen] = useState(false);

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
    if (tab === "Analytics") return;
    if (tab === "Withdrawal") return onNavigate?.({ route: "withdraw" }) ?? onClose?.();
    if (tab === "Payments") return onNavigate?.({ workspace: "account", accountTab: "balance_history" }) ?? onClose?.();
    if (tab === "Trades") return onNavigate?.({ workspace: "account", accountTab: "trading_history" }) ?? onClose?.();
    if (tab === "My account") return onNavigate?.({ workspace: "account", accountTab: "personal" }) ?? onClose?.();
    if (tab === "Market") return onNavigate?.({ workspace: "leaderboard" }) ?? onClose?.();
    if (tab === "Tournaments") return onNavigate?.({ workspace: "tournaments" }) ?? onClose?.();
  };

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
                tab === "Analytics" ? "bg-[#4a5061] text-white" : "text-white hover:bg-white/5"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

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
            <ProfileMetric label="In the account" value={formatMoney(liveBalance)} />
            <ProfileMetric label="In the demo" value={formatMoney(demoBalance)} />
            <button type="button" className="flex h-12 w-20 items-center justify-center rounded-[6px] bg-[#2d3446] text-white">
              <Eye className="h-5 w-5" />
            </button>
          </div>

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
      </div>
    </div>
  );
};

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
