import { useState } from "react";
import TradingSidebar from "@/components/trading/TradingSidebar";
import TradingHeader from "@/components/trading/TradingHeader";
import TradingChart from "@/components/trading/TradingChart";
import TradingPanel from "@/components/trading/TradingPanel";
import AssetInfo from "@/components/trading/AssetInfo";
import ActiveTrades from "@/components/trading/ActiveTrades";
import { Asset } from "@/components/trading/data/assets";
import { useAuth } from "@/contexts/AuthContext";
import { useTrading } from "@/hooks/useTrading";

const Trade = () => {
  const { profile } = useAuth();
  const { activeTrades, tradeHistory, openTrade, setCurrentPrice } = useTrading();

  const [selectedAsset, setSelectedAsset] = useState({
    symbol: "EUR/USD",
    type: "OTC",
    name: "Blitz",
    price: 1.24183,
    change: 0.35,
  });

  const balance = profile?.balance ?? 0;

  const handleSelectAsset = (asset: Asset & { price: number; change: number }) => {
    setSelectedAsset({
      symbol: asset.symbol,
      type: asset.type,
      name: asset.name,
      price: asset.price,
      change: asset.change,
    });
  };

  const handlePriceUpdate = (price: number) => {
    setCurrentPrice(price);
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <TradingSidebar />
      <div className="flex-1 flex flex-col">
        <TradingHeader balance={balance} />
        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            <AssetInfo asset={selectedAsset} onSelectAsset={handleSelectAsset} />
            <TradingChart asset={selectedAsset} onPriceUpdate={handlePriceUpdate} />
            {activeTrades.length > 0 && <ActiveTrades trades={activeTrades} />}
          </div>
          <TradingPanel
            asset={selectedAsset}
            balance={balance}
            onTrade={openTrade}
          />
        </div>
      </div>
    </div>
  );
};

export default Trade;
