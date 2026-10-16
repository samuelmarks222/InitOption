import { useTranslation } from "react-i18next";
import { useState, useMemo, useEffect } from "react";
import { X, Search, Star, ArrowDown, ArrowUp } from "lucide-react";
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
import { PairInfoModal } from "./PairInfoModal";

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

type TabType = "CURRENCIES" | "CRYPTO" | "COMMODITIES" | "STOCKS" | "INDICES";
type SortKey = "change24h" | "profit1m" | "profit5m";

const TABS: TabType[] = ["CURRENCIES", "CRYPTO", "COMMODITIES", "STOCKS", "INDICES"];

export const AssetSelectorModal = ({ onClose, onSelect }: AssetSelectorModalProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("CRYPTO");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("profit1m");
  const [sortAsc, setSortAsc] = useState(false);
  const [liveAssets, setLiveAssets] = useState<AssetSelectorAsset[]>([]);
  const [mounted, setMounted] = useState(false);
  const [pairInfoSymbol, setPairInfoSymbol] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

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

    const tabMap: Record<string, SelectorAssetCategory> = {
      CURRENCIES: "CURRENCIES",
      CRYPTO: "CRYPTO",
      COMMODITIES: "COMMODITIES",
      STOCKS: "STOCKS",
      INDICES: "INDICES",
    };
    data = liveAssets.filter(a => a.category === (tabMap[activeTab] ?? "CURRENCIES"));

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
  }, [activeTab, searchQuery, sortKey, sortAsc, liveAssets]);

  const toggleFavorite = (symbol: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  };

  const displayName = (asset: AssetSelectorAsset) => {
    const base = asset.category === "CURRENCIES" ? asset.symbol : (asset.name || asset.symbol);
    return (asset.category === "CURRENCIES" || asset.category === "CRYPTO") && !base.includes("(OTC)")
      ? `${base} (OTC)`
      : base;
  };

  return (
    <div className="absolute inset-0 z-[100]">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${mounted ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      {/* Panel — Quotex style floating card */}
      <div
        className={`absolute left-2 top-2 bottom-2 sm:left-4 sm:top-4 sm:bottom-4 flex w-[calc(100vw-16px)] max-w-[560px] flex-col rounded-lg bg-[#14161d] shadow-2xl border border-white/5 transition-all duration-300 ease-out ${
          mounted ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-[19px] font-bold text-white">Select trade pair</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 px-5 pb-2">
          <div className="flex items-center gap-5">
            {TABS.filter((tab) => tab !== "INDICES").map(tab => {
              const isActive = activeTab === tab;
              const label =
                tab === "CURRENCIES" ? "Currencies" :
                tab === "CRYPTO" ? "Crypto" :
                tab === "COMMODITIES" ? "Commodities" :
                tab === "STOCKS" ? "Stocks" : "Indices";
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
                  className={`rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                    isActive ? "bg-[#1f6bf3] text-white" : "text-[#8b90a0] hover:text-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div className="shrink-0 flex items-center gap-2 px-5 py-3">
          <div className="flex h-10 w-[58px] shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#23262f] text-[#8b90a0]">
            <Star className="h-3.5 w-3.5" />
            <span className="text-[12px] font-semibold">{favorites.size}</span>
          </div>
          <div className="flex h-10 flex-1 items-center gap-2 rounded-md bg-[#23262f] px-3">
            <Search className="h-4 w-4 shrink-0 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-gray-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-white">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Column Headers */}
        <div className="shrink-0 px-5 pb-1">
          <div className="grid grid-cols-[28px_minmax(0,1fr)_110px_80px_70px] items-center gap-1 border-b border-white/10 pb-2">
            <span />
            <span className="text-[12px] font-normal text-[#8b90a0]">Name</span>
            <span className="text-right text-[12px] font-normal text-[#8b90a0]">24h changing</span>
            <button
              onClick={() => handleSort("profit1m")}
              className="flex items-center justify-end gap-1 text-[12px] font-normal text-[#8b90a0] hover:text-white transition-colors"
            >
              Profit 1+ min <span className="text-[10px]">▼</span>
            </button>
            <span className="text-right text-[12px] font-normal text-[#8b90a0]">5+ min</span>
          </div>
        </div>

        {/* Asset List */}
        <div className="asset-scroll flex-1 overflow-y-auto px-2 pb-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3a3f4d #14161d' }}>
          <style>{`
            .asset-scroll::-webkit-scrollbar { width: 6px; }
            .asset-scroll::-webkit-scrollbar-track { background: transparent; }
            .asset-scroll::-webkit-scrollbar-thumb { background: #3a3f4d; border-radius: 3px; }
          `}</style>
          <div>
            {filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-[13px] text-gray-500">
                {activeTab === "INDICES" ? (
                  <p>No indices found</p>
                ) : (
                  <p>No assets match your search.</p>
                )}
              </div>
            ) : (
              filteredData.map((asset) => {
                const isPositive = asset.change24h >= 0;
                const isFav = favorites.has(asset.symbol);

                return (
                  <div
                    key={asset.symbol}
                    onClick={() => onSelect(asset)}
                    className="grid grid-cols-[28px_minmax(0,1fr)_110px_80px_70px] items-center gap-1 rounded px-3 py-[9px] cursor-pointer transition-colors hover:bg-white/[0.04] border-b border-white/[0.04]"
                  >
                    {/* Star */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(asset.symbol); }}
                      className="flex items-center justify-start"
                    >
                      <Star className={`h-[17px] w-[17px] transition-colors ${isFav ? "fill-[#f5b301] text-[#f5b301]" : "text-[#6b7183] hover:text-white"}`} strokeWidth={1.5} />
                    </button>
                    {/* Name column */}
                    <div className="flex items-center gap-2 min-w-0">
                      <AssetSymbolMark
                        symbol={asset.symbol}
                        name={asset.name}
                        category={asset.category}
                        flags={[asset.baseCountry, asset.quoteCountry]}
                        stockLogo={asset.stockLogo}
                        commodityIcon={asset.commodityIcon}
                        size={22}
                        forcePairFlags={asset.category === "CRYPTO" || asset.category === "CURRENCIES"}
                      />
                      <div className="truncate text-[14px] font-bold text-white leading-tight">{displayName(asset)}</div>
                    </div>

                    {/* 24h change */}
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full ${isPositive ? "bg-[#0ba360]/20 text-[#0bb36b]" : "bg-[#e5484d]/20 text-[#e5484d]"}`}>
                        {isPositive ? (
                          <ArrowUp className="h-3 w-3" strokeWidth={3} />
                        ) : (
                          <ArrowDown className="h-3 w-3" strokeWidth={3} />
                        )}
                      </span>
                      <span className={`text-[13px] font-bold ${isPositive ? "text-[#0bb36b]" : "text-[#e5484d]"}`}>
                        {isPositive ? "+" : ""}{asset.change24h.toFixed(2)}%
                      </span>
                    </div>

                    {/* Profit 1+ min */}
                    <div className="flex items-center justify-end">
                      <span className="text-[13px] font-bold text-[#ff9f2e]">{asset.profit1m}%</span>
                    </div>

                    {/* Profit 5+ min */}
                    <div className="flex items-center justify-end">
                      <span className="text-[13px] font-bold text-[#ff9f2e]">{asset.profit5m}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {pairInfoSymbol && (
        <PairInfoModal
          symbol={pairInfoSymbol}
          onClose={() => setPairInfoSymbol(null)}
          onTradeNow={(s) => {
            const found = liveAssets.find((a) => a.symbol === s);
            if (found) {
              onSelect(found);
              onClose();
            }
          }}
        />
      )}
    </div>
  );
};
