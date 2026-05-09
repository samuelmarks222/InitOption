import { useEffect, useMemo, useState } from "react";
import { Edit2, Link as LinkIcon, Power, PowerOff, Save, Search, Wallet, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

const createInitialForm = (method: CryptoMethod): EditFormState => ({
  addressPoolEntries: "",
  attribution_mode: method.attribution_mode,
  confirmations_required: Number(method.confirmations_required ?? 1),
  memo_label: method.memo_label ?? "",
  minimum_deposit_amount: Number(method.minimum_deposit_amount ?? 10),
  qr_code_url: method.qr_code_url ?? "",
  wallet_address: method.wallet_address ?? "",
});

const formatPoolSummary = (pool: { assigned: number; available: number; retired: number }) =>
  `${pool.available} available / ${pool.assigned} assigned${pool.retired > 0 ? ` / ${pool.retired} retired` : ""}`;

type PoolSummary = { assigned: number; available: number; retired: number };

const AUTOMATION_MODE_COPY = {
  static: {
    adminSteps: "Add one wallet address. Admin will still approve deposits manually.",
    description: "Manual approval",
    details: "Use this only if you want finance to review each payment by hand.",
    label: "Manual approval",
    routingHint: "User sees one wallet address. No automatic crediting.",
  },
  memo: {
    adminSteps: "Plisio hosted checkout can still pair memo/tag-style networks with your internal confirmation rules. Configure the user-facing label, like Memo or Destination Tag.",
    description: "Auto with memo/tag",
    details: "Use this for networks that conceptually require memo/tag routing while still sending the trader through Plisio.",
    label: "Auto with memo/tag",
    routingHint: "User completes the payment in Plisio and the platform credits after confirmations.",
  },
  dynamic_address: {
    adminSteps: "Recommended. Enable this mode for Plisio hosted checkout.",
    description: "Auto with Plisio",
    details: "Each deposit opens a hosted Plisio invoice instead of showing a static wallet inside the app.",
    label: "Auto with Plisio",
    routingHint: "User gets redirected to Plisio for payment and returns here for monitoring.",
  },
} as const;

const parseAddressPoolEntries = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );

const getAutomationCopy = (mode: string) =>
  AUTOMATION_MODE_COPY[mode as keyof typeof AUTOMATION_MODE_COPY] ?? AUTOMATION_MODE_COPY.static;

const getMethodReadiness = (
  mode: string,
  walletAddress: string | null | undefined,
  pool: PoolSummary,
) => {
  if (mode === "dynamic_address") {
    return {
      detail:
        pool.available > 0
          ? `Plisio mode is ready. ${pool.available} legacy pooled address${pool.available === 1 ? "" : "es"} are also available if needed.`
          : "Plisio mode is ready. Address pool import is optional.",
      label: "Ready",
      tone: "success",
    };
  }

  if (mode === "memo") {
    return {
      detail:
        "Plisio memo mode is ready. Users complete payment in the hosted invoice while the platform keeps memo/tag rules for matching and confirmations.",
      label: "Ready",
      tone: "success",
    };
  }

  return walletAddress
    ? {
        detail: "Wallet address is set. Deposits can be submitted, but admin approval is still required.",
        label: "Manual mode",
        tone: "info",
      }
    : {
        detail: "Add a wallet address before traders can submit this coin.",
        label: "Needs wallet",
        tone: "warning",
      };
};

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
  const importedAddressCount = useMemo(() => parseAddressPoolEntries(editForm.addressPoolEntries).length, [editForm.addressPoolEntries]);
  const activeAutomationCopy = getAutomationCopy(editForm.attribution_mode);

  useEffect(() => {
    void fetchMethods();
  }, []);

  const fetchMethods = async () => {
    setLoading(true);

    const [methodsResponse, poolResponse] = await Promise.all([
      supabase.from("crypto_payment_methods").select("*").order("coin_name"),
      supabase.from("crypto_deposit_address_pool").select("*").order("created_at", { ascending: false }),
    ]);

    if (methodsResponse.error) {
      console.error("Error fetching crypto methods:", methodsResponse.error);
      toast({ title: "Crypto methods unavailable", description: methodsResponse.error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (poolResponse.error) {
      console.error("Error fetching deposit address pool:", poolResponse.error);
      toast({ title: "Address pool unavailable", description: poolResponse.error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    setMethods(methodsResponse.data ?? []);
    setPoolEntries(poolResponse.data ?? []);
    setLoading(false);
  };

  const poolSummaryByMethod = useMemo(() => {
    return poolEntries.reduce<Record<string, { assigned: number; available: number; retired: number }>>((accumulator, entry) => {
      const current = accumulator[entry.payment_method_id] ?? { assigned: 0, available: 0, retired: 0 };
      if (entry.status === "assigned") current.assigned += 1;
      else if (entry.status === "retired") current.retired += 1;
      else current.available += 1;
      accumulator[entry.payment_method_id] = current;
      return accumulator;
    }, {});
  }, [poolEntries]);

  const handleToggleStatus = async (method: CryptoMethod) => {
    const newStatus = method.status === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("crypto_payment_methods")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", method.id);

    if (error) {
      toast({ title: "Status update failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: `${method.symbol} (${method.network}) is now ${newStatus}!` });
    setMethods((current) => current.map((entry) => (entry.id === method.id ? { ...entry, status: newStatus } : entry)));
  };

  const startEdit = (method: CryptoMethod) => {
    setEditingId(method.id);
    setEditForm(createInitialForm(method));
  };

  const saveEdit = async (method: CryptoMethod) => {
    const parsedAddresses = parseAddressPoolEntries(editForm.addressPoolEntries);

    const { error: updateError } = await supabase
      .from("crypto_payment_methods")
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
      toast({ title: "Update failed", description: updateError.message, variant: "destructive" });
      return;
    }

    if (parsedAddresses.length > 0) {
      const { error: poolInsertError } = await supabase.from("crypto_deposit_address_pool").insert(
        parsedAddresses.map((address) => ({
          address,
          payment_method_id: method.id,
          status: "available",
        })),
        {
          ignoreDuplicates: true,
          onConflict: "payment_method_id,address",
        },
      );

      if (poolInsertError) {
        toast({
          title: "Address pool import failed",
          description: poolInsertError.message,
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Crypto automation saved",
      description:
        parsedAddresses.length > 0
          ? `${parsedAddresses.length} address${parsedAddresses.length === 1 ? "" : "es"} imported into the pool.`
          : "Payment method settings updated.",
    });

    setEditingId(null);
    await fetchMethods();
  };

  const filteredMethods = methods.filter(
    (method) =>
      method.coin_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      method.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      method.network.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="text-[#0fa053]" /> Crypto Payments Config
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Configure each coin for Plisio hosted checkout and automatic crediting after confirmations.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {(["static", "memo", "dynamic_address"] as const).map((mode) => {
          const copy = getAutomationCopy(mode);
          return (
            <div key={mode} className="rounded-2xl border border-white/8 bg-[#1e2330] p-5">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0fa053]">{copy.label}</div>
              <p className="mt-2 text-sm font-semibold text-white">{copy.adminSteps}</p>
              <p className="mt-2 text-xs leading-6 text-slate-300">{copy.routingHint}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[#0fa053]/10 bg-[#0fa053]/5 p-4 text-sm leading-6 text-[#e8fff2]">
        Prefer <strong>Auto with Plisio</strong> for most chains. Use <strong>Auto with memo/tag</strong> only where the network requires it.
      </div>

      <div className="bg-[#1e2330] border border-[#1e2330] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-[#1e2330] flex justify-between items-center bg-[#1e2330]">
          <div className="flex gap-2 relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, symbol or network..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full bg-[#1c1f2d] border border-[#1e2330] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm text-slate-200">
            <thead className="text-xs uppercase bg-[#1e2330] text-slate-300 border-b border-[#1e2330]">
              <tr>
                <th className="px-6 py-3 font-semibold">Coin</th>
                <th className="px-6 py-3 font-semibold">Setup Type</th>
                <th className="px-6 py-3 font-semibold">What You Fill In</th>
                <th className="px-6 py-3 font-semibold">Rules</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Loading live crypto configurations...
                  </td>
                </tr>
              ) : filteredMethods.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No crypto methods found. Please apply the migration script.
                  </td>
                </tr>
              ) : (
                filteredMethods.map((method) => {
                  const isEditing = editingId === method.id;
                  const pool = poolSummaryByMethod[method.id] ?? { assigned: 0, available: 0, retired: 0 };
                  const automationCopy = isEditing ? activeAutomationCopy : getAutomationCopy(method.attribution_mode);
                  const readiness = getMethodReadiness(method.attribution_mode, method.wallet_address, pool);

                  return (
                    <tr key={method.id} className="hover:bg-white/[0.02] align-top">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white text-base flex items-center gap-2">
                          <img
                            src={`https://assets.coincap.io/assets/icons/${method.symbol.toLowerCase().replace("usdt", "tether")}@2x.png`}
                            className="w-6 h-6 rounded-full bg-white p-0.5"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                            alt=""
                          />
                          {method.coin_name}
                        </div>
                        <div className="text-xs text-[#0fa053] font-bold mt-1 tracking-wider">{method.symbol}</div>
                        <div className="mt-2 inline-flex rounded-full border border-[#1e2330] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                          {method.network}
                        </div>
                      </td>
                      <td className="px-6 py-4 w-72">
                        {isEditing ? (
                          <div className="space-y-3">
                            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#0fa053]">
                              How should this coin work?
                            </label>
                            <select
                              value={editForm.attribution_mode}
                              onChange={(event) => setEditForm((current) => ({ ...current, attribution_mode: event.target.value }))}
                              className="w-full rounded-lg border border-[#0fa053]/40 bg-[#1c1f2d] px-3 py-2 text-xs text-white outline-none focus:border-[#0fa053]"
                            >
                              <option value="static">Manual approval</option>
                              <option value="memo">Auto with memo/tag</option>
                              <option value="dynamic_address">Auto with Plisio</option>
                            </select>
                            <div className="rounded-xl border border-white/8 bg-[#1c1f2d] px-3 py-3">
                              <div className="text-sm font-semibold text-white">{automationCopy.label}</div>
                              <div className="mt-1 text-xs leading-6 text-slate-300">{automationCopy.adminSteps}</div>
                              <div className="mt-2 text-[11px] text-[#d8f6e5]">{automationCopy.details}</div>
                            </div>
                            {editForm.attribution_mode === "memo" ? (
                              <div className="space-y-2">
                                <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#0fa053]">
                                  Memo label shown to users
                                </label>
                                <input
                                  type="text"
                                  value={editForm.memo_label}
                                  onChange={(event) => setEditForm((current) => ({ ...current, memo_label: event.target.value }))}
                                  placeholder="Example: Memo, Tag, Destination Tag"
                                  className="w-full rounded-lg border border-[#0fa053]/40 bg-[#1c1f2d] px-3 py-2 text-xs text-white outline-none focus:border-[#0fa053]"
                                />
                                <div className="text-[11px] leading-5 text-slate-400">
                                  Use this only when the selected chain needs memo/tag routing.
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-sm font-semibold text-white">
                              {automationCopy.label}
                            </div>
                            <div className="text-xs leading-6 text-slate-300">
                              {automationCopy.details}
                            </div>
                            <div
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                                readiness.tone === "success"
                                  ? "border-green-500/20 bg-green-500/10 text-green-300"
                                  : readiness.tone === "warning"
                                    ? "border-[#0fa053]/20 bg-[#0fa053]/10 text-[#8be0af]"
                                    : "border-[#0fa053]/20 bg-[#0fa053]/10 text-[#0fa053]"
                              }`}
                            >
                              {readiness.label}
                            </div>
                            <div className="text-[11px] leading-5 text-slate-400">
                              {readiness.detail}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 w-[340px]">
                        {isEditing ? (
                          <div className="space-y-3">
                            {editForm.attribution_mode !== "dynamic_address" ? (
                              <div className="space-y-2">
                                <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#0fa053]">
                                  {editForm.attribution_mode === "memo" ? "Fixed wallet address" : "Wallet address"}
                                </label>
                                <div className="relative">
                                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                  <input
                                    type="text"
                                    value={editForm.wallet_address}
                                    onChange={(event) => setEditForm((current) => ({ ...current, wallet_address: event.target.value }))}
                                    placeholder={editForm.attribution_mode === "memo" ? "Legacy fixed wallet used together with memo/tag" : "Wallet address used for manual deposits"}
                                    className="w-full bg-[#1c1f2d] border border-[#0fa053]/50 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:border-[#0fa053] outline-none"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-xl border border-[#0fa053]/20 bg-[#0fa053]/10 px-3 py-3 text-xs leading-6 text-[#e8fff2]">
                                Plisio will host the payment page for this method, then send callbacks back to the platform for confirmation tracking.
                              </div>
                            )}
                            <div className="relative">
                              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                              <input
                                type="text"
                                value={editForm.qr_code_url}
                                onChange={(event) => setEditForm((current) => ({ ...current, qr_code_url: event.target.value }))}
                                placeholder="QR code image URL (optional)"
                                className="w-full bg-[#1c1f2d] border border-[#0fa053]/50 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:border-[#0fa053] outline-none"
                              />
                            </div>
                            {editForm.attribution_mode === "dynamic_address" ? (
                              <div className="space-y-2">
                                <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#0fa053]">
                                  Optional legacy address pool
                                </label>
                                <textarea
                                  value={editForm.addressPoolEntries}
                                  onChange={(event) => setEditForm((current) => ({ ...current, addressPoolEntries: event.target.value }))}
                                  placeholder={"Paste one unique deposit address per line\nExample:\naddr_1\naddr_2\naddr_3"}
                                  rows={5}
                                  className="w-full rounded-lg border border-[#0fa053]/50 bg-[#1c1f2d] px-3 py-2 text-xs text-white outline-none focus:border-[#0fa053]"
                                />
                                <div className="text-[11px] leading-5 text-slate-400">
                                  {importedAddressCount > 0
                                    ? `${importedAddressCount} new address${importedAddressCount === 1 ? "" : "es"} will be imported when you save.`
                                    : "Paste one unused address per line only if you want to keep a legacy fallback pool."}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : method.attribution_mode === "dynamic_address" ? (
                          <div className="space-y-2">
                            <div className="text-sm font-semibold text-white">Plisio checkout mode</div>
                            <div className="text-xs text-slate-300">{formatPoolSummary(pool)}</div>
                            <div className="text-[11px] text-slate-400">
                              {pool.available > 0
                                ? "Plisio is active. Legacy pool entries are available as optional fallback."
                                : "Plisio is active. Address pool is optional in this mode."}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="font-mono text-xs text-slate-300 break-all" title={method.wallet_address || ""}>
                              {method.wallet_address || "Not configured"}
                            </div>
                            <div className="text-[11px] leading-5 text-slate-400">
                              {method.attribution_mode === "memo"
                                ? `Users will also see a ${method.memo_label || "memo"} when required by network rules.`
                                : "Users submit to this address, then finance approves manually."}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 w-56">
                        {isEditing ? (
                          <div className="grid grid-cols-1 gap-3">
                            <div className="space-y-2">
                              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#0fa053]">
                                Minimum deposit in USD
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={editForm.minimum_deposit_amount}
                                onChange={(event) =>
                                  setEditForm((current) => ({
                                    ...current,
                                    minimum_deposit_amount: Number(event.target.value) || 0,
                                  }))
                                }
                                placeholder="Minimum USD amount"
                                className="w-full rounded-lg border border-[#0fa053]/40 bg-[#1c1f2d] px-3 py-2 text-xs text-white outline-none focus:border-[#0fa053]"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#0fa053]">
                                Confirmations needed before crediting
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={editForm.confirmations_required}
                                onChange={(event) =>
                                  setEditForm((current) => ({
                                    ...current,
                                    confirmations_required: Number(event.target.value) || 0,
                                  }))
                                }
                                placeholder="Required confirmations"
                                className="w-full rounded-lg border border-[#0fa053]/40 bg-[#1c1f2d] px-3 py-2 text-xs text-white outline-none focus:border-[#0fa053]"
                              />
                            </div>
                            <div className="text-[11px] leading-5 text-slate-400">
                              {editForm.attribution_mode === "static"
                                ? "These rules control the request, but the deposit will still wait for admin approval."
                                : `Once the webhook sees ${Number(editForm.confirmations_required) || 0} confirmation(s), the deposit can credit automatically.`}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 text-xs">
                            <div className="text-white">Min deposit: ${Number(method.minimum_deposit_amount).toFixed(2)}</div>
                            <div className="text-slate-300">Confirmations: {method.confirmations_required}</div>
                            <div className="text-[11px] text-slate-400">
                              {method.attribution_mode === "static"
                                ? "Manual approval after payment"
                                : `Automatic credit after ${method.confirmations_required} confirmation(s)`}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 flex items-center gap-1.5 rounded-full text-xs font-bold tracking-wider w-fit ${
                            method.status === "active" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {method.status === "active" ? <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> : <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                          {method.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => void saveEdit(method)}
                              className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white rounded transition-colors"
                              title="Save"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-[#1e2330] text-slate-300 hover:text-white rounded transition-colors"
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEdit(method)}
                              className="p-1.5 bg-[#1e2330] text-slate-300 hover:text-white rounded transition-colors"
                              title="Edit automation settings"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => void handleToggleStatus(method)}
                              className={`p-1.5 rounded transition-colors ${
                                method.status === "active"
                                  ? "bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white"
                                  : "bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white"
                              }`}
                              title={method.status === "active" ? "Disable asset" : "Enable asset"}
                            >
                              {method.status === "active" ? <PowerOff size={16} /> : <Power size={16} />}
                            </button>
                          </div>
                        )}
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



