import { useState, useEffect, useMemo } from "react";
import { Search, Power, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ASSETS_LIBRARY, MasterAsset } from "@/data/assetsLibrary";
import {
  clampAssetPayout,
  getAssetDefaultPayout,
} from "@/lib/assets";
import AssetSymbolMark from "@/components/trading/AssetSymbolMark";

interface AssetConfig {
  id: string;
  symbol: string;
  status: string;
  payout_pct: number;
}

type TabType = "ALL" | "CURRENCIES" | "CRYPTO" | "STOCKS" | "COMMODITIES";

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
          nextDrafts[asset.symbol] = String(clampAssetPayout(asset.payout_pct, getAssetDefaultPayout("CURRENCIES")));
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
      <AssetSymbolMark
        symbol={asset.symbol}
        name={asset.name}
        category={asset.category}
        flags={[asset.base_country, asset.quote_country]}
        stockLogo={asset.stock_logo}
        commodityIcon={asset.commodity_icon}
        size={24}
        className="ml-1"
      />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6" style={{ borderColor: "var(--admin-border)" }}>
        <div>
          <h2 className="text-2xl font-bold text-white">Asset Library</h2>
          <p className="text-sm text-slate-300 mt-1">Browse and enable hundreds of pre-configured assets for your traders.</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-lg border" style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}>
        <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 border-b" style={{ borderColor: "var(--admin-border)", background: "var(--admin-surface)" }}>
          
          <div className="flex space-x-1 p-1 rounded-lg w-full md:w-auto" style={{ background: "var(--admin-canvas)" }}>
            {(["ALL", "CURRENCIES", "CRYPTO", "STOCKS", "COMMODITIES"] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  activeTab === tab ? "bg-[var(--admin-green)] text-white shadow-sm" : "text-slate-300 hover:text-white hover:bg-[var(--admin-surface)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex gap-2 relative w-full md:w-80">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
             <input 
               type="text" 
               placeholder="Search by symbol or name..." 
               value={searchTerm} 
               onChange={e => setSearchTerm(e.target.value)} 
               className="w-full rounded-lg pl-9 pr-4 py-2 text-sm text-white outline-none transition-colors" style={{ borderColor: "var(--admin-border)", background: "var(--admin-canvas)" }} 
             />
          </div>
        </div>
        
        <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
          <table className="w-full min-w-[760px] text-left text-sm text-slate-200">
            <thead className="sticky top-0 text-xs uppercase text-slate-300 z-10" style={{ background: "var(--admin-surface)", borderColor: "var(--admin-border)" }}>
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
                 <tr><td colSpan={6} className="text-center py-12 text-slate-400">Loading DB assets...</td></tr>
              ) : filteredLibrary.length === 0 ? (
                 <tr><td colSpan={6} className="text-center py-12 text-slate-400">No assets found matching your criteria.</td></tr>
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
                      <div className="text-xs text-slate-400">{ast.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1.5 rounded text-slate-200 text-[10px] font-bold tracking-wider" style={{ background: "var(--admin-surface)" }}>{ast.category}</span>
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
                          className="h-10 w-20 rounded-lg px-3 text-sm font-semibold text-white outline-none transition-colors" style={{ borderColor: "var(--admin-border)", background: "var(--admin-canvas)" }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSavePayout(ast, dbMatch)}
                          disabled={!isAdded || !payoutChanged || savingPayoutSymbol === ast.symbol}
                          className="rounded-lg px-3 py-2 text-[11px] font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40" style={{ borderColor: "var(--admin-border)" }}
                        >
                          {savingPayoutSymbol === ast.symbol ? "Saving" : "Save"}
                        </button>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        {!isAdded ? "Applied when enabled" : "Allowed range: 60% to 95%"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isActive ? (
                        <span className="flex items-center gap-1.5 text-[#00C076] text-xs font-bold tracking-wide">
                          <CheckCircle2 size={14} /> ACTIVE
                        </span>
                      ) : isAdded ? (
                        <span className="flex items-center gap-1.5 text-slate-400 text-xs font-bold tracking-wide">
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
                             ? "bg-[var(--admin-surface)] text-slate-300 hover:bg-red-500/20 hover:text-red-400" 
                             : "bg-[var(--admin-green)] text-white hover:bg-[var(--admin-green)] hover:scale-105"
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

