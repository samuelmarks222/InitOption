import { X, ChevronDown } from "lucide-react";

interface TradingHistoryPanelProps {
  onClose: () => void;
}

const HISTORY = [
  { time: "17:56", date: "4 Dec", pair: "NZD/USD", flags: ["🇳🇿", "🇺🇸"], count: "2 Binary", profit: -540, investment: 4000, isUp: false },
  { time: "17:40", date: "4 Dec", pair: "NZD/USD", flags: ["🇳🇿", "🇺🇸"], count: "7 Binary", profit: -70000, investment: 70000, isUp: false },
  { time: "17:23", date: "4 Dec", pair: "NZD/USD", flags: ["🇳🇿", "🇺🇸"], count: "1 Binary", profit: 7300, investment: 10000, isUp: true },
  { time: "17:22", date: "4 Dec", pair: "NZD/USD", flags: ["🇳🇿", "🇺🇸"], count: "5 Binary", profit: 1900, investment: 50000, isUp: true },
  { time: "17:20", date: "4 Dec", pair: "Snap Inc.", flags: ["📸"], count: "4 Binary", profit: -2800, investment: 40000, isUp: false },
  { time: "16:55", date: "4 Dec", pair: "EUR/USD", flags: ["🇪🇺", "🇺🇸"], count: "3 Binary", profit: 3200, investment: 15000, isUp: true },
  { time: "16:30", date: "4 Dec", pair: "BTC/USD", flags: ["₿", "🇺🇸"], count: "1 Binary", profit: -5000, investment: 20000, isUp: false },
  { time: "15:44", date: "4 Dec", pair: "GBP/USD", flags: ["🇬🇧", "🇺🇸"], count: "2 Binary", profit: 1800, investment: 8000, isUp: true },
];

const TradingHistoryPanel = ({ onClose }: TradingHistoryPanelProps) => {
  const totalPL = HISTORY.reduce((sum, h) => sum + h.profit, 0);

  return (
    <div className="w-[300px] h-full flex flex-col bg-[#1a1b20] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#22242a]">
        <span className="text-sm font-semibold text-foreground">Trading History</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter */}
      <div className="px-3 py-2 border-b border-white/5">
        <button className="w-full flex items-center justify-between bg-[#2a2d35] rounded px-3 py-2 text-sm text-foreground hover:bg-[#32363e] transition-colors">
          All Positions
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {HISTORY.map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer">
            {/* Time */}
            <div className="text-center shrink-0 w-12">
              <div className="text-sm font-medium text-foreground">{item.time}</div>
              <div className="text-xs text-muted-foreground">{item.date}</div>
            </div>

            {/* Flags + Pair */}
            <div className="flex items-center gap-2 flex-1">
              <div className="flex -space-x-1">
                {item.flags.map((f, j) => (
                  <div key={j} className="w-5 h-5 rounded-full bg-black/40 flex items-center justify-center text-xs border border-[#1a1b20]" style={{ zIndex: 10 - j }}>
                    {f}
                  </div>
                ))}
              </div>
              <div>
                <div className="text-sm text-foreground">{item.pair}</div>
                <div className="text-xs text-muted-foreground">{item.count}</div>
              </div>
            </div>

            {/* Profit + Arrow */}
            <div className="text-right shrink-0">
              <div className={`text-sm font-semibold ${item.profit >= 0 ? "text-trading-green" : "text-red-400"}`}>
                {item.profit >= 0 ? "+" : ""}{item.profit < 0 ? `-$${Math.abs(item.profit).toLocaleString()}` : `$${item.profit.toLocaleString()}`}
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                ${item.investment.toLocaleString()}
                <span className={item.isUp ? "text-trading-green" : "text-red-400"}>
                  {item.isUp ? "▲" : "▼"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Total */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-[#22242a]">
        <span className="text-sm text-muted-foreground">Total P/L</span>
        <span className={`text-sm font-bold ${totalPL >= 0 ? "text-trading-green" : "text-red-400"}`}>
          {totalPL >= 0 ? "+" : ""}{totalPL < 0 ? `-$${Math.abs(totalPL).toLocaleString()}` : `$${totalPL.toLocaleString()}`}
        </span>
      </div>
    </div>
  );
};

export default TradingHistoryPanel;
