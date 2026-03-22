import { useState, useEffect, useMemo } from "react";
import { Search, Power, PowerOff, CheckCircle2, Circle, Gem, Flame, Magnet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ASSETS_LIBRARY, MasterAsset } from "@/data/assetsLibrary";
import Flag from "react-world-flags";
import {
  clampAssetPayout,
  getAssetDefaultPayout,
  getAssetFallbackLabel,
  getCryptoLogoUrl,
} from "@/lib/assets";

interface AssetConfig {
  id: string;
  symbol: string;
  status: string;
  payout_pct: number;
}

type TabType = "ALL" | "OTC" | "CRYPTO" | "STOCKS" | "COMMODITIES";

const AssetManagement = () => {
  const [dbAssets, setDbAssets] = useState<AssetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [payoutDrafts, setPayoutDrafts] = useState<Record<string, string>>({});
  const [savingPayoutSymbol, setSavingPayoutSymbol] = useState<string | null>(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('assets_config').select('id, symbol, status, payout_pct');
    if (error) console.error("Error fetching assets:", error);
    else {
      const nextAssets = data || [];
      setDbAssets(nextAssets);
      setPayoutDrafts((current) => {
        const nextDrafts = { ...current };
        nextAssets.forEach((asset) => {
          nextDrafts[asset.symbol] = String(clampAssetPayout(asset.payout_pct, getAssetDefaultPayout("OTC")));
        });
        return nextDrafts;
      });
    }
    setLoading(false);
  };

  const getDraftPayout = (asset: MasterAsset, dbAsset?: AssetConfig) =>
    payoutDrafts[asset.symbol] ?? String(clampAssetPayout(dbAsset?.payout_pct, getAssetDefaultPayout(asset.category)));

  const handleDraftChange = (symbol: string, value: string) => {
    if (!/^\d*$/.test(value)) return;
    setPayoutDrafts((current) => ({ ...current, [symbol]: value }));
  };

  const handleSavePayout = async (asset: MasterAsset, dbAsset?: AssetConfig) => {
    if (!dbAsset) {
      toast({ title: "Enable this asset first", description: "The payout draft will be used when you enable the asset." });
      return;
    }

    const nextPayout = clampAssetPayout(getDraftPayout(asset, dbAsset), getAssetDefaultPayout(asset.category));
    setSavingPayoutSymbol(asset.symbol);

    const { error } = await supabase
      .from('assets_config')
      .update({ payout_pct: nextPayout })
      .eq('id', dbAsset.id);

    if (error) {
      toast({ title: "Failed to save payout", description: error.message, variant: "destructive" });
    } else {
      setDbAssets((current) => current.map((item) => item.id === dbAsset.id ? { ...item, payout_pct: nextPayout } : item));
      setPayoutDrafts((current) => ({ ...current, [asset.symbol]: String(nextPayout) }));
      toast({ title: `${asset.symbol} payout updated`, description: `Profit percentage is now ${nextPayout}%.` });
    }

    setSavingPayoutSymbol(null);
  };

  const handleToggleAsset = async (master: MasterAsset, dbAsset?: AssetConfig) => {
    // Optimistic UI updates could go here, but doing it safely
    if (dbAsset) {
      // Toggle status
      const newStatus = dbAsset.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase.from('assets_config').update({ status: newStatus }).eq('id', dbAsset.id);
      if (error) {
        toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      } else {
        setDbAssets(dbAssets.map(a => a.id === dbAsset.id ? { ...a, status: newStatus } : a));
        toast({ title: `${master.symbol} marked as ${newStatus}` });
      }
    } else {
      // Create new active asset
      const payout = clampAssetPayout(getDraftPayout(master), getAssetDefaultPayout(master.category));
      const { data, error } = await supabase.from('assets_config').insert({
        symbol: master.symbol,
        name: master.name,
        category: master.category,
        min_trade: 1,
        max_trade: 5000,
        payout_pct: payout,
        spread: 0,
        status: "active"
      }).select().single();

      if (error) {
        toast({ title: "Error creating asset", description: error.message, variant: "destructive" });
      } else if (data) {
        setDbAssets([...dbAssets, data]);
        setPayoutDrafts((current) => ({ ...current, [master.symbol]: String(payout) }));
        toast({ title: `${master.symbol} Added to Platform!` });
      }
    }
  };

  const filteredLibrary = useMemo(() => {
    return ASSETS_LIBRARY.filter(a => {
      const matchSearch = a.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || a.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTab = activeTab === "ALL" || a.category === activeTab;
      return matchSearch && matchTab;
    });
  }, [searchTerm, activeTab]);

  const renderIcon = (asset: MasterAsset) => (
    <div className="flex items-center shrink-0 w-10">
      {asset.category === "OTC" && (
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full overflow-hidden border border-[#1A1F26] z-10 bg-white"><Flag code={asset.base_country} className="w-full h-full object-cover" /></div>
          <div className="w-6 h-6 rounded-full overflow-hidden border border-[#1A1F26] z-0 bg-white"><Flag code={asset.quote_country} className="w-full h-full object-cover" /></div>
        </div>
      )}
      {asset.category === "CRYPTO" && (
        <div className="relative ml-1 flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white p-0.5 shadow-sm">
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
          <div className="absolute inset-0 hidden items-center justify-center bg-[#f59e0b] text-[9px] font-black text-white">
            {getAssetFallbackLabel(asset.symbol, asset.name)}
          </div>
        </div>
      )}
      {asset.category === "STOCKS" && (
        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm overflow-hidden ml-1 relative">
           <img 
             src={asset.stock_logo} 
             alt="" 
             className="w-full h-full object-contain" 
             onError={(e) => { 
               e.currentTarget.style.display = 'none'; 
               if (e.currentTarget.nextElementSibling) {
                 (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
               }
             }} 
           />
           <div className="absolute inset-0 bg-blue-600 flex items-center justify-center hidden z-0">
             <span className="text-white text-[10px] font-bold">{getAssetFallbackLabel(asset.symbol, asset.name, 1)}</span>
           </div>
        </div>
      )}
      {asset.category === "COMMODITIES" && (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-sm ml-1 border border-white/10">
          {asset.commodity_icon === "gold" && <div className="w-3 h-3 bg-yellow-400 rounded-sm skew-x-12" />}
          {asset.commodity_icon === "silver" && <div className="w-3 h-3 bg-gray-300 rounded-sm skew-x-12" />}
          {asset.commodity_icon === "oil" && <div className="w-3 h-4 bg-black rounded-sm border border-gray-600" />}
          {asset.commodity_icon === "gas" && <Flame className="w-3 h-3 text-blue-400" />}
          {asset.commodity_icon === "copper" && <Magnet className="w-3 h-3 text-orange-600" />}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Asset Library</h2>
          <p className="text-sm text-gray-400 mt-1">Browse and enable hundreds of pre-configured assets for your traders.</p>
        </div>
      </div>

      <div className="bg-[#11161d] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row justify-between items-center bg-[#1A1F26] gap-4">
          
          <div className="flex space-x-1 bg-[#0b0e14] p-1 rounded-lg w-full md:w-auto">
            {(["ALL", "OTC", "CRYPTO", "STOCKS", "COMMODITIES"] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  activeTab === tab ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex gap-2 relative w-full md:w-80">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
             <input 
               type="text" 
               placeholder="Search by symbol or name..." 
               value={searchTerm} 
               onChange={e => setSearchTerm(e.target.value)} 
               className="w-full bg-[#0b0e14] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors" 
             />
          </div>
        </div>
        
        <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
          <table className="w-full min-w-[760px] text-left text-sm text-gray-300">
            <thead className="sticky top-0 text-xs uppercase bg-[#1A1F26] text-gray-400 border-b border-white/5 z-10">
              <tr>
                <th className="px-6 py-4 font-semibold w-12">Asset</th>
                <th className="px-6 py-4 font-semibold">Symbol & Name</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Payout %</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                 <tr><td colSpan={6} className="text-center py-12 text-gray-500">Loading DB assets...</td></tr>
              ) : filteredLibrary.length === 0 ? (
                 <tr><td colSpan={6} className="text-center py-12 text-gray-500">No assets found matching your criteria.</td></tr>
              ) : filteredLibrary.map((ast) => {
                const dbMatch = dbAssets.find(d => d.symbol === ast.symbol);
                const isActive = dbMatch && dbMatch.status === 'active';
                const isAdded = !!dbMatch;
                const draftPayout = getDraftPayout(ast, dbMatch);
                const normalizedDraftPayout = clampAssetPayout(draftPayout, getAssetDefaultPayout(ast.category));
                const payoutChanged = Boolean(dbMatch) && normalizedDraftPayout !== clampAssetPayout(dbMatch.payout_pct, getAssetDefaultPayout(ast.category));

                return (
                  <tr key={ast.symbol} className={`transition-colors ${isActive ? "bg-[#0b65c2]/5" : "hover:bg-white/[0.02]"}`}>
                    <td className="px-6 py-4">
                      {renderIcon(ast)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-[15px]">{ast.symbol}</div>
                      <div className="text-xs text-gray-500">{ast.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1.5 rounded bg-white/5 text-gray-300 text-[10px] font-bold tracking-wider">{ast.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={60}
                          max={95}
                          step={1}
                          value={draftPayout}
                          onChange={(event) => handleDraftChange(ast.symbol, event.target.value)}
                          className="h-10 w-20 rounded-lg border border-white/10 bg-[#0b0e14] px-3 text-sm font-semibold text-white outline-none transition-colors focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleSavePayout(ast, dbMatch)}
                          disabled={!isAdded || !payoutChanged || savingPayoutSymbol === ast.symbol}
                          className="rounded-lg border border-white/10 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {savingPayoutSymbol === ast.symbol ? "Saving" : "Save"}
                        </button>
                      </div>
                      <div className="mt-1 text-[11px] text-gray-500">
                        {!isAdded ? "Applied when enabled" : "Allowed range: 60% to 95%"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isActive ? (
                        <span className="flex items-center gap-1.5 text-[#00C076] text-xs font-bold tracking-wide">
                          <CheckCircle2 size={14} /> ACTIVE
                        </span>
                      ) : isAdded ? (
                        <span className="flex items-center gap-1.5 text-gray-500 text-xs font-bold tracking-wide">
                          <Circle size={14} /> INACTIVE
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-gray-600 text-xs font-medium tracking-wide">
                          Not Added
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                         onClick={() => handleToggleAsset(ast, dbMatch)} 
                         className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 ml-auto ${
                           isActive 
                             ? "bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-400" 
                             : "bg-blue-600 text-white hover:bg-blue-500 hover:scale-105"
                         }`}
                       >
                        {isActive ? (
                          <>Disable Asset</>
                        ) : (
                          <><Power size={14} /> Enable</>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AssetManagement;
