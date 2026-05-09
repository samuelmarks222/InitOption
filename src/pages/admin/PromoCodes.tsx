import { useState, useEffect } from "react";
import { Search, Plus, Trash2, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PromoCode {
  id: string;
  code: string;
  type: string;
  reward_value: string;
  usages: number;
  max_usages: number;
  expiry_date: string;
  status: string;
}

const PromoCodes = () => {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  // New promo form state
  const [newPromo, setNewPromo] = useState({
    code: "", type: "Percentage", reward_value: "", max_usages: 100, expiry_date: ""
  });

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
    if (error) {
       console.error("Error fetching promos:", error);
    } else {
       setPromos(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promo code?")) return;
    const { error } = await supabase.from('promo_codes').delete().eq('id', id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Promo deleted!" });
      setPromos(promos.filter(p => p.id !== id));
    }
  };

  const handleCreatePromo = async () => {
    if (!newPromo.code || !newPromo.reward_value || !newPromo.expiry_date) {
      toast({ title: "Validation Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    
    // Quick UTC conversion for DB
    const expiry = new Date(newPromo.expiry_date).toISOString();

    const { data, error } = await supabase.from('promo_codes').insert({
      code: newPromo.code.toUpperCase(),
      type: newPromo.type,
      reward_value: newPromo.reward_value,
      max_usages: newPromo.max_usages,
      expiry_date: expiry,
      status: "active"
    }).select().single();

    if (error) {
      toast({ title: "Error creating promo", description: error.message, variant: "destructive" });
    } else if (data) {
      toast({ title: "Promo code created successfully!" });
      setPromos([data, ...promos]);
      setIsCreating(false);
      setNewPromo({ code: "", type: "Percentage", reward_value: "", max_usages: 100, expiry_date: "" });
    }
  };

  const filteredPromos = promos.filter(p => p.code.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Promo Codes</h2>
          <p className="text-sm text-slate-300 mt-1">Create and monitor promotional marketing codes (LIVE DB).</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
             onClick={() => setIsCreating(!isCreating)}
             className="flex items-center gap-2 bg-[#0fa053] hover:bg-[#1e2330] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-[#0fa053]/20"
          >
            <Plus size={16} /> {isCreating ? "Cancel" : "Create Code"}
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="bg-[#1e2330] border border-[#1e2330] rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">Create New Promo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Code</label>
              <input type="text" value={newPromo.code} onChange={e => setNewPromo({...newPromo, code: e.target.value})} placeholder="WELCOME100" className="w-full bg-[#1c1f2d] border border-[#1e2330] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Type</label>
              <select value={newPromo.type} onChange={e => setNewPromo({...newPromo, type: e.target.value})} className="w-full bg-[#1c1f2d] border border-[#1e2330] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none">
                <option value="Percentage">Percentage</option>
                <option value="Fixed Bonus">Fixed Bonus</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Value</label>
              <input type="text" value={newPromo.reward_value} onChange={e => setNewPromo({...newPromo, reward_value: e.target.value})} placeholder="e.g. 50% or $100" className="w-full bg-[#1c1f2d] border border-[#1e2330] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Max Usages</label>
              <input type="number" value={newPromo.max_usages} onChange={e => setNewPromo({...newPromo, max_usages: Number(e.target.value)})} className="w-full bg-[#1c1f2d] border border-[#1e2330] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Expiry Date</label>
              <input type="date" value={newPromo.expiry_date} onChange={e => setNewPromo({...newPromo, expiry_date: e.target.value})} className="w-full bg-[#1c1f2d] border border-[#1e2330] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none" />
            </div>
            <div className="md:col-span-5 flex justify-end mt-2">
               <button onClick={handleCreatePromo} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors">
                 Save & Activate
               </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1e2330] border border-[#1e2330] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-[#1e2330] flex justify-between items-center bg-[#1e2330]">
          <div className="flex gap-2 relative w-full max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
             <input type="text" placeholder="Search code..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[#1c1f2d] border border-[#1e2330] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm text-slate-200">
            <thead className="text-xs uppercase bg-[#1e2330] text-slate-300 border-b border-[#1e2330]">
              <tr>
                <th className="px-6 py-3 font-semibold">Promo Code</th>
                <th className="px-6 py-3 font-semibold">Reward Value</th>
                <th className="px-6 py-3 font-semibold">Usages</th>
                <th className="px-6 py-3 font-semibold">Expiry Date</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
               {loading ? (
                 <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading live data...</td></tr>
               ) : filteredPromos.length === 0 ? (
                 <tr><td colSpan={6} className="text-center py-8 text-slate-400">No promo codes found in database.</td></tr>
               ) : filteredPromos.map((promo) => (
                <tr key={promo.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 font-mono font-bold text-white text-lg tracking-wider bg-gradient-to-r from-[#0fa053] to-[#1e2330] bg-clip-text text-transparent w-fit inline-block">
                    {promo.code}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{promo.reward_value}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{promo.type}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white">{promo.usages} / {promo.max_usages}</div>
                    <div className="w-24 h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-[#0fa053]" style={{ width: `${Math.min((promo.usages / promo.max_usages) * 100, 100)}%` }}></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-mono">
                    {new Date(promo.expiry_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                     <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider w-fit ${
                        promo.status === "active" ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-slate-400"
                      }`}>
                        {promo.status}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(promo.id)} className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Delete Promo">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PromoCodes;





