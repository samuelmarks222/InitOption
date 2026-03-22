import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { useStatistics } from "@/hooks/useStatistics";
import { TrendingUp, TrendingDown, Target } from "lucide-react";

const COLORS = ["#00C076", "#ef4444"];

export const AnalyticsOverview = () => {
  const { equityCurve, tradeStats, assetPerformance } = useStatistics();

  const winLossData = [
    { name: "Wins", value: tradeStats.wins },
    { name: "Losses", value: tradeStats.losses },
  ];

  // Prepare Monthly/Weekly performance placeholder data for the bar chart
  // Since our dummy data might span days, we aggregate by day/asset for now
  const performanceData = useMemo(() => {
    return assetPerformance.slice(0, 5).map(a => ({
      name: a.asset,
      profit: a.profit,
      volume: a.volume
    }));
  }, [assetPerformance]);

  return (
    <div className="space-y-6">
      
      {/* Top Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Equity Curve (Takes 2 columns) */}
        <div className="lg:col-span-2 bg-[#1A1F26] border border-white/5 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-[16px] font-bold text-white">Equity & Drawdown Curve</h3>
              <p className="text-[12px] text-gray-500">Account balance progression vs percentage drawdown</p>
            </div>
            <div className="text-right">
              <div className="text-[20px] font-bold text-[#00C076]">+${tradeStats.totalProfit.toFixed(2)}</div>
              <div className="text-[12px] text-gray-500">Net Profit</div>
            </div>
          </div>
          
          <div className="flex-1 min-h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0b65c2" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0b65c2" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis yAxisId="left" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1A1F26", borderColor: "#ffffff10", borderRadius: "8px", color: "#fff" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value: any, name: string) => [
                    name === "balance" ? `$${value.toFixed(2)}` : `${value.toFixed(2)}%`, 
                    name === "balance" ? "Balance" : "Drawdown"
                  ]}
                />
                <Area yAxisId="left" type="monotone" dataKey="balance" stroke="#0b65c2" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                <Area yAxisId="right" type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={1} fillOpacity={1} fill="url(#colorDrawdown)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win/Loss Distribution Donut */}
        <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="mb-4 text-center">
            <h3 className="text-[16px] font-bold text-white">Win/Loss Distribution</h3>
            <p className="text-[12px] text-gray-500">Based on {tradeStats.totalTrades} closed trades</p>
          </div>
          
          <div className="flex-1 min-h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={winLossData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {winLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1A1F26", borderColor: "#ffffff10", borderRadius: "8px", border: "none" }}
                  itemStyle={{ color: "#fff", fontWeight: "bold" }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Text manually absolute positioned */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[28px] font-black text-white">{tradeStats.winRate}%</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Win Rate</span>
            </div>
          </div>

          <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-white/5">
            <div className="text-center">
              <div className="text-[18px] font-bold text-[#00C076]">{tradeStats.wins}</div>
              <div className="text-[11px] text-gray-500 uppercase font-bold tracking-wider">Wins</div>
            </div>
            <div className="text-center border-l border-white/10 pl-8">
              <div className="text-[18px] font-bold text-red-500">{tradeStats.losses}</div>
              <div className="text-[11px] text-gray-500 uppercase font-bold tracking-wider">Losses</div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Performance by Asset Bar Chart */}
        <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-[16px] font-bold text-white">Net Profit by Asset</h3>
            <p className="text-[12px] text-gray-500">Top 5 traded assets contribution</p>
          </div>
          
          <div className="flex-1 min-h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: "#1A1F26", borderColor: "#ffffff10", borderRadius: "8px", color: "#fff" }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Net Profit"]}
                />
                <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? "#00C076" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trade Averages Snapshot */}
        <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-[16px] font-bold text-white">Trading Averages</h3>
            <p className="text-[12px] text-gray-500">Breakdown of average metrics</p>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1">
            <div className="bg-black/20 rounded-xl p-5 border border-white/5 flex flex-col justify-center">
              <TrendingUp className="w-5 h-5 text-[#00C076] mb-2" />
              <div className="text-[20px] font-bold text-white">${tradeStats.avgWin.toFixed(2)}</div>
              <div className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">Average Win</div>
            </div>
            <div className="bg-black/20 rounded-xl p-5 border border-white/5 flex flex-col justify-center">
              <TrendingDown className="w-5 h-5 text-red-500 mb-2" />
              <div className="text-[20px] font-bold text-white">-${Math.abs(tradeStats.avgLoss).toFixed(2)}</div>
              <div className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">Average Loss</div>
            </div>
            <div className="col-span-2 bg-black/20 rounded-xl p-5 border border-white/5 flex flex-col justify-center relative overflow-hidden">
              <Target className="w-8 h-8 text-blue-500/20 absolute right-4 top-1/2 -translate-y-1/2" />
              <div className="flex items-center gap-2 mb-1">
                <div className="text-[24px] font-bold text-white">${tradeStats.expectancy.toFixed(2)}</div>
              </div>
              <div className="text-[12px] font-bold text-gray-500 tracking-wider uppercase">Mathematical Expectancy per trade</div>
              
              {/* Expectancy Bar logic */}
              <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 flex">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, (tradeStats.expectancy / 50) * 100))}%` }} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
