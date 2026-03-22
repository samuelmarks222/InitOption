import { useStatistics } from "@/hooks/useStatistics";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AlertOctagon, Activity, RefreshCw, Layers } from "lucide-react";

export const AnalyticsRisk = () => {
  const { tradeStats, trades } = useStatistics();

  // Drawdown historical curve
  const drawdownCurve = [...trades].reverse().map((t, idx, arr) => {
    // Reconstruct peak up to this point
    const profArray = arr.slice(0, idx + 1).map(x => x.profit);
    const sum = profArray.reduce((acc, curr) => acc + curr, 0);
    // Peak tracking simplistically here 
    // This is just a visual approximation for the Risk tab
    return {
      index: idx,
      date: new Date(t.closeTime).toLocaleTimeString(),
      profit: t.profit,
      cumulative: sum,
    };
  });

  return (
    <div className="space-y-6">
      
      {/* 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <RiskCard 
          icon={AlertOctagon} color="text-red-400" bg="bg-red-500/10"
          title="Historical VaR (95%)" 
          val={`-$${Math.abs(tradeStats.var95).toFixed(2)}`}
          sub="Expected maximum loss in 95% of trades"
        />

        <RiskCard 
          icon={RefreshCw} color="text-[#00C076]" bg="bg-[#00C076]/10"
          title="Recovery Factor" 
          val={tradeStats.recoveryFactor.toFixed(2)}
          sub="Net Profit divided by Max Drawdown"
        />

        <RiskCard 
          icon={Activity} color="text-yellow-400" bg="bg-yellow-500/10"
          title="Max Winning Streak" 
          val={`${tradeStats.maxWinStreak} trades`}
          sub="Longest sequence of profitable trades"
        />

        <RiskCard 
          icon={Layers} color="text-orange-400" bg="bg-orange-500/10"
          title="Max Losing Streak" 
          val={`${tradeStats.maxLossStreak} trades`}
          sub="Longest sequence of negative trades"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drawdown Exposure Chart */}
        <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-[16px] font-bold text-white">Cumulative Returns Volatility</h3>
            <p className="text-[12px] text-gray-500">Trailing PnL distribution</p>
          </div>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdownCurve} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0b65c2" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0b65c2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1A1F26", borderColor: "#ffffff10", borderRadius: "8px", color: "#fff" }}
                />
                <Area type="monotone" dataKey="cumulative" stroke="#0b65c2" fill="url(#splitColor)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-6 shadow-sm">
          <h3 className="text-[16px] font-bold text-white mb-6">Advanced Metrics Explanation</h3>
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
              <h4 className="text-[14px] font-bold text-white mb-1">Value at Risk (VaR)</h4>
              <p className="text-[12px] text-gray-400 leading-relaxed">Value at Risk measures the level of financial risk within your trading portfolio over a specific time frame. A 95% historical VaR indicates that we are 95% confident your per-trade loss will not exceed this threshold, based on historical behavior.</p>
            </div>
            
            <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
              <h4 className="text-[14px] font-bold text-white mb-1">Recovery Factor</h4>
              <p className="text-[12px] text-gray-400 leading-relaxed">This denotes your system's resilience. It is calculated as Net Profit / Max Drawdown. A value above 1 implies that your strategy is able to recover the ground it lost during its maximum historical drawdown peak, demonstrating stability.</p>
            </div>

            <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
              <h4 className="text-[14px] font-bold text-white mb-1">Streaks Context</h4>
              <p className="text-[12px] text-gray-400 leading-relaxed">Using the theoretical probability (Win Rate), we evaluate if your maximum losing streak is within mathematical expectations. Extended losing streaks negatively impact expectancy exponentially based on position sizing formulas like Kelly Criterion.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const RiskCard = ({ icon: Icon, title, val, sub, bg, color }: any) => (
  <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:bg-white/5 transition-colors group">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${bg}`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <div>
      <div className={`text-[24px] font-black tracking-tight mb-1 ${color}`}>{val}</div>
      <div className="text-[13px] font-bold text-white mb-1">{title}</div>
      <div className="text-[11px] text-gray-500 leading-tight">{sub}</div>
    </div>
  </div>
);
