import { useState, useMemo, useEffect } from "react";
import { X, Search, Star, ArrowDown, ArrowUp, ArrowUpDown, Gem, Flame, Magnet, Check } from "lucide-react";
import Flag from "react-world-flags";
import { useDynamicAssets } from "@/contexts/DynamicAssetContext";
import { useTrading } from "@/hooks/useTrading";
import {
  assetCategoryToSelectorTab,
  getAssetCommodityIcon,
  getAssetFallbackLabel,
  getAssetFlags,
  getAssetStockLogo,
  getCryptoLogoUrl,
  normalizeAssetCategory,
} from "@/lib/assets";

interface Asset {
  symbol: string;
  name: string;
  category: "CURRENCIES" | "CRYPTO" | "COMMODITIES" | "STOCKS";
  isOTC?: boolean;
  baseCountry?: string;
  quoteCountry?: string;
  cryptoId?: string;
  stockLogo?: string | null;
  commodityIcon?: "gold" | "silver" | "oil" | "gas" | "copper";
  change24h: number;
  profit1m: number;
  profit5m: number;
  price: number;
}

interface AssetSelectorModalProps {
  onClose: () => void;
  onSelect: (asset: Asset) => void;
}

type TabType = "CURRENCIES" | "CRYPTO" | "COMMODITIES" | "STOCKS";
type SortKey = "name" | "change24h" | "profit1m" | "profit5m";

export const AssetSelectorModal = ({ onClose, onSelect }: AssetSelectorModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("CURRENCIES");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("profit1m");
  const [sortAsc, setSortAsc] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [liveAssets, setLiveAssets] = useState<Asset[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  const { assets } = useDynamicAssets();
  const { activeTrades } = useTrading();

  useEffect(() => {
    const mapped = assets.map(da => {
      const normalizedCategory = normalizeAssetCategory(da.type, da.symbol);
      const categoryMapped = assetCategoryToSelectorTab(normalizedCategory);
      const flags = getAssetFlags(da.symbol, da.flags);
      
      return {
        symbol: da.symbol,
        name: da.name,
        category: categoryMapped as any,
        isOTC: categoryMapped === 'CURRENCIES',
        baseCountry: flags[0],
        quoteCountry: flags[1],
        stockLogo: getAssetStockLogo(da.symbol, da.stockLogo),
        commodityIcon: getAssetCommodityIcon(da.symbol, da.commodityIcon) as any,
        change24h: da.change24h,
        profit1m: da.maxProfit,
        profit5m: da.profit5m,
        price: da.price
      };
    });
    setLiveAssets(mapped);
  }, [assets]);

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("trading_watchlist");
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const toggleWatchlist = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    setWatchlist(prev => {
      const next = prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol];
      localStorage.setItem("trading_watchlist", JSON.stringify(next));
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false); // default desc for new column
    }
  };

  const filteredData = useMemo(() => {
    let data = showOnlyFavorites 
      ? liveAssets.filter(a => watchlist.includes(a.symbol))
      : liveAssets.filter(a => a.category === activeTab);
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(a => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q));
    }

    return data.sort((a, b) => {
      // 1. PIN watchlist items to the top!
      const aFav = watchlist.includes(a.symbol);
      const bFav = watchlist.includes(b.symbol);
      
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      // 2. Standard sorting logic for the rest
      const valA = a[sortKey];
      const valB = b[sortKey];
      
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [activeTab, searchQuery, sortKey, sortAsc, watchlist, liveAssets, showOnlyFavorites]);

  const SortHeader = ({ label, sortName }: { label: string, sortName: SortKey }) => {
    const isActive = sortKey === sortName;
    return (
      <th 
        onClick={() => handleSort(sortName)}
        className="text-left font-normal text-[#8A939F] text-[13px] pb-3 cursor-pointer hover:text-white transition-colors group select-none"
      >
        <div className="flex items-center gap-1">
          {label}
          {isActive ? (
            sortAsc ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
          )}
        </div>
      </th>
    );
  };

  const favoriteAssets = liveAssets.filter(a => watchlist.includes(a.symbol));

  const renderIcon = (asset: Asset) => (
    <div className="flex items-center shrink-0 w-8">
      {asset.category === "CURRENCIES" && (
        <div className="flex -space-x-2">
          <div className="w-5 h-5 rounded-full overflow-hidden border border-black z-10 bg-white shadow-sm flex items-center justify-center">
            <Flag code={asset.baseCountry} className="w-full h-full object-cover" />
          </div>
          <div className="w-5 h-5 rounded-full overflow-hidden border border-black z-0 bg-white shadow-sm flex items-center justify-center">
            <Flag code={asset.quoteCountry} className="w-full h-full object-cover" />
          </div>
        </div>
      )}
      {asset.category === "CRYPTO" && (
        <div className="relative ml-1 flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-white p-0.5 shadow-sm">
          <img
            src={getCryptoLogoUrl(asset.symbol)}
            alt=""
            className="h-full w-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              if (e.currentTarget.nextElementSibling) {
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
              }
            }}
          />
          <div className="absolute inset-0 hidden items-center justify-center bg-[#f59e0b] text-[8px] font-black text-white">
            {getAssetFallbackLabel(asset.symbol, asset.name)}
          </div>
        </div>
      )}
      {asset.category === "STOCKS" && (
        <div className="relative ml-1 flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
          <img 
            src={asset.stockLogo || undefined} 
            alt="" 
            className="h-full w-full object-contain p-0.5 z-10" 
            onError={(e) => { 
              e.currentTarget.style.display = 'none'; 
              if (e.currentTarget.nextElementSibling) {
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
              }
            }} 
          />
          <div className="absolute inset-0 hidden items-center justify-center bg-blue-600 z-0">
            <span className="text-white text-[9px] font-bold">{getAssetFallbackLabel(asset.symbol, asset.name, 1)}</span>
          </div>
        </div>
      )}
      {asset.category === "COMMODITIES" && (
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-sm ml-1 border border-white/10">
          {asset.commodityIcon === "gold" && <div className="w-2.5 h-2.5 bg-yellow-400 rounded-sm skew-x-12" />}
          {asset.commodityIcon === "silver" && <div className="w-2.5 h-2.5 bg-gray-300 rounded-sm skew-x-12" />}
          {asset.commodityIcon === "oil" && <div className="w-2.5 h-3 bg-black rounded-sm border border-gray-600" />}
          {asset.commodityIcon === "gas" && <Flame className="w-2.5 h-2.5 text-blue-400" />}
          {asset.commodityIcon === "copper" && <Magnet className="w-2.5 h-2.5 text-orange-600" />}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
      {/* Full-screen on mobile, 80% modal on desktop */}
      <div className="w-full sm:w-[80%] sm:max-w-[1200px] h-[92dvh] sm:h-[90vh] bg-[#1A1F26] sm:rounded-lg rounded-t-2xl shadow-2xl flex flex-col border border-white/10 relative overflow-hidden">

        
        {/* Header Title */}
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h2 className="text-white text-[22px] font-bold tracking-wide">Select trade pair</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center px-6 gap-3 shrink-0">
          {(["CURRENCIES", "CRYPTO", "COMMODITIES", "STOCKS"] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setShowOnlyFavorites(false); }}
              className={`px-3 py-1.5 rounded text-[11px] font-bold tracking-wider transition-colors ${
                (!showOnlyFavorites && activeTab === tab) ? "bg-[#0b65c2] text-white" : "text-white hover:bg-white/10"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Bar Row */}
        <div className="px-6 py-5 shrink-0 flex items-center gap-3 border-b border-[#ffffff10]">
          <button 
            onClick={() => setShowOnlyFavorites(f => !f)}
            className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
              showOnlyFavorites ? "bg-white/20" : "bg-[#252A30] hover:bg-[#2A3036]"
            } border border-white/5`}
          >
            <Star className="w-4 h-4 fill-[#FFC107] text-[#FFC107]" />
            <span className="text-white text-[13px] font-bold">{watchlist.length}</span>
          </button>
          
          <div className="flex-1 relative flex items-center bg-[#252A30] rounded border border-white/5 focus-within:border-white/20 px-3 transition-colors">
            <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
            <input 
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none py-2 text-[14px] text-white placeholder:text-gray-400 font-medium"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center ml-2">
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Data List */}
        <div className="flex-1 overflow-y-auto CustomScrollbar px-6 pb-6 pt-2">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-[#1A1F26] z-10 border-b border-[#ffffff10]">
              <tr>
                <th className="w-10 pb-3"></th>
                <SortHeader label="Name" sortName="name" />
                <SortHeader label="24h changing" sortName="change24h" />
                <SortHeader label="Profit 1+ min" sortName="profit1m" />
                <SortHeader label="5+ min" sortName="profit5m" />
              </tr>
            </thead>
            <tbody>
              {filteredData.map((asset, i) => {
                const isSaved = watchlist.includes(asset.symbol);
                const isPositive = asset.change24h >= 0;
                const hasActiveTrade = activeTrades.some(t => t.asset_symbol === asset.symbol);

                return (
                  <tr 
                    key={asset.symbol} 
                    onClick={() => onSelect(asset)}
                    className={`cursor-pointer transition-colors border-b border-white/5 ${
                      i % 2 === 0 ? "bg-[#1A1F26]" : "bg-[#0E1217]/50"
                    } hover:bg-white/5 group`}
                  >
                    {/* Watchlist Star */}
                    <td className="py-2 text-center w-10 text-[#8A939F]" onClick={(e) => { e.stopPropagation(); toggleWatchlist(e, asset.symbol); }}>
                      <button className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity">
                        {isSaved ? (
                          <Star className="w-[18px] h-[18px] text-[#FFC107] fill-[#FFC107]" />
                        ) : (
                          <Star className="w-[18px] h-[18px] text-white hover:text-gray-300" />
                        )}
                      </button>
                    </td>
                    
                    {/* Name & Icons & Added Pill */}
                    <td className="py-2">
                      <div className="flex items-center gap-3">
                      {renderIcon(asset)}
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <div className="text-white font-bold text-[14px]">{asset.symbol} {asset.isOTC ? "(OTC)" : ""}</div>
                          <div className="text-[11px] text-[#8A939F]">{asset.name}</div>
                        </div>
                        {hasActiveTrade && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#545A64] rounded text-white text-[9px] font-bold tracking-wider">
                            <Check className="w-2.5 h-2.5" strokeWidth={3} /> ADDED
                          </span>
                        )}
                      </div>
                      </div>
                    </td>

                    {/* 24h Changing */}
                    <td className="py-2 w-32">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isPositive ? "bg-[#00C076]" : "bg-[#F6465D]"}`}>
                          {isPositive ? <ArrowUp className="w-2.5 h-2.5 text-white" strokeWidth={3} /> : <ArrowDown className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </div>
                        <span className={`text-[13px] font-bold ${isPositive ? "text-[#00C076]" : "text-[#F6465D]"}`}>
                          {asset.change24h > 0 ? "+" : ""}{asset.change24h.toFixed(2)}%
                        </span>
                      </div>
                    </td>

                    {/* Profit 1+ Mins */}
                    <td className="py-2 w-32">
                      <span className="text-[#FF9800] font-bold text-[14px]">{asset.profit1m}%</span>
                    </td>

                    {/* Profit 5+ Mins */}
                    <td className="py-2 w-32">
                      <span className="text-[#FF9800] font-bold text-[14px]">{asset.profit5m}%</span>
                    </td>
                  </tr>
                );
              })}
              
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500 font-bold text-[14px]">
                    No assets found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
