import { useState } from "react";
import TradingSidebar from "@/components/trading/TradingSidebar";
import TradingHeader from "@/components/trading/TradingHeader";
import TradingChart from "@/components/trading/TradingChart";
import TradingPanel from "@/components/trading/TradingPanel";
import AssetInfo from "@/components/trading/AssetInfo";

const Trade = () => {
  const [selectedAsset, setSelectedAsset] = useState({
    symbol: "EUR/USD",
    type: "OTC",
    name: "Blitz",
    price: 1.24183,
    change: 0.35,
  });

  const [balance, setBalance] = useState(0);

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <TradingSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <TradingHeader balance={balance} />

        {/* Trading Area */}
        <div className="flex-1 flex">
          {/* Chart Area */}
          <div className="flex-1 flex flex-col">
            <AssetInfo asset={selectedAsset} />
            <TradingChart asset={selectedAsset} />
          </div>

          {/* Trading Panel */}
          <TradingPanel 
            asset={selectedAsset} 
            balance={balance}
            setBalance={setBalance}
          />
        </div>
      </div>
    </div>
  );
};

export default Trade;
