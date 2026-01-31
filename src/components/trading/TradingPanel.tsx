import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Clock, HelpCircle, Plus, Minus } from "lucide-react";

interface TradingPanelProps {
  asset: {
    symbol: string;
    price: number;
  };
  balance: number;
  setBalance: (balance: number) => void;
}

const TradingPanel = ({ asset, balance, setBalance }: TradingPanelProps) => {
  const [investAmount, setInvestAmount] = useState(1000);
  const [expiration, setExpiration] = useState(30);
  const [profit, setProfit] = useState(86);

  const handleHigher = () => {
    if (investAmount <= balance) {
      setBalance(balance - investAmount);
    }
  };

  const handleLower = () => {
    if (investAmount <= balance) {
      setBalance(balance - investAmount);
    }
  };

  const adjustAmount = (delta: number) => {
    setInvestAmount(Math.max(1, investAmount + delta));
  };

  return (
    <aside className="w-64 bg-card border-l border-border flex flex-col">
      {/* Current Price */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-foreground">{asset.price.toFixed(5)}</span>
        </div>
      </div>

      {/* Investment Amount */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Invest</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => adjustAmount(-100)}
              className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={() => adjustAmount(100)}
              className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-secondary rounded-lg p-2">
          <span className="text-lg font-semibold text-foreground">$ {investAmount}</span>
        </div>
      </div>

      {/* Expiration */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Expiration</span>
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 bg-secondary rounded-lg p-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-lg font-semibold text-foreground">{expiration} sec</span>
        </div>
        <div className="flex gap-2 mt-2">
          {[30, 60, 120, 300].map((sec) => (
            <button
              key={sec}
              onClick={() => setExpiration(sec)}
              className={`flex-1 py-1 text-xs rounded ${
                expiration === sec
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {sec < 60 ? `${sec}s` : `${sec / 60}m`}
            </button>
          ))}
        </div>
      </div>

      {/* Profit Display */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground">Profit</span>
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="text-3xl font-bold text-trading-green">+{profit}%</div>
        <div className="text-lg font-semibold text-trading-green">
          +$ {((investAmount * profit) / 100).toFixed(0)}
        </div>
      </div>

      {/* Trading Buttons */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        <Button
          variant="higher"
          size="trading"
          onClick={handleHigher}
          className="flex flex-col items-center justify-center"
        >
          <TrendingUp className="w-8 h-8 mb-1" />
          <span className="text-lg">HIGHER</span>
        </Button>

        <Button
          variant="lower"
          size="trading"
          onClick={handleLower}
          className="flex flex-col items-center justify-center"
        >
          <TrendingDown className="w-8 h-8 mb-1" />
          <span className="text-lg">LOWER</span>
        </Button>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border text-center">
        <span className="text-xs text-muted-foreground">
          CURRENT TIME: {new Date().toLocaleTimeString()} (UTC+3)
        </span>
      </div>
    </aside>
  );
};

export default TradingPanel;
