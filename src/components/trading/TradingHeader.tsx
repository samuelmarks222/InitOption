import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus, DollarSign, User } from "lucide-react";

interface TradingHeaderProps {
  balance: number;
}

const TradingHeader = ({ balance }: TradingHeaderProps) => {
  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4">
      {/* Left - Asset tabs */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-white">€</span>
            </div>
            <span className="text-sm font-medium text-foreground">EUR/USD (O...</span>
          </div>
          <span className="text-xs px-1.5 py-0.5 bg-trading-orange text-primary-foreground rounded font-medium">
            OTC
          </span>
          <span className="text-xs text-muted-foreground">Blitz</span>
        </div>
        
        <button className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Right - User info */}
      <div className="flex items-center gap-4">
        {/* Account selector */}
        <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <User className="w-8 h-8 rounded-full bg-secondary p-1.5" />
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Balance */}
        <div className="flex items-center gap-1 text-foreground font-semibold">
          <span className="text-trading-green">${balance.toFixed(2)}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Deposit button */}
        <Link to="/deposit">
          <Button variant="deposit" size="sm" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Deposit
          </Button>
        </Link>
      </div>
    </header>
  );
};

export default TradingHeader;
