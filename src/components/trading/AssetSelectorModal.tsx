import { useTranslation } from "react-i18next";
import { useState, useMemo, useEffect } from "react";
import { X, Search, Star, ArrowDown, ArrowUp, ArrowUpDown, Gem, Check } from "lucide-react";
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

type TabType = "CURRENCIES" | "CRYPTO" | "COMMODITIES" | "STOCKS";
type SortKey = "name" | "change24h" | "profit1m" | "profit5m";

export const AssetSelectorModal = ({ onClose, onSelect }: AssetSelectorModalProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("CURRENCIES");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("profit1m");
  const [sortAsc, setSortAsc] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [liveAssets, setLiveAssets] = useState<AssetSelectorAsset[]>([]);
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

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("trading_watchlist");
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const openFavoritesView = () => {
    setShowOnlyFavorites(true);
    setSearchQuery("");
  };

  const toggleFavoritesView = () => {
    setShowOnlyFavorites((current) => {
      const next = !current;
      if (next) {
        setSearchQuery("");
      }
      return next;
    });
  };

  const toggleWatchlist = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    const isAddingToWatchlist = !watchlist.includes(symbol);

    setWatchlist(prev => {
      const next = prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol];
      localStorage.setItem("trading_watchlist", JSON.stringify(next));
      return next;
    });

    if (isAddingToWatchlist) {
      openFavoritesView();
    }
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

  const renderSortIcon = (sortName: SortKey, inactiveClassName = "opacity-0 group-hover:opacity-50") => {
    const isActive = sortKey === sortName;

    if (isActive) {
      return sortAsc ? <ArrowUp className="h-3 w-3 text-white" /> : <ArrowDown className="h-3 w-3 text-white" />;
    }

    return <ArrowUpDown className={`h-3 w-3 transition-opacity ${inactiveClassName}`} />;
  };

  const SortHeader = ({ label, sortName }: { label: string; sortName: SortKey }) => (
    <th
      onClick={() => handleSort(sortName)}
      className="cursor-pointer select-none pb-3 text-left text-[13px] font-normal text-[#8A939F] transition-colors hover:text-white group"
    >
      <div className="flex items-center gap-1">
        {label}
        {renderSortIcon(sortName)}
      </div>
    </th>
  );

  const MobileSortHeader = ({
    lines,
    sortName,
  }: {
    lines: string[];
    sortName: SortKey;
  }) => {
    const isActive = sortKey === sortName;

    return (
      <button
        type="button"
        onClick={() => handleSort(sortName)}
        className={`flex min-w-0 flex-col items-center justify-center gap-0.5 text-center text-[11px] font-medium leading-tight transition-colors ${
          isActive ? "text-white" : "text-[#8A939F]"
        }`}
      >
        <span>
          {lines.map((line) => (
            <span key={`${sortName}-${line}`} className="block">
              {line}
            </span>
          ))}
        </span>
        <span className={isActive ? "text-white" : "text-[#667085]"}>
          {renderSortIcon(sortName, "opacity-60")}
        </span>
      </button>
    );
  };

  const renderIcon = (asset: AssetSelectorAsset) => (
    <div className="flex items-center shrink-0 w-8">
      <AssetSymbolMark
        symbol={asset.symbol}
        name={asset.name}
        category={asset.category}
        flags={[asset.baseCountry, asset.quoteCountry]}
        stockLogo={asset.stockLogo}
        commodityIcon={asset.commodityIcon}
        size={20}
        className="ml-1"
      />
    </div>
  );

  const renderChangeCell = (change24h: number, compact = false) => {
    const isPositive = change24h >= 0;

    return (
      <div className={`flex items-center ${compact ? "justify-center gap-1" : "gap-2"}`}>
        <div
          className={`flex shrink-0 items-center justify-center rounded-full ${
            compact ? "h-4 w-4" : "h-4 w-4"
          } ${isPositive ? "bg-[#00C076]" : "bg-[#F6465D]"}`}
        >
          {isPositive ? (
            <ArrowUp className="h-2.5 w-2.5 text-white" strokeWidth={3} />
          ) : (
            <ArrowDown className="h-2.5 w-2.5 text-white" strokeWidth={3} />
          )}
        </div>
        <span className={`${compact ? "text-[12px]" : "text-[13px]"} font-bold ${isPositive ? "text-[#00C076]" : "text-[#F6465D]"}`}>
          {change24h > 0 ? "+" : ""}
          {change24h.toFixed(2)}%
        </span>
      </div>
    );
  };

  const emptyStateMessage = showOnlyFavorites
    ? watchlist.length === 0
      ? t("assetSelector.noFavorites")
      : t("assetSelector.noFavoritesMatch")
    : t("assetSelector.noAssetsMatch");

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="relative flex h-[calc(100dvh-56px)] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#1A1F26] shadow-2xl sm:h-[90vh] sm:w-[80%] sm:max-w-[1200px] sm:rounded-lg">

        
        {/* Header Title */}
        <div className="flex shrink-0 items-center justify-between px-4 py-4 sm:p-6 sm:pb-4">
          <h2 className="text-[18px] font-bold tracking-wide text-white sm:text-[22px]">{t("assetSelector.selectPair")}</h2>
          <button 
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 overflow-x-auto px-4 scrollbar-hide sm:px-6">
          <div className="flex min-w-max items-center gap-2 sm:gap-3">
            {(["CURRENCIES", "CRYPTO", "COMMODITIES", "STOCKS"] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setShowOnlyFavorites(false); }}
                className={`shrink-0 rounded px-3 py-1.5 text-[11px] font-bold tracking-wider transition-colors ${
                  (!showOnlyFavorites && activeTab === tab) ? "bg-[#0b65c2] text-white" : "text-white hover:bg-white/10"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar Row */}
        <div className="flex shrink-0 items-center gap-2 border-b border-[#ffffff10] px-4 py-4 sm:gap-3 sm:px-6 sm:py-5">
          <button 
            onClick={toggleFavoritesView}
            aria-label={showOnlyFavorites ? t("assetSelector.showAllAssets") : t("assetSelector.showFavorites")}
            className={`flex items-center gap-2 rounded border border-white/5 px-3 py-2 transition-colors ${
              showOnlyFavorites ? "bg-white/20" : "bg-[#252A30] hover:bg-[#2A3036]"
            }`}
          >
            <Star className="w-4 h-4 fill-[#FFC107] text-[#FFC107]" />
            <span className="text-white text-[13px] font-bold">{watchlist.length}</span>
          </button>
          
          <div className="relative flex flex-1 items-center rounded border border-white/5 bg-[#252A30] px-3 transition-colors focus-within:border-white/20">
            <Search className="mr-2 h-4 w-4 shrink-0 text-gray-400" />
            <input 
              type="text"
              placeholder={t("assetSelector.searchPlaceholder")}
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
        <div className="CustomScrollbar flex-1 overflow-y-auto px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
          <div className="sm:hidden">
            <div className="sticky top-0 z-10 border-b border-[#ffffff10] bg-[#1A1F26] pb-3">
              <div className="grid grid-cols-[28px,minmax(0,1.65fr),0.95fr,0.78fr,0.78fr] items-end gap-2">
                <div />
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className={`text-left text-[11px] font-medium transition-colors ${sortKey === "name" ? "text-white" : "text-[#8A939F]"}`}
                >
                  {t("assetSelector.name")}
                </button>
                <MobileSortHeader lines={[t("assetSelector.mobile24h"), t("assetSelector.mobileChanging")]} sortName="change24h" />
                <MobileSortHeader lines={[t("assetSelector.mobileProfit1"), t("assetSelector.mobileMin")]} sortName="profit1m" />
                <MobileSortHeader lines={[t("assetSelector.mobile5plus"), t("assetSelector.mobileMin")]} sortName="profit5m" />
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {filteredData.map((asset, i) => {
                const isSaved = watchlist.includes(asset.symbol);
                const hasActiveTrade = activeTrades.some(t => t.asset_symbol === asset.symbol);

                return (
                  <button
                    key={asset.symbol}
                    type="button"
                    onClick={() => onSelect(asset)}
                    className={`grid w-full grid-cols-[28px,minmax(0,1.65fr),0.95fr,0.78fr,0.78fr] items-center gap-2 px-1 py-3 text-left transition-colors ${
                      i % 2 === 0 ? "bg-[#1A1F26]" : "bg-[#0E1217]/50"
                    } hover:bg-white/5`}
                  >
                    <span className="flex items-center justify-center text-[#8A939F]">
                      <span
                        role="button"
                        aria-label={
                          isSaved
                            ? `Remove ${asset.symbol} from favorites`
                            : `Add ${asset.symbol} to favorites`
                        }
                        onClick={(e) => toggleWatchlist(e, asset.symbol)}
                        className="rounded p-1 opacity-70 transition-opacity hover:opacity-100"
                      >
                        {isSaved ? (
                          <Star className="h-[16px] w-[16px] fill-[#FFC107] text-[#FFC107]" />
                        ) : (
                          <Star className="h-[16px] w-[16px] text-white hover:text-gray-300" />
                        )}
                      </span>
                    </span>

                    <div className="flex min-w-0 items-center gap-2">
                      {renderIcon(asset)}
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-bold leading-tight text-white">
                          {asset.symbol}
                        </div>
                        <div className="truncate text-[10px] leading-tight text-[#8A939F]">
                          {asset.name}
                        </div>
                        {hasActiveTrade && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded bg-[#545A64] px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-white">
                            <Check className="h-2.5 w-2.5" strokeWidth={3} /> {t("assetSelector.added")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      {renderChangeCell(asset.change24h, true)}
                    </div>

                    <div className="text-center text-[13px] font-bold text-[#FF9800]">
                      {asset.profit1m}%
                    </div>

                    <div className="text-center text-[13px] font-bold text-[#FF9800]">
                      {asset.profit5m}%
                    </div>
                  </button>
                );
              })}

              {filteredData.length === 0 && (
                <div className="py-12 text-center text-[14px] font-bold text-gray-500">
                  {emptyStateMessage}
                </div>
              )}
            </div>
          </div>

          <div className="hidden sm:block">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 border-b border-[#ffffff10] bg-[#1A1F26]">
                <tr>
                  <th className="w-10 pb-3"></th>
                  <SortHeader label={t("assetSelector.name")} sortName="name" />
                  <SortHeader label={t("assetSelector.change24h")} sortName="change24h" />
                  <SortHeader label={t("assetSelector.profit1min")} sortName="profit1m" />
                  <SortHeader label={t("assetSelector.profit5min")} sortName="profit5m" />
                </tr>
              </thead>
              <tbody>
                {filteredData.map((asset, i) => {
                  const isSaved = watchlist.includes(asset.symbol);
                  const hasActiveTrade = activeTrades.some(t => t.asset_symbol === asset.symbol);

                  return (
                    <tr
                      key={asset.symbol}
                      onClick={() => onSelect(asset)}
                      className={`group cursor-pointer border-b border-white/5 transition-colors ${
                        i % 2 === 0 ? "bg-[#1A1F26]" : "bg-[#0E1217]/50"
                      } hover:bg-white/5`}
                    >
                      <td className="w-10 py-2 text-center text-[#8A939F]" onClick={(e) => { e.stopPropagation(); toggleWatchlist(e, asset.symbol); }}>
                        <button
                          type="button"
                          aria-label={
                            isSaved
                              ? `Remove ${asset.symbol} from favorites`
                              : `Add ${asset.symbol} to favorites`
                          }
                          className="rounded p-1 opacity-50 transition-opacity hover:opacity-100"
                        >
                          {isSaved ? (
                            <Star className="h-[18px] w-[18px] fill-[#FFC107] text-[#FFC107]" />
                          ) : (
                            <Star className="h-[18px] w-[18px] text-white hover:text-gray-300" />
                          )}
                        </button>
                      </td>

                      <td className="py-2">
                        <div className="flex items-center gap-3">
                          {renderIcon(asset)}
                          <div className="flex items-center gap-2">
                            <div className="min-w-0">
                              <div className="text-[14px] font-bold text-white">{asset.symbol}</div>
                              <div className="text-[11px] text-[#8A939F]">{asset.name}</div>
                            </div>
                            {hasActiveTrade && (
                              <span className="flex items-center gap-1 rounded bg-[#545A64] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white">
                                  <Check className="h-2.5 w-2.5" strokeWidth={3} /> {t("assetSelector.added")}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="w-32 py-2">
                        {renderChangeCell(asset.change24h)}
                      </td>

                      <td className="w-32 py-2">
                        <span className="text-[14px] font-bold text-[#FF9800]">{asset.profit1m}%</span>
                      </td>

                      <td className="w-32 py-2">
                        <span className="text-[14px] font-bold text-[#FF9800]">{asset.profit5m}%</span>
                      </td>
                    </tr>
                  );
                })}

                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[14px] font-bold text-gray-500">
                      {emptyStateMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
