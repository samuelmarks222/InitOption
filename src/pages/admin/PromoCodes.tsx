import { useState, useEffect } from "react";
import { Search, Plus, Trash2, Power, RefreshCw, Gift } from "lucide-react";
import { api } from "@/integrations/api/client";
import { toast } from "@/hooks/use-toast";

interface PromoCode {
  id: string;
  code: string;
  type: string;
  reward_value: string;
  minimum_deposit_amount?: number | null;
  usages: number;
  max_usages: number;
  expiry_date: string;
  status: string;
}

const BORDER = "#202B3A";

const DEFAULT_DEPOSIT_BONUSES = [
  {
    code: "WELCOME50",
    type: "Percentage",
    reward_value: "50%",
    minimum_deposit_amount: 30,
    max_usages: 10000,
    expiry_date: "2030-12-31T23:59:59Z",
    status: "active",
    title: "WELCOME50 (+50% Bonus on >$30)",
    position: 1,
  },
  {
    code: "DEPOSIT50",
    type: "Percentage",
    reward_value: "50%",
    minimum_deposit_amount: 100,
    max_usages: 10000,
    expiry_date: "2030-12-31T23:59:59Z",
    status: "active",
    title: "DEPOSIT50 (+50% Bonus on >$100)",
    position: 2,
  },
  {
    code: "DEPOSIT40",
    type: "Percentage",
    reward_value: "40%",
    minimum_deposit_amount: 80,
    max_usages: 10000,
    expiry_date: "2030-12-31T23:59:59Z",
    status: "active",
    title: "DEPOSIT40 (+40% Bonus on >$80)",
    position: 3,
  },
  {
    code: "DEPOSIT30",
    type: "Percentage",
    reward_value: "30%",
    minimum_deposit_amount: 70,
    max_usages: 10000,
    expiry_date: "2030-12-31T23:59:59Z",
    status: "active",
    title: "DEPOSIT30 (+30% Bonus on >$70)",
    position: 4,
  },
];

const PromoCodes = () => {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newPromo, setNewPromo] = useState({
    code: "",
    type: "Percentage",
    reward_value: "50%",
    minimum_deposit_amount: 30,
    max_usages: 1000,
    expiry_date: "",
  });

  useEffect(() => {
    void fetchAndSeedPromos();
  }, []);

  const fetchAndSeedPromos = async () => {
    setLoading(true);

    const { data: existingData, error } = await api.from("promo_codes").select("*").order("created_at", { ascending: false });

    let currentPromos = existingData || [];

    // Ensure the 4 requested predefined deposit bonuses exist in promo_codes table
    const existingCodes = new Set(currentPromos.map((p) => p.code.toUpperCase()));
    const missingBonuses = DEFAULT_DEPOSIT_BONUSES.filter((b) => !existingCodes.has(b.code));

    if (missingBonuses.length > 0) {
      for (const bonus of missingBonuses) {
        await api.from("promo_codes").insert({
          code: bonus.code,
          type: bonus.type,
          reward_value: bonus.reward_value,
          minimum_deposit_amount: bonus.minimum_deposit_amount,
          usages: 0,
          max_usages: bonus.max_usages,
          expiry_date: bonus.expiry_date,
          status: bonus.status,
        });

        // Also sync into deposit_bonus_offers table for automated deposit matcher
        await api.from("deposit_bonus_offers").insert({
          title: bonus.title,
          bonus_percent: parseInt(bonus.reward_value),
          deposit_amount: bonus.minimum_deposit_amount,
          minimum_deposit_amount: bonus.minimum_deposit_amount,
          status: bonus.status,
          position: bonus.position,
        });
      }

      // Re-fetch after seeding missing codes
      const { data: updatedData } = await api.from("promo_codes").select("*").order("created_at", { ascending: false });
      currentPromos = updatedData || currentPromos;
    }

    setPromos(currentPromos);
    setLoading(false);
  };

  const handleToggleStatus = async (promo: PromoCode) => {
    const nextStatus = promo.status === "active" ? "inactive" : "active";
    
    // Update promo_codes table
    const { error: promoErr } = await api
      .from("promo_codes")
      .update({ status: nextStatus })
      .eq("id", promo.id);

    if (promoErr) {
      toast({ title: "Failed to update status", description: promoErr.message, variant: "destructive" });
      return;
    }

    // Sync status with deposit_bonus_offers table if code matches
    await api
      .from("deposit_bonus_offers")
      .update({ status: nextStatus })
      .ilike("title", `%${promo.code}%`);

    toast({ title: `Promo ${promo.code} is now ${nextStatus.toUpperCase()}` });
    setPromos((prev) => prev.map((p) => (p.id === promo.id ? { ...p, status: nextStatus } : p)));
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete promo code ${code}?`)) return;
    const { error } = await api.from("promo_codes").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Promo ${code} deleted` });
      setPromos(promos.filter((p) => p.id !== id));
    }
  };

  const handleCreatePromo = async () => {
    if (!newPromo.code || !newPromo.reward_value || !newPromo.expiry_date) {
      toast({ title: "Validation Error", description: "Fill all required fields", variant: "destructive" });
      return;
    }
    const expiry = new Date(newPromo.expiry_date).toISOString();
    const upperCode = newPromo.code.toUpperCase();
    const bonusPercentVal = parseInt(newPromo.reward_value) || 50;

    const { data, error } = await api
      .from("promo_codes")
      .insert({
        code: upperCode,
        type: newPromo.type,
        reward_value: newPromo.reward_value,
        minimum_deposit_amount: Number(newPromo.minimum_deposit_amount) || 0,
        max_usages: newPromo.max_usages,
        expiry_date: expiry,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error creating promo", description: error.message, variant: "destructive" });
    } else if (data) {
      // Sync with deposit_bonus_offers table
      await api.from("deposit_bonus_offers").insert({
        title: `${upperCode} (+${bonusPercentVal}% Bonus)`,
        bonus_percent: bonusPercentVal,
        deposit_amount: Number(newPromo.minimum_deposit_amount) || 0,
        minimum_deposit_amount: Number(newPromo.minimum_deposit_amount) || 0,
        status: "active",
        position: 10,
      });

      toast({ title: `Promo code ${upperCode} created and activated` });
      setPromos([data, ...promos]);
      setIsCreating(false);
      setNewPromo({ code: "", type: "Percentage", reward_value: "50%", minimum_deposit_amount: 30, max_usages: 1000, expiry_date: "" });
    }
  };

  const filteredPromos = promos.filter((p) =>
    p.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4" style={{ borderColor: BORDER }}>
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Gift size={20} className="text-[#00C98D]" />
            PROMO CODE & DEPOSIT BONUS MANAGEMENT
          </h2>
          <p className="text-xs text-[#8D9AAF]">Enable or disable deposit bonuses, configure percentage rates and minimum deposit thresholds.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchAndSeedPromos()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-[#202B3A] bg-[#0D1420] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-[#00C98D]" : ""} /> Sync Offers
          </button>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-1.5 rounded-lg border border-[#00C98D]/30 bg-[#00C98D]/10 px-3 py-1.5 text-xs font-bold text-[#00C98D] hover:bg-[#00C98D] hover:text-black transition-colors"
          >
            <Plus size={13} /> {isCreating ? "Cancel" : "New Promo Code"}
          </button>
        </div>
      </div>

      {/* Create Form (collapsible) */}
      {isCreating && (
        <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
          <div className="border-b bg-[#121B29] px-4 py-2.5" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Create New Promo Code / Deposit Bonus</p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-6">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Code</label>
              <input
                type="text"
                value={newPromo.code}
                onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value })}
                placeholder="WELCOME50"
                className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs font-mono text-white outline-none focus:border-[#00C98D]"
                style={{ borderColor: BORDER }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Type</label>
              <select
                value={newPromo.type}
                onChange={(e) => setNewPromo({ ...newPromo, type: e.target.value })}
                className="w-full h-8 rounded-lg border bg-[#080D16] px-2 text-xs text-white outline-none focus:border-[#00C98D]"
                style={{ borderColor: BORDER }}
              >
                <option value="Percentage">Percentage Bonus</option>
                <option value="Fixed Bonus">Fixed Bonus Amount</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Bonus Value</label>
              <input
                type="text"
                value={newPromo.reward_value}
                onChange={(e) => setNewPromo({ ...newPromo, reward_value: e.target.value })}
                placeholder="50%"
                className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs text-white outline-none focus:border-[#00C98D]"
                style={{ borderColor: BORDER }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Min Deposit ($)</label>
              <input
                type="number"
                min="1"
                value={newPromo.minimum_deposit_amount}
                onChange={(e) => setNewPromo({ ...newPromo, minimum_deposit_amount: Number(e.target.value) })}
                className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs font-mono text-white outline-none focus:border-[#00C98D]"
                style={{ borderColor: BORDER }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Max Usages</label>
              <input
                type="number"
                value={newPromo.max_usages}
                onChange={(e) => setNewPromo({ ...newPromo, max_usages: Number(e.target.value) })}
                className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs text-white outline-none focus:border-[#00C98D]"
                style={{ borderColor: BORDER }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Expiry Date</label>
              <input
                type="date"
                value={newPromo.expiry_date}
                onChange={(e) => setNewPromo({ ...newPromo, expiry_date: e.target.value })}
                className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs text-white outline-none focus:border-[#00C98D]"
                style={{ borderColor: BORDER }}
              />
            </div>
            <div className="md:col-span-6 flex justify-end border-t pt-3" style={{ borderColor: BORDER }}>
              <button
                onClick={handleCreatePromo}
                className="rounded-lg bg-[#00C98D] px-5 py-1.5 text-xs font-bold text-black hover:bg-[#00b37d] transition-colors"
              >
                Save & Activate Promo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="flex items-center gap-3 rounded-lg border bg-[#0D1420] p-3" style={{ borderColor: BORDER }}>
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search promo code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 rounded-lg border bg-[#080D16] pl-8 pr-3 text-xs text-white outline-none placeholder:text-gray-500 focus:border-[#00C98D]"
            style={{ borderColor: BORDER }}
          />
        </div>
      </div>

      {/* Promo Code Table */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b bg-[#121B29] text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]" style={{ borderColor: BORDER }}>
                <th className="px-4 py-3">PROMO CODE</th>
                <th className="px-4 py-3">BONUS VALUE</th>
                <th className="px-4 py-3">MIN DEPOSIT REQUIRED</th>
                <th className="px-4 py-3">USAGES</th>
                <th className="px-4 py-3">EXPIRY</th>
                <th className="px-4 py-3">STATUS</th>
                <th className="px-4 py-3 text-right">TOGGLE ON / OFF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202B3A]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">Loading deposit promo codes...</td>
                </tr>
              ) : filteredPromos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">No promo codes found.</td>
                </tr>
              ) : (
                filteredPromos.map((promo) => {
                  const isActive = promo.status === "active";
                  const minDeposit = promo.minimum_deposit_amount ?? (promo.code === "WELCOME50" ? 30 : promo.code === "DEPOSIT50" ? 100 : promo.code === "DEPOSIT40" ? 80 : promo.code === "DEPOSIT30" ? 70 : 0);
                  return (
                    <tr key={promo.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono font-black text-[#00C98D] tracking-widest text-sm">
                        {promo.code}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-white text-xs">{promo.reward_value} BONUS</div>
                        <div className="text-[10px] uppercase text-[#5E6B7D]">{promo.type}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-white">
                        {minDeposit > 0 ? `$${minDeposit.toFixed(2)}` : "No Min."}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-white">{promo.usages} / {promo.max_usages}</div>
                        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full bg-[#00C98D]"
                            style={{ width: `${Math.min((promo.usages / promo.max_usages) * 100, 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[#8D9AAF]">
                        {promo.expiry_date ? new Date(promo.expiry_date).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isActive ? "bg-[#00C98D]/15 text-[#00C98D]" : "bg-[#EF4444]/15 text-[#EF4444]"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[#00C98D]" : "bg-[#EF4444]"}`} />
                          {isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(promo)}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                              isActive
                                ? "border border-[#00C98D]/30 bg-[#00C98D]/10 text-[#00C98D] hover:bg-[#EF4444]/20 hover:border-[#EF4444]/40 hover:text-[#EF4444]"
                                : "border border-gray-600 bg-gray-800/40 text-gray-400 hover:bg-[#00C98D]/20 hover:border-[#00C98D]/40 hover:text-[#00C98D]"
                            }`}
                          >
                            <Power size={13} />
                            {isActive ? "TURN OFF" : "TURN ON"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(promo.id, promo.code)}
                            className="rounded-lg border border-[#EF4444]/30 p-1.5 text-[#EF4444] hover:bg-[#EF4444] hover:text-white transition-colors"
                            title="Delete Promo"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PromoCodes;

