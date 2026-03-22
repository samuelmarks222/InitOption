import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useStatistics } from "@/hooks/useStatistics";

export const AnalyticsBenchmark = () => {
  const { equityCurve, tradeStats } = useStatistics();

  // Combine user equity curve with a mocked S&P 500 benchmark performance over the same steps
  const benchmarkData = useMemo(() => {
    let sp500 = 10000; // Base index
    return equityCurve.map((point) => {
      // simulate gradual market drift over the trades
      const drift = (Math.random() - 0.45) * 50; 
      sp500 += drift;
      return {
        ...point,
        sp500: parseFloat(sp500.toFixed(2))
      };
    });
  }, [equityCurve]);

  // Calculate Relative Alpha (User vs Market)
  const finalUser = benchmarkData.length > 0 ? benchmarkData[benchmarkData.length - 1].balance : 0;
  const startUser = benchmarkData.length > 0 ? benchmarkData[0].balance : 0;
  
  const finalMarket = benchmarkData.length > 0 ? benchmarkData[benchmarkData.length - 1].sp500 : 0;
  const startMarket = benchmarkData.length > 0 ? benchmarkData[0].sp500 : 0;

  const userReturnPct = startUser > 0 ? ((finalUser - startUser) / startUser) * 100 : 0;
  const marketReturnPct = startMarket > 0 ? ((finalMarket - startMarket) / startMarket) * 100 : 0;

  const alpha = userReturnPct - marketReturnPct;

  return (
    <div className="space-y-6">
      <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
        <h3 className="text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">Alpha vs S&P 500 Simulated</h3>
        <div className={`text-[48px] font-black ${alpha >= 0 ? "text-[#00C076]" : "text-red-500"}`}>
          {alpha >= 0 ? "+" : ""}{alpha.toFixed(2)}%
        </div>
        <p className="text-[13px] text-gray-400 max-w-lg mt-2 leading-relaxed">
          Your trading algorithm is mathematically comparing your total net return percentage against the background drift of a simulated market index (S&P 500 mapping). A positive Alpha means you outperformed the market.
        </p>
      </div>

      <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-[16px] font-bold text-white">Relative Performance Curve</h3>
              <p className="text-[12px] text-gray-500">Your Equity (Blue) vs S&P 500 Index (Orange)</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#0b65c2]" />
                <span className="text-[12px] font-bold text-gray-400">Your Portfolio</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-[12px] font-bold text-gray-400">Benchmark</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-h-[400px] w-full mt-4 relative">
             <ResponsiveContainer width="100%" height="100%">
              <LineChart data={benchmarkData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} dy={10} hide />
                <YAxis yAxisId="left" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: "#1A1F26", borderColor: "#ffffff10", borderRadius: "8px", color: "#fff" }}
                />
                <Line yAxisId="left" type="monotone" dataKey="balance" name="Your Equity" stroke="#0b65c2" strokeWidth={3} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="sp500" name="S&P 500" stroke="#f97316" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};
