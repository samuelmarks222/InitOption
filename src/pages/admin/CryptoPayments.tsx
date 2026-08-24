import { useEffect, useMemo, useState } from "react";
import { Edit2, Link as LinkIcon, Power, PowerOff, Save, Search, Wallet, X, RefreshCw } from "lucide-react";
import { api } from "@/integrations/api/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";

type CryptoMethod = Tables<"crypto_payment_methods">;
type AddressPoolEntry = Tables<"crypto_deposit_address_pool">;

type EditFormState = {
  addressPoolEntries: string;
  attribution_mode: string;
  confirmations_required: number;
  memo_label: string;
  minimum_deposit_amount: number;
  qr_code_url: string;
  wallet_address: string;
};

const BORDER = "#202B3A";

const createInitialForm = (method: CryptoMethod): EditFormState => ({
  addressPoolEntries: "",
  attribution_mode: method.attribution_mode,
  confirmations_required: Number(method.confirmations_required ?? 1),
  memo_label: method.memo_label ?? "",
  minimum_deposit_amount: Number(method.minimum_deposit_amount ?? 10),
  qr_code_url: method.qr_code_url ?? "",
  wallet_address: method.wallet_address ?? "",
});

const parseAddressPoolEntries = (value: string) =>
  Array.from(new Set(value.split(/\r?\n/).map((e) => e.trim()).filter(Boolean)));

const CryptoPayments = () => {
  const [methods, setMethods] = useState<CryptoMethod[]>([]);
  const [poolEntries, setPoolEntries] = useState<AddressPoolEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    addressPoolEntries: "",
    attribution_mode: "static",
    confirmations_required: 1,
    memo_label: "",
    minimum_deposit_amount: 10,
    qr_code_url: "",
    wallet_address: "",
  });

  useEffect(() => {
    void fetchMethods();
  }, []);

  const fetchMethods = async () => {
    setLoading(true);
    const [methodsResponse, poolResponse] = await Promise.all([
      api.from("crypto_payment_methods").select("*").order("coin_name"),
      api.from("crypto_deposit_address_pool").select("*").order("created_at", { ascending: false }),
    ]);

    setMethods(methodsResponse.data ?? []);
    setPoolEntries(poolResponse.data ?? []);
    setLoading(false);
  };

  const handleToggleStatus = async (method: CryptoMethod) => {
    const newStatus = method.status === "active" ? "inactive" : "active";
    const { error } = await api.from("crypto_payment_methods")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", method.id);

    if (error) {
      toast({ title: "Status update failed", variant: "destructive" });
      return;
    }

    toast({ title: `${method.symbol} (${method.network}) is now ${newStatus}` });
    setMethods((current) => current.map((e) => (e.id === method.id ? { ...e, status: newStatus } : e)));
  };

  const startEdit = (method: CryptoMethod) => {
    setEditingId(method.id);
    setEditForm(createInitialForm(method));
  };

  const saveEdit = async (method: CryptoMethod) => {
    const parsedAddresses = parseAddressPoolEntries(editForm.addressPoolEntries);

    const { error: updateError } = await api.from("crypto_payment_methods")
      .update({
        attribution_mode: editForm.attribution_mode,
        confirmations_required: Math.max(0, Number(editForm.confirmations_required) || 0),
        memo_label: editForm.memo_label.trim() || null,
        minimum_deposit_amount: Math.max(0, Number(editForm.minimum_deposit_amount) || 0),
        qr_code_url: editForm.qr_code_url.trim() || null,
        updated_at: new Date().toISOString(),
        wallet_address: editForm.wallet_address.trim() || null,
      })
      .eq("id", method.id);

    if (updateError) {
      toast({ title: "Update failed", variant: "destructive" });
      return;
    }

    if (parsedAddresses.length > 0) {
      await api.from("crypto_deposit_address_pool").insert(
        parsedAddresses.map((address) => ({ address, payment_method_id: method.id, status: "available" })),
        { ignoreDuplicates: true, onConflict: "payment_method_id,address" }
      );
    }

    toast({ title: "Crypto settings updated" });
    setEditingId(null);
    await fetchMethods();
  };

  const filteredMethods = methods.filter((m) =>
    [m.coin_name, m.symbol, m.network].some((v) => v.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4" style={{ borderColor: BORDER }}>
        <div>
          <h2 className="text-xl font-black text-white">CRYPTO PAYMENTS & GATEWAY INFRASTRUCTURE</h2>
          <p className="text-xs text-[#8D9AAF]">Plisio payment gateway status, network routes, and address pool configurations.</p>
        </div>
        <button
          onClick={() => void fetchMethods()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-[#202B3A] bg-[#0D1420] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/5 hover:text-white"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-[#00C98D]" : ""} /> Refresh Status
        </button>
      </div>

      {/* Metrics Strip */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
        <div className="grid grid-cols-2 divide-x divide-y divide-[#202B3A] sm:grid-cols-4 sm:divide-y-0">
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Plisio Gateway</p>
            <p className="mt-0.5 text-xl font-black font-mono text-[#00C98D]">● ONLINE</p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Active Coin Routes</p>
            <p className="mt-0.5 text-xl font-black font-mono text-white">
              {methods.filter((m) => m.status === "active").length} / {methods.length}
            </p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Default Provider</p>
            <p className="mt-0.5 text-xl font-black font-mono text-white">Plisio API</p>
          </div>
          <div className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Webhook Route</p>
            <p className="mt-0.5 text-xl font-black font-mono text-[#00C98D]">Connected</p>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-[#0D1420] p-3" style={{ borderColor: BORDER }}>
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search coin, symbol, or network..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 rounded-lg border bg-[#080D16] pl-8 pr-3 text-xs text-white outline-none placeholder:text-gray-500 focus:border-[#00C98D]"
            style={{ borderColor: BORDER }}
          />
        </div>
      </div>

      {/* Dense Gateway Table (NO CARDS) */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b bg-[#121B29] text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]" style={{ borderColor: BORDER }}>
                <th className="px-4 py-3">COIN</th>
                <th className="px-4 py-3">NETWORK</th>
                <th className="px-4 py-3">PROVIDER</th>
                <th className="px-4 py-3">DEPOSIT ROUTE</th>
                <th className="px-4 py-3">WITHDRAWAL ROUTE</th>
                <th className="px-4 py-3">MIN DEPOSIT</th>
                <th className="px-4 py-3">STATUS</th>
                <th className="px-4 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202B3A]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">Loading gateway configurations...</td>
                </tr>
              ) : filteredMethods.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">No crypto payment routes configured.</td>
                </tr>
              ) : (
                filteredMethods.map((m) => {
                  const isEditing = editingId === m.id;
                  return (
                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5 font-bold text-white flex items-center gap-2">
                        <span>{m.coin_name}</span>
                        <span className="text-[10px] text-[#00C98D] font-mono">({m.symbol})</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-gray-300">{m.network}</td>
                      <td className="px-4 py-2.5 font-semibold text-white">Plisio</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-[#00C98D]/15 text-[#00C98D] px-1.5 py-0.5 text-[10px] font-bold">
                          {m.attribution_mode === "dynamic_address" ? "● Plisio Invoice" : "● Manual Wallet"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-[#00C98D]/15 text-[#00C98D] px-1.5 py-0.5 text-[10px] font-bold">
                          ● Active Payouts
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-white">${Number(m.minimum_deposit_amount).toFixed(2)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          m.status === "active" ? "bg-[#00C98D]/15 text-[#00C98D]" : "bg-[#EF4444]/15 text-[#EF4444]"
                        }`}>
                          {m.status === "active" ? "● Active" : "● Disabled"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startEdit(m)}
                            className="rounded border border-[#00C98D]/30 bg-[#00C98D]/10 px-2 py-1 text-[11px] font-bold text-[#00C98D] hover:bg-[#00C98D] hover:text-black transition-colors"
                          >
                            Edit Config
                          </button>
                          <button
                            onClick={() => void handleToggleStatus(m)}
                            className={`rounded px-2 py-1 text-[11px] font-bold ${
                              m.status === "active" ? "border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444] hover:text-white" : "border border-[#00C98D]/30 text-[#00C98D] hover:bg-[#00C98D] hover:text-black"
                            }`}
                          >
                            {m.status === "active" ? "Disable" : "Enable"}
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

export default CryptoPayments;
