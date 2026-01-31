import { Info, Bell, Star } from "lucide-react";
import AssetSelector from "./AssetSelector";
import { Asset } from "./data/assets";

interface AssetInfoProps {
  asset: {
    symbol: string;
    type: string;
    name: string;
    price: number;
    change: number;
  };
  onSelectAsset: (asset: Asset & { price: number; change: number }) => void;
}

const AssetInfo = ({ asset, onSelectAsset }: AssetInfoProps) => {
  return (
    <div className="h-14 bg-card border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        {/* Asset selector dropdown */}
        <AssetSelector selectedAsset={asset} onSelectAsset={onSelectAsset} />

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
