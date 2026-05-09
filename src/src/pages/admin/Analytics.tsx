import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  PieChart as PieChartIcon,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { normalizeAssetCategory } from "@/lib/assets";

type TradeRow = Pick<Tables<"trades">, "amount" | "asset_symbol" | "closed_at" | "direction" | "profit" | "status">;

const CATEGORY_COLORS: Record<string, string> = {
  TRADING: "#00C076",
  CRYPTO: "#F7931A",
  STOCKS: "#3B82F6",
  COMMODITIES: "#FFD700",
};

const formatMoney = (value: number) =>
  `$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatSignedMoney = (value: number) => `${value > 0 ? "+" : value < 0 ? "-" : ""}${formatMoney(value)}`;

const startOfDay = (date = new Date()) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const startOfYear = (date = new Date()) => new Date(date.getFullYear(), 0, 1);

const sumPlatformProfit = (trades: TradeRow[]) => trades.reduce((sum, trade) => sum - Number(trade.profit ?? 0), 0);

const sumTradeVolume = (trades: TradeRow[]) => trades.reduce((sum, trade) => sum + Number(trade.amount ?? 0), 0);

const stdDev = (values: number[]) => {
  if (values.length <= 1) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
};

const getRangeStart = (range: string) => {
  const now = new Date();
  const next = new Date(now);

  if (range === "7D") {
    next.setDate(now.getDate() - 6);
    return startOfDay(next);
  }

  if (range === "30D") {
    next.setDate(now.getDate() - 29);
    return startOfDay(next);
  }

  if (range === "3M") {
    next.setMonth(now.getMonth() - 3);
    return startOfDay(next);
  }

  if (range === "1Y") {
    next.setFullYear(now.getFullYear() - 1);
    return startOfDay(next);
  }

  return null;
};

const toDayKey = (value: string) => new Date(value).toISOString().slice(0, 10);

const Analytics = () => {
  const [timeRange, setTimeRange] = useState("30D");
  const [loading, setLoading] = useState(true);
  const [closedTrades, setClosedTrades] = useState<TradeRow[]>([]);

  useEffect(() => {
    const fetchTrades = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("trades")
        .select("amount, asset_symbol, closed_at, direction, profit, status")
        .neq("status", "open")
        .not("closed_at", "is", null)
        .order("closed_at", { ascending: true })
        .limit(5000);

      if (error) {
        console.error("Failed to load analytics trades", error);
        setClosedTrades([]);
      } else {
        setClosedTrades(data ?? []);
      }

      setLoading(false);
    };

    void fetchTrades();
  }, []);

  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 6);
  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(todayStart);
  monthStart.setDate(todayStart.getDate() - 29);
  const previousMonthStart = new Date(monthStart);
  previousMonthStart.setDate(monthStart.getDate() - 30);
  const yearStart = startOfYear(now);
  const previousYearStart = startOfYear(new Date(now.getFullYear() - 1, 0, 1));
  const previousYearEnd = new Date(previousYearStart);
  previousYearEnd.setFullYear(previousYearEnd.getFullYear() + 1);

  const tradesInRange = (from: Date | null, to?: Date) =>
    closedTrades.filter((trade) => {
      const closedAt = new Date(trade.closed_at as string);
      if (from && closedAt < from) return false;
      if (to && closedAt >= to) return false;
      return true;
    });

  const todayTrades = tradesInRange(todayStart);
  const yesterdayTrades = tradesInRange(yesterdayStart, todayStart);
  const thisWeekTrades = tradesInRange(weekStart);
  const previousWeekTrades = tradesInRange(previousWeekStart, weekStart);
  const thisMonthTrades = tradesInRange(monthStart);
  const previousMonthTrades = tradesInRange(previousMonthStart, monthStart);
  const ytdTrades = tradesInRange(yearStart);
  const previousYearTrades = tradesInRange(previousYearStart, previousYearEnd);

  const filteredTrades = useMemo(() => {
    const cutoff = getRangeStart(timeRange);
    return cutoff ? tradesInRange(cutoff) : closedTrades;
  }, [closedTrades, timeRange]);

  const dailyProfitData = useMemo(() => {
    const grouped = new Map<string, { date: string; profit: number; volume: number }>();

    filteredTrades.forEach((trade) => {
      const key = toDayKey(trade.closed_at as string);
      const current = grouped.get(key) ?? { date: key, profit: 0, volume: 0 };
      current.profit += -Number(trade.profit ?? 0);
      current.volume += Number(trade.amount ?? 0);
      grouped.set(key, current);
    });

    return Array.from(grouped.values()).map((entry) => ({
      ...entry,
      label: new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }));
  }, [filteredTrades]);

  const assetVolumeData = useMemo(() => {
    const grouped = new Map<string, number>();

    filteredTrades.forEach((trade) => {
      const category = normalizeAssetCategory(undefined, trade.asset_symbol);
      grouped.set(category, (grouped.get(category) ?? 0) + Number(trade.amount ?? 0));
    });

    return Array.from(grouped.entries())
      .map(([name, value]) => ({
        name,
        value,
        color: CATEGORY_COLORS[name] ?? "#94A3B8",
      }))
      .sort((left, right) => right.value - left.value);
  }, [filteredTrades]);

  const directionCounts = useMemo(() => {
    const calls = filteredTrades.filter((trade) => trade.direction === "higher").length;
    const puts = filteredTrades.filter((trade) => trade.direction !== "higher").length;
    const total = calls + puts;
    return {
      calls,
      puts,
      callsPct: total > 0 ? Math.round((calls / total) * 100) : 0,
      putsPct: total > 0 ? Math.round((puts / total) * 100) : 0,
    };
  }, [filteredTrades]);

  const advancedMetrics = useMemo(() => {
    const totalTrades = filteredTrades.length;
    const userLossRate = totalTrades > 0 ? (filteredTrades.filter((trade) => trade.status === "lost").length / totalTrades) * 100 : 0;
    const averageTradeAmount = totalTrades > 0 ? sumTradeVolume(filteredTrades) / totalTrades : 0;
    const dailyVolatility = stdDev(dailyProfitData.map((entry) => entry.profit));

    return {
      userLossRate,
      averageTradeAmount,
      dailyVolatility,
    };
  }, [dailyProfitData, filteredTrades]);

  const kpiCards = [
    {
      label: "Today's Platform P&L",
      value: formatSignedMoney(sumPlatformProfit(todayTrades)),
      change: formatSignedMoney(sumPlatformProfit(todayTrades) - sumPlatformProfit(yesterdayTrades)),
      trend: sumPlatformProfit(todayTrades) >= sumPlatformProfit(yesterdayTrades) ? "up" : "down",
    },
    {
      label: "This Week",
      value: formatSignedMoney(sumPlatformProfit(thisWeekTrades)),
      change: formatSignedMoney(sumPlatformProfit(thisWeekTrades) - sumPlatformProfit(previousWeekTrades)),
      trend: sumPlatformProfit(thisWeekTrades) >= sumPlatformProfit(previousWeekTrades) ? "up" : "down",
    },
    {
      label: "This Month",
      value: formatSignedMoney(sumPlatformProfit(thisMonthTrades)),
      change: formatSignedMoney(sumPlatformProfit(thisMonthTrades) - sumPlatformProfit(previousMonthTrades)),
      trend: sumPlatformProfit(thisMonthTrades) >= sumPlatformProfit(previousMonthTrades) ? "up" : "down",
    },
    {
      label: "YTD Platform P&L",
      value: formatSignedMoney(sumPlatformProfit(ytdTrades)),
      change: formatSignedMoney(sumPlatformProfit(ytdTrades) - sumPlatformProfit(previousYearTrades)),
      trend: sumPlatformProfit(ytdTrades) >= sumPlatformProfit(previousYearTrades) ? "up" : "down",
    },
  ];

  const emptyRange = !loading && filteredTrades.length === 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Platform Profit Analytics</h2>
          <p className="mt-1 text-sm text-slate-300">Closed-trade performance, trade mix, and platform-side profitability.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[#1e2330] bg-[#1e2330] p-1">
          {["7D", "30D", "3M", "1Y", "ALL"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                timeRange === range ? "bg-[#0fa053] text-white shadow" : "text-slate-300 hover:bg-[#1e2330] hover:text-white"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-[#1e2330] bg-[#1e2330] p-6 shadow-lg">
            <p className="text-sm font-medium text-slate-300">{kpi.label}</p>
            <h3 className="mt-1 text-3xl font-bold text-white">{loading ? "..." : kpi.value}</h3>
            <div className="mt-4 flex items-center gap-1.5">
              {kpi.trend === "up" ? <ArrowUpRight size={16} className="text-green-400" /> : <ArrowDownRight size={16} className="text-red-400" />}
              <span className={`text-sm font-medium ${kpi.trend === "up" ? "text-green-400" : "text-red-400"}`}>
                {loading ? "Loading..." : `${kpi.change} vs previous period`}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <MetricsCard
          title="User Loss Rate"
          value={loading ? "..." : `${advancedMetrics.userLossRate.toFixed(1)}%`}
          icon={<Target size={20} />}
          subtitle="Share of closed trades that ended out-of-the-money for traders."
        />
        <MetricsCard
          title="Average Trade Amount"
          value={loading ? "..." : formatMoney(advancedMetrics.averageTradeAmount)}
          icon={<DollarSign size={20} />}
          subtitle="Average stake size across the selected time range."
        />
        <MetricsCard
          title="Daily Profit Volatility"
          value={loading ? "..." : `±${formatMoney(advancedMetrics.dailyVolatility)}`}
          icon={<Activity size={20} />}
          subtitle="Standard deviation of daily platform profit in the selected period."
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex h-[400px] flex-col rounded-2xl border border-[#1e2330] bg-[#1e2330] p-6 shadow-lg lg:col-span-2">
          <h3 className="mb-6 text-lg font-bold text-white">Daily Platform Profit</h3>
          <div className="flex-1">
            {emptyRange ? (
              <EmptyPanel message="No closed trades are available in the selected range." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyProfitData}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="label" stroke="#8A939F" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8A939F" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#1e2330", border: "1px solid #ffffff10", borderRadius: "8px", color: "#fff" }}
                    formatter={(value: number) => [formatSignedMoney(value), "Platform P&L"]}
                  />
                  <Area type="monotone" dataKey="profit" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="flex h-[400px] flex-col rounded-2xl border border-[#1e2330] bg-[#1e2330] p-6 shadow-lg">
          <h3 className="mb-2 text-lg font-bold text-white">Trade Volume by Asset Class</h3>
          <p className="mb-4 text-xs text-slate-400">Volume contribution within the selected range.</p>
          <div className="relative flex flex-1 items-center justify-center">
            {emptyRange || assetVolumeData.length === 0 ? (
              <EmptyPanel message="No asset-class volume data is available for this range." compact />
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={assetVolumeData} innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                      {assetVolumeData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#1e2330", border: "none", borderRadius: "8px", color: "#fff" }}
                      formatter={(value: number) => [formatMoney(value), "Volume"]}
                    />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "12px", color: "#8A939F" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
                  <span className="text-xs text-slate-300">Selected</span>
                  <span className="text-lg font-bold text-white">{formatMoney(sumTradeVolume(filteredTrades))}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex h-[350px] flex-col rounded-2xl border border-[#1e2330] bg-[#1e2330] p-6 shadow-lg">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
            <Activity className="h-5 w-5 text-[#8fb0cf]" />
            Trading Volume
          </h3>
          <div className="flex-1">
            {emptyRange ? (
              <EmptyPanel message="No trading volume is available for this range." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyProfitData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="label" stroke="#8A939F" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8A939F" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                  <RechartsTooltip
                    cursor={{ fill: "#ffffff05" }}
                    contentStyle={{ backgroundColor: "#1e2330", border: "1px solid #ffffff10", borderRadius: "8px", color: "#fff" }}
                    formatter={(value: number) => [formatMoney(value), "Volume"]}
                  />
                  <Bar dataKey="volume" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="flex h-[350px] flex-col rounded-2xl border border-[#1e2330] bg-[#1e2330] p-6 shadow-lg">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
            <PieChartIcon className="h-5 w-5 text-[#0fa053]" />
            Trade Direction Bias
          </h3>
          {emptyRange ? (
            <EmptyPanel message="No trade direction data is available for this range." />
          ) : (
            <div className="flex flex-1 items-center justify-center p-4">
              <div className="w-full max-w-sm space-y-6">
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="flex items-center gap-1 font-bold text-green-400">
                      <TrendingUp size={16} />
                      Calls (Higher)
                    </span>
                    <span className="font-bold text-white">{directionCounts.callsPct}%</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-[#1e2330]">
                    <div className="h-full rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" style={{ width: `${directionCounts.callsPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="flex items-center gap-1 font-bold text-red-400">
                      <TrendingDown size={16} />
                      Puts (Lower)
                    </span>
                    <span className="font-bold text-white">{directionCounts.putsPct}%</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-[#1e2330]">
                    <div className="h-full rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" style={{ width: `${directionCounts.putsPct}%` }} />
                  </div>
                </div>

                <div className="mt-8 rounded-xl border border-[#0fa053]/20 bg-[#0fa053]/10 p-4">
                  <p className="text-sm text-[#d8f6e5]">
                    <strong>Insight:</strong>{" "}
                    {directionCounts.calls === directionCounts.puts
                      ? "Trader direction is evenly split across higher and lower positions in this range."
                      : directionCounts.calls > directionCounts.puts
                        ? "Higher-side positioning is dominating the selected trade set."
                        : "Lower-side positioning is dominating the selected trade set."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MetricsCard = ({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  subtitle?: string;
}) => (
  <div className="relative overflow-hidden rounded-2xl border border-[#1e2330] bg-[#1e2330] p-5 shadow-lg">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-300">{title}</p>
        <h3 className="mt-1 text-2xl font-bold text-white">{value}</h3>
      </div>
      <div className="rounded-xl border border-[#1e2330] bg-[#1e2330] p-2.5 text-[#0fa053]">{icon}</div>
    </div>
    {subtitle && <p className="mt-3 text-xs text-slate-400">{subtitle}</p>}
  </div>
);

const EmptyPanel = ({ message, compact = false }: { message: string; compact?: boolean }) => (
  <div className={`flex h-full items-center justify-center rounded-xl border border-dashed border-[#1e2330] text-center text-sm text-slate-400 ${compact ? "p-4" : "p-6"}`}>
    {message}
  </div>
);

export default Analytics;



