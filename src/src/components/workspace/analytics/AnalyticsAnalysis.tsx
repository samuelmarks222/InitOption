import { useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar } from "recharts";
import { useStatistics, Trade } from "@/hooks/useStatistics";
import { Copy, ExternalLink, ArrowUpDown } from "lucide-react";

export const AnalyticsAnalysis = () => {
  const { trades } = useStatistics();
  const [sortConfig, setSortConfig] = useState<{ key: keyof Trade; direction: "asc" | "desc" } | null>(null);

  // Scatter plot data (Duration in minutes vs Return)
  const scatterData = trades.map(t => {
    const durationMins = (new Date(t.closeTime).getTime() - new Date(t.openTime).getTime()) / 60000;
    return {
      x: parseFloat(durationMins.toFixed(1)),
      y: t.profit,
      asset: t.asset
    };
  });

  // Histogram data (Buckets of profit ranges)
  const profits = trades.map(t => t.profit);
  const min = Math.floor(Math.min(...profits, 0));
  const max = Math.ceil(Math.max(...profits, 0));
  const bucketSize = (max - min) / 10 || 10;
  
  const histogramData = Array.from({ length: 11 }).map((_, i) => {
    const bucketMin = min + i * bucketSize;
    const bucketMax = bucketMin + bucketSize;
    const count = profits.filter(p => p >= bucketMin && p < bucketMax).length;
    return {
      range: `${bucketMin.toFixed(0)} to ${bucketMax.toFixed(0)}`,
      count,
      isProfit: bucketMax > 0
    };
  });

  // Handle sorting
  const sortedTrades = [...trades].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
    if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const requestSort = (key: keyof Trade) => {
    let direction: "asc" | "desc" = "desc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Scatter Plot */}
        <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-[16px] font-bold text-white">Trade Returns vs Duration</h3>
            <p className="text-[12px] text-gray-500">Duration (Minutes) on X vs Profit (USD) on Y</p>
          </div>
          
          <div className="flex-1 min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis type="number" dataKey="x" name="Duration" unit="m" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis type="number" dataKey="y" name="Profit" unit="$" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }} 
                  contentStyle={{ backgroundColor: "#1A1F26", borderColor: "#ffffff10", borderRadius: "8px", color: "#fff" }}
                />
                <Scatter name="Trades" data={scatterData} fill="#8884d8">
                  {scatterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.y >= 0 ? "#00C076" : "#ef4444"} fillOpacity={0.7} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Histogram */}
        <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-[16px] font-bold text-white">Return Distribution</h3>
            <p className="text-[12px] text-gray-500">Frequency of profit ranges</p>
          </div>
          
          <div className="flex-1 min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="range" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => val.split(' ')[0]} dy={10} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: "#1A1F26", borderColor: "#ffffff10", borderRadius: "8px", color: "#fff", textTransform: "capitalize" }}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {histogramData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isProfit ? "#00C076" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Trade List Table */}
      <div className="bg-[#1A1F26] border border-white/5 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div>
            <h3 className="text-[16px] font-bold text-white">Detailed Trade Log</h3>
            <p className="text-[12px] text-gray-500">Every recorded execution</p>
          </div>
          <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-white font-bold text-[13px] transition-colors">
            <Copy className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                {[
                  { key: "closeTime", label: "Date" },
                  { key: "asset", label: "Asset" },
                  { key: "direction", label: "Direction" },
                  { key: "amount", label: "Invested" },
                  { key: "profit", label: "P/L" }
                ].map(col => (
                  <th 
                    key={col.key}
                    onClick={() => requestSort(col.key as keyof Trade)}
                    className="p-4 text-[12px] text-gray-400 font-bold uppercase tracking-wider cursor-pointer hover:text-white transition-colors group"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </th>
                ))}
                <th className="p-4 text-[12px] text-gray-400 font-bold uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedTrades.map(t => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-[13px] text-gray-300">
                    {new Date(t.closeTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-4 text-[14px] font-bold text-white">{t.asset}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${
                      t.direction === "Buy" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-500"
                    }`}>
                      {t.direction}
                    </span>
                  </td>
                  <td className="p-4 text-[13px] font-bold text-gray-300">${t.amount.toFixed(2)}</td>
                  <td className={`p-4 text-[14px] font-bold ${t.profit > 0 ? "text-[#00C076]" : "text-red-500"}`}>
                    {t.profit > 0 ? "+" : ""}{t.profit.toFixed(2)}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-gray-500 hover:text-[#0fa053] transition-colors inline-block p-1">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {trades.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[13px] text-gray-500 font-bold">No trades recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

