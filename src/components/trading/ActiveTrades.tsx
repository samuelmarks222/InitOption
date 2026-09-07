import { TrendingUp, TrendingDown } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface ActiveTrade {
  id: string;
  asset_symbol: string;
  direction: string;
  amount: number;
  entry_price: number;
  expiry_time: number;  // Absolute timestamp (ms) instead of relative seconds
  created_at: number;   // Creation timestamp
}

const ActiveTrades = ({ trades }: { trades: ActiveTrade[] }) => {
  const { formatMoney } = useCurrency();
  const formatTimeRemaining = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
  };
  const getExpiryStatus = (trade: ActiveTrade) => {
    const now = Date.now();
    const elapsed = now - trade.created_at;
    const remaining = trade.expiry_time - now;
    const isExpired = remaining <= 0;
    return { elapsed, remaining, isExpired };
  };

  return (
    <div className="bg-card border-t border-border px-4 py-2">
      <div className="flex items-center gap-4 overflow-x-auto">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Active trades:</span>
        {trades.map((trade) => {
          const { elapsed, remaining, isExpired } = getExpiryStatus(trade);
          const progress = isExpired ? 100 : ((elapsed / (trade.expiry_time - trade.created_at)) * 100);
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
                <div className={`h-full bg-primary rounded-full transition-all ${isExpired ? "bg-gray-500" : ""}`} style={{ width: `${progress}%` }} />
              </div>
              {isExpired ? (
                <span className="text-xs text-gray-400 font-mono">Expired</span>
              ) : (
                <span className="text-xs text-trading-orange font-mono">{formatTimeRemaining(remaining)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveTrades;
