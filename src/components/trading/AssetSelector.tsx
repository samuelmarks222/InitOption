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
          <div className="absolute top-[calc(100%+8px)] left-0 w-[550px] h-[500px] bg-[#1a1b20] border border-white/10 rounded overflow-hidden shadow-2xl flex z-50">
            
            {/* Left Sidebar Menu */}
            <div className="w-[160px] bg-[#1d2029] border-r border-white/5 flex flex-col shrink-0 overflow-y-auto scrollbar-hide py-4">
               {CATEGORIES.map(cat => (
                 <div key={cat.id} className="mb-2">
                   <button
                     onClick={() => setActiveCategory(cat.id)}
                     className={`w-full flex items-center justify-between px-3 py-3 transition-colors ${
                       activeCategory === cat.id ? "text-white" : "text-gray-400 hover:text-gray-200"
                     }`}
                   >
                     <div className="flex items-center gap-2">
                       <cat.icon className="w-[18px] h-[18px]" />
                       <span className={`font-semibold text-[12px] ${activeCategory === cat.id ? "text-white" : ""}`}>{cat.label}</span>
                     </div>
                     {cat.count !== undefined && !cat.subItems && (
                       <span className="text-[10px] bg-[#2a2d3e] px-2 py-0.5 rounded-full text-gray-400 font-medium">{cat.count}</span>
                     )}
                   </button>
                   
                   {/* Sub-items for active category */}
                   {cat.subItems && activeCategory === cat.id && (
                     <div className="flex flex-col mt-1 mb-2">
                       {cat.subItems.map(sub => (
                         <button
                           key={sub.id}
                           onClick={() => setActiveSubCategory(sub.id)}
                           className={`w-full flex items-center justify-between pl-8 pr-3 py-2.5 transition-colors ${
                             activeSubCategory === sub.id ? "bg-white/5 text-white" : "text-gray-400 hover:text-gray-200"
                           }`}
                         >
                           <span className="font-medium text-[12px]">{sub.label}</span>
                           <span className="text-[10px] bg-[#2a2d3e] px-2 py-0.5 rounded-full text-gray-400 font-medium">{sub.count}</span>
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
              <div className="p-4 border-b border-white/5 shrink-0">
                 <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                   <input 
                     type="text" 
                      placeholder={t("assetSelector.searchPlaceholder")}
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full bg-transparent border-none text-[13px] text-white placeholder:text-gray-500 py-2 pl-10 pr-4 focus:outline-none transition-colors"
                   />
                 </div>
              </div>

              {/* Asset List Body */}
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <table className="w-full text-left text-[13px] text-gray-400">
                  <thead className="sticky top-0 bg-[#141820] z-10 border-b border-white/5">
                    <tr>
                      <th className="py-3 px-6 font-medium">{t("assetSelector.sortByName")}</th>
                      <th className="py-3 px-4 font-medium text-right hover:text-white cursor-pointer transition-colors">{t("assetSelector.price")}</th>
                      <th className="py-3 px-4 font-medium text-right hover:text-white cursor-pointer transition-colors">{t("assetSelector.hourly")}</th>
                      <th className="py-3 px-6 font-medium text-right hover:text-white cursor-pointer transition-colors">{t("assetSelector.profit")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map(asset => (
                      <tr 
                        key={asset.symbol} 
                        onClick={() => handleSelectAsset(asset)} 
                        className="cursor-pointer hover:bg-white/5 transition-colors group border-b border-white/5"
                      >
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-3">
                             <div className="flex -space-x-1">
                               {asset.flags.map((flag, idx) => (
                                  <div key={idx} className="w-6 h-6 rounded-full bg-trading-orange flex items-center justify-center text-[10px] border-2 border-[#141820] z-10 font-bold text-white shadow-sm" style={{ zIndex: 10 - idx }}>
                                    {flag === "🇺🇸" ? "US" : flag === "🇪🇺" ? "EU" : flag === "₿" ? "B" : "FX"}
                                  </div>
                               ))}
                             </div>
                             <span className="font-bold text-white">{asset.symbol}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-300 font-medium tracking-wide">
                          {asset.basePrice.toFixed(asset.basePrice > 100 ? 5 : 6)}
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${parseFloat(asset.change5min||"0") >= 0 ? "text-trading-green" : "text-trading-red"}`}>
                          {asset.change5min || "+0.00%"}
                        </td>
                        <td className="py-3 px-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <span className="font-bold text-trading-green text-sm">{asset.maxProfit || 87}%</span>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Bell className="w-[14px] h-[14px] text-gray-400 hover:text-white" />
                              <Star className="w-[14px] h-[14px] text-gray-400 hover:text-white" />
                              <Info className="w-[14px] h-[14px] text-gray-400 hover:text-white" />
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
