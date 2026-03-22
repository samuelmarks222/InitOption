import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Calendar, Activity, BarChart2 } from "lucide-react";
import { useDynamicAssets } from "@/contexts/DynamicAssetContext";

export const WorkspaceMarket = () => {
  const { assets } = useDynamicAssets();
  const [sentimentBuy, setSentimentBuy] = useState(68);

  // Fluctuating sentiment
  useEffect(() => {
    const interval = setInterval(() => {
      setSentimentBuy(prev => {
        // Random walk between 40% and 80%
        const shift = (Math.random() * 2) - 1; 
        let next = prev + shift;
        if (next > 80) next = 80;
        if (next < 40) next = 40;
        return Number(next.toFixed(1));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Top Movers Calculation
  const sortedAssets = [...assets].sort((a, b) => b.change24h - a.change24h);
  const gainers = sortedAssets.filter(a => a.change24h > 0).slice(0, 3);
  const losers = [...assets].sort((a, b) => a.change24h - b.change24h).filter(a => a.change24h < 0).slice(0, 2);
  const TOP_MOVERS = [...gainers, ...losers].map(a => ({
    symbol: a.symbol,
    name: a.name,
    change: `${a.change24h > 0 ? '+' : ''}${a.change24h.toFixed(2)}%`,
    isUp: a.change24h >= 0
  }));

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const EVENTS = [
    { time: `${pad(now.getHours() + 1)}:30`, country: "🇺🇸", event: "Core CPI (MoM)", impact: "High" },
    { time: `${pad(now.getHours() + 3)}:00`, country: "🇪🇺", event: "ECB President Speaks", impact: "Medium" },
    { time: `${pad(now.getHours() + 5)}:15`, country: "🇬🇧", event: "BoE Governor Speaks", impact: "High" },
  ];

  return (
    <div className="w-full h-full p-6 text-white overflow-y-auto no-scrollbar space-y-8">
      
      {/* Top Movers */}
      <div>
        <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#0b65c2]" /> Top Movers
        </h3>
        <div className="space-y-2">
          {TOP_MOVERS.map((asset) => (
            <div key={asset.symbol} className="bg-white/5 hover:bg-white/10 transition-colors rounded-xl p-3 flex items-center justify-between cursor-pointer border border-[#ffffff0a]">
              <div>
                <div className="font-bold text-[14px]">{asset.symbol}</div>
                <div className="text-[11px] text-gray-500">{asset.name}</div>
              </div>
              <div className={`flex items-center gap-1 font-bold text-[14px] ${asset.isUp ? "text-[#00C076]" : "text-[#F6465D]"}`}>
                {asset.isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {asset.change}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Sentiment */}
      <div>
        <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-orange-500" /> Global Sentiment
        </h3>
        <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-5">
          <div className="flex justify-between text-[12px] font-bold mb-2">
            <span className="text-[#00C076]">{sentimentBuy.toFixed(1)}% BUY</span>
            <span className="text-[#F6465D]">{(100 - sentimentBuy).toFixed(1)}% SELL</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden flex transition-all duration-1000 ease-in-out">
            <div className="bg-[#00C076] h-full transition-all duration-1000" style={{ width: `${sentimentBuy}%` }} />
            <div className="bg-[#F6465D] h-full transition-all duration-1000" style={{ width: `${100 - sentimentBuy}%` }} />
          </div>
          <p className="text-[11px] text-gray-500 mt-4 text-center">
            Based on millions of active open positions globally.
          </p>
        </div>
      </div>

      {/* Economic Calendar */}
      <div>
        <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-500" /> Economic Calendar
        </h3>
        <div className="space-y-3">
          {EVENTS.map((ev, i) => (
            <div key={i} className="flex gap-4 items-start border-l-2 border-white/10 pl-4 py-1 relative">
              <div className="absolute -left-[5px] top-2.5 w-2 h-2 rounded-full bg-white/20" />
              <div className="w-12 text-[12px] font-bold text-gray-400 pt-0.5">{ev.time}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span>{ev.country}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    ev.impact === "High" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-500"
                  }`}>
                    {ev.impact} Impact
                  </span>
                </div>
                <div className="text-[13px] font-medium text-white">{ev.event}</div>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full mt-4 py-2 border border-white/10 rounded-lg text-[12px] font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          View Full Calendar
        </button>
      </div>

    </div>
  );
};
