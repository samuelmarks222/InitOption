import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useStatistics } from "@/hooks/useStatistics";

export const AnalyticsAssets = () => {
  const { assetPerformance } = useStatistics();

  // Radar chart data mapping
  const radarData = assetPerformance.slice(0, 6).map(a => ({
    asset: a.asset,
    winRate: a.winRate,
    avgReturn: parseFloat(a.avgReturn.toFixed(2))
  }));

  return (
    <div className="space-y-6">
      
      {/* Top Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Radar Chart for Win Rates */}
        <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-6 shadow-sm flex flex-col items-center">
          <div className="mb-2 w-full text-left">
            <h3 className="text-[16px] font-bold text-white">Asset Proficiency Radar</h3>
            <p className="text-[12px] text-gray-500">Comparing Win Rate % across your top 6 traded assets</p>
          </div>
          
          <div className="w-full flex-1 min-h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#ffffff15" />
                <PolarAngleAxis dataKey="asset" tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} stroke="#ffffff10" />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: "#1A1F26", borderColor: "#ffffff10", borderRadius: "8px", color: "#fff" }}
                  formatter={(value: number) => [`${value}%`, "Win Rate"]}
                />
                <Radar name="Win Rate" dataKey="winRate" stroke="#0b65c2" fill="#0b65c2" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart for Volume */}
        <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="mb-6 w-full text-left">
            <h3 className="text-[16px] font-bold text-white">Investment Volume by Asset</h3>
            <p className="text-[12px] text-gray-500">Total capital deployed per asset</p>
          </div>
          
          <div className="flex-1 w-full min-h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={assetPerformance.slice(0,6)} margin={{ top: 0, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                <XAxis type="number" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <YAxis type="category" dataKey="asset" stroke="#9ca3af" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: "#1A1F26", borderColor: "#ffffff10", borderRadius: "8px", color: "#fff" }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Total Volume"]}
                />
                <Bar dataKey="volume" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Breakdown Table */}
      <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-6 shadow-sm">
        <h3 className="text-[16px] font-bold text-white mb-6">Complete Asset Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[12px] text-gray-500 font-bold uppercase tracking-wider">
                <th className="pb-4">Asset</th>
                <th className="pb-4">Trades</th>
                <th className="pb-4">Win Rate</th>
                <th className="pb-4">Net Profit</th>
                <th className="pb-4">Avg Return</th>
                <th className="pb-4">Best Trade</th>
                <th className="pb-4">Worst Trade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {assetPerformance.map((a, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 font-bold text-white">{a.asset}</td>
                  <td className="py-4 text-[13px] text-gray-300">{a.trades} ({a.wins}W / {a.losses}L)</td>
                  <td className="py-4 text-[13px] font-bold text-gray-300">{a.winRate}%</td>
                  <td className={`py-4 text-[14px] font-bold ${a.profit >= 0 ? "text-[#00C076]" : "text-red-500"}`}>
                    {a.profit >= 0 ? "+" : ""}${a.profit.toFixed(2)}
                  </td>
                  <td className="py-4 text-[13px] text-gray-300">${a.avgReturn.toFixed(2)}</td>
                  <td className="py-4 text-[13px] font-bold text-[#00C076]">${a.best.toFixed(2)}</td>
                  <td className="py-4 text-[13px] font-bold text-red-500">-${Math.abs(a.worst).toFixed(2)}</td>
                </tr>
              ))}
              {assetPerformance.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[13px] font-bold text-gray-500">No data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
