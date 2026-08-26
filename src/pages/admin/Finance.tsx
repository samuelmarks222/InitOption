import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine, ArrowUpFromLine, CheckCircle, Clock3, Filter, RefreshCw, Search, XCircle, DollarSign,
  ShieldCheck, AlertCircle, ArrowDownCircle, ArrowUpCircle, Check, X,
} from "lucide-react";
import { realtime } from "@/integrations/pusher/realtime";
import { api } from "@/integrations/api/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { adminUpdateDepositStatus, DepositDecision } from "@/lib/deposits";
import {
  adminUpdateWithdrawalStatus, MobileMoneyWithdrawalDecision, reviewMobileMoneyWithdrawal, WithdrawalDecision,
} from "@/lib/withdrawals";
import { getAppwriteIdToken } from "@/integrations/appwrite/authService";

type FinanceTab = "deposits" | "withdrawals" | "history";
type DepositRequest = Tables<"deposit_requests">;
type PlatformSettingsLookup = Pick<Tables<"platform_settings">, "id" | "mpesa_withdrawal_approval_threshold_kes">;
type WithdrawalRequest = Tables<"withdrawal_requests">;
type ProfileLookup = Pick<Tables<"profiles">, "id" | "username" | "display_name">;
type CryptoMethodLookup = Pick<Tables<"crypto_payment_methods">, "attribution_mode" | "id" | "network" | "symbol">;

type DepositWithUser = DepositRequest & {
  automationMode: string | null;
  cryptoLabel: string | null;
  providerLabel: string | null;
  userHandle: string;
  userName: string;
};

type WithdrawalWithUser = WithdrawalRequest & {
  payoutPhone: string | null;
  providerLabel: string | null;
  referenceMpesaPhone: string | null;
  userHandle: string;
  userName: string;
};

const BORDER = "#1b2333";
const STATUS_BADGES: Record<string, { bg: string; icon: string; label: string; text: string }> = {
  approved: { bg: "bg-[#00c878]/20 border border-[#00c878]/30", text: "text-[#00c878]", icon: "🟢", label: "Approved" },
  completed: { bg: "bg-[#00c878]/20 border border-[#00c878]/30", text: "text-[#00c878]", icon: "🟢", label: "Completed" },
  failed: { bg: "bg-[#ff4a5a]/20 border border-[#ff4a5a]/30", text: "text-[#ff4a5a]", icon: "🔴", label: "Failed" },
  pending: { bg: "bg-[#f5a13d]/20 border border-[#f5a13d]/30", text: "text-[#f5a13d]", icon: "🟡", label: "Pending Review" },
  processing: { bg: "bg-[#1689e8]/20 border border-[#1689e8]/30", text: "text-[#1689e8]", icon: "🔵", label: "Processing" },
  rejected: { bg: "bg-[#ff4a5a]/20 border border-[#ff4a5a]/30", text: "text-[#ff4a5a]", icon: "🔴", label: "Rejected" },
};

const FINANCE_REQUEST_LIMIT = 300;

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
};

const getUserName = (profile: ProfileLookup | undefined, userId: string) =>
  profile?.display_name || profile?.username || `User ${userId.slice(0, 8).toUpperCase()}`;

const getUserHandle = (profile: ProfileLookup | undefined, userId: string) =>
  profile?.username || userId.slice(0, 8).toUpperCase();

const Finance = () => {
  const [activeTab, setActiveTab] = useState<FinanceTab>("deposits");
  const [searchTerm, setSearchTerm] = useState("");
  const [deposits, setDeposits] = useState<DepositWithUser[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [mpesaApprovalThresholdKes, setMpesaApprovalThresholdKes] = useState(10000);
  const [platformSettingsId, setPlatformSettingsId] = useState<string | null>(null);
  const [processingDepositId, setProcessingDepositId] = useState<string | null>(null);
  const [processingWithdrawalId, setProcessingWithdrawalId] = useState<string | null>(null);
  const [savingThreshold, setSavingThreshold] = useState(false);

  const loadFinanceData = async () => {
    setLoading(true);
    const [depositsRes, withdrawalsRes, cryptoMethodsRes, platformSettingsRes] = await Promise.all([
      api.from("deposit_requests").select("*").order("created_at", { ascending: false }).limit(FINANCE_REQUEST_LIMIT),
      api.from("withdrawal_requests").select("*").order("created_at", { ascending: false }).limit(FINANCE_REQUEST_LIMIT),
      api.from("crypto_payment_methods").select("id, attribution_mode, symbol, network"),
      api.from("platform_settings").select("id, mpesa_withdrawal_approval_threshold_kes").limit(1).maybeSingle(),
    ]);

    const userIds = Array.from(new Set([
      ...(depositsRes.data ?? []).map((r) => r.user_id),
      ...(withdrawalsRes.data ?? []).map((r) => r.user_id),
    ]));

    const profilesRes = userIds.length > 0 ? await api.from("profiles").select("id, username, display_name").in("id", userIds) : { data: [] };
    const profilesById = new Map<string, ProfileLookup>((profilesRes.data ?? []).map((p) => [p.id, p]));
    const cryptoMethodsById = new Map<string, CryptoMethodLookup>((cryptoMethodsRes.data ?? []).map((m) => [m.id, m]));

    const nextDeposits = (depositsRes.data ?? []).map((req) => {
      const profile = profilesById.get(req.user_id);
      const cryptoMethod = req.payment_method_id ? cryptoMethodsById.get(req.payment_method_id) : undefined;
      return {
        automationMode: cryptoMethod?.attribution_mode ?? null,
        cryptoLabel: cryptoMethod ? `${cryptoMethod.symbol} (${cryptoMethod.network})` : null,
        providerLabel: req.provider_name ? `${req.provider_name}${req.provider_status ? ` - ${req.provider_status}` : ""}` : null,
        ...req,
        userHandle: getUserHandle(profile, req.user_id),
        userName: getUserName(profile, req.user_id),
      };
    });

    const nextWithdrawals = (withdrawalsRes.data ?? []).map((req) => {
      const profile = profilesById.get(req.user_id);
      const providerPayload = typeof req.provider_payload === "object" && req.provider_payload !== null ? (req.provider_payload as Record<string, unknown>) : {};
      return {
        payoutPhone: typeof providerPayload.phone_number === "string" ? providerPayload.phone_number : req.destination,
        providerLabel: req.provider_name ? `${req.provider_name}${req.provider_status ? ` - ${req.provider_status}` : ""}` : null,
        referenceMpesaPhone: req.provider_phone_number ?? null,
        ...req,
        userHandle: getUserHandle(profile, req.user_id),
        userName: getUserName(profile, req.user_id),
      };
    });

    setDeposits(nextDeposits);
    setWithdrawals(nextWithdrawals);

    const settingsData = platformSettingsRes.data as PlatformSettingsLookup | null;
    if (settingsData?.id) {
      setPlatformSettingsId(settingsData.id);
      if (typeof settingsData.mpesa_withdrawal_approval_threshold_kes === "number") {
        setMpesaApprovalThresholdKes(settingsData.mpesa_withdrawal_approval_threshold_kes);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadFinanceData();
  }, []);

  const handleSaveThreshold = async () => {
    if (!platformSettingsId) return;
    setSavingThreshold(true);
    try {
      const { error } = await api
        .from("platform_settings")
        .update({ mpesa_withdrawal_approval_threshold_kes: mpesaApprovalThresholdKes })
        .eq("id", platformSettingsId);

      if (error) throw new Error(error.message);
      toast({ title: "M-PESA Threshold Updated", description: `Approval threshold set to KES ${mpesaApprovalThresholdKes.toLocaleString()}` });
    } catch (err) {
      toast({ title: "Failed to save threshold", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally {
      setSavingThreshold(false);
    }
  };

  const handleDepositDecision = async (depositId: string, decision: DepositDecision) => {
    setProcessingDepositId(depositId);
    try {
      await adminUpdateDepositStatus({ decision, depositId });
      toast({ title: `Deposit ${decision}`, description: `Deposit request status updated.` });
      await loadFinanceData();
    } catch (err) {
      toast({ title: "Deposit update failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally {
      setProcessingDepositId(null);
    }
  };

  const handleWithdrawalDecision = async (withdrawalId: string, decision: WithdrawalDecision) => {
    setProcessingWithdrawalId(withdrawalId);
    try {
      await adminUpdateWithdrawalStatus({ decision, withdrawalId });
      toast({ title: `Withdrawal ${decision}`, description: `Withdrawal request status updated.` });
      await loadFinanceData();
    } catch (err) {
      toast({ title: "Withdrawal update failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally {
      setProcessingWithdrawalId(null);
    }
  };

  const filteredDeposits = useMemo(() => {
    return deposits.filter((d) =>
      d.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.userHandle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [deposits, searchTerm]);

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) =>
      w.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.userHandle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [withdrawals, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#131a27] p-6 shadow-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <DollarSign className="h-6 w-6 text-[#1689e8]" />
            <h1 className="text-xl font-black text-white uppercase tracking-wider">Financial Operations Console</h1>
          </div>
          <p className="mt-1 text-xs font-bold text-gray-400">
            Review live deposit notifications, approve or reject M-PESA & Crypto withdrawals, and manage threshold limits.
          </p>
        </div>

        <button
          onClick={() => void loadFinanceData()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1018] px-4 py-2.5 text-xs font-black text-white hover:border-[#1689e8] transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-[#1689e8]" : ""}`} />
          Refresh Ledger
        </button>
      </div>

      {/* Threshold & Automation Config Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#131a27] p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase text-gray-300">M-PESA Auto-Approve Threshold (KES):</span>
          <input
            type="number"
            value={mpesaApprovalThresholdKes}
            onChange={(e) => setMpesaApprovalThresholdKes(Number(e.target.value))}
            className="w-32 rounded-xl border border-white/10 bg-[#0b1018] px-3 py-1.5 text-xs font-black text-white outline-none focus:border-[#1689e8]"
          />
          <button
            onClick={() => void handleSaveThreshold()}
            disabled={savingThreshold}
            className="rounded-xl bg-[#1689e8] px-4 py-1.5 text-xs font-black text-white hover:bg-[#0f7cd5] transition disabled:opacity-50"
          >
            {savingThreshold ? "Saving..." : "Save Threshold"}
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1018] p-1">
          <button
            onClick={() => setActiveTab("deposits")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-black transition ${
              activeTab === "deposits" ? "bg-[#1689e8] text-white shadow-md" : "text-gray-400 hover:text-white"
            }`}
          >
            <ArrowDownCircle className="h-4 w-4" /> Deposits ({deposits.length})
          </button>

          <button
            onClick={() => setActiveTab("withdrawals")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-black transition ${
              activeTab === "withdrawals" ? "bg-[#1689e8] text-white shadow-md" : "text-gray-400 hover:text-white"
            }`}
          >
            <ArrowUpCircle className="h-4 w-4" /> Withdrawals ({withdrawals.length})
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Filter requests by user, handle, reference ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-[#131a27] py-3 pl-10 pr-4 text-xs font-bold text-white placeholder-gray-500 outline-none focus:border-[#1689e8]"
        />
      </div>

      {/* Main Request Queue Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#131a27] shadow-xl">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-xs font-bold text-gray-400">
            <RefreshCw className="mr-2 h-5 w-5 animate-spin text-[#1689e8]" /> Loading financial records...
          </div>
        ) : activeTab === "deposits" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-[#0b1018]/80 text-[11px] font-black uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Submitted</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-semibold">
                {filteredDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">No deposit records found.</td>
                  </tr>
                ) : (
                  filteredDeposits.map((d) => {
                    const badge = STATUS_BADGES[d.status.toLowerCase()] ?? STATUS_BADGES.pending;
                    return (
                      <tr key={d.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-white">{d.userName}</div>
                          <div className="text-[10px] text-gray-400">@{d.userHandle}</div>
                        </td>
                        <td className="py-3.5 px-4 font-black text-[#00c878]">
                          ${Number(d.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-gray-300">
                          {d.payment_method?.toUpperCase() || "M-PESA"}
                          {d.cryptoLabel && <span className="block text-[10px] text-gray-500">{d.cryptoLabel}</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-400">{formatDateTime(d.created_at)}</td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {d.status === "pending" && (
                            <>
                              <button
                                onClick={() => void handleDepositDecision(d.id, "completed")}
                                disabled={processingDepositId === d.id}
                                className="rounded-lg bg-[#00c878] px-3 py-1 text-xs font-black text-white hover:bg-[#00b26b] transition disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => void handleDepositDecision(d.id, "rejected")}
                                disabled={processingDepositId === d.id}
                                className="rounded-lg bg-[#ff4a5a] px-3 py-1 text-xs font-black text-white hover:bg-[#e03b4b] transition disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-[#0b1018]/80 text-[11px] font-black uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Method & Destination</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Requested</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-semibold">
                {filteredWithdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">No withdrawal requests found.</td>
                  </tr>
                ) : (
                  filteredWithdrawals.map((w) => {
                    const badge = STATUS_BADGES[w.status.toLowerCase()] ?? STATUS_BADGES.pending;
                    return (
                      <tr key={w.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-white">{w.userName}</div>
                          <div className="text-[10px] text-gray-400">@{w.userHandle}</div>
                        </td>
                        <td className="py-3.5 px-4 font-black text-amber-400">
                          ${Number(w.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-gray-300">
                          <div>{w.method?.toUpperCase() || "M-PESA"}</div>
                          <div className="text-[10px] text-gray-500">{w.destination}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-400">{formatDateTime(w.created_at)}</td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {w.status === "pending" && (
                            <>
                              <button
                                onClick={() => void handleWithdrawalDecision(w.id, "approved")}
                                disabled={processingWithdrawalId === w.id}
                                className="rounded-lg bg-[#00c878] px-3 py-1 text-xs font-black text-white hover:bg-[#00b26b] transition disabled:opacity-50"
                              >
                                Approve Payout
                              </button>
                              <button
                                onClick={() => void handleWithdrawalDecision(w.id, "rejected")}
                                disabled={processingWithdrawalId === w.id}
                                className="rounded-lg bg-[#ff4a5a] px-3 py-1 text-xs font-black text-white hover:bg-[#e03b4b] transition disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Finance;
