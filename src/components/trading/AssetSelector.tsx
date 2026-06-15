import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { ChevronDown, Search, Star, Flame, Zap, DollarSign, Building2, Bitcoin, Droplet, PieChart, Briefcase, Bell, Info } from "lucide-react";
import { allAssets, Asset } from "./data/assets";

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

const useCategories = (t: (key: string) => string) => [
  { id: "Trending", label: t("assetSelector.trending"), icon: Flame },
  { 
    id: "Options", label: t("assetSelector.options"), icon: Zap,
    subItems: [
      { id: "Blitz", label: "Blitz", count: 132 },
      { id: "Trade", label: "Trade", count: 149 },
      { id: "Digital", label: t("assetSelector.digital"), count: 139 },
    ]
  },
  { id: "Forex", label: "Forex", icon: DollarSign, count: 36 },
  { id: "Stocks", label: "Stocks", icon: Building2, count: 244 },
  { id: "Crypto", label: "Crypto", icon: Bitcoin, count: 11 },
  { id: "Commodities", label: "Commodities", icon: Droplet, count: 4 },
  { id: "ETFs", label: "ETFs", icon: PieChart, count: 26 },
  { id: "Indices", label: "Indices", icon: Briefcase, count: 12 },
  { id: "Watchlist", label: "Watchlist", icon: Star, count: 5 },
];

export const AssetSelector = ({ selectedAsset, onSelectAsset }: AssetSelectorProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Options");
  const [activeSubCategory, setActiveSubCategory] = useState<string>("Trade");

  const currentFullAsset = allAssets.find(a => a.symbol === selectedAsset.symbol);
  const flags = currentFullAsset?.flags || [selectedAsset.symbol.charAt(0)];

  const CATEGORIES = useMemo(() => useCategories(t), [t]);

  const filteredAssets = useMemo(() => {
    return allAssets.filter((asset) => {
      const matchesSearch = asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || asset.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [searchQuery]);

  const handleSelectAsset = (asset: Asset) => {
    onSelectAsset({
      ...asset,
      price: asset.basePrice,
      change: parseFloat(asset.change5min || "0"),
    });
    setIsOpen(false);
  };

  return (
    <div className="relative z-50">
      {/* TRIGGER BUTTON (Top Left Style) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 hover:bg-white/5 rounded p-1.5 transition-colors min-w-[140px]"
      >
        <div className="flex -space-x-2">
           {flags.map((flag, idx) => (
              <div key={idx} className="w-6 h-6 rounded-full bg-trading-orange flex items-center justify-center text-[10px] border-2 border-[#141820] z-10 relative font-bold text-white shadow-sm" style={{ zIndex: 10 - idx }}>
                {flag === "🇺🇸" ? "US" : flag === "🇪🇺" ? "EU" : flag === "₿" ? "B" : "FX"}
              </div>
           ))}
        </div>
        <div className="flex flex-col items-start pr-2">
          <div className="flex items-center gap-2">
             <span className="font-bold text-foreground leading-tight tracking-wide">{selectedAsset.symbol}</span>
             <ChevronDown className={`w-3 h-3 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
           <span className="text-xs text-muted-foreground leading-none">{t("assetSelector.digital")}</span>
        </div>
      </button>

      {/* MODAL DROPDOWN */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-[calc(100%+8px)] left-0 w-[340px] h-[350px] bg-[#1a1b20] border border-white/10 rounded overflow-hidden shadow-2xl flex z-50">
            
            {/* Left Sidebar Menu */}
            <div className="w-[120px] bg-[#1d2029] border-r border-white/5 flex flex-col shrink-0 overflow-y-auto scrollbar-hide py-3">
               {CATEGORIES.map(cat => (
                 <div key={cat.id} className="mb-2">
                   <button
                     onClick={() => setActiveCategory(cat.id)}
                     className={`w-full flex items-center justify-between px-2 py-2 transition-colors text-center ${
                       activeCategory === cat.id ? "text-white" : "text-gray-400 hover:text-gray-200"
                     }`}
                   >
                     <div className="flex flex-col items-center gap-1 w-full">
                       <cat.icon className="w-[16px] h-[16px]" />
                       <span className={`font-semibold text-[10px] leading-tight ${activeCategory === cat.id ? "text-white" : ""}`}>{cat.label}</span>
                     </div>
                     </div>
                   </button>
                   
                   {/* Sub-items for active category */}
                   {cat.subItems && activeCategory === cat.id && (
                     <div className="flex flex-col mt-0.5 mb-1">
                       {cat.subItems.map(sub => (
                         <button
                           key={sub.id}
                           onClick={() => setActiveSubCategory(sub.id)}
                           className={`w-full flex items-center justify-center pl-4 pr-2 py-1 transition-colors text-center ${
                             activeSubCategory === sub.id ? "bg-white/5 text-white" : "text-gray-400 hover:text-gray-200"
                           }`}
                         >
                           <span className="font-medium text-[9px]">{sub.label}</span>
                         </button>
                       ))}
                     </div>
                   )}
                 </div>
               ))}
            </div>

            {/* Right Main Content */}
            <div className="flex-1 flex flex-col bg-[#141820]">
              
              {/* Header: Search */}
              <div className="p-2 border-b border-white/5 shrink-0">
                 <div className="relative">
                   <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                   <input 
                     type="text" 
                      placeholder={t("assetSelector.searchPlaceholder")}
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full bg-transparent border-none text-[11px] text-white placeholder:text-gray-500 py-1 pl-7 pr-2 focus:outline-none transition-colors"
                   />
                 </div>
              </div>

              {/* Asset List Body */}
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <table className="w-full text-left text-[11px] text-gray-400">
                  <thead className="sticky top-0 bg-[#141820] z-10 border-b border-white/5">
                    <tr>
                      <th className="py-1.5 px-2 font-medium text-[10px]">{t("assetSelector.sortByName")}</th>
                      <th className="py-1.5 px-1 font-medium text-right text-[10px] hover:text-white cursor-pointer transition-colors">{t("assetSelector.price")}</th>
                      <th className="py-1.5 px-1 font-medium text-right text-[10px] hover:text-white cursor-pointer transition-colors">{t("assetSelector.hourly")}</th>
                      <th className="py-1.5 px-2 font-medium text-right text-[10px] hover:text-white cursor-pointer transition-colors">{t("assetSelector.profit")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map(asset => (
                      <tr 
                        key={asset.symbol} 
                        onClick={() => handleSelectAsset(asset)} 
                        className="cursor-pointer hover:bg-white/5 transition-colors group border-b border-white/5"
                      >
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-1.5">
                             <div className="flex -space-x-0.5">
                               {asset.flags.map((flag, idx) => (
                                  <div key={idx} className="w-4 h-4 rounded-full bg-trading-orange flex items-center justify-center text-[7px] border border-[#141820] z-10 font-bold text-white shadow-sm" style={{ zIndex: 10 - idx }}>
                                    {flag === "🇺🇸" ? "US" : flag === "🇪🇺" ? "EU" : flag === "₿" ? "B" : "FX"}
                                  </div>
                               ))}
                             </div>
                             <span className="font-bold text-white text-[10px]">{asset.symbol}</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-1 text-right text-gray-300 font-medium text-[10px]">
                          {asset.basePrice.toFixed(asset.basePrice > 100 ? 5 : 6)}
                        </td>
                        <td className={`py-1.5 px-1 text-right font-medium text-[10px] ${parseFloat(asset.change5min||"0") >= 0 ? "text-trading-green" : "text-trading-red"}`}>
                          {asset.change5min || "+0.00%"}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-bold text-trading-green text-[10px]">{asset.maxProfit || 87}%</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Bell className="w-[12px] h-[12px] text-gray-400 hover:text-white" />
                              <Star className="w-[12px] h-[12px] text-gray-400 hover:text-white" />
                              <Info className="w-[12px] h-[12px] text-gray-400 hover:text-white" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    
                    {filteredAssets.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">
                          {t("assetSelector.noAssetsFound")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AssetSelector;
