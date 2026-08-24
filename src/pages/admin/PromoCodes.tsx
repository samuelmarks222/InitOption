import { useState, useEffect } from "react";
import { Search, Plus, Trash2 } from "lucide-react";
import { api } from "@/integrations/api/client";
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

const BORDER = "#202B3A";

const PromoCodes = () => {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newPromo, setNewPromo] = useState({
    code: "", type: "Percentage", reward_value: "", max_usages: 100, expiry_date: ""
  });

  useEffect(() => { void fetchPromos(); }, []);

  const fetchPromos = async () => {
    setLoading(true);
    const { data, error } = await api.from("promo_codes").select("*").order("created_at", { ascending: false });
    if (error) { console.error("Error fetching promos:", error); }
    else { setPromos(data || []); }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this promo code?")) return;
    const { error } = await api.from("promo_codes").delete().eq("id", id);
    if (error) { toast({ title: "Failed to delete", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Promo deleted" }); setPromos(promos.filter(p => p.id !== id)); }
  };

  const handleCreatePromo = async () => {
    if (!newPromo.code || !newPromo.reward_value || !newPromo.expiry_date) {
      toast({ title: "Validation Error", description: "Fill all required fields", variant: "destructive" });
      return;
    }
    const expiry = new Date(newPromo.expiry_date).toISOString();
    const { data, error } = await api.from("promo_codes").insert({
      code: newPromo.code.toUpperCase(), type: newPromo.type, reward_value: newPromo.reward_value,
      max_usages: newPromo.max_usages, expiry_date: expiry, status: "active"
    }).select().single();

    if (error) { toast({ title: "Error creating promo", description: error.message, variant: "destructive" }); }
    else if (data) {
      toast({ title: "Promo code created" });
      setPromos([data, ...promos]);
      setIsCreating(false);
      setNewPromo({ code: "", type: "Percentage", reward_value: "", max_usages: 100, expiry_date: "" });
    }
  };

  const filteredPromos = promos.filter(p => p.code.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4" style={{ borderColor: BORDER }}>
        <div>
          <h2 className="text-xl font-black text-white">PROMO CODE MANAGEMENT</h2>
          <p className="text-xs text-[#8D9AAF]">Create, monitor, and expire promotional marketing codes.</p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-1.5 rounded-lg border border-[#00C98D]/30 bg-[#00C98D]/10 px-3 py-1.5 text-xs font-bold text-[#00C98D] hover:bg-[#00C98D] hover:text-black transition-colors"
        >
          <Plus size={13} /> {isCreating ? "Cancel" : "New Promo Code"}
        </button>
      </div>

      {/* Create Form (collapsible) */}
      {isCreating && (
        <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
          <div className="border-b bg-[#121B29] px-4 py-2.5" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Create New Promo Code</p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-5">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Code</label>
              <input type="text" value={newPromo.code} onChange={e => setNewPromo({...newPromo, code: e.target.value})} placeholder="WELCOME100"
                className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Type</label>
              <select value={newPromo.type} onChange={e => setNewPromo({...newPromo, type: e.target.value})}
                className="w-full h-8 rounded-lg border bg-[#080D16] px-2 text-xs text-white outline-none focus:border-[#00C98D] appearance-none" style={{ borderColor: BORDER }}>
                <option value="Percentage">Percentage</option>
                <option value="Fixed Bonus">Fixed Bonus</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Value</label>
              <input type="text" value={newPromo.reward_value} onChange={e => setNewPromo({...newPromo, reward_value: e.target.value})} placeholder="50% or $100"
                className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Max Usages</label>
              <input type="number" value={newPromo.max_usages} onChange={e => setNewPromo({...newPromo, max_usages: Number(e.target.value)})}
                className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Expiry Date</label>
              <input type="date" value={newPromo.expiry_date} onChange={e => setNewPromo({...newPromo, expiry_date: e.target.value})}
                className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
            </div>
            <div className="md:col-span-5 flex justify-end border-t pt-3" style={{ borderColor: BORDER }}>
              <button onClick={handleCreatePromo}
                className="rounded-lg bg-[#00C98D] px-5 py-1.5 text-xs font-bold text-black hover:bg-[#00b37d] transition-colors">
                Save & Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="flex items-center gap-3 rounded-lg border bg-[#0D1420] p-3" style={{ borderColor: BORDER }}>
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input type="text" placeholder="Search promo code..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-8 rounded-lg border bg-[#080D16] pl-8 pr-3 text-xs text-white outline-none placeholder:text-gray-500 focus:border-[#00C98D]"
            style={{ borderColor: BORDER }} />
        </div>
      </div>

      {/* Dense Promo Table */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b bg-[#121B29] text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]" style={{ borderColor: BORDER }}>
                <th className="px-4 py-3">CODE</th>
                <th className="px-4 py-3">REWARD VALUE</th>
                <th className="px-4 py-3">USAGES</th>
                <th className="px-4 py-3">EXPIRY</th>
                <th className="px-4 py-3">STATUS</th>
                <th className="px-4 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202B3A]">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">Loading promo codes...</td></tr>
              ) : filteredPromos.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">No promo codes found.</td></tr>
              ) : filteredPromos.map((promo) => (
                <tr key={promo.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5 font-mono font-black text-[#00C98D] tracking-widest">{promo.code}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-bold text-white">{promo.reward_value}</div>
                    <div className="text-[10px] uppercase text-[#5E6B7D]">{promo.type}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-mono text-white">{promo.usages} / {promo.max_usages}</div>
                    <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-[#00C98D]" style={{ width: `${Math.min((promo.usages / promo.max_usages) * 100, 100)}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[#8D9AAF]">{new Date(promo.expiry_date).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      promo.status === "active" ? "bg-[#00C98D]/15 text-[#00C98D]" : "bg-[#5E6B7D]/15 text-[#5E6B7D]"
                    }`}>{promo.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => handleDelete(promo.id)}
                      className="rounded border border-[#EF4444]/30 p-1 text-[#EF4444] hover:bg-[#EF4444] hover:text-white transition-colors">
                      <Trash2 size={12} />
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
