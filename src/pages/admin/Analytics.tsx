import { api } from "@/integrations/api/client";
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

      const { data, error } = await api.from("trades")
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

  const BORDER = "#202B3A";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4" style={{ borderColor: BORDER }}>
        <div>
          <h2 className="text-xl font-black text-white">PLATFORM PROFIT ANALYTICS</h2>
          <p className="text-xs text-[#8D9AAF]">Closed-trade performance, trade mix, and platform-side profitability.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[#202B3A] bg-[#0D1420] p-1">
          {['7D', '30D', '3M', '1Y', 'ALL'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`rounded px-3 py-1 text-xs font-bold transition-colors ${
                timeRange === range ? "bg-[#00C98D] text-black" : "text-[#8D9AAF] hover:text-white"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
        <div className="grid grid-cols-2 divide-x divide-y divide-[#202B3A] sm:grid-cols-4 sm:divide-y-0">
          {kpiCards.map((kpi) => (
            <div key={kpi.label} className="p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">{kpi.label}</p>
              <p className="mt-0.5 text-xl font-black font-mono text-white">{loading ? "..." : kpi.value}</p>
              <div className="mt-1 flex items-center gap-1">
                {kpi.trend === "up" ? <ArrowUpRight size={12} className="text-[#00C98D]" /> : <ArrowDownRight size={12} className="text-[#EF4444]" />}
                <span className={`text-[10px] font-semibold ${kpi.trend === "up" ? "text-[#00C98D]" : "text-[#EF4444]"}`}>
                  {loading ? "..." : `${kpi.change} vs prev`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Metrics — secondary strip */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
        <div className="grid grid-cols-3 divide-x divide-[#202B3A]">
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">User Loss Rate</p>
            <p className="mt-0.5 text-xl font-black font-mono text-white">{loading ? "..." : `${advancedMetrics.userLossRate.toFixed(1)}%`}</p>
            <p className="mt-0.5 text-[10px] text-[#5E6B7D]">Share of OTM closed trades</p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Avg Trade Amount</p>
            <p className="mt-0.5 text-xl font-black font-mono text-white">{loading ? "..." : formatMoney(advancedMetrics.averageTradeAmount)}</p>
            <p className="mt-0.5 text-[10px] text-[#5E6B7D]">Average stake in selected range</p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Daily P&L Volatility</p>
            <p className="mt-0.5 text-xl font-black font-mono text-white">{loading ? "..." : `±${formatMoney(advancedMetrics.dailyVolatility)}`}</p>
            <p className="mt-0.5 text-[10px] text-[#5E6B7D]">Std dev of daily platform profit</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex h-[380px] flex-col overflow-hidden rounded-lg border bg-[#0D1420] lg:col-span-2" style={{ borderColor: BORDER }}>
          <div className="border-b bg-[#121B29] px-4 py-2.5" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Daily Platform Profit — {timeRange}</p>
          </div>
          <div className="flex-1 p-4">
            {emptyRange ? (
              <EmptyPanel message="No closed trades in selected range." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyProfitData}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00C98D" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00C98D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#202B3A" vertical={false} />
                  <XAxis dataKey="label" stroke="#5E6B7D" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#5E6B7D" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#0D1420", border: "1px solid #202B3A", borderRadius: "6px", color: "#F1F5F9", fontSize: 11 }}
                    formatter={(value: number) => [formatSignedMoney(value), "Platform P&L"]}
                  />
                  <Area type="monotone" dataKey="profit" stroke="#00C98D" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="flex h-[380px] flex-col overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
          <div className="border-b bg-[#121B29] px-4 py-2.5" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Volume by Asset Class</p>
          </div>
          <div className="relative flex flex-1 items-center justify-center p-2">
            {emptyRange || assetVolumeData.length === 0 ? (
              <EmptyPanel message="No asset-class volume data for this range." compact />
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={assetVolumeData} innerRadius={60} outerRadius={95} paddingAngle={4} dataKey="value" stroke="none">
                      {assetVolumeData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#0D1420", border: "1px solid #202B3A", borderRadius: "6px", color: "#F1F5F9", fontSize: 11 }}
                      formatter={(value: number) => [formatMoney(value), "Volume"]}
                    />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "11px", color: "#8D9AAF" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8">
                  <span className="text-[10px] text-[#5E6B7D]">Selected</span>
                  <span className="text-base font-black font-mono text-white">{formatMoney(sumTradeVolume(filteredTrades))}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Volume Bar + Direction Bias */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="flex h-[320px] flex-col overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
          <div className="border-b bg-[#121B29] px-4 py-2.5" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Trading Volume — {timeRange}</p>
          </div>
          <div className="flex-1 p-4">
            {emptyRange ? (
              <EmptyPanel message="No trading volume for this range." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyProfitData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#202B3A" vertical={false} />
                  <XAxis dataKey="label" stroke="#5E6B7D" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#5E6B7D" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                  <RechartsTooltip
                    cursor={{ fill: "#ffffff05" }}
                    contentStyle={{ backgroundColor: "#0D1420", border: "1px solid #202B3A", borderRadius: "6px", color: "#F1F5F9", fontSize: 11 }}
                    formatter={(value: number) => [formatMoney(value), "Volume"]}
                  />
                  <Bar dataKey="volume" fill="#3B82F6" radius={[3, 3, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="flex h-[320px] flex-col overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
          <div className="border-b bg-[#121B29] px-4 py-2.5" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Trade Direction Bias</p>
          </div>
          {emptyRange ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyPanel message="No direction data for this range." />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center px-8">
              <div className="w-full max-w-sm space-y-5">
                <div>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="flex items-center gap-1 font-bold text-[#00C98D]"><TrendingUp size={12} /> Calls (Higher)</span>
                    <span className="font-black font-mono text-white">{directionCounts.callsPct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#121B29]">
                    <div className="h-full rounded-full bg-[#00C98D]" style={{ width: `${directionCounts.callsPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="flex items-center gap-1 font-bold text-[#EF4444]"><TrendingDown size={12} /> Puts (Lower)</span>
                    <span className="font-black font-mono text-white">{directionCounts.putsPct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#121B29]">
                    <div className="h-full rounded-full bg-[#EF4444]" style={{ width: `${directionCounts.putsPct}%` }} />
                  </div>
                </div>
                <div className="rounded-lg border border-[#202B3A] bg-[#121B29] px-3 py-2">
                  <p className="text-[11px] text-[#8D9AAF]">
                    <span className="font-bold text-white">Insight: </span>
                    {directionCounts.calls === directionCounts.puts
                      ? "Direction evenly split."
                      : directionCounts.calls > directionCounts.puts
                        ? "Higher-side positioning dominant in this range."
                        : "Lower-side positioning dominant in this range."}
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

const EmptyPanel = ({ message, compact = false }: { message: string; compact?: boolean }) => (
  <div className={`flex h-full items-center justify-center text-center text-xs text-[#5E6B7D] ${compact ? "p-4" : "p-6"}`}>
    {message}
  </div>
);

export default Analytics;



