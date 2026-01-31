import { useState, useMemo } from "react";
import { ChevronDown, Search, Star, X } from "lucide-react";
import { allAssets, assetTypes, Asset } from "./data/assets";

interface AssetSelectorProps {
  selectedAsset: {
    symbol: string;
    type: string;
    name: string;
    price: number;
    change: number;
  };
  onSelectAsset: (asset: Asset & { price: number; change: number }) => void;
}

const AssetSelector = ({ selectedAsset, onSelectAsset }: AssetSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [favorites, setFavorites] = useState<string[]>(["EUR/USD-OTC", "BTC/USD-Crypto"]);

  const filteredAssets = useMemo(() => {
    return allAssets.filter((asset) => {
      const matchesSearch =
        asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === "All" || asset.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [searchQuery, selectedType]);

  const toggleFavorite = (assetKey: string) => {
    setFavorites((prev) =>
      prev.includes(assetKey)
        ? prev.filter((f) => f !== assetKey)
        : [...prev, assetKey]
    );
  };

  const handleSelectAsset = (asset: Asset) => {
    onSelectAsset({
      ...asset,
      price: asset.basePrice,
      change: Math.random() * 2 - 1,
    });
    setIsOpen(false);
  };

  const getAssetKey = (asset: Asset) => `${asset.symbol}-${asset.type}`;

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:bg-secondary/50 rounded-lg p-2 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <span className="text-sm font-bold text-primary-foreground">
            {selectedAsset.symbol.charAt(0)}
          </span>
        </div>
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {selectedAsset.symbol} ({selectedAsset.type})
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-1.5 py-0.5 bg-trading-orange text-primary-foreground rounded font-medium">
              {selectedAsset.type}
            </span>
            <span className="text-xs text-muted-foreground">{selectedAsset.name}</span>
          </div>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-[400px] bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Select Asset</h3>
                <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Type Filters */}
            <div className="p-2 border-b border-border flex gap-1 overflow-x-auto">
              <button
                onClick={() => setSelectedType("All")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedType === "All"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              {assetTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedType === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Asset List */}
            <div className="max-h-[300px] overflow-y-auto">
              {filteredAssets.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No assets found
                </div>
              ) : (
                filteredAssets.map((asset) => {
                  const assetKey = getAssetKey(asset);
                  const isFavorite = favorites.includes(assetKey);
                  const isSelected =
                    selectedAsset.symbol === asset.symbol &&
                    selectedAsset.type === asset.type;

                  return (
                    <div
                      key={assetKey}
                      className={`flex items-center justify-between p-3 hover:bg-secondary/50 cursor-pointer transition-colors ${
                        isSelected ? "bg-secondary" : ""
                      }`}
                      onClick={() => handleSelectAsset(asset)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {asset.icon || asset.symbol.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground text-sm">
                              {asset.symbol}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              asset.type === "OTC" 
                                ? "bg-trading-orange text-primary-foreground" 
                                : asset.type === "Crypto"
                                ? "bg-purple-500 text-white"
                                : asset.type === "Stocks"
                                ? "bg-blue-500 text-white"
                                : asset.type === "Commodities"
                                ? "bg-yellow-500 text-black"
                                : "bg-green-500 text-white"
                            }`}>
                              {asset.type}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">{asset.name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground">
                          {asset.basePrice.toFixed(asset.basePrice > 100 ? 2 : 5)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(assetKey);
                          }}
                          className={`p-1 rounded transition-colors ${
                            isFavorite
                              ? "text-trading-orange"
                              : "text-muted-foreground hover:text-trading-orange"
                          }`}
                        >
                          <Star className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AssetSelector;
