import { Info, Bell, Star } from "lucide-react";

interface AssetInfoProps {
  asset: {
    symbol: string;
    type: string;
    name: string;
    price: number;
    change: number;
  };
}

const AssetInfo = ({ asset }: AssetInfoProps) => {
  return (
    <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        {/* Asset selector */}
        <button className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-sm font-bold text-white">€</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{asset.symbol} ({asset.type})</span>
              <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-1.5 py-0.5 bg-trading-orange text-primary-foreground rounded font-medium">
                OTC
              </span>
              <span className="text-xs text-muted-foreground">{asset.name}</span>
            </div>
          </div>
        </button>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <Info className="w-4 h-4" />
            <span className="text-sm">Info</span>
          </button>
          <button className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-trading-orange hover:opacity-80 transition-opacity">
            <Star className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>

      {/* Sentiment indicators */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">HIGHER</span>
          <span className="text-sm font-medium text-trading-green">56%</span>
        </div>
        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden flex">
          <div className="h-full bg-trading-green" style={{ width: "56%" }} />
          <div className="h-full bg-trading-red" style={{ width: "44%" }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">LOWER</span>
          <span className="text-sm font-medium text-trading-red">44%</span>
        </div>
      </div>
    </div>
  );
};

export default AssetInfo;
