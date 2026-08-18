import { TrendingUp, TrendingDown } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface ActiveTrade {
  id: string;
  asset_symbol: string;
  direction: string;
  amount: number;
  entry_price: number;
  expiry_seconds: number;
  timeLeft: number;
}

const ActiveTrades = ({ trades }: { trades: ActiveTrade[] }) => {
  const { formatMoney } = useCurrency();
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
  };

  return (
    <div className="bg-card border-t border-border px-4 py-2">
      <div className="flex items-center gap-4 overflow-x-auto">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Active trades:</span>
        {trades.map((trade) => {
          const progress = ((trade.expiry_seconds - trade.timeLeft) / trade.expiry_seconds) * 100;
          return (
            <div key={trade.id} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5 min-w-[180px]">
              {trade.direction === "higher" ? (
                <TrendingUp className="w-3 h-3 text-trading-green" />
              ) : (
                <TrendingDown className="w-3 h-3 text-trading-red" />
              )}
              <span className="text-xs text-foreground font-medium">{trade.asset_symbol}</span>
              <span className="text-xs text-muted-foreground">{formatMoney(trade.amount)}</span>
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-trading-orange font-mono">{formatTime(trade.timeLeft)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveTrades;
