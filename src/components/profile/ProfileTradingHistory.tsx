import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown, PieChart as PieChartIcon, Activity, Percent, ArrowRightLeft, TrendingUp, TrendingDown, X, Maximize2, BarChart3 } from "lucide-react";
import { useStatistics, Trade } from "@/hooks/useStatistics";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { useCurrency } from "@/contexts/CurrencyContext";

const safe = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

export const ProfileTradingHistory = () => {
  const { trades, tradeStats } = useStatistics();
  const [filterAsset, setFilterAsset] = useState("all");
  const { formatMoney } = useCurrency();
  const [fullScreen, setFullScreen] = useState(false);

  const filteredTrades = trades.filter(t => filterAsset === "all" || t.asset === filterAsset);
  const uniqueAssets = Array.from(new Set(trades.map(t => t.asset)));

  const winLossData = [
    { name: "Wins", value: tradeStats.wins, color: "#10b981" },
    { name: "Losses", value: tradeStats.losses, color: "#ef4444" },
  ];

  return (
    <>
    <div className="flex h-full min-w-0 max-w-6xl flex-col text-white">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[22px] font-bold sm:text-[24px]">Trading History & Analytics</h2>
        <button
          type="button"
          onClick={() => setFullScreen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Full View
        </button>
      </div>

      {/* Top Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatBox title="Total Trades" value={tradeStats.totalTrades} icon={ArrowRightLeft} color="text-[#86c9d4]" />
        <StatBox title="Win Rate" value={`${tradeStats.winRate.toFixed(1)}%`} icon={Percent} color={tradeStats.winRate >= 50 ? "text-green-500" : "text-red-500"} />
        <StatBox title="Total Profit/Loss" value={formatMoney(Math.abs(tradeStats.totalProfit))} icon={Activity} color={tradeStats.totalProfit >= 0 ? "text-green-500" : "text-red-500"} prefix={tradeStats.totalProfit > 0 ? "+" : tradeStats.totalProfit < 0 ? "-" : ""} />
        <StatBox title="Profit Factor" value={tradeStats.profitFactor.toFixed(2)} icon={TrendingUp} color={tradeStats.profitFactor >= 1 ? "text-green-500" : "text-red-500"} />
        
        <StatBox title="Average Return" value={formatMoney(Math.abs(tradeStats.averageReturn))} icon={ArrowUp} color="text-[#86c9d4]" prefix={tradeStats.averageReturn > 0 ? "+" : tradeStats.averageReturn < 0 ? "-" : ""} />
        <StatBox title="Best Trade" value={formatMoney(tradeStats.bestTrade)} icon={ArrowUp} color="text-green-500" prefix="+" />
        <StatBox title="Worst Trade" value={formatMoney(Math.abs(tradeStats.worstTrade))} icon={ArrowDown} color="text-red-500" prefix="-" />
        <StatBox title="Wins / Losses" value={`${tradeStats.wins} / ${tradeStats.losses}`} icon={PieChartIcon} color="text-[#86c9d4]" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Win / Loss Donut Chart */}
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-[#0b2f3a] bg-[#13232d] p-5 sm:min-h-[250px] sm:p-6 lg:col-span-1">
          <h3 className="text-[14px] font-bold text-gray-300 mb-2 w-full text-left">Win / Loss Ratio</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={winLossData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {winLossData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ backgroundColor: "#13232d", borderColor: "#0b2f3a", borderRadius: "8px" }}
                itemStyle={{ color: "#fff" }}
              />
              <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "4px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown by Asset could go here in a more advanced implementation. Placeholder for layout balance */}
        <div className="overflow-hidden rounded-2xl border border-[#0b2f3a] bg-[#13232d] p-5 sm:p-6 lg:col-span-3">
           <h3 className="text-[14px] font-bold text-gray-300 mb-4">Performance Highlights</h3>
           <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex min-h-[132px] flex-col justify-center rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                <span className="text-[12px] text-green-400 font-bold uppercase mb-1">Gross Profit</span>
                <span className="text-[24px] font-bold text-white">{formatMoney(tradeStats.grossProfit)}</span>
              </div>
              <div className="flex min-h-[132px] flex-col justify-center rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <span className="text-[12px] text-red-400 font-bold uppercase mb-1">Gross Loss</span>
                <span className="text-[24px] font-bold text-white">-{formatMoney(tradeStats.grossLoss)}</span>
              </div>
              <div className="flex min-h-[132px] flex-col justify-center rounded-xl border border-[#1b4f60] bg-[#0b2f3a] p-4">
                <span className="text-[12px] text-[#86c9d4] font-bold uppercase mb-1">Trades Taken</span>
                <span className="text-[24px] font-bold text-white">{tradeStats.totalTrades}</span>
              </div>
           </div>
        </div>
      </div>

      {/* Trades List */}
      <div className="flex-1 bg-[#13232d] border border-[#0b2f3a] rounded-2xl flex flex-col overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#0b2f3a] p-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-[15px] font-bold">Trade History</h3>
          <select 
            value={filterAsset} 
            onChange={(e) => setFilterAsset(e.target.value)}
            className="w-full rounded border border-[#0b2f3a] bg-[#121f27] px-3 py-1.5 text-[12px] font-bold text-white focus:border-[#86c9d4] focus:outline-none sm:w-auto"
          >
            <option value="all">All Assets</option>
            {uniqueAssets.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        
        <div className="flex-1 overflow-auto">
          <div className="space-y-3 p-3 sm:hidden">
            {filteredTrades.map((t) => (
              <div key={t.id} className="rounded-2xl border border-[#0b2f3a] bg-[#121f27] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold text-white">{safe(t.asset)}</div>
                    <div className="mt-2">
                      <span className={`rounded-sm px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${
                         t.direction === "Buy" || t.direction === "Higher" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                       }`}>
                         {safe(t.direction)}
                       </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-[14px] font-bold ${t.profit > 0 ? "text-green-500" : "text-red-500"}`}>
                      {t.profit > 0 ? "+" : t.profit < 0 ? "-" : ""}{formatMoney(Math.abs(t.profit))}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500">Payout: {formatMoney(t.payout)}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <div className="text-gray-500">Investment</div>
                    <div className="mt-1 font-bold text-white">{formatMoney(t.amount)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Opened</div>
                    <div className="mt-1 text-gray-300">{safe(new Date(t.openTime).toLocaleString())}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:block">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-[#121f27] text-[12px] font-semibold uppercase text-gray-400 shadow-md">
                <tr>
                  <th className="px-6 py-3 border-b border-white/10">Asset</th>
                  <th className="px-6 py-3 border-b border-white/10">Direction</th>
                  <th className="px-6 py-3 border-b border-white/10 text-right">Investment</th>
                  <th className="px-6 py-3 border-b border-white/10 text-right">Result</th>
                  <th className="px-6 py-3 border-b border-white/10">Open Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map(t => (
                  <tr key={t.id} className="cursor-pointer border-b border-[#0b2f3a] transition-colors hover:bg-[#121f27]">
                    <td className="px-6 py-3 font-bold text-[14px] text-white">{safe(t.asset)}</td>
                    <td className="px-6 py-3">
                      <span className={`text-[12px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider ${
                         t.direction === "Buy" || t.direction === "Higher" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                       }`}>
                         {safe(t.direction)}
                       </span>
                    </td>
                    <td className="px-6 py-3 text-[14px] font-bold text-white text-right">{formatMoney(t.amount)}</td>
                    <td className="px-6 py-3 text-right flex flex-col items-end">
                      <span className={`text-[14px] font-bold ${t.profit > 0 ? "text-green-500" : "text-red-500"}`}>
                        {t.profit > 0 ? "+" : t.profit < 0 ? "-" : ""}{formatMoney(Math.abs(t.profit))}
                      </span>
                      <span className="text-[11px] text-gray-500">Payout: {formatMoney(t.payout)}</span>
                    </td>
                    <td className="px-6 py-3 text-[12px] text-gray-400">
                      {safe(new Date(t.openTime).toLocaleString())}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTrades.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-[14px]">
              No trades found.
            </div>
          )}
        </div>
      </div>
    </div>

      {/* ─── Full-Screen Statistics Overlay ────────────────────────────────── */}
      {fullScreen && (
        <div className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm" onClick={() => setFullScreen(false)}>
          <div className="relative mx-auto my-6 w-full max-w-[900px] rounded-2xl border border-[#0b2f3a] bg-[#0d1a22] p-6 shadow-2xl sm:p-8" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setFullScreen(false)} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-[#1a3a4a] bg-[#13232d] text-[#86c9d4] transition-colors hover:text-white">
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0fa053]/12 text-[#0fa053]">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-[22px] font-bold text-white sm:text-[26px]">Trading Statistics</h2>
                <p className="text-[13px] text-[#86c9d4]">
                  {safe(tradeStats.totalTrades)} trades · {safe(tradeStats.wins)} wins · {safe(tradeStats.losses)} losses
                </p>
              </div>
            </div>

            {/* KPI Grid */}
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KPIBox label="Total Trades" value={safe(tradeStats.totalTrades)} icon={ArrowRightLeft} color="text-[#86c9d4]" />
              <KPIBox label="Win Rate" value={`${safe(tradeStats.winRate)}%`} icon={Percent} color={tradeStats.winRate >= 50 ? "text-green-500" : "text-red-500"} />
              <KPIBox label="Total P&L" value={formatMoney(Math.abs(tradeStats.totalProfit))} icon={Activity} color={tradeStats.totalProfit >= 0 ? "text-green-500" : "text-red-500"} prefix={tradeStats.totalProfit > 0 ? "+" : tradeStats.totalProfit < 0 ? "-" : ""} />
              <KPIBox label="Profit Factor" value={safe(tradeStats.profitFactor.toFixed(2))} icon={TrendingUp} color={tradeStats.profitFactor >= 1 ? "text-green-500" : "text-red-500"} />
              <KPIBox label="Avg Return" value={formatMoney(Math.abs(tradeStats.averageReturn))} icon={ArrowUp} color="text-[#86c9d4]" prefix={tradeStats.averageReturn > 0 ? "+" : tradeStats.averageReturn < 0 ? "-" : ""} />
              <KPIBox label="Best Trade" value={formatMoney(tradeStats.bestTrade)} icon={ArrowUp} color="text-green-500" prefix="+" />
              <KPIBox label="Worst Trade" value={formatMoney(Math.abs(tradeStats.worstTrade))} icon={ArrowDown} color="text-red-500" prefix="-" />
              <KPIBox label="Wins / Losses" value={`${safe(tradeStats.wins)} / ${safe(tradeStats.losses)}`} icon={PieChartIcon} color="text-[#86c9d4]" />
              <KPIBox label="Avg Win" value={formatMoney(tradeStats.avgWin)} icon={ArrowUp} color="text-green-500" prefix="+" />
              <KPIBox label="Avg Loss" value={`-${formatMoney(Math.abs(tradeStats.avgLoss))}`} icon={ArrowDown} color="text-red-500" />
              <KPIBox label="Max Drawdown" value={`-${formatMoney(tradeStats.maxDrawdown)}`} icon={TrendingDown} color="text-red-500" />
              <KPIBox label="Sharpe Ratio" value={safe(tradeStats.sharpeRatio.toFixed(2))} icon={Activity} color={tradeStats.sharpeRatio >= 1 ? "text-green-500" : "text-[#86c9d4]"} />
            </div>

            {/* Recent Trades */}
            <h3 className="mb-3 text-[15px] font-bold text-white">Recent Trades</h3>
            <div className="overflow-x-auto rounded-xl border border-[#0b2f3a]">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[#0b2f3a] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Direction</th>
                    <th className="px-4 py-3">Investment</th>
                    <th className="px-4 py-3">Result</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No trades yet.</td></tr>
                  ) : (
                    trades.slice(0, 10).map((t) => (
                      <tr key={safe(t.id)} className="border-b border-[#0b2f3a] hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-semibold text-white">{safe(t.asset)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${t.direction === "Buy" || t.direction === "Higher" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                            {safe(t.direction)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">{formatMoney(t.amount)}</td>
                        <td className={`px-4 py-3 font-mono font-semibold ${t.profit >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {t.profit >= 0 ? "+" : "-"}{formatMoney(Math.abs(t.profit))}
                        </td>
                        <td className="px-4 py-3 text-gray-400">{new Date(t.openTime).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-center text-[11px] text-gray-500">Click outside or press Close to return</p>
          </div>
        </div>
      )}
    </>
  );
};

const StatBox = ({ title, value, icon: Icon, color, prefix = "" }: any) => (
  <div className="flex items-center justify-between rounded-xl border border-[#0b2f3a] bg-[#13232d] p-4">
    <div className="min-w-0">
      <h4 className="text-[12px] text-gray-400 font-semibold mb-1">{title}</h4>
      <span className="block break-words text-[18px] font-bold tracking-tight text-white">{prefix}{typeof value === "string" || typeof value === "number" ? value : safe(value)}</span>
    </div>
    <div className={`w-10 h-10 rounded-full bg-[#0b2f3a] flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
  </div>
);

const KPIBox = ({ label, value, icon: Icon, color, prefix = "" }: { label: string; value: string; icon: any; color?: string; prefix?: string }) => (
  <div className="flex flex-col justify-center rounded-xl border border-[#0b2f3a] bg-[#13232d] p-4">
    <div className="mb-1 flex items-center gap-2">
      <Icon className={`h-4 w-4 ${color || "text-[#86c9d4]"}`} />
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
    </div>
    <span className={`text-[20px] font-black ${color || "text-white"}`}>{prefix}{value}</span>
  </div>
);
