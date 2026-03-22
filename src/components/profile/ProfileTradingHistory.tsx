import { useState } from "react";
import { ArrowUp, ArrowDown, PieChart as PieChartIcon, Activity, Percent, ArrowRightLeft, TrendingUp } from "lucide-react";
import { useStatistics, Trade } from "@/hooks/useStatistics";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { useCurrency } from "@/contexts/CurrencyContext";

export const ProfileTradingHistory = () => {
  const { trades, tradeStats } = useStatistics();
  const [filterAsset, setFilterAsset] = useState("all");
  const { formatMoney } = useCurrency();

  const filteredTrades = trades.filter(t => filterAsset === "all" || t.asset === filterAsset);
  const uniqueAssets = Array.from(new Set(trades.map(t => t.asset)));

  const winLossData = [
    { name: "Wins", value: tradeStats.wins, color: "#10b981" },
    { name: "Losses", value: tradeStats.losses, color: "#ef4444" },
  ];

  return (
    <div className="max-w-6xl text-white h-full flex flex-col">
      <h2 className="text-[24px] font-bold mb-6">Trading History & Analytics</h2>

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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Win / Loss Donut Chart */}
        <div className="bg-[#13232d] border border-[#0b2f3a] rounded-2xl p-6 flex flex-col items-center justify-center lg:col-span-1 h-[250px]">
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
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown by Asset could go here in a more advanced implementation. Placeholder for layout balance */}
        <div className="bg-[#13232d] border border-[#0b2f3a] rounded-2xl p-6 lg:col-span-3 h-[250px] overflow-hidden">
           <h3 className="text-[14px] font-bold text-gray-300 mb-4">Performance Highlights</h3>
           <div className="grid grid-cols-3 gap-4 h-full pb-8">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex flex-col justify-center">
                <span className="text-[12px] text-green-400 font-bold uppercase mb-1">Gross Profit</span>
                <span className="text-[24px] font-bold text-white">{formatMoney(tradeStats.grossProfit)}</span>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex flex-col justify-center">
                <span className="text-[12px] text-red-400 font-bold uppercase mb-1">Gross Loss</span>
                <span className="text-[24px] font-bold text-white">-{formatMoney(tradeStats.grossLoss)}</span>
              </div>
              <div className="bg-[#0b2f3a] border border-[#1b4f60] rounded-xl p-4 flex flex-col justify-center">
                <span className="text-[12px] text-[#86c9d4] font-bold uppercase mb-1">Trades Taken</span>
                <span className="text-[24px] font-bold text-white">{tradeStats.totalTrades}</span>
              </div>
           </div>
        </div>
      </div>

      {/* Trades List */}
      <div className="flex-1 bg-[#13232d] border border-[#0b2f3a] rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#0b2f3a] flex items-center justify-between">
          <h3 className="text-[15px] font-bold">Trade History</h3>
          <select 
            value={filterAsset} 
            onChange={(e) => setFilterAsset(e.target.value)}
            className="bg-[#121f27] border border-[#0b2f3a] text-white text-[12px] font-bold rounded px-3 py-1.5 focus:outline-none focus:border-[#86c9d4]"
          >
            <option value="all">All Assets</option>
            {uniqueAssets.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#121f27] shadow-md z-10 text-[12px] text-gray-400 uppercase font-semibold">
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
                <tr key={t.id} className="border-b border-[#0b2f3a] hover:bg-[#121f27] transition-colors cursor-pointer">
                  <td className="px-6 py-3 font-bold text-[14px] text-white">{t.asset}</td>
                  <td className="px-6 py-3">
                    <span className={`text-[12px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider ${
                      t.direction === "Buy" || t.direction === "Higher" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {t.direction}
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
                    {new Date(t.openTime).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTrades.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-[14px]">
              No trades found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ title, value, icon: Icon, color, prefix = "" }: any) => (
  <div className="bg-[#13232d] border border-[#0b2f3a] rounded-xl p-4 flex items-center justify-between">
    <div>
      <h4 className="text-[12px] text-gray-400 font-semibold mb-1">{title}</h4>
      <span className="text-[18px] font-bold text-white tracking-tight">{prefix}{value}</span>
    </div>
    <div className={`w-10 h-10 rounded-full bg-[#0b2f3a] flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
  </div>
);
