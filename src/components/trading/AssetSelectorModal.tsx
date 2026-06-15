import { useTranslation } from "react-i18next";
import { useState, useMemo, useEffect } from "react";
import { X, Search, Star, ArrowDown, ArrowUp, ArrowUpDown, Trash2, Plus, Minus } from "lucide-react";
import { useDynamicAssets } from "@/contexts/DynamicAssetContext";
import { useTrading } from "@/hooks/useTrading";
import {
  assetCategoryToSelectorTab,
  type CommodityIcon,
  getAssetCommodityIcon,
  getAssetFlags,
  getAssetStockLogo,
  normalizeAssetCategory,
  type SelectorAssetCategory,
} from "@/lib/assets";
import AssetSymbolMark from "./AssetSymbolMark";

export interface AssetSelectorAsset {
  symbol: string;
  name: string;
  category: SelectorAssetCategory;
  isOTC?: boolean;
  baseCountry?: string;
  quoteCountry?: string;
  cryptoId?: string;
  stockLogo?: string | null;
  commodityIcon?: CommodityIcon;
  change24h: number;
  profit1m: number;
  profit5m: number;
  price: number;
}

interface AssetSelectorModalProps {
  onClose: () => void;
  onSelect: (asset: AssetSelectorAsset) => void;
}

type TabType = "CURRENCIES" | "CRYPTO" | "MARKET" | "COMMODITIES" | "STOCKS" | "INDICES" | "FAVORITES";
type SortKey = "change24h" | "profit1m" | "profit5m";

const TABS: TabType[] = ["CURRENCIES", "CRYPTO", "MARKET", "COMMODITIES", "STOCKS", "INDICES", "FAVORITES"];

export const AssetSelectorModal = ({ onClose, onSelect }: AssetSelectorModalProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("CURRENCIES");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("profit1m");
  const [sortAsc, setSortAsc] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [liveAssets, setLiveAssets] = useState<AssetSelectorAsset[]>([]);
  const [mounted, setMounted] = useState(false);

  const { assets } = useDynamicAssets();
  const { activeTrades } = useTrading();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mapped = assets.map(da => {
      const normalizedCategory = normalizeAssetCategory(da.type, da.symbol);
      const categoryMapped = assetCategoryToSelectorTab(normalizedCategory);
      const flags = getAssetFlags(da.symbol, da.flags);

      return {
        symbol: da.symbol,
        name: da.name,
        category: categoryMapped,
        isOTC: categoryMapped === "CURRENCIES",
        baseCountry: flags[0],
        quoteCountry: flags[1],
        stockLogo: getAssetStockLogo(da.symbol, da.stockLogo),
        commodityIcon: getAssetCommodityIcon(da.symbol, da.commodityIcon),
        change24h: da.change24h,
        profit1m: da.maxProfit,
        profit5m: da.profit5m,
        price: da.price,
      };
    });
    setLiveAssets(mapped);
  }, [assets]);

  useEffect(() => {
    const saved = localStorage.getItem("trading_watchlist");
    if (saved) {
      try { setWatchlist(JSON.parse(saved)); }
      catch (e) {}
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
      setSortAsc(true);
    }
  };

  const filteredData = useMemo(() => {
    let data: AssetSelectorAsset[];

    if (activeTab === "FAVORITES") {
      data = liveAssets.filter(a => watchlist.includes(a.symbol));
    } else {
      const tabMap: Record<string, SelectorAssetCategory> = {
        CURRENCIES: "CURRENCIES",
        CRYPTO: "CRYPTO",
        MARKET: "CURRENCIES",
        COMMODITIES: "COMMODITIES",
        STOCKS: "STOCKS",
        INDICES: "STOCKS",
      };
      data = liveAssets.filter(a => a.category === (tabMap[activeTab] ?? "CURRENCIES"));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(a => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q));
    }

    if (sortKey) {
      data = [...data].sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [activeTab, searchQuery, sortKey, sortAsc, watchlist, liveAssets]);

  const renderSortIcon = (key: SortKey) => {
    if (sortKey === key) {
      return sortAsc ? <ArrowUp className="h-3 w-3 text-white" /> : <ArrowDown className="h-3 w-3 text-white" />;
    }
    return <ArrowUpDown className="h-3 w-3 text-[#B0B0B0] opacity-0 group-hover:opacity-60" />;
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${mounted ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`absolute left-0 top-0 h-full w-[340px] flex flex-col bg-[#1A1A2A] shadow-2xl transition-transform duration-300 ease-out border-r border-[#2A2A3A] ${
          mounted ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-4 py-3 border-b border-[#2A2A3A]">
          <h2 className="text-[14px] font-bold text-white">Select trade pair</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 overflow-x-auto scrollbar-hide border-b border-[#2A2A3A]">
          <div className="flex min-w-max items-center px-2">
            {TABS.map(tab => {
              const isActive = activeTab === tab;
              const label =
                tab === "CURRENCIES" ? "Currencies" :
                tab === "CRYPTO" ? "Crypto" :
                tab === "MARKET" ? "Market" :
                tab === "COMMODITIES" ? "Commodities" :
                tab === "STOCKS" ? "Stocks" :
                tab === "INDICES" ? "Indices" : "Favorites";
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
                  className={`relative shrink-0 px-1.5 py-2 text-[9px] font-semibold uppercase tracking-wider transition-colors ${
                    isActive ? "text-white" : "text-[#B0B0B0] hover:text-white"
                  }`}
                >
                  {label}
                  {isActive && <span className="absolute bottom-0 left-1.5 right-1.5 h-[2px] rounded-full bg-[#D5006C]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div className="shrink-0 px-3 py-2.5">
          <div className="flex items-center gap-2 rounded-full bg-[#0D0D0D] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-[12px] text-white outline-none placeholder:text-gray-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-white">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Column Headers */}
        <div className="shrink-0 border-b border-[#2A2A3A] px-3 pb-2">
          <div className="grid grid-cols-[minmax(0,1fr),65px,55px,55px] items-center gap-0.5">
            <span className="text-[11px] font-semibold text-[#B0B0B0]">Name</span>
            <button
              onClick={() => handleSort("change24h")}
              className="group flex items-center justify-end gap-0.5 text-[10px] font-semibold text-[#B0B0B0] hover:text-white transition-colors"
            >
              24h {renderSortIcon("change24h")}
            </button>
            <button
              onClick={() => handleSort("profit1m")}
              className="group flex items-center justify-end gap-0.5 text-[10px] font-semibold text-[#B0B0B0] hover:text-white transition-colors"
            >
              1+ min {renderSortIcon("profit1m")}
            </button>
            <button
              onClick={() => handleSort("profit5m")}
              className="group flex items-center justify-end gap-0.5 text-[10px] font-semibold text-[#B0B0B0] hover:text-white transition-colors"
            >
              5+ min {renderSortIcon("profit5m")}
            </button>
          </div>
        </div>

        {/* Asset List */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#D5006C #2A2A3A' }}>
          <style>{`
            .asset-scroll::-webkit-scrollbar { width: 6px; }
            .asset-scroll::-webkit-scrollbar-track { background: #2A2A3A; }
            .asset-scroll::-webkit-scrollbar-thumb { background: #D5006C; border-radius: 3px; }
          `}</style>
          <div className="asset-scroll">
            {filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-[13px] text-gray-500">
                {activeTab === "FAVORITES" ? (
                  <>
                    <Star className="mb-2 h-8 w-8 text-gray-600" />
                    <p>No assets added yet</p>
                  </>
                ) : (
                  <p>No assets match your search.</p>
                )}
              </div>
            ) : (
              filteredData.map((asset, i) => {
                const isSaved = watchlist.includes(asset.symbol);
                const isPositive = asset.change24h >= 0;

                return (
                  <div
                    key={asset.symbol}
                    onClick={() => onSelect(asset)}
                    className="grid grid-cols-[minmax(0,1fr),65px,55px,55px] items-center gap-0.5 px-3 py-1.5 cursor-pointer transition-colors hover:bg-[#2A2A3A]"
                  >
                    {/* Name column */}
                    <div className="flex items-center gap-2 min-w-0">
                      <AssetSymbolMark
                        symbol={asset.symbol}
                        name={asset.name}
                        category={asset.category}
                        flags={[asset.baseCountry, asset.quoteCountry]}
                        stockLogo={asset.stockLogo}
                        commodityIcon={asset.commodityIcon}
                        size={18}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-semibold text-white leading-tight">{asset.symbol}</div>
                        <div className="truncate text-[9px] text-gray-400 leading-tight">{asset.name}</div>
                      </div>
                      {activeTab === "FAVORITES" ? (
                        <button
                          onClick={(e) => toggleWatchlist(e, asset.symbol)}
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-gray-400 hover:text-[#F6465D] hover:bg-[#F6465D]/10 transition-colors"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => toggleWatchlist(e, asset.symbol)}
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors ${
                            isSaved ? "text-yellow-400 hover:text-gray-400" : "text-gray-400 hover:text-yellow-400"
                          }`}
                        >
                          {isSaved ? <Star className="h-3 w-3 fill-yellow-400" /> : <Star className="h-3 w-3" />}
                        </button>
                      )}
                    </div>

                    {/* 24h change */}
                    <div className="flex items-center justify-end gap-1">
                      {isPositive ? (
                        <ArrowUp className="h-2.5 w-2.5 text-[#00C076]" strokeWidth={3} />
                      ) : (
                        <ArrowDown className="h-2.5 w-2.5 text-[#F6465D]" strokeWidth={3} />
                      )}
                      <span className={`text-[12px] font-bold ${isPositive ? "text-[#00C076]" : "text-[#F6465D]"}`}>
                        {isPositive ? "+" : ""}{asset.change24h.toFixed(2)}%
                      </span>
                    </div>

                    {/* Profit 1+ min */}
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#3B82F6]" />
                      <span className="text-[12px] font-bold text-white">{asset.profit1m}%</span>
                    </div>

                    {/* Profit 5+ min */}
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#00C076]" />
                      <span className="text-[12px] font-bold text-white">{asset.profit5m}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
